import { GameState } from '../../contracts/provider';
import { GameSessionTracker } from '../gameSessionTracker';

describe('GameSessionTracker', () => {
  test('starts idle when no game is active', () => {
    const tracker = new GameSessionTracker('riot');

    const snapshot = tracker.update({ gameState: GameState.NotActive, gameTime: null });

    expect(snapshot.state).toBe('idle');
    expect(snapshot.gameTime).toBeNull();
  });

  test('keeps loading separate from live time', () => {
    const tracker = new GameSessionTracker('riot');

    const snapshot = tracker.update({ gameState: GameState.Loading, gameTime: null });

    expect(snapshot.state).toBe('loading');
    expect(snapshot.gameTime).toBeNull();
  });

  test('tracks live game time when the clock advances', () => {
    const tracker = new GameSessionTracker('riot');

    const first = tracker.update({ gameState: GameState.InGame, gameTime: 120 });
    const second = tracker.update({ gameState: GameState.InGame, gameTime: 121 });

    expect(first.state).toBe('live');
    expect(second.state).toBe('live');
    expect(second.gameTime).toBe(121);
    expect(second.isClockAdvancing).toBe(true);
  });

  test('marks stalled after repeated equal game time ticks', () => {
    const tracker = new GameSessionTracker('riot');

    tracker.update({ gameState: GameState.InGame, gameTime: 120 });
    tracker.update({ gameState: GameState.InGame, gameTime: 120 });
    tracker.update({ gameState: GameState.InGame, gameTime: 120 });
    const stalled = tracker.update({ gameState: GameState.InGame, gameTime: 120 });

    expect(stalled.state).toBe('stalled');
    expect(stalled.gameTime).toBe(120);
    expect(stalled.isClockAdvancing).toBe(false);
  });

  test('uses reconnecting when live API loses game time', () => {
    const tracker = new GameSessionTracker('riot');

    tracker.update({ gameState: GameState.InGame, gameTime: 220 });
    const snapshot = tracker.update({ gameState: GameState.InGame, gameTime: null });

    expect(snapshot.state).toBe('reconnecting');
    expect(snapshot.gameTime).toBe(220);
  });

  test('uses demo state for mock provider gameplay', () => {
    const tracker = new GameSessionTracker('mock');

    const snapshot = tracker.update({ gameState: GameState.InGame, gameTime: 30 });

    expect(snapshot.state).toBe('demo');
  });

  test('emits ended once after an active session becomes inactive', () => {
    const tracker = new GameSessionTracker('riot');

    tracker.update({ gameState: GameState.InGame, gameTime: 300 });
    const ended = tracker.update({ gameState: GameState.NotActive, gameTime: null });
    const idle = tracker.update({ gameState: GameState.NotActive, gameTime: null });

    expect(ended.state).toBe('ended');
    expect(idle.state).toBe('idle');
  });
});
