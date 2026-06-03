import { GameFactors, Lane, MapRegion } from '../contracts/junglerData';
import { CompetitiveSignal, SignalConfidence, SignalEvidence, SignalSeverity } from '../contracts/signals';

export class CompetitiveSignalEngine {
  generateSignals(factors: GameFactors): CompetitiveSignal[] {
    return [
      this.generateLeeSinLevelThreeSignal(factors)
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
}
