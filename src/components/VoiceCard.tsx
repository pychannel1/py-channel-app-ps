// src/components/VoiceCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { playInstantVoicePreview } from '../utils/audioPlayer';

interface VoiceCardProps {
  id: string;
  name: string;
  gender: 'male' | 'female';
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  sampleText?: string;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  id,
  name,
  gender,
  index,
  isSelected,
  onSelect,
  sampleText,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const controllerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
      }
    };
  }, []);

  const handlePreview = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPlaying) {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const controller = await playInstantVoicePreview(index, sampleText, () => {
      setIsPlaying(false);
      controllerRef.current = null;
    });
    controllerRef.current = controller;
  };

  return (
    <div
      onClick={() => onSelect(id)}
      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/20'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
            #{index + 1}
          </span>
          <div>
            <h4 className="text-sm font-medium text-zinc-100 font-burmese">{name}</h4>
            <p className="text-xs text-zinc-400 capitalize">{gender === 'male' ? 'အမျိုးသား' : 'အမျိုးသမီး'}</p>
          </div>
        </div>

        {/* စမ်းနားထောင်မည် ခလုတ် */}
        <button
          type="button"
          onClick={handlePreview}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium font-burmese flex items-center gap-1.5 transition-all cursor-pointer ${
            isPlaying
              ? 'bg-purple-600 text-white scale-95 ring-2 ring-purple-400 animate-pulse'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:scale-95'
          }`}
        >
          <span>{isPlaying ? '■ ရပ်မည်' : '▶ စမ်းနားထောင်မည်'}</span>
        </button>
      </div>
    </div>
  );
};

