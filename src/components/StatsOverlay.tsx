import React from 'react';
import { Shield, Sparkles, Heart, Zap, Award } from 'lucide-react';

interface StatsOverlayProps {
  displayName: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  exp: number;
}

export default function StatsOverlay({
  displayName,
  hp,
  maxHp,
  mana,
  maxMana,
  level,
  exp,
}: StatsOverlayProps) {
  const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const manaPercentage = Math.max(0, Math.min(100, (mana / maxMana) * 100));
  const expPercentage = Math.max(0, Math.min(100, (exp / 100) * 100)); // EXP max 100 for level up

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-slate-900/90 backdrop-blur-md p-2 sm:p-4 rounded-xl border border-slate-700/60 shadow-2xl w-[150px] sm:w-[260px] text-white">
      {/* Player Header */}
      <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3 border-b border-slate-700/50 pb-1 sm:pb-2">
        <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-lg flex items-center justify-center font-bold text-xs sm:text-lg border border-slate-600 shadow-md flex-shrink-0">
          {level}
        </div>
        <div className="min-w-0 flex-grow">
          <h2 className="font-semibold text-[10px] sm:text-sm tracking-wide text-slate-100 truncate">
            {displayName || 'Héroe Anónimo'}
          </h2>
          <div className="flex items-center gap-1 text-[8px] sm:text-xs text-slate-400">
            <Award className="w-2 sm:w-3.5 h-2 sm:h-3.5 text-amber-400" />
            <span>Nivel {level}</span>
          </div>
        </div>
      </div>

      {/* Stats Bars */}
      <div className="space-y-1.5 sm:space-y-3">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-[8px] sm:text-xs font-medium mb-0.5 sm:mb-1 px-0.5">
            <span className="flex items-center gap-0.5 sm:gap-1 text-rose-400">
              <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-rose-400" /> HP
            </span>
            <span className="text-slate-300 font-mono text-[8px] sm:text-xs">
              {hp} / {maxHp}
            </span>
          </div>
          <div className="w-full h-2 sm:h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Mana Bar */}
        <div>
          <div className="flex justify-between text-[8px] sm:text-xs font-medium mb-0.5 sm:mb-1 px-0.5">
            <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-400">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-cyan-400" /> MANÁ
            </span>
            <span className="text-slate-300 font-mono text-[8px] sm:text-xs">
              {mana} / {maxMana}
            </span>
          </div>
          <div className="w-full h-2 sm:h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              style={{ width: `${manaPercentage}%` }}
            />
          </div>
        </div>

        {/* Exp Bar */}
        <div>
          <div className="flex justify-between text-[7px] sm:text-[10px] font-medium mb-0.5 px-0.5 text-slate-400">
            <span className="flex items-center gap-0.5">
              <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-indigo-400" /> EXP
            </span>
            <span className="font-mono">{exp}%</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${expPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Basic Controls instructions */}
      <div className="hidden sm:flex mt-4 pt-2.5 border-t border-slate-700/30 flex-col gap-1.5 text-[11px] text-slate-400 font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">Mover:</span>
          <span className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">W, A, S, D / 🠹🠸🠺🠻</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Interactuar:</span>
          <span className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Presionar [E]</span>
        </div>
      </div>
    </div>
  );
}
