import { Lane, MapRegion, ObjectiveType } from '../../contracts/junglerData';
import { CompetitiveSignalEngine } from '../competitiveSignalEngine';

describe('CompetitiveSignalEngine', () => {
  test('generates a Lee Sin level 3 top threat signal with evidence', () => {
    const engine = new CompetitiveSignalEngine();

    const signals = engine.generateSignals({
      gameTime: 160,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 3000, y: 10800 },
        region: MapRegion.TOP_JUNGLE,
        lastSeen: 160,
        isVisible: true,
        level: 3,
        creepScore: 12,
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
      lanePressures: [{ lane: Lane.TOP, pressure: 'pushing' }]
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      id: 'lee-sin-level-3-top-threat',
      kind: 'gank',
      lane: Lane.TOP,
      severity: 'danger',
      confidence: 'high',
      label: 'Lee lvl3 -> top/mid',
      reason: '12 CS + top avancada'
    });
    expect(signals[0].evidence.length).toBeGreaterThanOrEqual(4);
  });

  test('stays silent outside the level 3 timing window', () => {
    const engine = new CompetitiveSignalEngine();

    const signals = engine.generateSignals({
      gameTime: 90,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 11200, y: 2800 },
        region: MapRegion.BOT_JUNGLE,
        lastSeen: 90,
        isVisible: true,
        level: 1,
        creepScore: 0,
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
      lanePressures: [{ lane: Lane.TOP, pressure: 'neutral' }]
    });

    expect(signals).toEqual([]);
  });

  test('generates first dragon setup when Lee resets to bot side', () => {
    const engine = new CompetitiveSignalEngine();

    const signals = engine.generateSignals({
      gameTime: 300,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 9600, y: 4700 },
        region: MapRegion.BOT_JUNGLE,
        lastSeen: 300,
        isVisible: true,
        level: 4,
        creepScore: 20,
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
      lanePressures: [{ lane: Lane.BOT, pressure: 'receding' }]
    });

    expect(signals[0]).toMatchObject({
      id: 'first-dragon-setup',
      kind: 'objective',
      severity: 'danger',
      confidence: 'medium',
      label: 'Dragao vivo -> bot side',
      reason: 'Lee resetou para baixo'
    });
  });

  test('generates post-gank reset tempo before dragon setup', () => {
    const engine = new CompetitiveSignalEngine();

    const signals = engine.generateSignals({
      gameTime: 250,
      junglerState: {
        championName: 'LeeSin',
        position: { x: 1500, y: 1500 },
        region: MapRegion.BASE,
        lastSeen: 250,
        isVisible: true,
        level: 4,
        creepScore: 16,
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
      lanePressures: [{ lane: Lane.TOP, pressure: 'receding' }]
    });

    expect(signals[0]).toMatchObject({
      id: 'post-gank-reset-window',
      kind: 'tempo',
      severity: 'watch',
      confidence: 'medium',
      label: 'Reset curto -> dragao',
      reason: 'top resolvida + 5:00 chegando'
    });
  });
});
