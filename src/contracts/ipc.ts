import { Player } from './gameData';
import { LanePressure, Objective, Ward } from './junglerData';
import { GameSessionState } from '../logic/gameSessionTracker';
import { GameState, Telemetry } from './provider';

export type ExternalFetchType = 'json' | 'image' | 'buffer';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface GameUpdatePayload {
  gameState?: GameState;
  sessionState?: GameSessionState;
  isClockAdvancing?: boolean;
  gameTime?: number | null;
  rawGameTime?: number | null;
  waveTime?: string;
  isSiege?: boolean;
  gankRisk?: 'low' | 'medium' | 'high';
  gankHypothesis?: string;
  junglerName?: string;
  players?: Player[];
  wards?: Ward[];
  objectives?: Objective[];
  lanePressures?: LanePressure[];
  telemetry?: {
    wards: Telemetry<Ward[]> | null;
    objectives: Telemetry<Objective[]> | null;
    lanePressures: Telemetry<LanePressure[]> | null;
  };
  error?: string | null;
  errorType?: string | null;
}

export interface ElectronAPI {
  onGameUpdate(callback: (data: GameUpdatePayload) => void): void;
  removeGameUpdate(callback: (data: GameUpdatePayload) => void): void;
  startSimulation(): Promise<void>;
  stopSimulation(): Promise<void>;
  setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void;
  log(message: string): void;
  fetchExternal<T = unknown>(url: string, type: ExternalFetchType): Promise<T>;
  saveWidgetPosition(id: string, pos: WidgetPosition): Promise<void>;
  loadWidgetPositions(): Promise<Record<string, WidgetPosition>>;
}

export interface DataDragonChampion {
  id: string;
  name: string;
  image: {
    full: string;
  };
}

export interface DataDragonChampionResponse {
  data: Record<string, DataDragonChampion>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
