
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, ImageModel } from "../types";

// Helper to ensure we always have the latest key from the process shim
const getAI = () => {
  const apiKey = (window as any).process?.env?.API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

/**
 * 0. Connection Test
 * Validates the provided API key with a minimal request.
 */
export const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping",
    });
    return { success: !!response.text, message: "연결 성공! 이제 AI 아트를 생성할 수 있습니다." };
  } catch (error: any) {
    console.error("Connection test failed:", error);
    return { success: false, message: "연결 실패: 유효하지 않은 API 키이거나 권한이 없습니다." };
  }
};

/**
 * 1. Smart Title Generator
 */
export const generateTitles = async (selection: UserSelection): Promise<string[]> => {
  if (!selection.destination || !selection.view || !selection.mood) throw new Error("Incomplete selection");

  const ai = getAI();
  const prompt = `
    You are a jazz channel copywriter.
    Destination: ${selection.destination.label}, View: ${selection.view.label}, Mood: ${selection.mood.label}
    Generate 3 distinct playlist titles (max 25 characters each). Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titles"],
        },
      },
    });
    const json = JSON.parse(response.text || '{"titles": []}');
    return json.titles;
  } catch (error) {
    return [`${selection.destination.label} Vibes`, "Midnight Session", "Focus BGM"];
  }
};

/**
 * 2. Jazz Tone Analyzer
 */
export const generateColorPalette = async (mood: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `Suggest 3 hex colors for a jazz cover inspired by "${mood}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["colors"],
        },
      },
    });
    const json = JSON.parse(response.text || '{"colors": []}');
    return json.colors;
  } catch (error) {
    return ["#1e293b", "#3b82f6", "#f59e0b"];
  }
};

/**
 * 3. Thumbnail Generator
 */
export const generateThumbnail = async (
  selection: UserSelection, 
  colors: string[], 
  modelType: ImageModel = 'flash'
): Promise<{ url: string, prompt: string }> => {
  const ai = getAI();
  const aspectRatio = selection.aspectRatio || "16:9";
  const modelName = modelType === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const optimizedPrompt = `Cinematic jazz cover. ${selection.view?.label} in ${selection.destination?.label}. Mood: ${selection.mood?.label}. Palette: ${colors.join(', ')}. High quality, no text.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: optimizedPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          ...(modelName === 'gemini-3-pro-image-preview' ? { imageSize: "1K" } : {})
        }
      },
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("Image failed");
    return { url: imageUrl, prompt: optimizedPrompt };
  } catch (error) {
    throw error;
  }
};
