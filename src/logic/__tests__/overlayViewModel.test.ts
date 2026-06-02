import { GameState } from '../../contracts/provider';
import { createOverlayViewModel } from '../overlayViewModel';

describe('createOverlayViewModel', () => {
  test('uses idle mode outside a game', () => {
    const vm = createOverlayViewModel({ gameState: GameState.NotActive });

    expect(vm.mode).toBe('idle');
    expect(vm.showWave).toBe(false);
    expect(vm.statusText).toBe('Aguardando partida');
  });

  test('uses loading mode while the game is loading', () => {
    const vm = createOverlayViewModel({
      gameState: GameState.Loading
    });

    expect(vm.mode).toBe('loading');
    expect(vm.showEnemies).toBe(false);
    expect(vm.showRisk).toBe(false);
  });

  test('uses compact mode for low risk gameplay', () => {
    const vm = createOverlayViewModel({
      gameState: GameState.InGame,
      gameTime: 120,
      gankRisk: 'low',
      sessionState: 'demo'
    });

    expect(vm.mode).toBe('compact');
    expect(vm.riskLabel).toBe('Baixo');
    expect(vm.statusText).toBe('Demo offline');
    expect(vm.showWave).toBe(true);
  });

  test('uses alert mode for high risk gameplay', () => {
    const vm = createOverlayViewModel({
      gameState: GameState.InGame,
      gameTime: 180,
      gankRisk: 'high',
      gankHypothesis: 'JG em bot jungle. bot avancada. Gank provavel em bot.'
    });

    expect(vm.mode).toBe('alert');
    expect(vm.riskClass).toBe('perigo');
    expect(vm.showDetails).toBe(true);
  });

  test('maps API errors to error mode', () => {
    const vm = createOverlayViewModel({
      error: 'ECONNREFUSED',
      errorType: 'connect_refused'
    });

    expect(vm.mode).toBe('error');
    expect(vm.statusText).toBe('API offline');
  });
});
