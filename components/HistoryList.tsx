import React from 'react';
import { GeneratedStory } from '../types';
import { IconBook, IconChevronRight, IconTrash } from './Icons';

interface HistoryListProps {
  stories: GeneratedStory[];
  onSelect: (story: GeneratedStory) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  currentStoryId?: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({ stories, onSelect, onDelete, currentStoryId }) => {
  if (stories.length === 0) return null;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 sticky top-6">
      <h3 className="text-lg font-serif font-bold text-slate-300 mb-4 flex items-center gap-2 px-2">
        <IconBook className="w-5 h-5 text-myth-gold" />
        Kütüphane
      </h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => onSelect(story)}
            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
              currentStoryId === story.id
                ? 'bg-slate-800 border-myth-gold/50 shadow-md'
                : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
            }`}
          >
            <div className="flex-1 min-w-0 mr-3">
              <h4 className={`text-sm font-bold truncate ${currentStoryId === story.id ? 'text-myth-gold' : 'text-slate-300 group-hover:text-slate-200'}`}>
                {story.title}
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {story.params.characterName} - {story.params.mythology}
              </p>
            </div>
            
            <button
              onClick={(e) => onDelete(story.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
              title="Sil"
            >
              <IconTrash className="w-4 h-4" />
            </button>
            
            {currentStoryId === story.id && (
               <IconChevronRight className="w-4 h-4 text-myth-gold ml-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};