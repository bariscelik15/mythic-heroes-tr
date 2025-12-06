import React, { useState, useRef, useEffect } from 'react';
import { GeneratedStory, StoryDuration } from '../types';
import { IconScroll, IconSmartphone, IconFilm, IconHourglass, IconVolume, IconStop, IconLoader, IconDownload, IconImage, IconPalette, IconLayout, IconMic, IconCaptions } from './Icons';
import { generateStorySpeech, audioBufferToWav, generateStoryIllustrations, generateYouTubeThumbnail, createSRTContent } from '../services/geminiService';

interface StoryDisplayProps {
  story: GeneratedStory | null;
  isLoading: boolean;
  onUpdateStory?: (story: GeneratedStory) => void;
}

// Model: API'nin tanıdığı gerçek isim
// Label: Kullanıcının gördüğü isim
const VOICE_OPTIONS = [
  // Orijinal Modeller
  { label: 'Charon', model: 'Charon', desc: 'Destansı & Derin (Erkek)' },
  { label: 'Fenrir', model: 'Fenrir', desc: 'Gür & Otoriter (Erkek)' },
  { label: 'Puck', model: 'Puck', desc: 'Oyunbaz & Tenor (Erkek)' },
  { label: 'Kore', model: 'Kore', desc: 'Sakin & Mistik (Kadın)' },
  { label: 'Zephyr', model: 'Zephyr', desc: 'Yumuşak & Duruluk (Kadın)' },
  { label: 'Aoede', model: 'Aoede', desc: 'Zarif & Kendinden Emin (Kadın)' },
  
  // Tematik Varyasyonlar (Alias)
  { label: 'Dyno', model: 'Fenrir', desc: 'Tok & Bas (Erkek)' },
  { label: 'Nyx', model: 'Kore', desc: 'Karanlık & Gizemli (Kadın)' },
  { label: 'Apollo', model: 'Puck', desc: 'Parlak & Enerjik (Erkek)' },
  { label: 'Gaia', model: 'Zephyr', desc: 'Anaç & Doğal (Kadın)' },
  { label: 'Kronos', model: 'Charon', desc: 'Antik & Bilge (Erkek)' },
];

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, isLoading, onUpdateStory }) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [showThumbnailMenu, setShowThumbnailMenu] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  // selectedVoiceLabel keeps track of the UI selection (e.g. "Dyno")
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Charon');
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  // Cache the generated audio buffer for the current story
  const cachedAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Cleanup audio on unmount or story change
  useEffect(() => {
    // Stop any playing audio
    stopAudio();
    
    // Reset the cache when the story ID changes (new story = new audio needed)
    cachedAudioBufferRef.current = null;
    setHasAudio(false);
    setShowThumbnailMenu(false);
    setShowVoiceMenu(false);
  }, [story?.id]);

  const handleVoiceChange = (voiceLabel: string) => {
    if (selectedVoiceLabel === voiceLabel) return;
    
    stopAudio();
    setSelectedVoiceLabel(voiceLabel);
    // Important: Clear cache because voice changed
    cachedAudioBufferRef.current = null; 
    setHasAudio(false);
    setShowVoiceMenu(false);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const getAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (!story) return null;
    
    // Initialize AudioContext if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }

    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    if (cachedAudioBufferRef.current) {
      return cachedAudioBufferRef.current;
    }

    setIsGeneratingAudio(true);
    try {
      // Resolve the actual API model name from the selected label
      const selectedOption = VOICE_OPTIONS.find(v => v.label === selectedVoiceLabel);
      const apiModelName = selectedOption ? selectedOption.model : 'Charon';

      const buffer = await generateStorySpeech(story.content, apiModelName);
      cachedAudioBufferRef.current = buffer;
      setHasAudio(true);
      return buffer;
    } catch (error) {
      console.error("Audio generation failed:", error);
      alert("Seslendirme oluşturulurken bir hata oluştu.");
      setHasAudio(false);
      return null;
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!story) return;

    // If already playing, stop it
    if (isPlaying) {
      stopAudio();
      return;
    }

    const bufferToPlay = await getAudioBuffer();
    if (!bufferToPlay || !audioContextRef.current) return;
      
    const source = audioContextRef.current.createBufferSource();
    source.buffer = bufferToPlay;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      sourceNodeRef.current = null;
    };

    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  const handleDownloadAudio = async () => {
    if (!story || isGeneratingAudio) return;

    const buffer = await getAudioBuffer();
    if (!buffer) return;

    try {
      const wavBlob = audioBufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${selectedVoiceLabel.toLowerCase()}.wav`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error("Download error:", error);
      alert("Dosya indirilirken bir hata oluştu.");
    }
  };

  const handleDownloadSRT = async () => {
    if (!story || !cachedAudioBufferRef.current) return;

    try {
      const srtContent = createSRTContent(story.content, cachedAudioBufferRef.current.duration);
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${selectedVoiceLabel.toLowerCase()}.srt`;
      document.body.appendChild(a);
      a.click();
      
      window.setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("SRT generation error:", error);
      alert("SRT oluşturulurken bir hata oluştu.");
    }
  };

  const handleGenerateImages = async () => {
    if (!story || !onUpdateStory || isGeneratingImages) return;

    setIsGeneratingImages(true);
    try {
      // Pass character details to ensure they are in foreground
      const images = await generateStoryIllustrations(
        story.content, 
        story.params.characterName, 
        story.params.traits
      );
      
      onUpdateStory({
        ...story,
        images: images
      });
    } catch (error) {
      console.error("Image gen error:", error);
      alert("Görseller oluşturulurken bir hata oluştu.");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleGenerateThumbnail = async (orientation: 'landscape' | 'portrait') => {
    if (!story || !onUpdateStory || isGeneratingThumbnail) return;
    
    setIsGeneratingThumbnail(true);
    setShowThumbnailMenu(false);

    try {
      const thumbnailData = await generateYouTubeThumbnail(
        story.title,
        story.params.characterName,
        story.params.traits,
        orientation
      );

      if (thumbnailData) {
        onUpdateStory({
          ...story,
          thumbnail: thumbnailData
        });
      } else {
        alert("Thumbnail oluşturulamadı.");
      }
    } catch (error) {
      console.error("Thumbnail gen error:", error);
      alert("Thumbnail oluşturulurken bir hata oluştu.");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleDownloadImage = (base64Data: string, filename: string) => {
    try {
        const a = document.createElement('a');
        a.href = base64Data;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error("Image download failed", error);
    }
  };

  const getDurationIcon = (d: StoryDuration) => {
    switch (d) {
      case StoryDuration.SHORTS: return <IconSmartphone className="w-4 h-4" />;
      case StoryDuration.VIDEO: return <IconFilm className="w-4 h-4" />;
      case StoryDuration.EPIC: return <IconHourglass className="w-4 h-4" />;
    }
  };

  const getDurationLabel = (d: StoryDuration) => {
    switch (d) {
      case StoryDuration.SHORTS: return 'Shorts';
      case StoryDuration.VIDEO: return 'Video';
      case StoryDuration.EPIC: return 'Destan';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 min-h-[400px]">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-myth-gold/20 blur-xl rounded-full animate-pulse"></div>
          <IconScroll className="w-16 h-16 text-myth-gold animate-bounce relative z-10" />
        </div>
        <h3 className="text-xl font-serif text-myth-gold mb-2">Musalar Fısıldıyor...</h3>
        <p className="text-slate-400 max-w-sm">
          Yapay zeka mitolojik arşivleri tarıyor ve karakterin için eşsiz bir kader örüyor. Lütfen bekle.
        </p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 min-h-[400px]">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
           <IconScroll className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-xl font-serif text-slate-300 mb-2">Henüz Bir Efsane Yok</h3>
        <p className="text-slate-500 max-w-sm">
          Sol taraftaki formu doldurarak yeni bir mitolojik hikaye oluşturmaya başla.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-myth-parchment text-slate-900 p-8 md:p-12 rounded-xl shadow-2xl relative overflow-hidden min-h-[600px] border-4 border-double border-myth-accent/20">
       {/* Parchment texture effect overlay */}
       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-myth-accent/30 to-transparent"></div>
       
       <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-myth-accent/20">
            <div className="flex justify-center items-center gap-3 mb-3">
              <span className="text-xs uppercase tracking-[0.3em] text-myth-accent/60 font-bold block">
                {story.params.mythology}
              </span>
              <span className="text-myth-accent/30 text-xs">•</span>
              <div className="flex items-center gap-1 bg-myth-accent/5 px-2 py-0.5 rounded text-xs text-myth-accent/80 font-semibold uppercase tracking-wide">
                 {getDurationIcon(story.params.duration)}
                 {getDurationLabel(story.params.duration)}
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-serif font-bold text-myth-accent mb-4 leading-tight">
              {story.title}
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-myth-accent/70 italic mb-4">
               <span>{story.params.characterName}</span>
               <span>•</span>
               <span>{story.params.tone.split(' ')[0]}</span>
            </div>

            {/* THUMBNAIL DISPLAY AREA */}
            {story.thumbnail && (
              <div className="mb-8 flex justify-center">
                 <div className="relative group max-w-md w-full shadow-2xl rounded-lg overflow-hidden border-2 border-myth-accent/30 bg-black/5">
                    <img 
                      src={story.thumbnail} 
                      alt="YouTube Thumbnail" 
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => handleDownloadImage(story.thumbnail!, `${story.title}_thumbnail.png`)}
                        className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                         <IconDownload className="w-4 h-4" />
                         Thumbnail İndir
                      </button>
                    </div>
                 </div>
              </div>
            )}

            {/* CONTROL BAR */}
            <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
              
              {/* Voice Selection */}
              <div className="relative">
                <button
                  onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                  className="p-2.5 rounded-full border border-myth-gold/30 text-myth-accent hover:bg-myth-gold/10 transition-all shadow-sm flex items-center justify-center"
                  title="Ses Seçimi"
                >
                  <IconMic className="w-5 h-5" />
                </button>
                
                {showVoiceMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-100 mb-1">
                      Anlatıcı Sesi
                    </div>
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.label}
                        onClick={() => handleVoiceChange(v.label)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors mb-0.5 ${
                          selectedVoiceLabel === v.label 
                            ? 'bg-myth-accent/10 text-myth-accent font-bold' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{v.label}</span>
                          {selectedVoiceLabel === v.label && <div className="w-1.5 h-1.5 rounded-full bg-myth-accent"></div>}
                        </div>
                        <div className="text-[10px] opacity-70 font-normal">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Play Button */}
              <button
                onClick={handlePlayAudio}
                disabled={isGeneratingAudio}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-bold transition-all border shadow-sm ${
                  isPlaying 
                    ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                    : 'bg-myth-gold/10 text-myth-accent border-myth-gold/30 hover:bg-myth-gold/20 hover:shadow-myth-gold/10'
                }`}
              >
                {isGeneratingAudio ? (
                  <>
                    <IconLoader className="w-4 h-4 animate-spin" />
                    Hazırlanıyor...
                  </>
                ) : isPlaying ? (
                  <>
                    <IconStop className="w-4 h-4 fill-current" />
                    Durdur
                  </>
                ) : (
                  <>
                    <IconVolume className="w-4 h-4" />
                    Seslendir ({selectedVoiceLabel})
                  </>
                )}
              </button>

              {/* Audio Download */}
              <button
                onClick={handleDownloadAudio}
                disabled={isGeneratingAudio}
                title="Ses dosyasını indir"
                className="p-2.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconDownload className="w-5 h-5" />
              </button>

              {/* SRT Download Button - Only visible when audio is ready */}
              {hasAudio && (
                <button
                  onClick={handleDownloadSRT}
                  title="SRT Altyazı dosyasını indir"
                  className="p-2.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400 transition-all shadow-sm animate-in fade-in zoom-in duration-300"
                >
                  <IconCaptions className="w-5 h-5" />
                </button>
              )}

              <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block"></div>

              {/* Generate Images Button */}
              <button
                onClick={handleGenerateImages}
                disabled={isGeneratingImages || (story.images && story.images.length > 0)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-bold transition-all border shadow-sm ${
                   (story.images && story.images.length > 0)
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-default'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:shadow-indigo-100'
                }`}
              >
                 {isGeneratingImages ? (
                    <>
                       <IconLoader className="w-4 h-4 animate-spin" />
                       Çiziliyor...
                    </>
                 ) : (story.images && story.images.length > 0) ? (
                    <>
                       <IconImage className="w-4 h-4" />
                       Görseller Hazır
                    </>
                 ) : (
                    <>
                       <IconImage className="w-4 h-4" />
                       10 Görsel Oluştur
                    </>
                 )}
              </button>

              {/* Thumbnail Generator Button */}
              <div className="relative">
                <button
                  onClick={() => setShowThumbnailMenu(!showThumbnailMenu)}
                  disabled={isGeneratingThumbnail}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-bold transition-all border shadow-sm ${
                    story.thumbnail 
                      ? 'bg-purple-100 text-purple-700 border-purple-200' 
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  {isGeneratingThumbnail ? (
                    <>
                      <IconLoader className="w-4 h-4 animate-spin" />
                      Tasarlanıyor...
                    </>
                  ) : (
                    <>
                      <IconPalette className="w-4 h-4" />
                      Thumbnail Tasarla
                    </>
                  )}
                </button>

                {/* Thumbnail Dropdown Menu */}
                {showThumbnailMenu && !isGeneratingThumbnail && (
                   <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-20 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                      <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Format Seç</div>
                      <button 
                        onClick={() => handleGenerateThumbnail('landscape')}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors text-left"
                      >
                        <IconLayout className="w-4 h-4 rotate-90" />
                        <span>Yatay (16:9)</span>
                      </button>
                      <button 
                        onClick={() => handleGenerateThumbnail('portrait')}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors text-left"
                      >
                        <IconLayout className="w-4 h-4" />
                        <span>Dikey (9:16)</span>
                      </button>
                   </div>
                )}
              </div>
            </div>
          </div>

          <article className="prose prose-slate prose-lg max-w-none font-serif text-slate-800 leading-relaxed space-y-4 mb-12">
             <div className="whitespace-pre-wrap">
               {story.content}
             </div>
          </article>

          {/* GALLERY SECTION */}
          {story.images && story.images.length > 0 && (
            <div className="mt-8 border-t border-myth-accent/10 pt-8">
              <h3 className="text-2xl font-serif font-bold text-myth-accent mb-6 flex items-center gap-2">
                 <IconImage className="w-6 h-6" />
                 Efsanevi Sahneler (Shorts Formatı)
              </h3>
              {/* Vertical Grid for Shorts Images (9:16) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 {story.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden shadow-md border border-myth-accent/20 hover:shadow-xl transition-all aspect-[9/16]">
                       <img 
                         src={img} 
                         alt={`Scene ${idx + 1}`} 
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                       />
                       
                       {/* Overlay with Download Button */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <button
                            onClick={() => handleDownloadImage(img, `${story.params.characterName}_sahne_${idx + 1}.png`)}
                            title="Görseli İndir"
                            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-slate-800 hover:bg-white hover:text-indigo-600 transition-colors shadow-lg"
                          >
                             <IconDownload className="w-4 h-4" />
                          </button>
                          <span className="text-white text-xs font-serif font-bold">Sahne {idx + 1}</span>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-myth-accent/10 flex justify-between items-center text-myth-accent/50 text-xs">
            <span>Mythos Weaver AI tarafından oluşturuldu</span>
            <span>{story.createdAt.toLocaleDateString('tr-TR')}</span>
          </div>
       </div>
    </div>
  );
}