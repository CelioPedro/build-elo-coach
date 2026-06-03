import { JunglerState, GankAlert, Lane, GameFactors, MapRegion, ObjectiveType } from '../contracts/junglerData';

type RiskLevel = 'low' | 'medium' | 'high';

export class GankPredictor {
  private gankHistory: Array<{ timestamp: number; lane: string; success: boolean }> = [];

  predictGankProbability(junglerState: JunglerState | null): number {
    if (!junglerState) return 0;

    let probability = 0;
    probability += junglerState.pathingProfile.gankFrequency * 0.4;
    probability += (junglerState.pathingProfile.aggressionLevel / 10) * 0.3;

    if (junglerState.region.includes('JUNGLE')) {
      probability += 0.2;
    }

    const recentGanks = this.gankHistory.filter(
      g => Date.now() - g.timestamp < 300000
    );
    if (recentGanks.length > 0) {
      const successRate = recentGanks.filter(g => g.success).length / recentGanks.length;
      probability += successRate * 0.1;
    }

    return Math.min(probability, 1.0);
  }

  recordGank(lane: string, success: boolean): void {
    this.gankHistory.push({
      timestamp: Date.now(),
      lane,
      success
    });

    if (this.gankHistory.length > 20) {
      this.gankHistory.shift();
    }
  }

  getLikelyTargets(junglerState: JunglerState | null): string[] {
    if (!junglerState) return [];

    return junglerState.pathingProfile.commonTargets.map(lane => {
      switch (lane) {
        case 'top': return 'TOP_LANE';
        case 'mid': return 'MID_LANE';
        case 'bot': return 'BOT_LANE';
        default: return `${lane.toUpperCase()}_LANE`;
      }
    });
  }

  predictGanks(junglerState: JunglerState | null): GankAlert[] {
    if (!junglerState) return [];

    const probability = this.predictGankProbability(junglerState);
    const targets = this.getLikelyTargets(junglerState);

    if (probability < 0.3) return [];

    const risk: RiskLevel = probability > 0.7 ? 'high' : probability > 0.5 ? 'medium' : 'low';

    return targets.map(target => ({
      risk,
      targetLane: target as Lane,
      estimatedTime: 25,
      reason: `Jungler ${junglerState.championName} pode rotacionar para ${target}`,
      timestamp: Date.now()
    }));
  }

  generateHypothesis(factors: GameFactors): { risk: RiskLevel; hypothesis: string } {
    const { junglerState, wards, gameTime } = factors;
    const hasWardData = this.hasUsableTelemetry(factors.wardTelemetry);

    if (!junglerState || !junglerState.isVisible) {
      return this.generateInvisibleJunglerHypothesis(factors);
    }

    const earlyLeeSinHypothesis = this.generateEarlyLeeSinHypothesis(factors);
    if (earlyLeeSinHypothesis) {
      return earlyLeeSinHypothesis;
    }

    const nearbyWards = hasWardData
      ? wards.filter(ward =>
        this.distance(junglerState.position, ward.position) < 2000 &&
        gameTime - ward.placedAt < 30
      )
      : [];

    if (nearbyWards.length > 0) {
      return this.generateWardSightedHypothesis(factors);
    }

    return this.generatePositionBasedHypothesis(factors);
  }

  private generateInvisibleJunglerHypothesis(factors: GameFactors): { risk: RiskLevel; hypothesis: string } {
    const { objectives, lanePressures, gameTime } = factors;
    const hasObjectiveData = this.hasUsableTelemetry(factors.objectiveTelemetry);
    const hasLanePressureData = this.hasUsableTelemetry(factors.lanePressureTelemetry);

    const recentObjectives = hasObjectiveData
      ? objectives.filter(obj => obj.killedAt && (gameTime - obj.killedAt) < 60)
      : [];

    if (recentObjectives.length > 0) {
      const obj = recentObjectives[0];
      if (typeof obj.killedAt !== 'number') {
        return {
          risk: 'low',
          hypothesis: 'Objetivo recente sem tempo confiavel.'
        };
      }

      const timeSinceKill = gameTime - obj.killedAt;
      if (timeSinceKill < 30) {
        return {
          risk: 'medium',
          hypothesis: `${this.formatObjective(obj.type)} caiu agora. JG fora do mapa, risco depende da proxima rota.`
        };
      }
    }

    const pushingLanes = hasLanePressureData
      ? lanePressures.filter(lp => lp.pressure === 'pushing')
      : [];
    if (pushingLanes.length > 0) {
      const lane = pushingLanes[0];
      return {
        risk: 'medium',
        hypothesis: `${lane.lane} avancada e JG nao visto. Respeitar rotacao ate nova informacao.`
      };
    }

    if (!hasObjectiveData && !hasLanePressureData) {
      return {
        risk: 'low',
        hypothesis: 'Telemetria tatica limitada. Sem sinais confiaveis de pressao ou rota.'
      };
    }

    return {
      risk: 'low',
      hypothesis: 'Sem pressao de lane ou rota inimiga forte. Momento seguro.'
    };
  }

  private generateWardSightedHypothesis(factors: GameFactors): { risk: RiskLevel; hypothesis: string } {
    const { junglerState, objectives, lanePressures } = factors;
    const hasObjectiveData = this.hasUsableTelemetry(factors.objectiveTelemetry);
    const hasLanePressureData = this.hasUsableTelemetry(factors.lanePressureTelemetry);

    if (!junglerState) {
      return {
        risk: 'low',
        hypothesis: 'JG sem posicao confiavel no momento.'
      };
    }

    const targetLane = this.getTargetLaneFromRegion(junglerState.region);
    const targetPressure = hasLanePressureData
      ? lanePressures.find(lp => lp.lane === targetLane)
      : undefined;
    const dragonAlive = hasObjectiveData && objectives.some(obj => obj.type === ObjectiveType.DRAGON && obj.alive);

    if (targetPressure?.pressure === 'pushing') {
      return {
        risk: 'medium',
        hypothesis: `JG visto por ward em ${this.formatRegion(junglerState.region)}. ${this.formatLane(targetLane)} avancada, rotacao possivel.`
      };
    }

    return {
      risk: 'low',
      hypothesis: `JG visto por ward em ${this.formatRegion(junglerState.region)}. ${dragonAlive ? 'Atencao ao objetivo; ' : ''}sem setup forte de gank.`
    };
  }

  private generatePositionBasedHypothesis(factors: GameFactors): { risk: RiskLevel; hypothesis: string } {
    const { junglerState, lanePressures, gameTime, objectives } = factors;
    const hasLanePressureData = this.hasUsableTelemetry(factors.lanePressureTelemetry);
    const hasObjectiveData = this.hasUsableTelemetry(factors.objectiveTelemetry);

    if (!junglerState) {
      return {
        risk: 'low',
        hypothesis: 'JG sem posicao confiavel no momento.'
      };
    }

    const region = junglerState.region;

    if (region === MapRegion.BASE) {
      return {
        risk: 'low',
        hypothesis: 'JG em reset/base. Janela segura para reposicionar e preparar wave.'
      };
    }

    const objectiveFocus = hasObjectiveData && objectives.some(objective =>
      objective.alive &&
      this.distance(junglerState.position, objective.position) < 1600
    );

    if (objectiveFocus) {
      return {
        risk: 'low',
        hypothesis: 'JG agrupado em objetivo. Risco de gank baixo; atencao ao setup do mapa.'
      };
    }

    const targetLane = this.getTargetLaneFromRegion(region);
    const lanePressure = hasLanePressureData
      ? lanePressures.find(lp => lp.lane === targetLane)
      : undefined;

    if (!lanePressure) {
      return {
        risk: region === MapRegion.MID_JUNGLE || region === MapRegion.RIVER ? 'medium' : 'low',
        hypothesis: `JG em ${this.formatRegion(region)}. Sem pressao de lane confiavel para cravar gank.`
      };
    }

    if (lanePressure.pressure === 'pushing') {
      const risk: RiskLevel = region === MapRegion.RIVER ||
        region === MapRegion.TOP_LANE ||
        region === MapRegion.BOT_LANE ||
        region === MapRegion.MID_LANE
        ? 'high'
        : 'medium';

      return {
        risk,
        hypothesis: `${this.formatLane(targetLane)} avancada com JG em ${this.formatRegion(region)}. ${risk === 'high' ? 'Janela real de gank.' : 'Rotacao possivel.'}`
      };
    }

    if (lanePressure.pressure === 'receding') {
      return {
        risk: 'low',
        hypothesis: `${this.formatLane(targetLane)} recuando. JG em ${this.formatRegion(region)}, mas sem setup forte de gank.`
      };
    }

    return {
      risk: gameTime < 360 && (region === MapRegion.RIVER || region === MapRegion.MID_JUNGLE) ? 'medium' : 'low',
      hypothesis: `${this.formatLane(targetLane)} neutra. JG em ${this.formatRegion(region)}; monitorar rotacao, sem alerta forte.`
    };
  }

  private generateEarlyLeeSinHypothesis(factors: GameFactors): { risk: RiskLevel; hypothesis: string } | null {
    const { junglerState, lanePressures, gameTime } = factors;
    const hasLanePressureData = this.hasUsableTelemetry(factors.lanePressureTelemetry);

    if (!junglerState) return null;

    const isLevelThreeWindow = junglerState.championName.toLowerCase() === 'leesin' &&
      gameTime >= 150 &&
      gameTime <= 205 &&
      (junglerState.level ?? 0) >= 3 &&
      (junglerState.creepScore ?? 0) >= 12;

    const isTopSide = junglerState.region === MapRegion.TOP_JUNGLE ||
      junglerState.region === MapRegion.RIVER ||
      junglerState.region === MapRegion.TOP_LANE;

    if (!isLevelThreeWindow || !isTopSide) {
      return null;
    }

    const topPressure = hasLanePressureData
      ? lanePressures.find(lp => lp.lane === Lane.TOP)
      : undefined;
    const topText = topPressure?.pressure === 'pushing'
      ? 'top avancada'
      : hasLanePressureData ? 'top sem pressao clara' : 'pressao de top incerta';

    return {
      risk: topPressure?.pressure === 'pushing' ? 'high' : 'medium',
      hypothesis: `Lee Sin lvl3 no top side. ${topText}; janela classica de gank/invade.`
    };
  }

  private distance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  private hasUsableTelemetry(telemetry?: { status: string }): boolean {
    return telemetry?.status === 'available' || telemetry?.status === 'simulated';
  }

  private getTargetLaneFromRegion(region: MapRegion): Lane {
    if (region === MapRegion.TOP_JUNGLE || region === MapRegion.TOP_LANE) return Lane.TOP;
    if (region === MapRegion.BOT_JUNGLE || region === MapRegion.BOT_LANE) return Lane.BOT;
    return Lane.MID;
  }

  private formatObjective(type: ObjectiveType): string {
    if (type === ObjectiveType.DRAGON) return 'Dragao';
    if (type === ObjectiveType.BARON) return 'Baron';
    return 'Herald';
  }

  private formatRegion(region: MapRegion): string {
    return region.replace('_', ' ');
  }

  private formatLane(lane: Lane): string {
    if (lane === Lane.TOP) return 'top';
    if (lane === Lane.BOT) return 'bot';
    return 'mid';
  }
}
