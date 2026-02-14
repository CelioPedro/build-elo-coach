import { JunglerState, GankAlert, Lane, GameFactors, WardType, ObjectiveType } from '../contracts/junglerData';

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

  /**
   * Gera hipótese detalhada baseada em fatores do jogo
   */
  generateHypothesis(factors: GameFactors): { risk: 'low' | 'medium' | 'high'; hypothesis: string } {
    const { junglerState, wards, objectives, lanePressures, gameTime } = factors;

    // Cenário base: sem jungler visível
    if (!junglerState || !junglerState.isVisible) {
      return this.generateInvisibleJunglerHypothesis(factors);
    }

    // Cenário: JG visto por ward
    const nearbyWards = wards.filter(ward =>
      this.distance(junglerState.position, ward.position) < 2000 &&
      gameTime - ward.placedAt < 30 // Ward recente
    );

    if (nearbyWards.length > 0) {
      return this.generateWardSightedHypothesis(factors, nearbyWards);
    }

    // Cenário: JG em posição conhecida
    return this.generatePositionBasedHypothesis(factors);
  }

  private generateInvisibleJunglerHypothesis(factors: GameFactors): { risk: 'low' | 'medium' | 'high'; hypothesis: string } {
    const { objectives, lanePressures, gameTime } = factors;

    // Verificar objetivos recentes
    const recentObjectives = objectives.filter(obj =>
      obj.killedAt && (gameTime - obj.killedAt) < 60 // Morto há menos de 1min
    );

    if (recentObjectives.length > 0) {
      const obj = recentObjectives[0];
      const timeSinceKill = gameTime - obj.killedAt!;
      const respawnIn = obj.respawnAt! - gameTime;

      if (timeSinceKill < 30) {
        return {
          risk: 'high',
          hypothesis: `${obj.type === 'dragon' ? 'Dragão' : obj.type === 'baron' ? 'Baron' : 'Herald'} morto recentemente. JG invisível. Gank provável em breve.`
        };
      }
    }

    // Verificar pressão de lanes
    const pushingLanes = lanePressures.filter(lp => lp.pressure === 'pushing');
    if (pushingLanes.length > 0) {
      const lane = pushingLanes[0];
      return {
        risk: 'medium',
        hypothesis: `${lane.lane} avançada. JG não visto há ${Math.floor(gameTime / 60)}min. Possível gank iminente.`
      };
    }

    return {
      risk: 'low',
      hypothesis: 'JG não visto recentemente. Objetivos intactos. Risco baixo de gank.'
    };
  }

  private generateWardSightedHypothesis(factors: GameFactors, nearbyWards: any[]): { risk: 'low' | 'medium' | 'high'; hypothesis: string } {
    const { junglerState, objectives, lanePressures } = factors;

    // Verificar região do JG
    const region = junglerState!.region;
    let side = '';
    if (region.includes('TOP')) side = 'TOP SIDE';
    else if (region.includes('BOT')) side = 'BOT SIDE';
    else side = 'MID';

    // Verificar objetivos
    const dragonAlive = objectives.some(obj => obj.type === ObjectiveType.DRAGON && obj.alive);
    const baronAlive = objectives.some(obj => obj.type === ObjectiveType.BARON && obj.alive);

    // Verificar pressão oposta
    let opposingPressure = '';
    if (side === 'TOP SIDE') {
      const botPressure = lanePressures.find(lp => lp.lane === Lane.BOT);
      if (botPressure?.pressure === 'pushing') opposingPressure = ', bot avançada';
    } else if (side === 'BOT SIDE') {
      const topPressure = lanePressures.find(lp => lp.lane === Lane.TOP);
      if (topPressure?.pressure === 'pushing') opposingPressure = ', top avançada';
    }

    const objStatus = dragonAlive ? 'Dragão vivo' : 'Dragão morto';
    const hypothesis = `JG inimigo visto na jungle ${side} por ward. ${objStatus}${opposingPressure}. JG PODE estar por perto.`;

    return {
      risk: 'medium',
      hypothesis
    };
  }

  private generatePositionBasedHypothesis(factors: GameFactors): { risk: 'low' | 'medium' | 'high'; hypothesis: string } {
    const { junglerState, lanePressures } = factors;

    const region = junglerState!.region;
    let targetLane = '';

    if (region.includes('TOP')) targetLane = 'top';
    else if (region.includes('BOT')) targetLane = 'bot';
    else targetLane = 'mid';

    const lanePressure = lanePressures.find(lp => lp.lane.toLowerCase() === targetLane);
    const pressureText = lanePressure?.pressure === 'pushing' ? 'avançada' : 'neutra';

    return {
      risk: 'high',
      hypothesis: `JG em ${region.replace('_', ' ').toLowerCase()}. ${targetLane} ${pressureText}. Gank provável em ${targetLane}.`
    };
  }

  private distance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
}
