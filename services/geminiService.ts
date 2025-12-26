
import { GoogleGenAI, Type } from "@google/genai";
import { UserSelection, ImageModel } from "../types";

// Removed getApiKey shim as process.env.API_KEY is handled externally.

/**
 * 1. Smart Title Generator
 * Uses gemini-3-flash-preview for a creative text task.
 */
export const generateTitles = async (selection: UserSelection): Promise<string[]> => {
  if (!selection.destination || !selection.view || !selection.mood) throw new Error("Incomplete selection");

  // Always initialize GoogleGenAI with the API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a jazz channel copywriter for a "Ticketless Travel" concept app.
    Context:
    - Destination: ${selection.destination.label}
    - View: ${selection.view.label}
    - Mood: ${selection.mood.label}

    Task:
    Generate 3 distinct, emotional, and clickable playlist titles (max 25 characters each).
    Rules:
    - One title MUST include the tag "[Ticketless Travel]".
    - One title MUST include the tag "[Focus BGM]".
    - Return ONLY the titles in JSON format.
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
            titles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["titles"],
        },
      },
    });

    const json = JSON.parse(response.text || '{"titles": []}');
    return json.titles;
  } catch (error) {
    console.error("Title generation failed:", error);
    return [`${selection.destination.label} Vibes`, "Ticketless Jazz [Focus BGM]", "Midnight Session"];
  }
};

/**
 * 2. Jazz Tone Analyzer
 * Uses gemini-3-flash-preview for color palette suggestions.
 */
export const generateColorPalette = async (mood: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    console.error("Color palette generation failed:", error);
    return ["#1e293b", "#3b82f6", "#f59e0b"];
  }
};

/**
 * 3. Thumbnail Generator
 * Uses gemini-2.5-flash-image by default, or gemini-3-pro-image-preview for high quality.
 */
export const generateThumbnail = async (
  selection: UserSelection, 
  colors: string[], 
  modelType: ImageModel = 'flash'
): Promise<{ url: string, prompt: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const aspectRatio = selection.aspectRatio || "16:9";
  
  // Select appropriate model name based on guidelines
  const modelName = modelType === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const optimizedPrompt = `A high-quality, cinematic jazz playlist cover. Scene: A ${selection.view?.label} in ${selection.destination?.label}. Musical Mood: ${selection.mood?.label} jazz. Aesthetic: Moody, atmospheric, professional photography, lighting inspired by colors ${colors.join(', ')}. No text.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: optimizedPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          // imageSize is only supported for gemini-3-pro-image-preview. Changed to 1K as requested.
          ...(modelName === 'gemini-3-pro-image-preview' ? { imageSize: "1K" } : {})
        }
      },
    });

    let imageUrl = '';
    // Iterate through all parts to find the image part as per guidelines
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("이미지 데이터를 생성하지 못했습니다.");
    
    return { url: imageUrl, prompt: optimizedPrompt };
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};
