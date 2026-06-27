import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, saveGameProgress, loadGameProgress } from './firebase';
import { PlayerState, NPC } from './types';
import { generateWorldMap } from './utils/mapGenerator';
import GameBoard, { WORLD_NPCS } from './components/GameBoard';
import DialogueBox from './components/DialogueBox';
import StatsOverlay from './components/StatsOverlay';
import AuthScreen from './components/AuthScreen';
import { Gamepad2, Cloud, Save, Sparkles, LogIn, Lock, HelpCircle, Swords, BookOpen, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Default initial state for a new player
const createInitialPlayerState = (userId: string, displayName: string): PlayerState => ({
  userId,
  displayName,
  posX: 1008, // exact starting pixel coordinate near (32, 32)
  posY: 1008,
  hp: 100,
  maxHp: 100,
  mana: 50,
  maxMana: 50,
  level: 1,
  exp: 0,
  interactedNPCs: [],
  inventory: [],
});

export default function App() {
  // Firebase Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Player Game Progress State
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    // Attempt local storage fallback if available on initial load
    const saved = localStorage.getItem('rpg_guest_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          inventory: parsed.inventory || [],
        };
      } catch (e) {
        console.error("Failed to parse local guest save:", e);
      }
    }
    return createInitialPlayerState('guest', 'Invitado');
  });

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCloudSave, setHasCloudSave] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Active dialogue tracker
  const [activeDialogue, setActiveDialogue] = useState<{
    npcId: string;
    dialogueIndex: number;
  } | null>(null);

  // Pre-generate map to avoid re-generating on render
  const worldMap = useMemo(() => generateWorldMap(), []);

  // Monitor Auth State and fetch/sync saves accordingly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load cloud save
        try {
          const cloudSave = await loadGameProgress(firebaseUser.uid);
          if (cloudSave) {
            setHasCloudSave(true);
            setPlayerState(cloudSave);
          } else {
            // No cloud save exists yet, initialize from scratch or sync current local state if they just signed in
            setHasCloudSave(false);
            const localSaveStr = localStorage.getItem('rpg_guest_save');
            let baseState = createInitialPlayerState(firebaseUser.uid, firebaseUser.displayName || 'Jugador Cloud');
            if (localSaveStr) {
              try {
                const localData = JSON.parse(localSaveStr);
                baseState = {
                  ...localData,
                  userId: firebaseUser.uid,
                  displayName: firebaseUser.displayName || 'Jugador Cloud',
                };
              } catch (e) {
                console.error("Error migrating local progress to cloud:", e);
              }
            }
            setPlayerState(baseState);
            // Auto save to cloud right away
            await saveGameProgress(baseState);
            setHasCloudSave(true);
          }
        } catch (err) {
          console.error("Error fetching progress from Firestore:", err);
        }
      } else {
        setUser(null);
        setHasCloudSave(false);
        // Revert to local storage state if guest save exists
        const saved = localStorage.getItem('rpg_guest_save');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setPlayerState({
              ...parsed,
              inventory: parsed.inventory || [],
            });
          } catch (e) {
            setPlayerState(createInitialPlayerState('guest', 'Invitado'));
          }
        } else {
          setPlayerState(createInitialPlayerState('guest', 'Invitado'));
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save guest progress to localStorage automatically when it changes
  useEffect(() => {
    if (!user) {
      localStorage.setItem('rpg_guest_save', JSON.stringify(playerState));
    }
  }, [playerState, user]);

  // Handle Manual Save or Sync
  const handleSaveToCloud = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      await saveGameProgress(playerState);
      setHasCloudSave(true);
      setSaveSuccessMessage('¡Progreso guardado en la nube con éxito!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveSuccessMessage('Error al guardar en la nube.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Load Cloud Save manually
  const handleLoadCloudSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const cloudSave = await loadGameProgress(user.uid);
      if (cloudSave) {
        setPlayerState(cloudSave);
        setSaveSuccessMessage('¡Progreso cargado desde la nube!');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        setIsMenuOpen(false); // Close menu on successful load
      } else {
        setSaveSuccessMessage('No se encontraron datos guardados.');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setSaveSuccessMessage('Error al cargar progreso.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Dialog Interaction handlers
  const handleInteractNPC = useCallback((npc: NPC) => {
    setActiveDialogue({
      npcId: npc.id,
      dialogueIndex: 0,
    });
  }, []);

  const handleNextDialogue = useCallback(() => {
    if (!activeDialogue) return;
    const currentNPC = WORLD_NPCS.find(n => n.id === activeDialogue.npcId);
    if (!currentNPC) return;

    if (activeDialogue.dialogueIndex < currentNPC.dialogues.length - 1) {
      setActiveDialogue(prev => ({
        ...prev!,
        dialogueIndex: prev!.dialogueIndex + 1,
      }));
    } else {
      setActiveDialogue(null);
    }
  }, [activeDialogue]);

  const handleCloseDialogue = useCallback(() => {
    setActiveDialogue(null);
  }, []);

  // Listen for 'E' key or Space key during dialogue to progress dialogue
  useEffect(() => {
    const handleDialogueKeys = (e: KeyboardEvent) => {
      if (!activeDialogue) return;
      if (e.key.toLowerCase() === 'e' || e.key === ' ') {
        e.preventDefault();
        handleNextDialogue();
      }
    };
    window.addEventListener('keydown', handleDialogueKeys);
    return () => window.removeEventListener('keydown', handleDialogueKeys);
  }, [activeDialogue, handleNextDialogue]);

  // Derive active NPC details for the dialogue box overlay
  const activeNPC = useMemo(() => {
    if (!activeDialogue) return null;
    return WORLD_NPCS.find(n => n.id === activeDialogue.npcId) || null;
  }, [activeDialogue]);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,41,59,0.5),rgba(2,6,23,1))] text-slate-100 flex flex-col antialiased">
      
      {/* Immersive Medieval HUD Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Gamepad2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg md:text-xl tracking-tight bg-gradient-to-r from-slate-100 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              Pixel RPG: Mundo Abierto
            </h1>
            <p className="text-[10px] md:text-xs font-mono text-slate-400">
              Desarrollado en React y Firebase Firestore
            </p>
          </div>
        </div>

        {/* Sync / Menu actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400">
              <Cloud className="w-4 h-4 animate-bounce" />
              <span>Autoguardado On</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 bg-amber-950/40 border border-amber-900/50 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-400">
              <span>Sesión Invitado</span>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 font-semibold text-xs transition-all active:translate-y-0.5 shadow-md cursor-pointer"
          >
            {isMenuOpen ? 'Reanudar' : 'Menú & Cuentas'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-6 relative max-w-7xl mx-auto w-full">
        <div className="w-full relative flex flex-col items-center">
          
          {/* Game Canvas Container */}
          <div className="w-full relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40 shadow-2xl">
            {/* Visual HUD overlays inside the Game Board */}
            <AnimatePresence>
              {!isMenuOpen && (
                <>
                  {/* Health/Mana Bars Stats Overlay (Top-Left) */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <StatsOverlay
                      displayName={playerState.displayName}
                      hp={playerState.hp}
                      maxHp={playerState.maxHp}
                      mana={playerState.mana}
                      maxMana={playerState.maxMana}
                      level={playerState.level}
                      exp={playerState.exp}
                    />
                  </motion.div>

                  {/* Active Dialogue Overlays (Bottom-Center) */}
                  {activeDialogue && activeNPC && (
                    <DialogueBox
                      npcName={activeNPC.name}
                      npcRole={activeNPC.role}
                      dialogueText={activeNPC.dialogues[activeDialogue.dialogueIndex]}
                      onNext={handleNextDialogue}
                      isLast={activeDialogue.dialogueIndex === activeNPC.dialogues.length - 1}
                    />
                  )}
                </>
              )}
            </AnimatePresence>

            {/* 2D HTML5 Canvas Component */}
            <GameBoard
              playerState={playerState}
              setPlayerState={setPlayerState}
              map={worldMap}
              onInteractNPC={handleInteractNPC}
              onCloseDialogue={handleCloseDialogue}
              activeDialogueNPCId={activeDialogue ? activeDialogue.npcId : null}
            />

            {/* Save / Save success toasts */}
            {saveSuccessMessage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-slate-900 border-2 border-emerald-500 rounded-xl text-emerald-400 font-bold font-mono text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Interactive Overlay Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 p-2"
                  >
                    
                    {/* Left Panel: Game Legend / Lore */}
                    <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between text-left h-full">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold bg-amber-500/10 px-2 py-1 rounded">
                          RPG DE MUNDO ABIERTO
                        </span>
                        <h3 className="text-xl font-bold mt-3 text-white flex items-center gap-2">
                          <Swords className="w-5 h-5 text-rose-500" /> ¡Comienza tu Aventura!
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Navega en un inmenso mapa 2D compuesto por biomas de praderas, desiertos arenosos, zonas volcánicas y de hielo. ¡Ten cuidado con los enemigos! Ataca pulsando la tecla <strong className="text-cyan-400">Espacio</strong>, la tecla <strong className="text-cyan-400">F</strong> o haciendo <strong className="text-cyan-400">clic</strong> con tu ratón sobre el mapa de juego. Explora el mapa en busca de cristales mágicos para mejorar tus habilidades:
                        </p>

                        <div className="mt-4 space-y-3">
                          <div className="flex gap-3 items-start">
                            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold font-mono">HP</span>
                            <p className="text-xs text-slate-300">
                              <strong className="text-rose-400">Cristales Vitales (Verdes):</strong> Restaura puntos de vida perdidos y mantiene tu salud al máximo.
                            </p>
                          </div>
                          <div className="flex gap-3 items-start">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">MP</span>
                            <p className="text-xs text-slate-300">
                              <strong className="text-cyan-400">Cristales Espirituales (Azul claro):</strong> Restaura maná y energía mágica.
                            </p>
                          </div>
                          <div className="flex gap-3 items-start">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">XP</span>
                            <p className="text-xs text-slate-300">
                              <strong className="text-purple-400">Cristales Arcanos (Púrpura):</strong> Otorga experiencia. ¡Alcanza 100 EXP para subir de nivel y aumentar tus estadísticas de HP/Mana máximos!
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center gap-3 text-slate-400 text-xs">
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>Presiona cualquier tecla de dirección o WASD para comenzar a moverte.</span>
                      </div>
                    </div>

                    {/* Right Panel: Firebase Authentication / Saving Accounts Screen */}
                    <AuthScreen
                      user={user}
                      loading={authLoading}
                      onPlayGuest={() => setIsMenuOpen(false)}
                      onSyncSave={handleSaveToCloud}
                      onLoadCloudSave={handleLoadCloudSave}
                      hasCloudSave={hasCloudSave}
                      isSaving={isSaving}
                      isFirstLoad={authLoading}
                    />

                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Bottom Game stats and info */}
          <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Exploración</span>
              <p className="text-lg font-bold text-white mt-1">64 x 64 Bloques</p>
              <p className="text-xs text-slate-400 mt-1">Un mundo abierto dinámico con 4,096 casillas procedimentales.</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Diálogos y Quests</span>
              <p className="text-lg font-bold text-amber-400 mt-1">3 NPCs Interactivos</p>
              <p className="text-xs text-slate-400 mt-1">Conversa con Eldrin, Garrick y Lyra para aprender de la zona y ganar recompensas.</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Estado de Nube</span>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-sm font-semibold text-white">{user ? 'Google Cloud Sincronizado' : 'Offline / Almacenamiento Local'}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Tu progreso se guarda automáticamente para evitar pérdidas.</p>
            </div>
          </div>

        </div>
      </main>

      {/* Medieval Styled Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span>© 2026 RPG de Mundo Abierto - Pixel Art Canvas Prototype.</span>
        <div className="flex gap-4">
          <span>Licencia: Apache-2.0</span>
          <span>Google AI Studio & Firebase</span>
        </div>
      </footer>

    </div>
  );
}
