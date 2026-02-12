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
