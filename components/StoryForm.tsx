import React, { useState } from 'react';
import { StoryParams, StoryTone, StoryDuration } from '../types';
import { IconFeather, IconSparkles, IconWand, IconSmartphone, IconFilm, IconHourglass } from './Icons';
import { getCharacterDetails } from '../services/geminiService';

interface StoryFormProps {
  onSubmit: (params: StoryParams) => void;
  isLoading: boolean;
}

export const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isLoading }) => {
  const [characterName, setCharacterName] = useState('');
  const [mythology, setMythology] = useState('');
  const [traits, setTraits] = useState('');
  const [tone, setTone] = useState<StoryTone>(StoryTone.EPIC);
  const [duration, setDuration] = useState<StoryDuration>(StoryDuration.VIDEO);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onSubmit({
      characterName,
      mythology,
      traits,
      tone,
      duration,
      customPrompt
    });
  };

  const handleAutoFill = async () => {
    if (!characterName.trim()) return;
    
    setIsAutoFilling(true);
    try {
      const details = await getCharacterDetails(characterName);
      setMythology(details.mythology);
      setTraits(details.traits);
    } catch (error) {
      console.error("Otomatik doldurma hatası", error);
    } finally {
      setIsAutoFilling(false);
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
    }
  };

  const getDurationSubLabel = (d: StoryDuration) => {
    switch (d) {
      case StoryDuration.SHORTS: return '30-60sn';
      case StoryDuration.VIDEO: return '4-10dk';
      case StoryDuration.EPIC: return '12dk+';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-2xl relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-myth-gold/10 rounded-full blur-2xl group-hover:bg-myth-gold/20 transition-all duration-700"></div>

      <h2 className="text-2xl font-serif font-bold text-myth-gold mb-6 flex items-center gap-2">
        <IconFeather className="w-6 h-6" />
        Karakterini Yarat
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Karakter Adı</label>
            <div className="relative">
              <input
                type="text"
                required
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Örn: Zeus, Thor"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-white focus:ring-2 focus:ring-myth-gold focus:border-transparent outline-none transition-all placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isAutoFilling || !characterName.trim()}
                title="Sihirli Değnek: Bilgileri Otomatik Doldur"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-myth-gold hover:bg-myth-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <IconWand className={`w-5 h-5 ${isAutoFilling ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Mitoloji / Köken</label>
            <input
              type="text"
              required
              value={mythology}
              onChange={(e) => setMythology(e.target.value)}
              placeholder="Örn: Yunan, İskandinav"
              className={`w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-myth-gold focus:border-transparent outline-none transition-all placeholder-slate-500 ${isAutoFilling ? 'animate-pulse bg-slate-800' : ''}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Karakter Özellikleri</label>
          <input
            type="text"
            required
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            placeholder="Örn: Güçlü, bilge, yıldırımlar..."
            className={`w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-myth-gold focus:border-transparent outline-none transition-all placeholder-slate-500 ${isAutoFilling ? 'animate-pulse bg-slate-800' : ''}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Hikaye Tonu</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.values(StoryTone).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`text-xs px-2 py-2.5 rounded-lg border transition-all duration-200 truncate ${
                    tone === t
                      ? 'bg-myth-gold text-myth-dark border-myth-gold font-bold shadow-lg shadow-myth-gold/20'
                      : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                  title={t}
                >
                  {t.split(' ')[0]} 
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">İçerik Formatı / Süre</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(StoryDuration).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                    duration === d
                      ? 'bg-slate-800 border-myth-gold text-myth-gold shadow-lg shadow-myth-gold/10'
                      : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {getDurationIcon(d)}
                  <span className="text-xs font-bold mt-1">{getDurationLabel(d)}</span>
                  <span className="text-[10px] opacity-70">{getDurationSubLabel(d)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Ekstra Senaryo (Opsiyonel)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Hikayede geçmesini istediğin özel bir olay var mı?"
            rows={3}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-myth-gold focus:border-transparent outline-none transition-all placeholder-slate-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isAutoFilling}
          className={`w-full py-4 rounded-lg font-serif font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
            isLoading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-myth-gold to-yellow-600 text-white hover:to-yellow-500 hover:shadow-myth-gold/30 hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Efsane Yazılıyor...
            </>
          ) : (
            <>
              <IconSparkles className="w-5 h-5" />
              Destanı Oluştur
            </>
          )}
        </button>
      </form>
    </div>
  );
};