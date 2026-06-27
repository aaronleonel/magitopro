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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-600/80 rounded-xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.6)] text-white relative overflow-hidden"
      >
        {/* Aesthetic Pixelated Borders Corner Accents */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-amber-500/60" />
        <div className="absolute top-1 right-1 w-2 h-2 bg-amber-500/60" />
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-amber-500/60" />
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-amber-500/60" />

        <div className="flex gap-4">
          {/* NPC Profile Avatar Box */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-amber-400">
            <User className="w-6 h-6" />
          </div>

          <div className="flex-grow min-w-0">
            {/* NPC Identity Row */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-bold text-base text-amber-400 tracking-wide">
                {npcName}
              </span>
              <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                [{npcRole}]
              </span>
            </div>

            {/* Dialogue DialogueText */}
            <p className="text-slate-200 text-sm md:text-base leading-relaxed tracking-wide select-none">
              {dialogueText}
            </p>
          </div>
        </div>

        {/* Action Button Indicator */}
        <div className="mt-4 flex justify-end items-center gap-2 border-t border-slate-800 pt-3">
          <span className="text-[10px] text-slate-500 font-mono">
            Presiona <span className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">[E]</span> o haz clic para continuar
          </span>
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded shadow-md transition-all duration-150 transform hover:translate-y-[-1px] active:translate-y-[1px]"
          >
            <span>{isLast ? 'Cerrar' : 'Siguiente'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
