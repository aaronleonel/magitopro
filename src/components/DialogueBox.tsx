import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, ArrowRight, User } from 'lucide-react';

interface DialogueBoxProps {
  npcName: string;
  npcRole: string;
  dialogueText: string;
  onNext: () => void;
  isLast: boolean;
}

export default function DialogueBox({
  npcName,
  npcRole,
  dialogueText,
  onNext,
  isLast,
}: DialogueBoxProps) {
  return (
    <div className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 w-[95%] sm:w-full sm:max-w-2xl px-2 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-slate-900/95 backdrop-blur-md border border-amber-600/85 rounded-xl p-3 sm:p-5 shadow-[0_0_30px_rgba(0,0,0,0.6)] text-white relative overflow-hidden"
      >
        {/* Aesthetic Pixelated Borders Corner Accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-amber-500/60" />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500/60" />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 bg-amber-500/60" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500/60" />

        <div className="flex gap-2.5 sm:gap-4">
          {/* NPC Profile Avatar Box */}
          <div className="flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-amber-400">
            <User className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>

          <div className="flex-grow min-w-0">
            {/* NPC Identity Row */}
            <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
              <span className="font-bold text-xs sm:text-base text-amber-400 tracking-wide">
                {npcName}
              </span>
              <span className="text-[9px] sm:text-xs text-slate-400 uppercase font-mono tracking-wider">
                [{npcRole}]
              </span>
            </div>

            {/* Dialogue DialogueText */}
            <p className="text-slate-200 text-[11px] sm:text-sm md:text-base leading-relaxed tracking-wide select-none">
              {dialogueText}
            </p>
          </div>
        </div>

        {/* Action Button Indicator */}
        <div className="mt-2.5 sm:mt-4 flex justify-end items-center gap-2 border-t border-slate-800 pt-2 sm:pt-3">
          <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono hidden sm:inline">
            Presiona <span className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">[E]</span> o haz clic para continuar
          </span>
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] sm:text-xs rounded shadow-md transition-all duration-150"
          >
            <span>{isLast ? 'Cerrar' : 'Siguiente'}</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
