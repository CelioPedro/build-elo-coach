import { GameState } from '../contracts/provider';

export type ProviderMode = 'riot' | 'mock';

export type GameSessionState =
  | 'idle'
  | 'loading'
  | 'live'
  | 'stalled'
  | 'reconnecting'
  | 'ended'
  | 'demo';

export interface GameSessionSnapshot {
  state: GameSessionState;
  gameTime: number | null;
  lastValidGameTime: number | null;
  isClockAdvancing: boolean;
  stalledTicks: number;
}

interface GameSessionUpdate {
  gameState: GameState;
  gameTime: number | null;
}

export class GameSessionTracker {
  private lastValidGameTime: number | null = null;
  private lastState: GameSessionState = 'idle';
  private stalledTicks = 0;

  constructor(private readonly providerMode: ProviderMode) {}

  update(update: GameSessionUpdate): GameSessionSnapshot {
    const { gameState, gameTime } = update;

    if (gameState === GameState.NotActive) {
      return this.handleInactiveState();
    }

    if (gameState === GameState.Loading) {
      this.stalledTicks = 0;
      this.lastState = 'loading';
      return this.snapshot('loading', null, false);
    }

    if (gameTime === null) {
      const state = this.lastValidGameTime === null ? 'loading' : 'reconnecting';
      this.lastState = state;
      return this.snapshot(state, this.lastValidGameTime, false);
    }

    const isClockAdvancing = this.lastValidGameTime === null || gameTime > this.lastValidGameTime;

    if (this.lastValidGameTime !== null && gameTime < this.lastValidGameTime) {
      this.lastState = 'reconnecting';
      return this.snapshot('reconnecting', this.lastValidGameTime, false);
    }

    if (isClockAdvancing) {
      this.stalledTicks = 0;
      this.lastValidGameTime = gameTime;
    } else {
      this.stalledTicks += 1;
    }

    const state = this.providerMode === 'mock'
      ? 'demo'
      : this.stalledTicks >= 3 ? 'stalled' : 'live';

    this.lastState = state;
    return this.snapshot(state, this.lastValidGameTime, isClockAdvancing);
  }

  private handleInactiveState(): GameSessionSnapshot {
    const wasActive = this.lastState === 'loading' ||
      this.lastState === 'live' ||
      this.lastState === 'stalled' ||
      this.lastState === 'reconnecting' ||
      this.lastState === 'demo';

    this.stalledTicks = 0;

    if (wasActive) {
      this.lastState = 'ended';
      return this.snapshot('ended', this.lastValidGameTime, false);
    }

    this.lastValidGameTime = null;
    this.lastState = 'idle';
    return this.snapshot('idle', null, false);
  }

  private snapshot(
    state: GameSessionState,
    gameTime: number | null,
    isClockAdvancing: boolean
  ): GameSessionSnapshot {
    return {
      state,
      gameTime,
      lastValidGameTime: this.lastValidGameTime,
      isClockAdvancing,
      stalledTicks: this.stalledTicks
    };
  }
}
