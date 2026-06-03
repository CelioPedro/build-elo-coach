import { GameFactors, Lane, MapRegion, ObjectiveType } from '../contracts/junglerData';
import { CompetitiveSignal, SignalConfidence, SignalEvidence, SignalSeverity } from '../contracts/signals';

export class CompetitiveSignalEngine {
  generateSignals(factors: GameFactors): CompetitiveSignal[] {
    return [
      this.generateLeeSinLevelThreeSignal(factors),
      this.generatePostGankResetSignal(factors),
      this.generateDragonSetupSignal(factors),
      this.generateHeraldSetupSignal(factors),
      this.generateBaronSetupSignal(factors),
      this.generateClosingPushSignal(factors)
    ]
      .filter((signal): signal is CompetitiveSignal => signal !== null)
      .sort((a, b) => b.score - a.score);
  }

  private generateLeeSinLevelThreeSignal(factors: GameFactors): CompetitiveSignal | null {
    const { junglerState, lanePressures, gameTime } = factors;

    if (!junglerState || junglerState.championName.toLowerCase() !== 'leesin') {
      return null;
    }

    const inWindow = gameTime >= 150 && gameTime <= 205;
    const topSide = junglerState.region === MapRegion.TOP_JUNGLE ||
      junglerState.region === MapRegion.TOP_LANE ||
      junglerState.region === MapRegion.RIVER;
    const levelThree = (junglerState.level ?? 0) >= 3;
    const threeCamps = (junglerState.creepScore ?? 0) >= 12;
    const topPressure = lanePressures.find(lane => lane.lane === Lane.TOP);
    const topAdvanced = topPressure?.pressure === 'pushing';

    if (!inWindow || !topSide || !levelThree || !threeCamps) {
      return null;
    }

    const evidence: SignalEvidence[] = [
      { label: 'Lee early ganker', weight: 25, source: 'inferred' },
      { label: 'janela lvl3 2:30-3:25', weight: 20, source: 'inferred' },
      { label: '12 CS indica 3 campos', weight: 20, source: 'simulated' },
      { label: 'top side visto', weight: 20, source: 'simulated', freshnessSeconds: 0 }
    ];

    if (topAdvanced) {
      evidence.push({ label: 'top avancada', weight: 15, source: 'simulated' });
    }

    const score = evidence.reduce((total, item) => total + item.weight, 0);
    const severity = this.severityFromScore(score);

    return {
      id: 'lee-sin-level-3-top-threat',
      kind: 'gank',
      lane: Lane.TOP,
      severity,
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: 150, to: 205 },
      label: 'Lee lvl3 -> top/mid',
      reason: topAdvanced
        ? '12 CS + top avancada'
        : '12 CS + top side visto',
      evidence,
      score
    };
  }

  private generateDragonSetupSignal(factors: GameFactors): CompetitiveSignal | null {
    const { junglerState, objectives, lanePressures, gameTime } = factors;
    const dragon = objectives.find(objective => objective.type === ObjectiveType.DRAGON);

    if (!dragon || dragon.killedAt) {
      return null;
    }

    const spawnAt = dragon.alive ? gameTime : dragon.respawnAt;
    if (spawnAt === undefined || gameTime < spawnAt - 30 || gameTime > spawnAt + 30) {
      return null;
    }

    const dragonSpawnSoon = !dragon.alive && dragon.respawnAt !== undefined;
    const dragonLive = dragon.alive && gameTime >= spawnAt;
    const botSideJungler = junglerState?.region === MapRegion.BOT_JUNGLE ||
      junglerState?.region === MapRegion.RIVER ||
      junglerState?.region === MapRegion.MID_JUNGLE;
    const botLaneState = lanePressures.find(lane => lane.lane === Lane.BOT);
    const botUnderPressure = botLaneState?.pressure === 'receding';

    if (!dragonSpawnSoon && !dragonLive) {
      return null;
    }

    const firstDragon = spawnAt <= 330;
    const evidence: SignalEvidence[] = [
      { label: dragonLive ? 'dragao vivo' : 'dragao nasce em breve', weight: 25, source: 'simulated' },
      { label: firstDragon ? 'janela 5:00-5:30' : 'proxima janela de dragao', weight: 15, source: 'inferred' }
    ];

    if (botSideJungler) {
      evidence.push({ label: 'jungler no bot side', weight: 20, source: 'simulated', freshnessSeconds: 0 });
    }

    if (botUnderPressure) {
      evidence.push({ label: 'bot sem prioridade', weight: 15, source: 'simulated' });
    }

    const score = evidence.reduce((total, item) => total + item.weight, 0);

    return {
      id: firstDragon ? 'first-dragon-setup' : 'second-dragon-setup',
      kind: 'objective',
      severity: this.severityFromScore(score),
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: spawnAt - 30, to: spawnAt + 30 },
      label: dragonLive ? 'Dragao vivo -> bot side' : `Dragao em ${this.formatClock(spawnAt)}`,
      reason: botSideJungler
        ? 'Lee resetou para baixo'
        : 'prepare wave/visao',
      evidence,
      score
    };
  }

  private generateHeraldSetupSignal(factors: GameFactors): CompetitiveSignal | null {
    const { junglerState, objectives, lanePressures, gameTime } = factors;
    const herald = objectives.find(objective => objective.type === ObjectiveType.HERALD);

    if (!herald || herald.killedAt) return null;

    const spawnAt = herald.alive ? 840 : herald.respawnAt;
    if (spawnAt === undefined || gameTime < spawnAt - 30 || gameTime > spawnAt + 45) {
      return null;
    }

    const topSideJungler = junglerState?.region === MapRegion.TOP_JUNGLE ||
      junglerState?.region === MapRegion.RIVER ||
      junglerState?.region === MapRegion.TOP_LANE;
    const topPressure = lanePressures.find(lane => lane.lane === Lane.TOP)?.pressure === 'pushing';
    const evidence: SignalEvidence[] = [
      { label: herald.alive ? 'Herald vivo' : 'Herald nasce em breve', weight: 25, source: 'simulated' },
      { label: 'pressao no lado superior', weight: 15, source: 'inferred' }
    ];

    if (topSideJungler) {
      evidence.push({ label: 'jungler no top side', weight: 20, source: 'simulated', freshnessSeconds: 0 });
    }

    if (topPressure) {
      evidence.push({ label: 'top com prioridade', weight: 15, source: 'simulated' });
    }

    const score = evidence.reduce((total, item) => total + item.weight, 0);

    return {
      id: 'herald-setup',
      kind: 'objective',
      severity: this.severityFromScore(score),
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: spawnAt - 30, to: spawnAt + 45 },
      label: herald.alive ? 'Herald -> placas mid' : `Herald em ${this.formatClock(spawnAt)}`,
      reason: topSideJungler ? 'Lee controla lado superior' : 'prepare visao top river',
      evidence,
      score
    };
  }

  private generateBaronSetupSignal(factors: GameFactors): CompetitiveSignal | null {
    const { junglerState, objectives, lanePressures, gameTime } = factors;
    const baron = objectives.find(objective => objective.type === ObjectiveType.BARON);

    if (!baron || baron.killedAt) return null;

    const spawnAt = baron.alive ? 1200 : baron.respawnAt;
    if (spawnAt === undefined || gameTime < spawnAt - 30 || gameTime > spawnAt + 60) {
      return null;
    }

    const topSideJungler = junglerState?.region === MapRegion.TOP_JUNGLE ||
      junglerState?.region === MapRegion.RIVER;
    const midPriority = lanePressures.find(lane => lane.lane === Lane.MID)?.pressure === 'pushing';
    const evidence: SignalEvidence[] = [
      { label: baron.alive ? 'Baron vivo' : 'Baron nasce em breve', weight: 30, source: 'simulated' },
      { label: 'janela 20:00+', weight: 20, source: 'inferred' }
    ];

    if (topSideJungler) {
      evidence.push({ label: 'jungler no rio superior', weight: 20, source: 'simulated', freshnessSeconds: 0 });
    }

    if (midPriority) {
      evidence.push({ label: 'mid com prioridade', weight: 15, source: 'simulated' });
    }

    const score = evidence.reduce((total, item) => total + item.weight, 0);

    return {
      id: 'baron-setup',
      kind: 'objective',
      severity: this.severityFromScore(score),
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: spawnAt - 30, to: spawnAt + 60 },
      label: baron.alive ? 'Baron vivo -> setup' : `Baron em ${this.formatClock(spawnAt)}`,
      reason: midPriority ? 'mid empurrada + controle topo' : 'controle visao antes do rio',
      evidence,
      score
    };
  }

  private generateClosingPushSignal(factors: GameFactors): CompetitiveSignal | null {
    const { objectives, lanePressures, gameTime } = factors;
    const baron = objectives.find(objective => objective.type === ObjectiveType.BARON);
    const midPressure = lanePressures.find(lane => lane.lane === Lane.MID);

    if (!baron?.killedAt || gameTime < 1260 || gameTime > 1440 || midPressure?.pressure !== 'pushing') {
      return null;
    }

    const evidence: SignalEvidence[] = [
      { label: 'Baron abatido', weight: 30, source: 'simulated', freshnessSeconds: gameTime - baron.killedAt },
      { label: 'mid lane avancada', weight: 25, source: 'simulated' },
      { label: 'janela de fechamento', weight: 20, source: 'inferred' }
    ];
    const score = evidence.reduce((total, item) => total + item.weight, 0);

    return {
      id: 'closing-push',
      kind: 'tempo',
      severity: this.severityFromScore(score),
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: 1260, to: 1440 },
      label: 'Baron buff -> fechar mid',
      reason: 'mid avancada + buff ativo',
      evidence,
      score
    };
  }

  private generatePostGankResetSignal(factors: GameFactors): CompetitiveSignal | null {
    const { objectives, lanePressures, gameTime } = factors;
    const dragon = objectives.find(objective => objective.type === ObjectiveType.DRAGON);
    const topLaneState = lanePressures.find(lane => lane.lane === Lane.TOP);

    if (gameTime < 238 || gameTime > 270 || topLaneState?.pressure !== 'receding') {
      return null;
    }

    const dragonSpawnAt = dragon?.respawnAt ?? (dragon?.alive ? 300 : null);
    const dragonSoon = dragonSpawnAt !== null && dragonSpawnAt - gameTime <= 65;

    if (!dragonSoon) {
      return null;
    }

    const evidence: SignalEvidence[] = [
      { label: 'top resolvida', weight: 20, source: 'simulated' },
      { label: 'dragon em breve', weight: 20, source: 'inferred' },
      { label: 'janela de reset curta', weight: 15, source: 'inferred' }
    ];
    const score = evidence.reduce((total, item) => total + item.weight, 0);

    return {
      id: 'post-gank-reset-window',
      kind: 'tempo',
      severity: this.severityFromScore(score),
      confidence: this.confidenceFromScore(score),
      timeWindow: { from: 238, to: 270 },
      label: 'Reset curto -> dragao',
      reason: 'top resolvida + 5:00 chegando',
      evidence,
      score
    };
  }

  private severityFromScore(score: number): SignalSeverity {
    if (score >= 65) return 'danger';
    if (score >= 35) return 'watch';
    return 'info';
  }

  private confidenceFromScore(score: number): SignalConfidence {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private formatClock(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
