import { GameFactors, Lane, MapRegion, ObjectiveType } from '../../contracts/junglerData';
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

  test('marks reset/base as safe instead of constant gank risk', () => {
    const predictor = new GankPredictor();
    const factors: GameFactors = {
      gameTime: 250,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 1500, y: 1500 },
        region: MapRegion.BASE,
        lastSeen: 250,
        isVisible: true,
        level: 4,
        creepScore: 16,
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
      objectives: [{ type: ObjectiveType.DRAGON, alive: false, respawnAt: 300, position: { x: 9800, y: 4400 } }],
      lanePressures: [{ lane: Lane.TOP, pressure: 'receding', towerHealth: 100, inhibitorAlive: true }],
      objectiveTelemetry: {
        status: 'simulated',
        source: 'simulated',
        value: [{ type: ObjectiveType.DRAGON, alive: false, respawnAt: 300, position: { x: 9800, y: 4400 } }],
        capturedAt: 250
      },
      lanePressureTelemetry: {
        status: 'simulated',
        source: 'simulated',
        value: [{ lane: Lane.TOP, pressure: 'receding', towerHealth: 100, inhibitorAlive: true }],
        capturedAt: 250
      }
    };

    const result = predictor.generateHypothesis(factors);

    expect(result.risk).toBe('low');
    expect(result.hypothesis).toContain('reset/base');
  });

  test('keeps objective setup separate from gank danger', () => {
    const predictor = new GankPredictor();
    const factors: GameFactors = {
      gameTime: 300,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 9600, y: 4700 },
        region: MapRegion.RIVER,
        lastSeen: 300,
        isVisible: true,
        level: 4,
        creepScore: 20,
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
      objectives: [{ type: ObjectiveType.DRAGON, alive: true, position: { x: 9800, y: 4400 } }],
      lanePressures: [{ lane: Lane.BOT, pressure: 'receding', towerHealth: 100, inhibitorAlive: true }],
      objectiveTelemetry: {
        status: 'simulated',
        source: 'simulated',
        value: [{ type: ObjectiveType.DRAGON, alive: true, position: { x: 9800, y: 4400 } }],
        capturedAt: 300
      },
      lanePressureTelemetry: {
        status: 'simulated',
        source: 'simulated',
        value: [{ lane: Lane.BOT, pressure: 'receding', towerHealth: 100, inhibitorAlive: true }],
        capturedAt: 300
      }
    };

    const result = predictor.generateHypothesis(factors);

    expect(result.risk).toBe('low');
    expect(result.hypothesis).toContain('objetivo');
  });
});
