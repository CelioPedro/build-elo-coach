import { Player } from './gameData';
import { LanePressure, Objective, Ward } from './junglerData';

export enum GameState {
  NotActive = 'not_active',
  Loading = 'loading',
  InGame = 'in_game',
}

export type TelemetryStatus = 'available' | 'unavailable' | 'stale' | 'simulated';
export type TelemetrySource = 'live-api' | 'event-api' | 'simulated' | 'manual' | 'inferred';

export interface Telemetry<T> {
  status: TelemetryStatus;
  source: TelemetrySource;
  value: T | null;
  capturedAt: number;
  message?: string;
}

export interface GameDataProvider {
  readonly lastError?: string | null;

  getGameState(): Promise<GameState>;
  getGameTime(): Promise<number | null>;
  getPlayerList(): Promise<Player[]>;
  getJungler(): Promise<Player | null>;
  getJunglerLoading(): Promise<Player | null>;
  getWards(): Promise<Ward[]>;
  getObjectives(): Promise<Objective[]>;
  getLanePressures(): Promise<LanePressure[]>;

  startSimulation?(): void;
  stopSimulation?(): void;
  isSimulationRunning?(): boolean;
}
