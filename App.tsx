import React, { useState, useEffect, useRef } from 'react';
import { StoryParams, GeneratedStory } from './types';
import { generateMythologicalStory } from './services/geminiService';
import { StoryForm } from './components/StoryForm';
import { StoryDisplay } from './components/StoryDisplay';
import { HistoryList } from './components/HistoryList';
import { IconShield, IconHammer, IconFeather, IconMusic, IconMusicOff } from './components/Icons';

// Telif haksız (Royalty Free) Müzik URL'leri - Güncellenmiş Kararlı Kaynaklar
const MUSIC_TRACKS = {
  // Varsayılan: Mistik, Şamanik Davullar (Tribal Atmospheric)
  DEFAULT: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3', 
  
  // İskandinav: Derin, Savaşçı ve Soğuk (Viking Dark Folk)
  NORSE: 'https://cdn.pixabay.com/audio/2023/02/10/audio_5b364177c8.mp3', 
  
  // Yunan/Antik: Arp ve Duygusal (Ancient Harp)
  GREEK: 'https://cdn.pixabay.com/audio/2022/10/05/audio_6869a83478.mp3', 
  
  // Mısır/Çöl: Gizemli Orta Doğu (Middle East Mystery)
  EGYPT: 'https://cdn.pixabay.com/audio/2020/11/10/audio_573c242339.mp3'    
};

function App() {
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [history, setHistory] = useState<GeneratedStory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mythos_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const hydrated = parsed.map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }));
        setHistory(hydrated);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    
    // Initialize Audio with Error Handling
    if (!audioRef.current) {
        const audio = new Audio();
        audio.src = MUSIC_TRACKS.DEFAULT;
        audio.loop = true;
        audio.volume = 0.4; // Slightly louder to ensure it's heard
        
        // Add error listener to catch broken links or decoding errors
        audio.addEventListener('error', (e) => {
            console.error("Audio playback error:", e);
            // If error occurs, update UI state to reflect stopped audio
            setIsMusicPlaying(false);
        });

        audioRef.current = audio;
    }
    
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, []);

  // Handle Music Track Change based on Mythology
  useEffect(() => {
    if (!audioRef.current) return;

    let targetTrack = MUSIC_TRACKS.DEFAULT;

    if (currentStory) {
      const myth = currentStory.params.mythology.toLowerCase();
      if (myth.includes('iskandinav') || myth.includes('thor') || myth.includes('odin') || myth.includes('viking') || myth.includes('kuzey')) {
        targetTrack = MUSIC_TRACKS.NORSE;
      } else if (myth.includes('yunan') || myth.includes('zeus') || myth.includes('roma') || myth.includes('olimp') || myth.includes('antik')) {
        targetTrack = MUSIC_TRACKS.GREEK;
      } else if (myth.includes('mısır') || myth.includes('ra') || myth.includes('anubis') || myth.includes('çöl')) {
        targetTrack = MUSIC_TRACKS.EGYPT;
      }
    }

    // Only change source if it's different to prevent restart
    // Check if the source URL contains the target track filename to avoid full URL mismatch issues
    if (audioRef.current.src !== targetTrack) {
      const wasPlaying = isMusicPlaying;
      audioRef.current.src = targetTrack;
      audioRef.current.load(); // Reload the new source
      
      if (wasPlaying) {
        audioRef.current.play().catch(e => {
            console.log("Audio autoplay prevented on track change", e);
            setIsMusicPlaying(false);
        });
      }
    }
  }, [currentStory]); // Remove isMusicPlaying from dep array to avoid loops

  // Save history to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('mythos_history', JSON.stringify(history));
    } catch (e) {
      console.warn("LocalStorage limit reached. Attempting to save without images.", e);
      try {
        const lightHistory = history.map(({ images, ...rest }) => rest);
        localStorage.setItem('mythos_history', JSON.stringify(lightHistory));
      } catch (retryError) {
        console.error("Failed to save history even without images", retryError);
      }
    }
  }, [history]);

  const handleGenerateStory = async (params: StoryParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentStory(null);

    try {
      const { title, content } = await generateMythologicalStory(params);
      
      const newStory: GeneratedStory = {
        id: crypto.randomUUID(),
        title,
        content,
        params,
        createdAt: new Date(),
        images: []
      };

      setCurrentStory(newStory);
      setHistory(prev => [newStory, ...prev]);

    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStory = (updatedStory: GeneratedStory) => {
    setCurrentStory(updatedStory);
    setHistory(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
  };

  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(s => s.id !== id));
    if (currentStory?.id === id) {
      setCurrentStory(null);
    }
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
    } else {
        // Attempt to play
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setIsMusicPlaying(true);
                })
                .catch((e) => {
                    console.error("Manual play failed:", e);
                    setIsMusicPlaying(false);
                });
        }
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => setCurrentStory(null)}>
             {/* Logo Container */}
             <div className="relative w-14 h-14 flex items-center justify-center">
               <div className="absolute inset-0 bg-myth-gold/10 blur-xl rounded-full group-hover:bg-myth-gold/30 transition-all duration-500"></div>
               <div className="absolute inset-0 border-2 border-myth-gold/30 rounded-full scale-90 group-hover:scale-100 transition-transform duration-500"></div>
               <IconHammer className="absolute -left-1 bottom-1 w-8 h-8 text-slate-400 -rotate-12 drop-shadow-md z-10" fill="currentColor" fillOpacity={0.2} />
               <IconShield className="absolute w-10 h-10 text-myth-gold z-20 drop-shadow-lg" fill="currentColor" fillOpacity={0.15} />
               <IconFeather className="absolute -right-1 bottom-1 w-8 h-8 text-yellow-600 rotate-12 drop-shadow-md z-10" />
             </div>
             
             {/* Text */}
             <div className="flex flex-col justify-center">
               <h1 className="text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-myth-gold via-yellow-200 to-yellow-600 tracking-wide drop-shadow-sm flex items-center gap-2">
                 MYTHIC HEROES
               </h1>
             </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
             {/* Music Toggle Button */}
             <button 
               onClick={toggleMusic}
               className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 font-bold text-xs uppercase tracking-wider ${
                 isMusicPlaying 
                   ? 'bg-myth-gold/20 border-myth-gold text-myth-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                   : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
               }`}
             >
               {isMusicPlaying ? (
                 <>
                   <IconMusic className="w-4 h-4 animate-pulse" />
                   <span>Müzik Açık</span>
                 </>
               ) : (
                 <>
                   <IconMusicOff className="w-4 h-4" />
                   <span>Müzik Kapalı</span>
                 </>
               )}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-8 text-center animate-pulse">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form & History (Desktop) */}
          <div className="lg:col-span-4 space-y-8">
            <StoryForm onSubmit={handleGenerateStory} isLoading={isLoading} />
            <div className="hidden lg:block">
              <HistoryList 
                stories={history} 
                onSelect={setCurrentStory} 
                onDelete={handleDeleteStory}
                currentStoryId={currentStory?.id} 
              />
            </div>
          </div>

          {/* Right Column: Display */}
          <div className="lg:col-span-8">
             <StoryDisplay 
                story={currentStory} 
                isLoading={isLoading} 
                onUpdateStory={handleUpdateStory}
             />
             
             {/* Mobile History View */}
             <div className="block lg:hidden mt-8">
               <HistoryList 
                  stories={history} 
                  onSelect={(s) => {
                    setCurrentStory(s);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  onDelete={handleDeleteStory}
                  currentStoryId={currentStory?.id} 
                />
             </div>
          </div>
        
        </div>
      </main>
    </div>
  );
}

export default App;