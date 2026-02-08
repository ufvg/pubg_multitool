export const MAP_DATA: Record<string, number> = {
  "Erangel": 8000,
  "Miramar": 8000,
  "Taego": 8000,
  "Deston": 8000,
  "Rondo": 8000,
  "Vikendi": 8000,  // Fixed: 8x8, not 6x6
  "Sanhok": 4000,
  "Paramo": 3000,
  "Karakin": 2000
};

// Map Images - Using official PUBG API assets from GitHub
const GITHUB_MAPS_BASE = "https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps";
// High Res images are stored in Git LFS, so we need to use the raw/media redirector
const GITHUB_MAPS_HIGH_RES_BASE = "https://github.com/pubg/api-assets/raw/master/Assets/Maps";

export const MAP_IMAGES: Record<string, string> = {
  "Erangel": `${GITHUB_MAPS_BASE}/Erangel_Main_Low_Res.png`,
  "Miramar": `${GITHUB_MAPS_BASE}/Miramar_Main_Low_Res.png`,
  "Taego": `${GITHUB_MAPS_BASE}/Taego_Main_Low_Res.png`,
  "Deston": `${GITHUB_MAPS_BASE}/Deston_Main_Low_Res.png`,
  "Rondo": `${GITHUB_MAPS_BASE}/Rondo_Main_Low_Res.png`,
  "Vikendi": `${GITHUB_MAPS_BASE}/Vikendi_Main_Low_Res.png`,
  "Sanhok": `${GITHUB_MAPS_BASE}/Sanhok_Main_Low_Res.png`,
  "Paramo": `${GITHUB_MAPS_BASE}/Paramo_Main_Low_Res.png`,
  "Karakin": `${GITHUB_MAPS_BASE}/Karakin_Main_Low_Res.png`
};

export const MAP_IMAGES_HIGH_RES: Record<string, string> = {
  "Erangel": `${GITHUB_MAPS_HIGH_RES_BASE}/Erangel_Main_High_Res.png`,
  "Miramar": `${GITHUB_MAPS_HIGH_RES_BASE}/Miramar_Main_High_Res.png`,
  "Taego": `${GITHUB_MAPS_HIGH_RES_BASE}/Taego_Main_High_Res.png`,
  "Deston": `${GITHUB_MAPS_HIGH_RES_BASE}/Deston_Main_High_Res.png`,
  "Rondo": `${GITHUB_MAPS_HIGH_RES_BASE}/Rondo_Main_High_Res.png`,
  "Vikendi": `${GITHUB_MAPS_HIGH_RES_BASE}/Vikendi_Main_High_Res.png`,
  "Sanhok": `${GITHUB_MAPS_HIGH_RES_BASE}/Sanhok_Main_High_Res.png`,
  "Paramo": `${GITHUB_MAPS_HIGH_RES_BASE}/Paramo_Main_High_Res.png`,
  "Karakin": `${GITHUB_MAPS_HIGH_RES_BASE}/Karakin_Main_High_Res.png`
};



// Map color themes (dominant colors from each map)
export const MAP_THEMES: Record<string, { primary: string; secondary: string; accent: string; text: string }> = {
  "Erangel": { primary: '#2d4a3e', secondary: '#1a2f28', accent: '#5c8a6e', text: '#e8f0eb' },
  "Miramar": { primary: '#8b7355', secondary: '#5c4a3a', accent: '#d4a574', text: '#f5efe8' },
  "Taego": { primary: '#4a5d4a', secondary: '#2e3d2e', accent: '#7a9a7a', text: '#e8f0e8' },
  "Deston": { primary: '#3a4a5c', secondary: '#252f3a', accent: '#6a8a9c', text: '#e8eef5' },
  "Rondo": { primary: '#4a4a5c', secondary: '#2e2e3a', accent: '#7a7a9c', text: '#e8e8f5' },
  "Vikendi": { primary: '#6a7a8a', secondary: '#4a5a6a', accent: '#9ab0c0', text: '#f0f5fa' },
  "Sanhok": { primary: '#3a5a3a', secondary: '#1e3a1e', accent: '#5c9a5c', text: '#e8f5e8' },
  "Paramo": { primary: '#5a5a4a', secondary: '#3a3a2e', accent: '#8a8a6a', text: '#f0f0e8' },
  "Karakin": { primary: '#7a6a5a', secondary: '#4a3a2e', accent: '#b09a7a', text: '#f5f0e8' }
};

// Theme types
export type ThemeMode = 'dark' | 'light' | 'map';

// Round distance for display (rounds to 50m for values > 800m)
export const roundDistance = (meters: number): number => {
  if (meters <= 800) return Math.round(meters);
  return Math.round(meters / 50) * 50;
};

// ===========================================
// Jump Distance Rules (meters from target)
// ===========================================

// 8x8 maps: default 800m jump distance (standard dive)
export const JUMP_DISTANCE_8X8 = 800;

// Extended glide distance (when target > 800m from path)
// Use slow glide technique to cover more horizontal distance
export const JUMP_DISTANCE_EXTENDED = 1200;

// Sanhok (4x4): always 1200m with slow glide, then dive at 100m
export const JUMP_DISTANCE_SANHOK = 1200;
export const DIVE_DISTANCE_SANHOK = 100;

// Karakin: 500m jump, fly horizontal, dive at 115m
export const JUMP_DISTANCE_KARAKIN = 500;
export const DIVE_DISTANCE_KARAKIN = 115;

// Other smaller maps (Paramo, Haven)
export const JUMP_DISTANCE_SMALL = 600;

// Default dive distance for all other maps
export const DIVE_DISTANCE_DEFAULT = 120;

// Maximum reachable distance with slow glide
export const MAX_GLIDE_DISTANCE = 1200;

// Special locations with 600m jump distance instead of 800m
// Grid coordinates: Letter = column (x), Number = row (y)
// For 8x8: A-H columns, 1-8 rows. Cell center = (index + 0.5) / 8
// Radius 0.0625 = half a grid cell on 8x8 map (500m)
// Radius 0.0625 = half a grid cell on 8x8 map (500m)
// radiusY is optional, for elliptical zones (e.g. Prison)
export const SPECIAL_LOCATIONS: Record<string, { name: string; x: number; y: number; radius: number; radiusY?: number }[]> = {
  "Erangel": [
    { name: "Stalber", x: 0.6875, y: 0.1875, radius: 0.0625 }, // 2F
    { name: "Prison", x: 0.77, y: 0.52, radius: 0.0625, radiusY: 0.0625 * 0.7 } // Squeezed vertically by 30%
  ],
  "Miramar": [
    { name: "Chumacera", x: 0.3125, y: 0.6875, radius: 0.0625 },  // 6C
    { name: "Power Grid", x: 0.4375, y: 0.4375, radius: 0.0625 }  // D4
  ],
  "Deston": [
    { name: "Turrita", x: 0.3125, y: 0.4375, radius: 0.0625 }     // 4C
  ]
};
export const SPECIAL_JUMP_DISTANCE = 600;

// Get jump distance based on map, destination, and perpendicular distance
export const getJumpDistance = (
  map: string,
  destX?: number,
  destY?: number,
  perpDistanceMeters?: number
): { distance: number; technique: 'STANDARD' | 'SLOW_GLIDE' | 'SANHOK' | 'KARAKIN' | 'SPECIAL' | 'TOO_FAR' } => {

  // Sanhok always uses slow glide technique
  if (map === "Sanhok") {
    return { distance: JUMP_DISTANCE_SANHOK, technique: 'SANHOK' };
  }

  // Karakin: 500m jump, fly horizontal, dive at 115m
  if (map === "Karakin") {
    // If perp distance > 500m, need to handle differently
    if (perpDistanceMeters !== undefined && perpDistanceMeters > JUMP_DISTANCE_KARAKIN) {
      if (perpDistanceMeters > MAX_GLIDE_DISTANCE) {
        return { distance: perpDistanceMeters, technique: 'TOO_FAR' };
      }
      return { distance: perpDistanceMeters, technique: 'SLOW_GLIDE' };
    }
    return { distance: JUMP_DISTANCE_KARAKIN, technique: 'KARAKIN' };
  }

  // Check for special locations
  let isSpecialLocation = false;
  if (destX !== undefined && destY !== undefined && SPECIAL_LOCATIONS[map]) {
    for (const loc of SPECIAL_LOCATIONS[map]) {
      // Check collision with circle or ellipse
      const rx = loc.radius;
      const ry = loc.radiusY || loc.radius;

      // Normalized distance equation: (dx/rx)^2 + (dy/ry)^2 <= 1
      const normalizedDistSq = Math.pow((destX - loc.x) / rx, 2) + Math.pow((destY - loc.y) / ry, 2);

      if (normalizedDistSq <= 1) {
        isSpecialLocation = true;
        break;
      }
    }
  }

  // Special location: 600m rule only applies if perp distance <= 600m
  if (isSpecialLocation && perpDistanceMeters !== undefined) {
    if (perpDistanceMeters <= SPECIAL_JUMP_DISTANCE) {
      return { distance: SPECIAL_JUMP_DISTANCE, technique: 'SPECIAL' };
    }
    // Special location but too far - fall through to normal distance checks
  } else if (isSpecialLocation) {
    // No perp distance info, assume special
    return { distance: SPECIAL_JUMP_DISTANCE, technique: 'SPECIAL' };
  }

  const mapSize = MAP_DATA[map];

  // 8x8 maps logic
  if (mapSize >= 8000) {
    if (perpDistanceMeters !== undefined) {
      if (perpDistanceMeters > MAX_GLIDE_DISTANCE) {
        return { distance: perpDistanceMeters, technique: 'TOO_FAR' };
      }
      if (perpDistanceMeters > JUMP_DISTANCE_8X8) {
        return { distance: perpDistanceMeters, technique: 'SLOW_GLIDE' };
      }
    }
    return { distance: JUMP_DISTANCE_8X8, technique: 'STANDARD' };
  }

  // Smaller maps (Paramo, Haven)
  if (perpDistanceMeters !== undefined) {
    if (perpDistanceMeters > MAX_GLIDE_DISTANCE) {
      return { distance: perpDistanceMeters, technique: 'TOO_FAR' };
    }
    if (perpDistanceMeters > JUMP_DISTANCE_SMALL) {
      return { distance: perpDistanceMeters, technique: 'SLOW_GLIDE' };
    }
  }
  return { distance: JUMP_DISTANCE_SMALL, technique: 'STANDARD' };
};

// Helper: Get green zone (fly) distance for visualization
export const getFlyDistance = (map: string): number => {
  switch (map) {
    case "Karakin": return 500;
    case "Paramo": return 600;
    case "Sanhok": return 1200; // Sanhok uses extended glide by default for coverage
    default: return 800;
  }
};

// Colors - Matching neumorphic design palette
export const COLORS = {
  PLANE_PATH: '#60a5fa', // Blue-400 (softer)
  DESTINATION: '#f87171', // Red-400
  JUMP_POINT: '#34d399', // Emerald-400
  DIVE_POINT: '#fbbf24', // Amber-400
  SPECIAL_ZONE: '#f59e0b', // Amber-500
  TEXT: '#f1f5f9', // Slate-100
  GRID_MAJOR: 'rgba(255, 255, 255, 0.15)',
  GRID_MINOR: 'rgba(255, 255, 255, 0.05)',
  RANGE_FILL: 'rgba(52, 211, 153, 0.08)', // Emerald with low opacity
  RANGE_STROKE: 'rgba(52, 211, 153, 0.25)'
};
