import { GameUpdatePayload } from '../contracts/ipc';
import { GameState } from '../contracts/provider';

export type OverlayMode = 'idle' | 'loading' | 'compact' | 'alert' | 'error';

export interface OverlayViewModel {
  mode: OverlayMode;
  statusText: string;
  riskLabel: string;
  riskClass: 'seguro' | 'atencao' | 'perigo';
  reason: string;
  showWave: boolean;
  showRisk: boolean;
  showEnemies: boolean;
  showDetails: boolean;
}

export function createOverlayViewModel(payload: GameUpdatePayload): OverlayViewModel {
  if (payload.error) {
    return {
      mode: 'error',
      statusText: getErrorStatus(payload.errorType),
      riskLabel: 'Offline',
      riskClass: 'atencao',
      reason: '',
      showWave: false,
      showRisk: false,
      showEnemies: false,
      showDetails: false
    };
  }

  if (payload.gameState === GameState.Loading) {
    return {
      mode: 'loading',
      statusText: 'Detectando partida',
      riskLabel: 'Loading',
      riskClass: 'seguro',
      reason: payload.gankHypothesis || '',
      showWave: false,
      showRisk: false,
      showEnemies: (payload.players || []).length > 0,
      showDetails: false
    };
  }

  if (payload.gameState !== GameState.InGame) {
    return {
      mode: 'idle',
      statusText: 'Aguardando partida',
      riskLabel: 'Idle',
      riskClass: 'seguro',
      reason: '',
      showWave: false,
      showRisk: false,
      showEnemies: false,
      showDetails: false
    };
  }

  const riskClass = payload.gankRisk === 'high'
    ? 'perigo'
    : payload.gankRisk === 'medium' ? 'atencao' : 'seguro';
  const mode = payload.gankRisk === 'high' ? 'alert' : 'compact';

  return {
    mode,
    statusText: getSessionStatus(payload),
    riskLabel: riskClass === 'perigo' ? 'Alto' : riskClass === 'atencao' ? 'Medio' : 'Safe',
    riskClass,
    reason: compactReason(payload.gankHypothesis || ''),
    showWave: payload.gameTime !== null && payload.gameTime !== undefined,
    showRisk: true,
    showEnemies: (payload.players || []).length > 0,
    showDetails: mode === 'alert'
  };
}

function getSessionStatus(payload: GameUpdatePayload): string {
  if (payload.sessionState === 'demo') return 'Demo offline';
  if (payload.sessionState === 'stalled') return 'Tempo pausado';
  if (payload.sessionState === 'reconnecting') return 'Reconectando';
  return '';
}

function getErrorStatus(errorType?: string | null): string {
  if (errorType === 'connect_refused') return 'API offline';
  if (errorType === 'timeout') return 'Timeout API';
  if (errorType === 'not_found') return 'Aguardando partida';
  return 'Erro de telemetria';
}

function compactReason(reason: string): string {
  if (reason.length <= 72) return reason;
  return `${reason.slice(0, 69).trim()}...`;
}
