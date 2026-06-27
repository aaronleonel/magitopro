import { Tile, TileType } from '../types';

export const MAP_SIZE = 96; // 96x96 grid - expanded map!
export const TILE_SIZE = 32; // each tile is 32x32 pixels
export const WORLD_SIZE = MAP_SIZE * TILE_SIZE; // 3072x3072 pixels

/**
 * Generates a 96x96 tilemap using deterministic procedural generation with 5 distinct biomes.
 * Ensures safe starting locations for player and NPCs.
 */
export function generateWorldMap(): Tile[][] {
  const map: Tile[][] = [];

  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      // Procedural noise approximation using sine waves of different frequencies
      const elevation = 
        Math.sin(x * 0.15) * Math.cos(y * 0.15) * 0.6 +
        Math.sin(x * 0.05) * 0.3 +
        Math.cos(y * 0.05) * 0.1;

      let type: TileType = 'grass';
      let isObstacle = false;

      // Biome distribution by region
      if (y < 25) {
        // --- 1. NORTHERN TUNDRA (SNOW & ICE) ---
        type = 'snow';
        if (elevation < -0.2) {
          type = 'ice'; // Frozen lakes are safe to walk but look like ice
        } else if (elevation > 0.3) {
          type = 'tree'; // Snowy pine trees
          isObstacle = true;
        } else {
          // Check for random rocks or sparse pine trees
          const chance = Math.sin(x * 0.8) * Math.cos(y * 0.8);
          if (chance > 0.7) {
            type = 'tree';
            isObstacle = true;
          } else if (chance < -0.8) {
            type = 'rock';
            isObstacle = true;
          }
        }
      } else if (y > 70) {
        // --- 2. SOUTHERN VOLCANIC WASTES (LAVA & SCORCH) ---
        type = 'scorch';
        if (elevation < -0.1) {
          type = 'lava'; // Magma streams are obstacles
          isObstacle = true;
        } else {
          // Check for volcanic obsidian rocks
          const chance = Math.sin(x * 0.7) * Math.cos(y * 0.7);
          if (chance > 0.65) {
            type = 'rock';
            isObstacle = true;
          }
        }
      } else if (x > 72) {
        // --- 3. EASTERN ANCIENT RUINS (BRICK & RUINS WALL) ---
        type = 'brick';
        // Construct wall patterns procedurally using grid lines or divisions
        const isWallPattern = (x % 6 === 0 || y % 6 === 0) && (x % 6 !== 2 && y % 6 !== 2);
        if (isWallPattern && elevation > -0.2) {
          type = 'ruins_wall';
          isObstacle = true;
        }
      } else if (x < 22) {
        // --- 4. WESTERN SWAMP (MUD & SWAMP WATER) ---
        type = 'dirt'; // muddy soil
        if (elevation < -0.05) {
          type = 'water'; // Swamp lakes/rivers
          isObstacle = true;
        } else if (elevation > 0.25) {
          type = 'tree'; // Cypress/swamp trees
          isObstacle = true;
        }
      } else {
        // --- 5. CENTRAL TEMPERATE FOREST (GRASS, SAND, WATER) ---
        // Classify tile type by elevation
        if (elevation < -0.3) {
          type = 'water';
          isObstacle = true;
        } else if (elevation < -0.2) {
          type = 'sand';
        } else if (elevation < 0.25) {
          type = 'grass';
          const obstacleChance = Math.sin(x * 0.9) * Math.cos(y * 0.9);
          if (obstacleChance > 0.75) {
            type = 'tree';
            isObstacle = true;
          } else if (obstacleChance < -0.85) {
            type = 'rock';
            isObstacle = true;
          }
        } else {
          type = 'grass';
          const obstacleChance = Math.cos(x * 0.4) * Math.sin(y * 0.4);
          if (obstacleChance > 0.4) {
            type = 'tree';
            isObstacle = true;
          } else if (obstacleChance < -0.5) {
            type = 'rock';
            isObstacle = true;
          }
        }
      }

      // Procedural roads/dirt paths connecting everything
      // Main crossroads centered on the starting area (32, 32) extending outwards
      const isPath = Math.abs(x - 32) < 2 || Math.abs(y - 32) < 2;
      const isPathVariant = Math.sin(x * 0.3) * Math.cos(y * 0.3) > 0.45;
      
      // Paths should not cut through lava or ruins walls to maintain layout logic,
      // but let dirt roads connect through central and swamp/snow zones
      if (isPath && type !== 'water' && type !== 'lava' && type !== 'ruins_wall') {
        type = 'dirt';
        isObstacle = false; // paths are always walkable
      } else if (isPathVariant && type === 'grass') {
        type = 'dirt';
      }

      row.push({ type, isObstacle });
    }
    map.push(row);
  }

  // Ensure safe starting area for player at the center (32, 32) and surrounding area
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const tx = 32 + dx;
      const ty = 32 + dy;
      if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
        // Force grass or dirt path, no obstacles
        map[ty][tx].type = (dx === 0 || dy === 0) ? 'dirt' : 'grass';
        map[ty][tx].isObstacle = false;
      }
    }
  }

  // Ensure safe spots for designated NPC locations
  // NPC 1 at (30, 32), NPC 2 at (34, 30), NPC 3 at (32, 28)
  const safeNPCs = [
    { x: 30, y: 32 },
    { x: 34, y: 30 },
    { x: 32, y: 28 },
  ];

  safeNPCs.forEach(npc => {
    map[npc.y][npc.x].type = 'grass';
    map[npc.y][npc.x].isObstacle = false;
  });

  return map;
}

/**
 * Checks if a specific pixel coordinate collides with the map boundaries or obstacles.
 * Returns true if there is a collision.
 * @param px Player coordinate X
 * @param py Player coordinate Y
 * @param size Player size in pixels
 * @param map Generated world map
 */
export function checkCollision(
  px: number,
  py: number,
  size: number,
  map: Tile[][]
): boolean {
  // Map boundaries check
  if (px < 0 || px + size > WORLD_SIZE || py < 0 || py + size > WORLD_SIZE) {
    return true;
  }

  // Calculate bounding box corner coordinates in grid indices
  const left = Math.floor(px / TILE_SIZE);
  const right = Math.floor((px + size - 1) / TILE_SIZE);
  const top = Math.floor(py / TILE_SIZE);
  const bottom = Math.floor((py + size - 1) / TILE_SIZE);

  // Check all tiles intersected by the bounding box
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (y >= 0 && y < MAP_SIZE && x >= 0 && x < MAP_SIZE) {
        if (map[y][x].isObstacle) {
          return true;
        }
      } else {
        return true; // outside grid bounds
      }
    }
  }

  return false;
}
