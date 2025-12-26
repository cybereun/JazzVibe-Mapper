
import React, { useState, useEffect } from 'react';
import { DESTINATIONS, VIEWS, MOODS } from './constants';
import { VibeOption, UserSelection, GeneratedResult, Step, ImageModel } from './types';
import StepIndicator from './components/StepIndicator';
import SelectionCard from './components/SelectionCard';
import ResultView from './components/ResultView';
import { generateTitles, generateThumbnail, generateColorPalette } from './services/geminiService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('destination');
  const [selection, setSelection] = useState<UserSelection>({
    destination: null,
    view: null,
    mood: null,
    aspectRatio: "16:9",
  });
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customDestInput, setCustomDestInput] = useState("");
  
  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ImageModel>('flash');

  useEffect(() => {
    const savedModel = localStorage.getItem('selected_model') as ImageModel;
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('selected_model', selectedModel);
    setIsSettingsOpen(false);
  };

  const handleSelection = (option: VibeOption) => {
    const nextSelection = { ...selection, [currentStep]: option };
    setSelection(nextSelection);
    
    if (currentStep === 'destination') setTimeout(() => setCurrentStep('view'), 300);
    else if (currentStep === 'view') setTimeout(() => setCurrentStep('mood'), 300);
  };

  const handleCustomDestination = () => {
    if (!customDestInput.trim()) return;
    const customOption: VibeOption = {
      id: `custom-${Date.now()}`,
      label: customDestInput.trim(),
      keywords: [customDestInput.trim(), 'custom'],
      image: `https://picsum.photos/seed/${customDestInput.trim()}/200/200`
    };
    handleSelection(customOption);
  };

  const handleGenerate = async () => {
    if (!selection.destination || !selection.view || !selection.mood) return;
    
    // For gemini-3-pro-image-preview, user must select their own key via the aistudio interface
    if (selectedModel === 'pro') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Proceeding after openSelectKey as per race condition guidelines
      }
    }

    setCurrentStep('generating');
    setError(null);
    try {
      const colors = await generateColorPalette(selection.mood.label);
      const titlesPromise = generateTitles(selection);
      const thumbnailPromise = generateThumbnail(selection, colors, selectedModel);
      const [titles, thumbnailData] = await Promise.all([titlesPromise, thumbnailPromise]);
      
      setResult({
        titles,
        thumbnailUrl: thumbnailData.url,
        colors,
        promptUsed: thumbnailData.prompt
      });
      setCurrentStep('result');
    } catch (err: any) {
      console.error("Generation error:", err);
      setError("시스템 생성에 실패했습니다. 설정을 확인하거나 잠시 후 다시 시도해주세요.");
      setCurrentStep('mood');
    }
  };

  const resetApp = () => {
    setSelection({ ...selection, destination: null, view: null, mood: null, aspectRatio: "16:9" });
    setResult(null);
    setCustomDestInput("");
    setCurrentStep('destination');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <header className="py-4 px-6 md:px-12 border-b border-slate-900 flex justify-between items-center bg-[#020617]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={resetApp}>
          <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-950" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight serif">
            Jazz Vibe<span className="text-amber-500">Mapper</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-slate-900/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-[#18181b] w-full max-w-lg rounded-[2rem] p-8 shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5 animate-fadeIn">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-[#7c3aed] rounded-xl flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.91,7.62,6.29L5.23,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.72,8.87 c-0.11,0.21-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.81,11.68,4.81,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
                 </div>
                 <h2 className="text-2xl font-bold text-white">설정</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-8">
              {/* Model Select Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-100">이미지 생성 모델</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  썸네일 생성에 사용할 모델을 선택하세요. '나노 바나나 프로'는 고화질(1K) 생성을 지원하며 결제가 필요할 수 있습니다.
                </p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => setSelectedModel('flash')}
                    className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all ${selectedModel === 'flash' ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-slate-800 bg-transparent opacity-60'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${selectedModel === 'flash' ? 'border-[#7c3aed]' : 'border-slate-700'}`}>
                      {selectedModel === 'flash' && <div className="w-3 h-3 bg-[#7c3aed] rounded-full" />}
                    </div>
                    <span className="text-slate-100 font-bold">나노 바나나 (Flash Image) - 빠름</span>
                  </button>
                  
                  <button 
                    onClick={() => setSelectedModel('pro')}
                    className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all ${selectedModel === 'pro' ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-slate-800 bg-transparent opacity-60'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${selectedModel === 'pro' ? 'border-[#7c3aed]' : 'border-slate-700'}`}>
                      {selectedModel === 'pro' && <div className="w-3 h-3 bg-[#7c3aed] rounded-full" />}
                    </div>
                    <span className="text-slate-100 font-bold">나노 바나나 프로 (Pro Image) - 고화질 (1K)</span>
                  </button>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <p>나노 바나나 프로 이용 시 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-amber-500 underline">결제 계정</a>이 필요할 수 있습니다.</p>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleSaveSettings}
                className="w-full py-6 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-3xl font-bold text-xl transition-all shadow-lg active:scale-[0.98] mt-4"
              >
                저장 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 max-w-5xl">
        {currentStep !== 'result' && currentStep !== 'generating' && (
          <StepIndicator currentStep={currentStep === 'destination' ? 1 : currentStep === 'view' ? 2 : 3} />
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl mb-12 text-center animate-fadeIn flex flex-col items-center">
            <span className="font-bold mb-1">시스템 오류</span>
            <span className="text-sm opacity-80">{error}</span>
          </div>
        )}

        {currentStep === 'generating' ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
             <div className="w-20 h-20 rounded-full border-2 border-slate-800 border-t-amber-500 animate-spin mb-10"></div>
             <h2 className="text-3xl serif text-white mb-3">Synthesizing Artist Profile</h2>
             <p className="text-slate-500 text-xs tracking-widest uppercase italic">
               {selectedModel === 'pro' ? 'Gemini 3 Pro Engine • 1K Resolution' : 'Gemini 2.5 Flash Engine • Fast Mode'}
             </p>
          </div>
        ) : currentStep === 'result' && result ? (
          <ResultView result={result} onReset={resetApp} aspectRatio={selection.aspectRatio} />
        ) : (
          <div className="animate-fadeIn pb-24">
            <h2 className="text-4xl md:text-6xl text-center serif text-white mb-16 leading-tight">
              {currentStep === 'destination' ? "Where is your mind traveling?" : 
               currentStep === 'view' ? "What do you see?" : "Choose your sonic palette."}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
              {(currentStep === 'destination' ? DESTINATIONS : currentStep === 'view' ? VIEWS : MOODS).map((option) => {
                // Fix: Properly cast the currentStep to vibe keys to avoid Type errors with aspectRatio
                const vibeKey = currentStep as 'destination' | 'view' | 'mood';
                const isSelected = selection[vibeKey]?.id === option.id;

                return (
                  <SelectionCard
                    key={option.id}
                    option={option}
                    selected={isSelected}
                    onClick={() => handleSelection(option)}
                  />
                );
              })}
            </div>

            {currentStep === 'destination' && (
               <div className="mt-16 max-w-md mx-auto">
                 <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-1.5 flex items-center shadow-2xl">
                   <input type="text" value={customDestInput} onChange={(e) => setCustomDestInput(e.target.value)} placeholder="Type a custom city..." className="flex-grow bg-transparent border-none text-white px-5 py-4 focus:ring-0 outline-none text-sm placeholder:text-slate-600" />
                   <button onClick={handleCustomDestination} className="bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg hover:bg-amber-400 transition-all">GO</button>
                 </div>
               </div>
            )}

            <div className="mt-20 flex flex-col items-center space-y-8 sticky bottom-10 z-20">
               {selection.destination && selection.view && selection.mood ? (
                 <>
                   <div className="flex bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
                     {['16:9', '1:1', '9:16'].map((ratio) => (
                       <button
                         key={ratio}
                         onClick={() => setSelection({ ...selection, aspectRatio: ratio })}
                         className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                           ${selection.aspectRatio === ratio ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}
                         `}
                       >
                         {ratio}
                       </button>
                     ))}
                   </div>

                   <button
                      onClick={handleGenerate}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-5 px-16 rounded-full shadow-2xl transition-all flex items-center space-x-4 active:scale-95 group"
                   >
                      <span className="text-xl uppercase tracking-wider">Start Vibe Mapping</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                   </button>
                 </>
               ) : (
                 <div className="h-24"></div>
               )}
            </div>
          </div>
        )}
      </main>
      <footer className="py-12 text-center text-slate-700 text-[9px] uppercase tracking-[0.4em] border-t border-slate-900">
        <p>© 2024 Jazz Vibe Mapper • E-MusicVibe Architecture</p>
      </footer>
    </div>
  );
};

export default App;
