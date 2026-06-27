/**
 * Types and interfaces for the Top-down Pixel RPG.
 */

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'potion' | 'key_item' | 'shield' | 'material';
  description: string;
  spriteColor: string;
  quantity: number;
}

export interface PlayerState {
  userId: string;
  displayName: string;
  posX: number; // in-game pixel or tile position
  posY: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  exp: number;
  interactedNPCs: string[];
  inventory: InventoryItem[];
  updatedAt?: string;
}

export type TileType = 'grass' | 'dirt' | 'water' | 'tree' | 'rock' | 'sand' | 'snow' | 'ice' | 'lava' | 'scorch' | 'brick' | 'ruins_wall';

export interface Tile {
  type: TileType;
  isObstacle: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface NPC {
  id: string;
  name: string;
  tileX: number; // position in grid coordinates
  tileY: number;
  spriteColor: string; // color of the NPC sprite
  dialogues: string[];
  role: string;
}

export interface Enemy {
  id: string;
  name: string;
  x: number; // pixel X
  y: number; // pixel Y
  hp: number;
  maxHp: number;
  type: 'slime' | 'skeleton' | 'goblin' | 'demon' | 'golem';
  color: string;
  speed: number;
  damage: number;
  lastAttackTime: number;
  isDefeated: boolean;
  level: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
