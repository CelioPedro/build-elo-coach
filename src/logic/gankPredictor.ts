import { JunglerState, GankAlert, Lane } from '../contracts/junglerData';

export class GankPredictor {
  private gankHistory: Array<{ timestamp: number; lane: string; success: boolean }> = [];

  /**
   * Prediz probabilidade de gank baseado no estado do jungler
   */
  predictGankProbability(junglerState: JunglerState | null): number {
    if (!junglerState) return 0;

    let probability = 0;

    // Baseado no perfil de pathing do campeão
    probability += junglerState.pathingProfile.gankFrequency * 0.4;

    // Baseado na agressividade
    probability += (junglerState.pathingProfile.aggressionLevel / 10) * 0.3;

    // Baseado na posição (mais provável se estiver na jungle próxima às lanes)
    if (junglerState.region.includes('JUNGLE')) {
      probability += 0.2;
    }

    // Baseado no histórico recente
    const recentGanks = this.gankHistory.filter(
      g => Date.now() - g.timestamp < 300000 // últimos 5 minutos
    );
    if (recentGanks.length > 0) {
      const successRate = recentGanks.filter(g => g.success).length / recentGanks.length;
      probability += successRate * 0.1;
    }

    return Math.min(probability, 1.0);
  }

  /**
   * Registra um gank no histórico
   */
  recordGank(lane: string, success: boolean): void {
    this.gankHistory.push({
      timestamp: Date.now(),
      lane,
      success
    });

    // Mantém apenas os últimos 20 registros
    if (this.gankHistory.length > 20) {
      this.gankHistory.shift();
    }
  }

  /**
   * Retorna lanes mais prováveis para gank
   */
  getLikelyTargets(junglerState: JunglerState | null): string[] {
    if (!junglerState) return [];

    return junglerState.pathingProfile.commonTargets.map(lane => {
      switch (lane) {
        case 'top': return 'TOP_LANE';
        case 'mid': return 'MID_LANE';
        case 'bot': return 'BOT_LANE';
        default: return lane.toUpperCase() + '_LANE';
      }
    });
  }

  /**
   * Prediz alertas de gank baseado no estado do jungler
   */
  predictGanks(junglerState: JunglerState | null): GankAlert[] {
    if (!junglerState) return [];

    const probability = this.predictGankProbability(junglerState);
    const targets = this.getLikelyTargets(junglerState);

    if (probability < 0.3) return []; // Não alerta se probabilidade baixa

    const alerts: GankAlert[] = [];
    const risk: 'low' | 'medium' | 'high' = probability > 0.7 ? 'high' : probability > 0.5 ? 'medium' : 'low';

    targets.forEach(target => {
      alerts.push({
        risk,
        targetLane: target as Lane,
        estimatedTime: Math.floor(Math.random() * 30) + 10, // 10-40 segundos aleatório
        reason: `Jungler ${junglerState.championName} está próximo da ${target}`,
        timestamp: Date.now()
      });
    });

    return alerts;
  }
}
