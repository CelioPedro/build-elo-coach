export interface Position {
  x: number;
  y: number;
}

export enum MapRegion {
  BASE = 'base',
  TOP_JUNGLE = 'top_jungle',
  MID_JUNGLE = 'mid_jungle',
  BOT_JUNGLE = 'bot_jungle',
  TOP_LANE = 'top_lane',
  MID_LANE = 'mid_lane',
  BOT_LANE = 'bot_lane',
  RIVER = 'river'
}

export enum Lane {
  TOP = 'top',
  MID = 'mid',
  BOT = 'bot'
}

export interface PathingProfile {
  championName: string;
  preferredPath: MapRegion[];
  gankFrequency: number;        // Ganks por minuto
  aggressionLevel: number;      // 1-10
  commonTargets: Lane[];
  averageGankDuration: number;  // Segundos
}

export interface JunglerState {
  championName: string;
  position: Position;
  region: MapRegion;
  lastSeen: number;
  pathingProfile: PathingProfile;
  isVisible: boolean;
}

export interface GankAlert {
  risk: 'low' | 'medium' | 'high';
  targetLane: Lane;
  estimatedTime: number;        // Segundos até o gank
  reason: string;
  timestamp: number;
}

export interface GankHistory {
  timestamp: number;
  lane: Lane;
  success: boolean;
  duration: number;
  position: Position;
}

export enum WardType {
  VISION = 'vision',
  PINK = 'pink'
}

export interface Ward {
  id: string;
  position: Position;
  type: WardType;
  team: 'ORDER' | 'CHAOS';
  placedAt: number;
  duration: number; // seconds
}

export enum ObjectiveType {
  DRAGON = 'dragon',
  BARON = 'baron',
  HERALD = 'herald'
}

export interface Objective {
  type: ObjectiveType;
  alive: boolean;
  killedAt?: number;
  respawnAt?: number;
  position: Position;
}

export interface LanePressure {
  lane: Lane;
  pressure: 'pushing' | 'neutral' | 'receding';
  towerHealth?: number;
  inhibitorAlive?: boolean;
}

export interface GameFactors {
  junglerState: JunglerState | null;
  wards: Ward[];
  objectives: Objective[];
  lanePressures: LanePressure[];
  gameTime: number;
}
