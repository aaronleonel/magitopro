import React, { useRef, useEffect, useState } from 'react';
import { Tile, PlayerState, NPC, InventoryItem, Enemy } from '../types';
import { MAP_SIZE, TILE_SIZE, WORLD_SIZE, checkCollision } from '../utils/mapGenerator';
import { Sparkles, Trophy, BookOpen, Volume2, VolumeX, Backpack, X, Shield, Sword, Heart, Key, Star, HelpCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface GameBoardProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  map: Tile[][];
  onInteractNPC: (npc: NPC) => void;
  onCloseDialogue: () => void;
  activeDialogueNPCId: string | null;
}

// Defining static NPCs in the world
export const WORLD_NPCS: NPC[] = [
  {
    id: 'npc_eldrin',
    name: 'Eldrin',
    role: 'Mago Sabio',
    tileX: 30,
    tileY: 32,
    spriteColor: '#a855f7', // purple wizard
    dialogues: [
      '¡Saludos, viajero del gran valle! He estado observando las corrientes de maná últimamente...',
      'Las ruinas antiguas al norte contienen grandes secretos, pero el agua que nos rodea es traicionera.',
      'Si exploras el mundo y recolectas los cristales de luz azul, ganarás experiencia y podrás subir de nivel.',
      '¡Que la sabiduría de las estrellas guíe tu camino en este vasto mundo abierto!',
    ],
  },
  {
    id: 'npc_garrick',
    name: 'Garrick',
    role: 'Herrero Real',
    tileX: 34,
    tileY: 30,
    spriteColor: '#f97316', // orange blacksmith
    dialogues: [
      '¿Qué tal, forastero? Mi fragua siempre está ardiendo, pero hoy me faltan materiales.',
      'Si buscas mejorar tu vitalidad (HP), recuerda mantenerte a salvo de los obstáculos del terreno.',
      'Veo que llevas un espíritu aventurero. Si alguna vez te sientes cansado, acércate a mí o a Eldrin.',
      '¡Un buen acero requiere paciencia y fuego ardiente, igual que tu viaje!',
    ],
  },
  {
    id: 'npc_lyra',
    name: 'Lyra',
    role: 'Exploradora de Fronteras',
    tileX: 32,
    tileY: 28,
    spriteColor: '#22c55e', // green explorer
    dialogues: [
      '¡Hola! Acabo de regresar de cartografiar las zonas costeras orientales.',
      'El mapa que ves en la esquina superior derecha te muestra en tiempo real dónde te encuentras.',
      'Hay cristales de luz esparcidos por el mapa. Al tocarlos, restaurarán tu energía mágica.',
      '¡Sigue explorando! No hay mejor sensación que descubrir tierras desconocidas.',
    ],
  },
];

// Interactive collectable crystals
interface Crystal {
  id: string;
  gridX: number;
  gridY: number;
  type: 'health' | 'mana' | 'exp';
  collected: boolean;
  color: string;
}

export interface MapItem {
  id: string;
  name: string;
  type: 'weapon' | 'potion' | 'key_item' | 'shield' | 'material';
  description: string;
  gridX: number;
  gridY: number;
  collected: boolean;
  spriteColor: string;
}

const SHINY_TEMPLATES: Omit<MapItem, 'id' | 'gridX' | 'gridY' | 'collected'>[] = [
  { name: 'Espada de Madera', type: 'weapon', description: 'Una espada simple pero útil para principiantes.', spriteColor: '#f59e0b' },
  { name: 'Escudo de Hierro', type: 'shield', description: 'Un escudo metálico resistente para defenderte.', spriteColor: '#64748b' },
  { name: 'Poción de Vida', type: 'potion', description: 'Un elixir rojo brillante que cura tus heridas.', spriteColor: '#ef4444' },
  { name: 'Gema Estelar', type: 'key_item', description: 'Una gema cósmica que pulsa con energía misteriosa.', spriteColor: '#ec4899' },
  { name: 'Llave Antigua', type: 'key_item', description: 'Una llave dorada de diseño muy antiguo.', spriteColor: '#eab308' },
  { name: 'Hierba Curativa', type: 'material', description: 'Una planta silvestre con propiedades medicinales.', spriteColor: '#10b981' },
];

export default function GameBoard({
  playerState,
  setPlayerState,
  map,
  onInteractNPC,
  onCloseDialogue,
  activeDialogueNPCId,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Use refs to store player position and speed for high frequency loop (preventing React render lag)
  const playerXRef = useRef<number>(playerState.posX);
  const playerYRef = useRef<number>(playerState.posY);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Crystals collection
  const [crystals, setCrystals] = useState<Crystal[]>([]);
  const crystalsRef = useRef<Crystal[]>([]);

  // Shiny Items collection
  const [shinyItems, setShinyItems] = useState<MapItem[]>([]);
  const shinyItemsRef = useRef<MapItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState<number>(0);

  // Enemies and Combat states
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const [activeAttacks, setActiveAttacks] = useState<{ id: string; x: number; y: number; radius: number; duration: number; maxDuration: number; color: string }[]>([]);
  const activeAttacksRef = useRef<{ id: string; x: number; y: number; radius: number; duration: number; maxDuration: number; color: string }[]>([]);
  const [damageTexts, setDamageTexts] = useState<{ id: string; text: string; x: number; y: number; color: string; duration: number; maxDuration: number }[]>([]);
  const damageTextsRef = useRef<{ id: string; text: string; x: number; y: number; color: string; duration: number; maxDuration: number }[]>([]);
  const lastAttackTimeRef = useRef<number>(0);

  // Sound FX and status effects
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentLog, setRecentLog] = useState<string>('¡Bienvenido al mundo RPG! Explora el mapa.');
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const isMobileSize = window.innerWidth < 768;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobileSize || hasTouch) {
      setShowTouchControls(true);
    }

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Initialize collectable crystals randomly around the map in safe spots
  useEffect(() => {
    const initialCrystals: Crystal[] = [];
    // Deterministic random generation for crystals
    for (let i = 0; i < 35; i++) {
      // Pick coordinates away from the center to encourage exploration
      const gridX = Math.floor(10 + ((i * 17) % (MAP_SIZE - 20)));
      const gridY = Math.floor(10 + ((i * 23) % (MAP_SIZE - 20)));
      
      // Avoid placing inside obstacles or player starting zone (32, 32)
      if (
        map[gridY] && map[gridY][gridX] &&
        !map[gridY][gridX].isObstacle &&
        Math.abs(gridX - 32) > 3 &&
        Math.abs(gridY - 32) > 3
      ) {
        const types: ('health' | 'mana' | 'exp')[] = ['health', 'mana', 'exp'];
        const type = types[i % 3];
        let color = '#22c55e'; // green hp
        if (type === 'mana') color = '#06b6d4'; // cyan mana
        if (type === 'exp') color = '#a855f7'; // purple exp

        initialCrystals.push({
          id: `crystal_${i}`,
          gridX,
          gridY,
          type,
          collected: false,
          color,
        });
      }
    }
    setCrystals(initialCrystals);
    crystalsRef.current = initialCrystals;
  }, [map]);

  // Initialize collectable shiny items randomly around the map in safe spots
  useEffect(() => {
    const initialItems: MapItem[] = [];
    // Deterministic random generation for shiny items
    for (let i = 0; i < 20; i++) {
      // Pick coordinates away from the center to encourage exploration
      const gridX = Math.floor(12 + ((i * 31) % (MAP_SIZE - 24)));
      const gridY = Math.floor(12 + ((i * 19) % (MAP_SIZE - 24)));
      
      // Avoid placing inside obstacles or player starting zone (32, 32)
      if (
        map[gridY] && map[gridY][gridX] &&
        !map[gridY][gridX].isObstacle &&
        Math.abs(gridX - 32) > 3 &&
        Math.abs(gridY - 32) > 3
      ) {
        const template = SHINY_TEMPLATES[i % SHINY_TEMPLATES.length];
        initialItems.push({
          id: `shiny_${i}`,
          name: template.name,
          type: template.type,
          description: template.description,
          gridX,
          gridY,
          collected: false,
          spriteColor: template.spriteColor,
        });
      }
    }
    setShinyItems(initialItems);
    shinyItemsRef.current = initialItems;
  }, [map]);

  // Initialize enemies randomly around the map based on biomes
  useEffect(() => {
    const initialEnemies: Enemy[] = [];
    let enemyCount = 0;

    // Pick 45 spots on the 96x96 map
    for (let i = 0; i < 45; i++) {
      // Procedural position selection spread across the map
      const gridX = Math.floor(10 + ((i * 37) % (MAP_SIZE - 20)));
      const gridY = Math.floor(10 + ((i * 43) % (MAP_SIZE - 20)));

      if (
        map[gridY] && map[gridY][gridX] &&
        !map[gridY][gridX].isObstacle &&
        Math.abs(gridX - 32) > 5 &&
        Math.abs(gridY - 32) > 5
      ) {
        const tileType = map[gridY][gridX].type;
        let type: 'slime' | 'skeleton' | 'goblin' | 'demon' | 'golem' = 'slime';
        let name = 'Slime de Bosque';
        let color = '#10b981'; // green slime
        let hp = 25;
        let speed = 40;
        let damage = 6;
        let level = 1;

        // Custom theme by biome type
        if (tileType === 'snow' || tileType === 'ice') {
          type = 'golem';
          name = 'Gólem Escarchado';
          color = '#38bdf8'; // frozen blue Golem
          hp = 80;
          speed = 25;
          damage = 12;
          level = 3;
        } else if (tileType === 'lava' || tileType === 'scorch') {
          type = 'demon';
          name = 'Demonio del Abismo';
          color = '#f43f5e'; // hellish rose red Demon
          hp = 70;
          speed = 65;
          damage = 18;
          level = 5;
        } else if (tileType === 'brick' || tileType === 'ruins_wall') {
          type = 'skeleton';
          name = 'Esqueleto Guardián';
          color = '#cbd5e1'; // bone slate skeleton
          hp = 45;
          speed = 50;
          damage = 10;
          level = 2;
        } else if (tileType === 'dirt') {
          type = 'goblin';
          name = 'Duende del Pantano';
          color = '#b45309'; // brownish/muddy goblin
          hp = 35;
          speed = 55;
          damage = 8;
          level = 1;
        }

        initialEnemies.push({
          id: `enemy_${enemyCount++}`,
          name,
          x: gridX * TILE_SIZE + 16,
          y: gridY * TILE_SIZE + 16,
          hp,
          maxHp: hp,
          type,
          color,
          speed,
          damage,
          lastAttackTime: 0,
          isDefeated: false,
          level,
        });
      }
    }

    setEnemies(initialEnemies);
    enemiesRef.current = initialEnemies;
  }, [map]);

  // Audio Synthesizer (Web Audio API) for Retro 8-bit sound effects (pure frontend, zero dependencies!)
  const playRetroSound = (type: 'collect' | 'levelUp' | 'interact' | 'step' | 'hit' | 'hurt' | 'defeat' | 'heal') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'collect') {
        // Blip up sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'levelUp') {
        // Arpeggio chime
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.1); // E4
        osc.frequency.setValueAtTime(392.00, ctx.currentTime + 0.2); // G4
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3); // C5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'interact') {
        // High melody ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'hit') {
        // Quick high-pitch slide down swoop (sword swipe / magic blast)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'hurt') {
        // Low crunch sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'defeat') {
        // Sad falling sliding beeps
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'heal') {
        // Fast upward bubble sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch (e) {
      console.warn("Audio Context blocked or not supported:", e);
    }
  };

  const handleTouchStart = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (dir === 'up') {
      keysPressed.current['w'] = true;
      keysPressed.current['arrowup'] = true;
    } else if (dir === 'down') {
      keysPressed.current['s'] = true;
      keysPressed.current['arrowdown'] = true;
    } else if (dir === 'left') {
      keysPressed.current['a'] = true;
      keysPressed.current['arrowleft'] = true;
    } else if (dir === 'right') {
      keysPressed.current['d'] = true;
      keysPressed.current['arrowright'] = true;
    }
  };

  const handleTouchEnd = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (dir === 'up') {
      keysPressed.current['w'] = false;
      keysPressed.current['arrowup'] = false;
    } else if (dir === 'down') {
      keysPressed.current['s'] = false;
      keysPressed.current['arrowdown'] = false;
    } else if (dir === 'left') {
      keysPressed.current['a'] = false;
      keysPressed.current['arrowleft'] = false;
    } else if (dir === 'right') {
      keysPressed.current['d'] = false;
      keysPressed.current['arrowright'] = false;
    }
  };

  const performPlayerAttack = () => {
    // Check attack cooldown
    if (Date.now() - lastAttackTimeRef.current < 300) return; // 300ms cooldown
    lastAttackTimeRef.current = Date.now();

    const pX = playerXRef.current;
    const pY = playerYRef.current;

    // Trigger hit sound
    playRetroSound('hit');

    // Create a beautiful slash/impact visual effect at player's location
    const attackId = `attack_${Date.now()}_${Math.random()}`;
    activeAttacksRef.current.push({
      id: attackId,
      x: pX + 16,
      y: pY + 16,
      radius: 48,
      duration: 0,
      maxDuration: 0.15, // 150ms animation
      color: '#22d3ee' // beautiful magical cyan slash
    });
    setActiveAttacks([...activeAttacksRef.current]);

    // Attack range
    const attackRange = 52;

    // Check collision with all active enemies
    enemiesRef.current.forEach(enemy => {
      if (enemy.isDefeated) return;

      const dist = Math.hypot(pX + 16 - enemy.x, pY + 16 - enemy.y);
      if (dist < attackRange) {
        // Calculate player damage based on level + weapons
        // Base damage is 12 + 4 * level
        const baseDmg = 12 + playerState.level * 4;
        // Check if player has wooden sword/etc in inventory
        const hasSword = playerState.inventory?.some(item => item.type === 'weapon') || false;
        const dmg = hasSword ? Math.round(baseDmg * 1.5) : baseDmg;

        enemy.hp = Math.max(0, enemy.hp - dmg);

        // Add floating damage number over enemy
        damageTextsRef.current.push({
          id: `damage_e_${Date.now()}_${Math.random()}`,
          text: `-${dmg}`,
          x: enemy.x + (Math.random() - 0.5) * 16,
          y: enemy.y - 12,
          color: '#fbbf24', // golden yellow damage color
          duration: 0,
          maxDuration: 0.8
        });

        if (enemy.hp <= 0) {
          enemy.isDefeated = true;
          playRetroSound('defeat');
          // Player gains experience!
          const expGained = enemy.level * 25;
          setRecentLog(`¡Derrotaste a ${enemy.name}! Ganaste +${expGained} EXP.`);

          // Apply exp gain
          setPlayerState(prev => {
            let newExp = prev.exp + expGained;
            let newHp = prev.hp;
            let newMana = prev.mana;
            let newLevel = prev.level;

            if (newExp >= 100) {
              newLevel += 1;
              newExp = newExp % 100;
              newHp = prev.maxHp + 15;
              newMana = prev.maxMana + 10;
              setTimeout(() => playRetroSound('levelUp'), 100);
            }

            return {
              ...prev,
              exp: newExp,
              hp: newHp,
              mana: newMana,
              level: newLevel,
              maxHp: newLevel > prev.level ? prev.maxHp + 15 : prev.maxHp,
              maxMana: newLevel > prev.level ? prev.maxMana + 10 : prev.maxMana,
            };
          });
        }
      }
    });

    // Update enemies list and damage texts
    setEnemies([...enemiesRef.current]);
    setDamageTexts([...damageTextsRef.current]);
  };

  // Synchronize canvas dimensions and input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Handle interaction trigger via 'e'
      if (key === 'e') {
        handleInteractionRequest();
      }

      // Handle inventory toggle via 'i'
      if (key === 'i') {
        setShowInventory(prev => !prev);
      }

      // Handle player attack via Spacebar or 'f'
      if (key === ' ' || key === 'f') {
        performPlayerAttack();
        // Prevent default spacebar scrolling
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerState, activeDialogueNPCId]);

  // Request interaction with the nearest NPC
  const handleInteractionRequest = () => {
    // If dialogue is already open, pressing 'E' closes it or moves to next
    if (activeDialogueNPCId) {
      onCloseDialogue();
      return;
    }

    const playerX = playerXRef.current;
    const playerY = playerYRef.current;

    // Check distance to each NPC
    for (const npc of WORLD_NPCS) {
      const npcRealX = npc.tileX * TILE_SIZE + TILE_SIZE / 2;
      const npcRealY = npc.tileY * TILE_SIZE + TILE_SIZE / 2;

      const dist = Math.hypot(playerX + 12 - npcRealX, playerY + 12 - npcRealY);
      if (dist < 48) {
        // Interact range (1.5 tiles)
        playRetroSound('interact');
        setRecentLog(`Hablando con ${npc.name} el ${npc.role}`);
        onInteractNPC(npc);
        
        // Add NPC to interacted list if not already there, and reward EXP!
        if (!playerState.interactedNPCs.includes(npc.id)) {
          const updatedNPCs = [...playerState.interactedNPCs, npc.id];
          let newExp = playerState.exp + 25;
          let newLevel = playerState.level;
          let message = `¡Hablaste con ${npc.name} y ganaste +25 EXP!`;

          if (newExp >= 100) {
            newLevel += 1;
            newExp = newExp % 100;
            message += ` ¡SUBISTE AL NIVEL ${newLevel}!`;
            playRetroSound('levelUp');
          } else {
            playRetroSound('collect');
          }

          setRecentLog(message);
          setPlayerState(prev => ({
            ...prev,
            interactedNPCs: updatedNPCs,
            exp: newExp,
            level: newLevel,
            maxHp: prev.maxHp + (newLevel > prev.level ? 15 : 0),
            hp: newLevel > prev.level ? prev.maxHp + 15 : prev.hp,
            maxMana: prev.maxMana + (newLevel > prev.level ? 10 : 0),
            mana: newLevel > prev.level ? prev.maxMana + 10 : prev.mana,
          }));
        }
        return;
      }
    }
  };

  // Synchronize coordinates back to React state occasionally (throttle/debounce)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      setPlayerState(prev => ({
        ...prev,
        posX: Math.round(playerXRef.current),
        posY: Math.round(playerYRef.current),
      }));
    }, 1000); // sync coordinates to state every second for auto-saves

    return () => clearInterval(syncInterval);
  }, [setPlayerState]);

  // Main Canvas Render and Update Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // time in seconds
      lastTime = currentTime;

      // 1. UPDATE PLAYER POSITION
      let dx = 0;
      let dy = 0;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

      // Normalize diagonal movement speed
      let speed = 140; // pixels per second
      if (dx !== 0 && dy !== 0) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
      }

      // Check collision and apply movement
      const moveDistanceX = dx * speed * deltaTime;
      const moveDistanceY = dy * speed * deltaTime;

      const playerSize = 24; // bounding box for collisions

      // Try moving along X axis
      if (moveDistanceX !== 0) {
        const nextX = playerXRef.current + moveDistanceX;
        if (!checkCollision(nextX, playerYRef.current, playerSize, map)) {
          playerXRef.current = nextX;
        }
      }

      // Try moving along Y axis
      if (moveDistanceY !== 0) {
        const nextY = playerYRef.current + moveDistanceY;
        if (!checkCollision(playerXRef.current, nextY, playerSize, map)) {
          playerYRef.current = nextY;
        }
      }

      // Check item collections
      const pX = playerXRef.current;
      const pY = playerYRef.current;
      crystalsRef.current.forEach(crystal => {
        if (!crystal.collected) {
          const cRealX = crystal.gridX * TILE_SIZE + TILE_SIZE / 2;
          const cRealY = crystal.gridY * TILE_SIZE + TILE_SIZE / 2;
          const dist = Math.hypot(pX + 12 - cRealX, pY + 12 - cRealY);

          if (dist < 22) {
            crystal.collected = true;
            playRetroSound('collect');

            // Determine log message outside of the state updater
            let logText = '';
            if (crystal.type === 'exp') {
              logText = '¡Recogiste un cristal arcano! +15 EXP';
              // Since the state updates, calculate if level up will happen
              if (playerState.exp + 15 >= 100) {
                logText += ` | ¡SUBISTE AL NIVEL ${playerState.level + 1}!`;
                setTimeout(() => playRetroSound('levelUp'), 100);
              }
            } else if (crystal.type === 'health') {
              logText = '¡Cristal vital recogido! +20 HP';
            } else if (crystal.type === 'mana') {
              logText = '¡Cristal espiritual recogido! +15 Maná';
            }
            setRecentLog(logText);

            // Apply benefits purely
            setPlayerState(prev => {
              let newExp = prev.exp;
              let newHp = prev.hp;
              let newMana = prev.mana;
              let newLevel = prev.level;

              if (crystal.type === 'exp') {
                newExp += 15;
                if (newExp >= 100) {
                  newLevel += 1;
                  newExp = newExp % 100;
                  newHp = prev.maxHp + 15;
                  newMana = prev.maxMana + 10;
                }
              } else if (crystal.type === 'health') {
                newHp = Math.min(prev.maxHp, prev.hp + 20);
              } else if (crystal.type === 'mana') {
                newMana = Math.min(prev.maxMana, prev.mana + 15);
              }

              return {
                ...prev,
                exp: newExp,
                hp: newHp,
                mana: newMana,
                level: newLevel,
                maxHp: newLevel > prev.level ? prev.maxHp + 15 : prev.maxHp,
                maxMana: newLevel > prev.level ? prev.maxMana + 10 : prev.maxMana,
              };
            });

            // Update crystals trigger
            setCrystals([...crystalsRef.current]);
          }
        }
      });

      // Check shiny items collections
      shinyItemsRef.current.forEach(item => {
        if (!item.collected) {
          const iRealX = item.gridX * TILE_SIZE + TILE_SIZE / 2;
          const iRealY = item.gridY * TILE_SIZE + TILE_SIZE / 2;
          const dist = Math.hypot(pX + 12 - iRealX, pY + 12 - iRealY);

          if (dist < 22) {
            item.collected = true;
            playRetroSound('collect');
            setRecentLog(`¡Has recogido: ${item.name}!`);

            setPlayerState(prev => {
              const currentInv = prev.inventory || [];
              const existingItemIndex = currentInv.findIndex(invItem => invItem.name === item.name);
              let newInv = [...currentInv];

              if (existingItemIndex > -1) {
                // Increment quantity
                const existingItem = newInv[existingItemIndex];
                newInv[existingItemIndex] = {
                  ...existingItem,
                  quantity: existingItem.quantity + 1
                };
              } else {
                // Add new item
                newInv.push({
                  id: item.id,
                  name: item.name,
                  type: item.type,
                  description: item.description,
                  spriteColor: item.spriteColor,
                  quantity: 1
                });
              }

              return {
                ...prev,
                inventory: newInv
              };
            });

            // Update shiny items trigger
            setShinyItems([...shinyItemsRef.current]);
          }
        }
      });

      // Update active attacks animation duration
      activeAttacksRef.current.forEach(attack => {
        attack.duration += deltaTime;
      });
      activeAttacksRef.current = activeAttacksRef.current.filter(attack => attack.duration < attack.maxDuration);

      // Update damage text animation duration
      damageTextsRef.current.forEach(dmg => {
        dmg.duration += deltaTime;
      });
      damageTextsRef.current = damageTextsRef.current.filter(dmg => dmg.duration < dmg.maxDuration);

      // Update Enemies positions and tackle combat collision
      enemiesRef.current.forEach(enemy => {
        if (enemy.isDefeated) return;

        const eX = enemy.x;
        const eY = enemy.y;
        
        // Calculate distance to player
        const distToPlayer = Math.hypot(pX - eX, pY - eY);

        if (distToPlayer < 220) {
          // Move towards player
          const angle = Math.atan2(pY - eY, pX - eX);
          const enemyMoveX = Math.cos(angle) * enemy.speed * deltaTime;
          const enemyMoveY = Math.sin(angle) * enemy.speed * deltaTime;

          // Check collisions with map obstacles
          const nextEnemyX = eX + enemyMoveX;
          const nextEnemyY = eY + enemyMoveY;

          if (!checkCollision(nextEnemyX, eY, 20, map)) {
            enemy.x = nextEnemyX;
          }
          if (!checkCollision(eX, nextEnemyY, 20, map)) {
            enemy.y = nextEnemyY;
          }
          
          // Player damage logic on collision
          if (distToPlayer < 24) {
            const now = Date.now();
            if (now - enemy.lastAttackTime > 1200) { // 1.2 second attack cooldown
              enemy.lastAttackTime = now;
              playRetroSound('hurt');
              
              // Apply damage
              setPlayerState(prev => {
                const nextHp = Math.max(0, prev.hp - enemy.damage);
                if (nextHp <= 0) {
                  // Respawn / Reset player to safe center and heal
                  setTimeout(() => {
                    playerXRef.current = 1008; // Start pixel near (32, 32)
                    playerYRef.current = 1008;
                    setPlayerState(p => ({ ...p, hp: p.maxHp }));
                    setRecentLog('¡Fuiste derrotado! Reapareces curado en el centro.');
                    playRetroSound('levelUp');
                  }, 500);
                  return { ...prev, hp: 0 };
                }
                return { ...prev, hp: nextHp };
              });

              // Add floating damage number over player
              damageTextsRef.current.push({
                id: `damage_p_${now}_${Math.random()}`,
                text: `-${enemy.damage}`,
                x: pX + 12 + (Math.random() - 0.5) * 16,
                y: pY - 8,
                color: '#f87171', // soft red
                duration: 0,
                maxDuration: 1.0
              });

              setRecentLog(`¡El ${enemy.name} te atacó y te quitó ${enemy.damage} HP!`);
            }
          }
        } else {
          // Wander around starting position/random walk a bit to look alive
          if (Math.random() < 0.02) {
            const wanderAngle = Math.random() * Math.PI * 2;
            const wx = Math.cos(wanderAngle) * 8;
            const wy = Math.sin(wanderAngle) * 8;
            if (!checkCollision(eX + wx, eY + wy, 20, map)) {
              enemy.x += wx;
              enemy.y += wy;
            }
          }
        }
      });

      // 2. RENDER THE GAME SCENE
      // Clear viewport
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera positioning - Center on player
      const cameraX = Math.max(0, Math.min(WORLD_SIZE - canvas.width, pX + playerSize / 2 - canvas.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD_SIZE - canvas.height, pY + playerSize / 2 - canvas.height / 2));

      // Draw Tiles in Viewport
      const startTileX = Math.max(0, Math.floor(cameraX / TILE_SIZE));
      const endTileX = Math.min(MAP_SIZE, Math.ceil((cameraX + canvas.width) / TILE_SIZE));
      const startTileY = Math.max(0, Math.floor(cameraY / TILE_SIZE));
      const endTileY = Math.min(MAP_SIZE, Math.ceil((cameraY + canvas.height) / TILE_SIZE));

      // Oscillations for animated biomes (water flow)
      const waterOscillation = Math.sin(currentTime * 0.003) * 6;

      for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
          const tile = map[y][x];
          const rx = x * TILE_SIZE - cameraX;
          const ry = y * TILE_SIZE - cameraY;

          // Render Tile Background
          if (tile.type === 'grass') {
            ctx.fillStyle = '#22c55e'; // Grass green
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Little grass blades
            ctx.fillStyle = '#16a34a';
            if ((x + y) % 3 === 0) {
              ctx.fillRect(rx + 8, ry + 12, 2, 4);
              ctx.fillRect(rx + 22, ry + 20, 2, 4);
            }
          } else if (tile.type === 'dirt') {
            ctx.fillStyle = '#b45309'; // Warm brown dirt
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Dirt details
            ctx.fillStyle = '#78350f';
            if ((x * y) % 5 === 0) {
              ctx.fillRect(rx + 16, ry + 8, 3, 2);
              ctx.fillRect(rx + 4, ry + 20, 2, 2);
            }
          } else if (tile.type === 'water') {
            // Animate water colors slightly
            const waterColorVal = Math.floor(190 + waterOscillation);
            ctx.fillStyle = `rgb(29, 78, ${waterColorVal})`; // Dynamic deep ocean blue
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Wave ripples
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            if ((x + y) % 4 === 0) {
              ctx.fillRect(rx + ((currentTime * 0.02 + x * 5) % TILE_SIZE), ry + 14, 8, 2);
            }
          } else if (tile.type === 'sand') {
            ctx.fillStyle = '#fef08a'; // Sandy yellow beach
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Sand ripples
            ctx.fillStyle = '#facc15';
            if ((x + y) % 4 === 1) {
              ctx.fillRect(rx + 10, ry + 16, 4, 1);
              ctx.fillRect(rx + 24, ry + 8, 4, 1);
            }
          } else if (tile.type === 'tree') {
            // Background grass
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

            // Draw a modular beautiful Pixel Art Tree stump and green leaves
            // Trunk
            ctx.fillStyle = '#78350f';
            ctx.fillRect(rx + 12, ry + 18, 8, 14);
            // Foliage
            ctx.fillStyle = '#15803d'; // dark foliage
            ctx.fillRect(rx + 4, ry + 4, 24, 16);
            ctx.fillStyle = '#166534'; // darker shadow
            ctx.fillRect(rx + 20, ry + 10, 8, 10);
            ctx.fillStyle = '#22c55e'; // bright highlight
            ctx.fillRect(rx + 8, ry + 2, 10, 6);
          } else if (tile.type === 'rock') {
            // Background grass
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

            // Draw boulder rock with reflections
            ctx.fillStyle = '#64748b'; // slate gray
            ctx.fillRect(rx + 6, ry + 8, 20, 18);
            ctx.fillStyle = '#475569'; // dark shadow
            ctx.fillRect(rx + 14, ry + 14, 12, 12);
            ctx.fillStyle = '#94a3b8'; // light shine
            ctx.fillRect(rx + 8, ry + 10, 6, 4);
          } else if (tile.type === 'snow') {
            ctx.fillStyle = '#f8fafc'; // Soft pure white snow
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Snowy sparkles
            ctx.fillStyle = '#e2e8f0';
            if ((x * y) % 4 === 0) {
              ctx.fillRect(rx + 14, ry + 10, 2, 2);
              ctx.fillRect(rx + 24, ry + 24, 2, 2);
            }
          } else if (tile.type === 'ice') {
            ctx.fillStyle = '#93c5fd'; // Pale blue ice
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Glacial cracks
            ctx.strokeStyle = '#ffffff88';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx + 4, ry + 4);
            ctx.lineTo(rx + 14, ry + 18);
            ctx.lineTo(rx + 28, ry + 22);
            ctx.stroke();
          } else if (tile.type === 'lava') {
            // Pulsing bright orange lava with heat ripples
            const pulse = Math.floor(180 + Math.sin(currentTime * 0.005 + x) * 25);
            ctx.fillStyle = `rgb(${pulse}, 60, 10)`; 
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Magma crust ripples
            ctx.fillStyle = '#7c2d12';
            if ((x + y) % 3 === 0) {
              ctx.fillRect(rx + 6, ry + 10, 10, 3);
            }
            ctx.fillStyle = '#fef08a'; // bright hot sparks
            if ((x * y * currentTime) % 500 < 15) {
              ctx.fillRect(rx + 12, ry + 12, 3, 3);
            }
          } else if (tile.type === 'scorch') {
            ctx.fillStyle = '#1e1b4b'; // Deep ash charcoal
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Glowing heat fractures
            ctx.fillStyle = '#ea580c';
            if ((x + y) % 4 === 1) {
              ctx.fillRect(rx + 8, ry + 12, 6, 1.5);
              ctx.fillRect(rx + 20, ry + 22, 1.5, 6);
            }
          } else if (tile.type === 'brick') {
            ctx.fillStyle = '#334155'; // Dark slate bricks
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Brick borders
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
            // Moss spots
            ctx.fillStyle = '#15803d';
            if ((x * y) % 7 === 0) {
              ctx.fillRect(rx + 4, ry + 4, 4, 3);
            }
          } else if (tile.type === 'ruins_wall') {
            // Background brick
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

            // Ancient detailed ruined wall
            ctx.fillStyle = '#475569'; // wall block
            ctx.fillRect(rx + 2, ry + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx + 2, ry + 2, TILE_SIZE - 4, TILE_SIZE - 4);

            // Runic gold vein engravings
            ctx.fillStyle = '#eab308';
            ctx.fillRect(rx + 10, ry + 8, 12, 2);
            ctx.fillRect(rx + 15, ry + 14, 2, 10);
          }
        }
      }

      // Draw Collectable Crystals
      crystalsRef.current.forEach(crystal => {
        if (!crystal.collected) {
          const rx = crystal.gridX * TILE_SIZE + TILE_SIZE / 2 - cameraX;
          const ry = crystal.gridY * TILE_SIZE + TILE_SIZE / 2 - cameraY;

          // Drawing glowing floating diamond crystals
          const bounce = Math.sin(currentTime * 0.008 + crystal.gridX) * 4;
          
          ctx.fillStyle = crystal.color;
          ctx.beginPath();
          ctx.moveTo(rx, ry - 7 + bounce);
          ctx.lineTo(rx + 5, ry + bounce);
          ctx.lineTo(rx, ry + 7 + bounce);
          ctx.lineTo(rx - 5, ry + bounce);
          ctx.closePath();
          ctx.fill();

          // Outer glow
          ctx.fillStyle = crystal.color + '22';
          ctx.beginPath();
          ctx.arc(rx, ry + bounce, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Collectable Shiny Items
      shinyItemsRef.current.forEach(item => {
        if (!item.collected) {
          const rx = item.gridX * TILE_SIZE + TILE_SIZE / 2 - cameraX;
          const ry = item.gridY * TILE_SIZE + TILE_SIZE / 2 - cameraY;

          // Drawing glowing floating round items with stars
          const bounce = Math.sin(currentTime * 0.006 + item.gridY) * 3;
          const scalePulse = 1 + Math.sin(currentTime * 0.01) * 0.15;

          // Draw item base glow
          ctx.fillStyle = item.spriteColor + '22';
          ctx.beginPath();
          ctx.arc(rx, ry + bounce, 12 * scalePulse, 0, Math.PI * 2);
          ctx.fill();

          // Draw item main circle body
          ctx.fillStyle = item.spriteColor;
          ctx.beginPath();
          ctx.arc(rx, ry + bounce, 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw inner bright star/sparkle (cross)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx - 4, ry + bounce);
          ctx.lineTo(rx + 4, ry + bounce);
          ctx.moveTo(rx, ry + bounce - 4);
          ctx.lineTo(rx, ry + bounce + 4);
          ctx.stroke();
        }
      });

      // Draw NPCs
      WORLD_NPCS.forEach(npc => {
        const rx = npc.tileX * TILE_SIZE - cameraX;
        const ry = npc.tileY * TILE_SIZE - cameraY;

        // Dynamic breathing bounce for each NPC based on their tile positions
        const npcBounce = Math.sin(currentTime * 0.004 + npc.tileX) * 1.5;

        // Draw soft shadow under NPC
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(rx + 16, ry + 26, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw NPC base character (robe) with breathing bounce
        ctx.fillStyle = npc.spriteColor;
        ctx.fillRect(rx + 6, ry + 6 + npcBounce, 20, 20 - npcBounce); 

        ctx.fillStyle = '#ffedd5'; // face skin
        ctx.fillRect(rx + 9, ry + 6 + npcBounce, 14, 10);

        ctx.fillStyle = '#0f172a'; // eyes
        ctx.fillRect(rx + 11, ry + 10 + npcBounce, 2, 2);
        ctx.fillRect(rx + 17, ry + 10 + npcBounce, 2, 2);

        // Wizard Hat / Hair / Accents & Unique Items
        if (npc.id === 'npc_eldrin') {
          // Wizard Pointy Hat (bouncing)
          ctx.fillStyle = '#7e22ce';
          ctx.beginPath();
          ctx.moveTo(rx + 16, ry - 3 + npcBounce);
          ctx.lineTo(rx + 24, ry + 6 + npcBounce);
          ctx.lineTo(rx + 8, ry + 6 + npcBounce);
          ctx.closePath();
          ctx.fill();
          // Beard
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(rx + 9, ry + 15 + npcBounce, 14, 10);

          // EXTRA DETAIL: Floating Glowing Spellbook
          const bookBounce = Math.sin(currentTime * 0.003) * 4;
          const bx = rx - 12;
          const by = ry + 8 + bookBounce;
          // Book cover (brown)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx, by, 10, 8);
          // Book pages (glowing neon cyan)
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(bx + 1, by + 1, 8, 5);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx + 2, by + 2, 2, 3);
          ctx.fillRect(bx + 5, by + 2, 2, 3);
          // Spellbook magic glow aura
          ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
          ctx.beginPath();
          ctx.arc(bx + 5, by + 4, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (npc.id === 'npc_garrick') {
          // Blacksmith Hair
          ctx.fillStyle = '#78350f';
          ctx.fillRect(rx + 7, ry + 3 + npcBounce, 18, 4);
          // Apron
          ctx.fillStyle = '#a16207';
          ctx.fillRect(rx + 11, ry + 18 + npcBounce, 10, 10);

          // EXTRA DETAIL: Blacksmith Iron Anvil right next to him
          const ax = rx + 24;
          const ay = ry + 12;
          ctx.fillStyle = '#475569'; // anvil body
          ctx.fillRect(ax, ay + 6, 10, 8);
          ctx.fillRect(ax - 2, ay + 4, 14, 3);
          ctx.fillStyle = '#334155'; // anvil base
          ctx.fillRect(ax + 2, ay + 14, 6, 4);
          ctx.fillStyle = '#f97316'; // glowing hot metal on anvil
          if (Math.sin(currentTime * 0.01) > 0.4) {
            ctx.fillRect(ax + 3, ay + 2, 4, 2);
          }
        } else if (npc.id === 'npc_lyra') {
          // Explorer Hood
          ctx.fillStyle = '#15803d';
          ctx.fillRect(rx + 7, ry + 3 + npcBounce, 18, 4);
          ctx.fillRect(rx + 6, ry + 7 + npcBounce, 3, 12);
          ctx.fillRect(rx + 23, ry + 7 + npcBounce, 3, 12);
          // Backpack strap
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(rx + 12, ry + 16 + npcBounce, 8, 3);

          // EXTRA DETAIL: Rotating explorer compass direction indicator next to her
          const cx = rx - 10;
          const cy = ry + 8 + Math.sin(currentTime * 0.002) * 2;
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Compass needle
          const angle = currentTime * 0.001;
          ctx.strokeStyle = '#ef4444'; // North needle
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
          ctx.stroke();
        }

        // Distance Indicator: Exclamation point/press E bubble above head
        const dist = Math.hypot(pX + 12 - (npc.tileX * TILE_SIZE + TILE_SIZE / 2), pY + 12 - (npc.tileY * TILE_SIZE + TILE_SIZE / 2));
        if (dist < 48) {
          const bounce = Math.sin(currentTime * 0.01) * 3;
          // Render floating "E" dialog bubble
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(rx + 4, ry - 22 + bounce, 24, 16, 4);
          ctx.fill();
          ctx.stroke();

          // Letter E inside
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('[E]', rx + 16, ry - 11 + bounce);
        }
      });

      // Draw Player Character (Wizard/Hero)
      const isMoving = dx !== 0 || dy !== 0;
      // Soft breathing bounce when standing still
      const pBounce = isMoving ? 0 : Math.sin(currentTime * 0.005) * 1.2;

      // Draw soft shadow under Player
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(pX + 16 - cameraX, pY + 26 - cameraY, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Player Base (Robe)
      ctx.fillStyle = '#3b82f6'; // Bright blue robe
      ctx.fillRect(pX + 6 - cameraX, pY + 6 + pBounce - cameraY, 20, 20 - pBounce);

      ctx.fillStyle = '#ffedd5'; // Skin face
      ctx.fillRect(pX + 9 - cameraX, pY + 5 + pBounce - cameraY, 14, 10);

      // Player Eyes looking in direction of movement
      ctx.fillStyle = '#0f172a';
      let eyeOffsetX = 0;
      if (dx > 0) eyeOffsetX = 2;
      if (dx < 0) eyeOffsetX = -2;
      ctx.fillRect(pX + 11 + eyeOffsetX - cameraX, pY + 9 + pBounce - cameraY, 2, 2);
      ctx.fillRect(pX + 17 + eyeOffsetX - cameraX, pY + 9 + pBounce - cameraY, 2, 2);

      // Red Hero Cap/Crest
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(pX + 7 - cameraX, pY + 1 + pBounce - cameraY, 18, 4);
      ctx.fillRect(pX + 13 - cameraX, pY - 2 + pBounce - cameraY, 6, 4);

      // Staff/Sword in hand (glowing magical staff!)
      ctx.fillStyle = '#92400e'; // wooden staff
      ctx.fillRect(pX + 23 - cameraX, pY + 6 + pBounce - cameraY, 3, 16);
      ctx.fillStyle = '#06b6d4'; // staff blue crystal tip
      ctx.fillRect(pX + 22 - cameraX, pY + 2 + pBounce - cameraY, 5, 4);
      
      // Staff glow pulsating dynamically
      const staffPulse = 6 + Math.sin(currentTime * 0.01) * 2;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(pX + 24 - cameraX, pY + 4 + pBounce - cameraY, staffPulse, 0, Math.PI * 2);
      ctx.fill();

      // EXTRA DETAIL: Glowing Fairy Companion floating around the player
      const fairyAngle = currentTime * 0.0025;
      const fairyX = pX + 16 + Math.cos(fairyAngle) * 22 - cameraX;
      const fairyY = pY + 8 + Math.sin(fairyAngle * 1.5) * 14 - cameraY;
      // Aura
      ctx.fillStyle = 'rgba(236, 72, 153, 0.22)';
      ctx.beginPath();
      ctx.arc(fairyX, fairyY, 7, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(fairyX, fairyY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fairyX, fairyY, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Foot movement animations
      const legWave = isMoving ? Math.sin(currentTime * 0.015) * 3 : 0;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pX + 8 - cameraX, pY + 25 + legWave - cameraY, 5, 4);
      ctx.fillRect(pX + 18 - cameraX, pY + 25 - legWave - cameraY, 5, 4);

      // Draw Enemies
      enemiesRef.current.forEach(enemy => {
        if (enemy.isDefeated) return;

        const rx = enemy.x - cameraX;
        const ry = enemy.y - cameraY;

        // Bouncing/wobble animation for living entities
        const eBounce = Math.sin(currentTime * 0.006 + enemy.x) * 2;
        
        // 1. Draw small shadow under enemy
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(rx, ry + 12, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw enemy bodies with unique styles based on type
        if (enemy.type === 'slime') {
          // Bouncy slime blob
          const squish = 1 + Math.sin(currentTime * 0.01) * 0.1;
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.ellipse(rx, ry + eBounce, 12 * squish, 10 / squish, 0, 0, Math.PI * 2);
          ctx.fill();

          // Slimy eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 4, ry - 2 + eBounce, 2, 2);
          ctx.fillRect(rx + 2, ry - 2 + eBounce, 2, 2);
          
          // Smile
          ctx.strokeStyle = '#065f46';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rx, ry + 1 + eBounce, 3, 0, Math.PI);
          ctx.stroke();

        } else if (enemy.type === 'skeleton') {
          // Skeletal torso and head
          ctx.fillStyle = enemy.color;
          // Skull
          ctx.fillRect(rx - 6, ry - 12 + eBounce, 12, 10);
          // Ribs
          ctx.fillRect(rx - 4, ry + 1 + eBounce, 8, 2);
          ctx.fillRect(rx - 4, ry + 5 + eBounce, 8, 2);
          ctx.fillRect(rx - 1, ry - 2 + eBounce, 2, 11); // spine

          // Glowing evil red eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(rx - 3, ry - 9 + eBounce, 2, 2);
          ctx.fillRect(rx + 1, ry - 9 + eBounce, 2, 2);

        } else if (enemy.type === 'goblin') {
          // Greenish goblin with pointy ears
          ctx.fillStyle = enemy.color;
          // Body / Shirt
          ctx.fillRect(rx - 6, ry - 2 + eBounce, 12, 12);
          // Head
          ctx.fillRect(rx - 5, ry - 10 + eBounce, 10, 8);
          // Pointy ears
          ctx.beginPath();
          ctx.moveTo(rx - 5, ry - 8 + eBounce);
          ctx.lineTo(rx - 10, ry - 6 + eBounce);
          ctx.lineTo(rx - 5, ry - 4 + eBounce);
          ctx.moveTo(rx + 5, ry - 8 + eBounce);
          ctx.lineTo(rx + 10, ry - 6 + eBounce);
          ctx.lineTo(rx + 5, ry - 4 + eBounce);
          ctx.closePath();
          ctx.fill();

          // Yellow glint eyes
          ctx.fillStyle = '#facc15';
          ctx.fillRect(rx - 3, ry - 7 + eBounce, 1.5, 1.5);
          ctx.fillRect(rx + 1.5, ry - 7 + eBounce, 1.5, 1.5);

        } else if (enemy.type === 'golem') {
          // Sturdy heavy stone golem
          ctx.fillStyle = enemy.color;
          // Large heavy body
          ctx.fillRect(rx - 12, ry - 14 + eBounce * 0.5, 24, 22);
          // Left and right heavy shoulder guards
          ctx.fillStyle = '#475569';
          ctx.fillRect(rx - 16, ry - 16 + eBounce * 0.5, 6, 12);
          ctx.fillRect(rx + 10, ry - 16 + eBounce * 0.5, 6, 12);

          // Magical core glowing line on golem
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(rx - 8, ry - 6 + eBounce * 0.5, 16, 2);

        } else if (enemy.type === 'demon') {
          // Impish floating fire demon
          ctx.fillStyle = enemy.color;
          // Winged / Horned appearance
          ctx.beginPath();
          ctx.moveTo(rx, ry - 12 + eBounce);
          ctx.lineTo(rx - 8, ry - 18 + eBounce); // Left Horn
          ctx.lineTo(rx - 3, ry - 8 + eBounce);
          ctx.lineTo(rx + 3, ry - 8 + eBounce);
          ctx.lineTo(rx + 8, ry - 18 + eBounce); // Right Horn
          ctx.lineTo(rx, ry - 12 + eBounce);
          ctx.closePath();
          ctx.fill();

          // Main torso
          ctx.fillRect(rx - 8, ry - 8 + eBounce, 16, 16);

          // Glowing yellow/orange eyes
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(rx - 4, ry - 5 + eBounce, 2, 2);
          ctx.fillRect(rx + 2, ry - 5 + eBounce, 2, 2);

          // Fire wings
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(rx - 14, ry - 4 + eBounce, 6, 4);
          ctx.fillRect(rx + 8, ry - 4 + eBounce, 6, 4);
        }

        // 3. Draw Enemy Health Bar (so users see feedback during attacks)
        if (enemy.hp < enemy.maxHp) {
          const barWidth = 24;
          const barHeight = 4;
          const bx = rx - barWidth / 2;
          const by = ry - 18 + eBounce;

          // Black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);
          
          // Red background
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(bx, by, barWidth, barHeight);

          // Green fill based on health ratio
          const ratio = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(bx, by, barWidth * ratio, barHeight);
        }
      });

      // Update and Draw Active Attacks (e.g. Slash visual effect)
      activeAttacksRef.current.forEach((attack) => {
        const rx = attack.x - cameraX;
        const ry = attack.y - cameraY;
        const progress = attack.duration / attack.maxDuration;
        const currentRadius = attack.radius * progress;

        // Draw a neat expanding glowing arc/ring
        ctx.strokeStyle = attack.color;
        ctx.lineWidth = 3 * (1 - progress);
        ctx.shadowColor = attack.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(rx, ry, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow
      });

      // Update and Draw Floating Damage/Info Texts
      damageTextsRef.current.forEach((dmg) => {
        const rx = dmg.x - cameraX;
        // Float upwards
        const ry = dmg.y - (dmg.duration * 30) - cameraY;
        const progress = dmg.duration / dmg.maxDuration;
        const opacity = 1 - progress;

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = dmg.color;
        ctx.globalAlpha = opacity;
        
        // Shadow for high contrast
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        ctx.fillText(dmg.text, rx, ry);
        
        // Reset canvas context config
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      // 3. RENDER THE MINIMAP OVERLAY
      const minimap = minimapRef.current;
      if (minimap) {
        const mCtx = minimap.getContext('2d');
        if (mCtx) {
          mCtx.fillStyle = '#0f172a';
          mCtx.fillRect(0, 0, minimap.width, minimap.height);

          const scale = minimap.width / MAP_SIZE; // 128 / 64 = 2 pixels per tile

          for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
              const tile = map[y][x];
              if (tile.type === 'water') {
                mCtx.fillStyle = '#1d4ed8';
              } else if (tile.type === 'sand') {
                mCtx.fillStyle = '#fef08a';
              } else if (tile.type === 'dirt') {
                mCtx.fillStyle = '#b45309';
              } else if (tile.type === 'tree') {
                mCtx.fillStyle = '#15803d';
              } else if (tile.type === 'rock') {
                mCtx.fillStyle = '#64748b';
              } else if (tile.type === 'snow') {
                mCtx.fillStyle = '#f8fafc';
              } else if (tile.type === 'ice') {
                mCtx.fillStyle = '#93c5fd';
              } else if (tile.type === 'lava') {
                mCtx.fillStyle = '#ef4444';
              } else if (tile.type === 'scorch') {
                mCtx.fillStyle = '#312e81';
              } else if (tile.type === 'brick') {
                mCtx.fillStyle = '#334155';
              } else if (tile.type === 'ruins_wall') {
                mCtx.fillStyle = '#1e293b';
              } else {
                mCtx.fillStyle = '#22c55e'; // grass
              }
              mCtx.fillRect(x * scale, y * scale, scale, scale);
            }
          }

          // Draw NPCs as tiny yellow boxes
          mCtx.fillStyle = '#eab308';
          WORLD_NPCS.forEach(npc => {
            mCtx.fillRect(npc.tileX * scale - 1, npc.tileY * scale - 1, 3, 3);
          });

          // Draw active crystals as cyan dots
          mCtx.fillStyle = '#06b6d4';
          crystalsRef.current.forEach(crystal => {
            if (!crystal.collected) {
              mCtx.fillRect(crystal.gridX * scale, crystal.gridY * scale, 2, 2);
            }
          });

          // Draw active shiny items as pink dots
          mCtx.fillStyle = '#ec4899';
          shinyItemsRef.current.forEach(item => {
            if (!item.collected) {
              mCtx.fillRect(item.gridX * scale, item.gridY * scale, 2, 2);
            }
          });

          // Draw Player as blinking red indicator
          const blink = Math.floor(currentTime / 250) % 2 === 0;
          if (blink) {
            mCtx.fillStyle = '#ef4444';
            const mPlayerX = Math.floor(pX / TILE_SIZE);
            const mPlayerY = Math.floor(pY / TILE_SIZE);
            mCtx.fillRect(mPlayerX * scale - 1, mPlayerY * scale - 1, 4, 4);
          }
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [map]);

  return (
    <div className="relative w-full aspect-video md:aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col select-none">
      
      {/* Game Canvas container with pixelated styling */}
      <canvas
        ref={canvasRef}
        width={720}
        height={405}
        id="game-canvas"
        className="w-full h-full object-cover rounded-xl cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
        onMouseDown={performPlayerAttack}
      />

      {/* Minimap Overlay (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="bg-slate-900/95 backdrop-blur-md p-2 rounded-xl border-2 border-slate-700/60 shadow-2xl">
          <canvas
            ref={minimapRef}
            width={128}
            height={128}
            className="rounded border border-slate-800 shadow-inner"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="text-[10px] text-center text-slate-400 mt-1.5 font-mono flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span>Minimapa (96x96)</span>
          </div>
        </div>

        {/* Audio Toggle & Quick Settings */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`px-2.5 py-2 rounded-lg border transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-mono text-xs ${
              showTouchControls 
                ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-400 font-semibold' 
                : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar controles táctiles"
          >
            <span>🎮 {showTouchControls ? 'Táctil' : 'Teclado'}</span>
          </button>
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="px-2.5 py-2 bg-slate-900/90 hover:bg-slate-800/90 rounded-lg border border-slate-700/60 text-slate-300 transition-all shadow-md cursor-pointer flex items-center gap-1.5 font-mono text-xs"
            title="Ver Inventario"
          >
            <Backpack className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Inventario [I]</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-900/90 hover:bg-slate-800/90 rounded-lg border border-slate-700/60 text-slate-300 transition-all shadow-md cursor-pointer"
            title="Toggle SFX"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Floating Status / Quest Log at the bottom */}
      <div className="absolute bottom-4 left-4 z-10 max-w-sm bg-slate-900/90 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-2 shadow-lg">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-bounce" />
        <span className="truncate">{recentLog}</span>
      </div>

      {/* Inventory Modal Overlay */}
      {showInventory && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6 select-none">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl h-[85%] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-800/50 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Backpack className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 tracking-tight text-sm md:text-base">Mochila del Héroe</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Espacio ocupado: {playerState.inventory?.reduce((acc, item) => acc + item.quantity, 0) || 0} objetos</p>
                </div>
              </div>
              <button
                onClick={() => setShowInventory(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left Column: Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(!playerState.inventory || playerState.inventory.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="p-3 bg-slate-800/40 rounded-full text-slate-500">
                      <Backpack className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-300">Tu mochila está vacía</p>
                      <p className="text-xs text-slate-500 max-w-[200px] mx-auto">Busca objetos brillantes con estrellas parpadeantes en el mapa.</p>
                    </div>
                  </div>
                ) : (
                  playerState.inventory.map((item, idx) => {
                    const isSelected = idx === selectedInventoryIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedInventoryIndex(idx)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                            : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: `${item.spriteColor}15`,
                              borderColor: `${item.spriteColor}30`,
                            }}
                          >
                            {item.type === 'weapon' && <Sword className="w-4 h-4" style={{ color: item.spriteColor }} />}
                            {item.type === 'shield' && <Shield className="w-4 h-4" style={{ color: item.spriteColor }} />}
                            {item.type === 'potion' && <Heart className="w-4 h-4" style={{ color: item.spriteColor }} />}
                            {item.type === 'key_item' && (
                              item.name === 'Gema Estelar'
                                ? <Star className="w-4 h-4" style={{ color: item.spriteColor }} />
                                : <Key className="w-4 h-4" style={{ color: item.spriteColor }} />
                            )}
                            {item.type === 'material' && <Sparkles className="w-4 h-4" style={{ color: item.spriteColor }} />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold">{item.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize font-mono">{item.type}</p>
                          </div>
                        </div>
                        <div className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-mono text-[10px] font-bold">
                          x{item.quantity}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Item details */}
              <div className="w-full md:w-64 bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
                {(playerState.inventory && playerState.inventory[selectedInventoryIndex]) ? (
                  <div className="space-y-4">
                    {(() => {
                      const selectedItem = playerState.inventory[selectedInventoryIndex];
                      return (
                        <>
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 animate-pulse"
                              style={{
                                backgroundColor: `${selectedItem.spriteColor}15`,
                                borderColor: `${selectedItem.spriteColor}40`,
                              }}
                            >
                              {selectedItem.type === 'weapon' && <Sword className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />}
                              {selectedItem.type === 'shield' && <Shield className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />}
                              {selectedItem.type === 'potion' && <Heart className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />}
                              {selectedItem.type === 'key_item' && (
                                selectedItem.name === 'Gema Estelar'
                                  ? <Star className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />
                                  : <Key className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />
                              )}
                              {selectedItem.type === 'material' && <Sparkles className="w-8 h-8" style={{ color: selectedItem.spriteColor }} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-100">{selectedItem.name}</h4>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-[9px] font-mono font-bold uppercase tracking-wider text-amber-500">
                                {selectedItem.type}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-slate-800/80 pt-4">
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                              {selectedItem.description}
                            </p>
                          </div>

                          {/* Lore/flavor text based on item type */}
                          <div className="text-[10px] italic text-slate-500 font-mono text-center">
                            {selectedItem.type === 'weapon' && '"Una hoja forjada con determinación para abrir caminos."'}
                            {selectedItem.type === 'shield' && '"Firme muralla de metal, inquebrantable ante la tormenta."'}
                            {selectedItem.type === 'potion' && '"La esencia de la vida fluye cálida en este vial de cristal."'}
                            {selectedItem.type === 'key_item' && '"Sostiene un significado profundo en este mundo milenario."'}
                            {selectedItem.type === 'material' && '"Recurso natural valioso para la alquimia y la herrería."'}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 italic">
                    Selecciona un objeto para ver sus detalles.
                  </div>
                )}

                <div className="border-t border-slate-800/80 pt-3 text-center">
                  <span className="text-[10px] font-mono text-slate-500">Presiona [I] para cerrar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Touch Controls Overlay */}
      {showTouchControls && (
        <>
          {/* Left Side: Virtual D-Pad */}
          <div className="absolute bottom-4 left-4 z-30 flex flex-col items-center gap-1 md:gap-1.5 pointer-events-auto select-none">
            {/* UP button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleTouchStart('up'); }}
              onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('up'); }}
              onPointerLeave={(e) => { e.preventDefault(); handleTouchEnd('up'); }}
              className="w-10 h-10 md:w-14 md:h-14 bg-slate-900/95 border-2 border-slate-700/80 active:bg-cyan-600 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-300 shadow-xl touch-none transition-all active:scale-90"
            >
              <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            
            {/* LEFT / CENTER / RIGHT */}
            <div className="flex gap-1 md:gap-1.5">
              <button
                onPointerDown={(e) => { e.preventDefault(); handleTouchStart('left'); }}
                onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('left'); }}
                onPointerLeave={(e) => { e.preventDefault(); handleTouchEnd('left'); }}
                className="w-10 h-10 md:w-14 md:h-14 bg-slate-900/95 border-2 border-slate-700/80 active:bg-cyan-600 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-300 shadow-xl touch-none transition-all active:scale-90"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              
              {/* Decorative center piece */}
              <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-950/90 border-2 border-slate-800 rounded-xl flex items-center justify-center text-slate-600 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
              </div>

              <button
                onPointerDown={(e) => { e.preventDefault(); handleTouchStart('right'); }}
                onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('right'); }}
                onPointerLeave={(e) => { e.preventDefault(); handleTouchEnd('right'); }}
                className="w-10 h-10 md:w-14 md:h-14 bg-slate-900/95 border-2 border-slate-700/80 active:bg-cyan-600 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-300 shadow-xl touch-none transition-all active:scale-90"
              >
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* DOWN button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleTouchStart('down'); }}
              onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('down'); }}
              onPointerLeave={(e) => { e.preventDefault(); handleTouchEnd('down'); }}
              className="w-10 h-10 md:w-14 md:h-14 bg-slate-900/95 border-2 border-slate-700/80 active:bg-cyan-600 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-300 shadow-xl touch-none transition-all active:scale-90"
            >
              <ArrowDown className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Right Side: Virtual Action Buttons */}
          <div className="absolute bottom-4 right-4 z-30 flex items-end gap-1.5 md:gap-3 pointer-events-auto select-none">
            {/* Interact Button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleInteractionRequest(); }}
              className="w-11 h-11 md:w-15 md:h-15 bg-emerald-950/90 border-2 border-emerald-700/80 active:bg-emerald-600 active:border-emerald-400 rounded-full flex flex-col items-center justify-center text-emerald-200 shadow-lg touch-none transition-all active:scale-90"
            >
              <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              <span className="text-[7px] md:text-[9px] font-mono mt-0.5">Hablar [E]</span>
            </button>

            {/* Bag Button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); setShowInventory(prev => !prev); }}
              className="w-11 h-11 md:w-15 md:h-15 bg-amber-950/90 border-2 border-amber-700/80 active:bg-amber-600 active:border-amber-400 rounded-full flex flex-col items-center justify-center text-amber-200 shadow-lg touch-none transition-all active:scale-90"
            >
              <Backpack className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse" />
              <span className="text-[7px] md:text-[9px] font-mono mt-0.5">Mochila [I]</span>
            </button>

            {/* Attack Button (Large/Primary) */}
            <button
              onPointerDown={(e) => { e.preventDefault(); performPlayerAttack(); }}
              className="w-14 h-14 md:w-20 md:h-20 bg-rose-600/95 border-2 border-rose-400 hover:bg-rose-500 active:bg-rose-400 active:border-rose-300 rounded-full flex flex-col items-center justify-center text-white shadow-2xl touch-none transition-all active:scale-90 relative"
              style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
            >
              <Sword className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse" />
              <span className="text-[8px] md:text-[9px] font-bold tracking-wider font-mono mt-0.5 uppercase text-rose-100">Atacar</span>
            </button>
          </div>
        </>
      )}

      {/* Portrait warning overlay with rotation reminder */}
      {showTouchControls && isPortrait && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 mb-4 animate-bounce">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM3 9l3-3m0 0l3 3M6 6v6" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">Gira tu pantalla</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Para la mejor experiencia de juego RPG, te recomendamos girar tu dispositivo a <strong className="text-cyan-400">modo horizontal (Landscape)</strong>.
          </p>
          <button
            onClick={() => setIsPortrait(false)}
            className="mt-6 px-4 py-2 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl active:bg-slate-800 transition-colors cursor-pointer"
          >
            Ignorar y jugar de todos modos
          </button>
        </div>
      )}
    </div>
  );
}
