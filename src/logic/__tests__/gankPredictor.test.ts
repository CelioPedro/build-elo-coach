import { GameFactors, Lane, MapRegion } from '../../contracts/junglerData';
import { GankPredictor } from '../gankPredictor';

describe('GankPredictor', () => {
  test('explains Lee Sin level 3 top-side pressure with lane context', () => {
    const predictor = new GankPredictor();
    const factors: GameFactors = {
      gameTime: 160,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 3000, y: 10800 },
        region: MapRegion.TOP_JUNGLE,
        lastSeen: 160,
        isVisible: true,
        level: 3,
        creepScore: 12,
        team: 'CHAOS',
        pathingProfile: {
          championName: 'LeeSin',
          preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE],
          gankFrequency: 0.8,
          aggressionLevel: 9,
          commonTargets: [Lane.TOP, Lane.MID],
          averageGankDuration: 25
        }
      },
      wards: [],
      objectives: [],
      lanePressures: [{ lane: Lane.TOP, pressure: 'pushing', towerHealth: 100, inhibitorAlive: true }],
      lanePressureTelemetry: {
        status: 'simulated',
        source: 'simulated',
        value: [{ lane: Lane.TOP, pressure: 'pushing', towerHealth: 100, inhibitorAlive: true }],
        capturedAt: 160
      }
    };

    const result = predictor.generateHypothesis(factors);

    expect(result.risk).toBe('high');
    expect(result.hypothesis).toContain('Lee Sin lvl3');
    expect(result.hypothesis).toContain('top avancada');
  });
});
