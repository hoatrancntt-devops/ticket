import React from 'react';
import { AVAILABLE_VOICES, VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect }) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Chọn Giọng Đọc</label>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {AVAILABLE_VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all duration-200 group
              ${selectedVoice === voice.id 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-750'}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold ${selectedVoice === voice.id ? 'text-blue-400' : 'text-slate-200'}`}>
                {voice.name}
              </span>
              {selectedVoice === voice.id && (
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
              )}
            </div>
            <div className="text-xs text-slate-500 mb-1">{voice.gender === 'Male' ? 'Nam' : 'Nữ'}</div>
            <div className="text-xs text-slate-400 line-clamp-1">{voice.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};