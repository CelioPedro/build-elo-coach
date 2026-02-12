import { JunglerTracker } from '../junglerTracker';
import { Player } from '../../contracts/gameData';
import { MapRegion } from '../../contracts/junglerData';

describe('JunglerTracker', () => {
  let tracker: JunglerTracker;

  beforeEach(() => {
    tracker = new JunglerTracker();
  });

  describe('getRegionFromCoords', () => {
    test('should identify base region', () => {
      expect(JunglerTracker.getRegionFromCoords(1000, 1000)).toBe(MapRegion.BASE);
    });

    test('should identify jungle regions', () => {
      expect(JunglerTracker.getRegionFromCoords(2000, 11000)).toBe(MapRegion.TOP_JUNGLE);
      expect(JunglerTracker.getRegionFromCoords(12000, 2000)).toBe(MapRegion.BOT_JUNGLE);
      expect(JunglerTracker.getRegionFromCoords(7000, 7000)).toBe(MapRegion.MID_JUNGLE);
    });

    test('should identify lane regions', () => {
      expect(JunglerTracker.getRegionFromCoords(2500, 13500)).toBe(MapRegion.TOP_LANE);
      expect(JunglerTracker.getRegionFromCoords(13500, 2500)).toBe(MapRegion.BOT_LANE);
      expect(JunglerTracker.getRegionFromCoords(7500, 7500)).toBe(MapRegion.MID_LANE);
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance correctly', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 3, y: 4 };
      expect(JunglerTracker.calculateDistance(pos1, pos2)).toBe(5);
    });
  });

  describe('updateJunglerState', () => {
    test('should identify jungler by Smite spell', () => {
      const players: Player[] = [
        {
          championName: 'LeeSin',
          isBot: false,
          isDead: false,
          items: [],
          level: 1,
          position: { x: 7000, y: 7000 },
          rawChampionName: 'LeeSin',
          respawnTimer: 0,
          runes: {},
          scores: { assists: 0, creepScore: 0, deaths: 0, kills: 0, wardScore: 0 },
          skinID: 0,
          skinName: '',
          summonerName: '',
          summonerSpells: {
            summonerSpellOne: { id: 11, name: 'Smite' }, // Smite
            summonerSpellTwo: { id: 4, name: 'Flash' }
          },
          team: ''
        },
        {
          championName: 'Ahri',
          isBot: false,
          isDead: false,
          items: [],
          level: 1,
          position: { x: 7500, y: 7500 },
          rawChampionName: 'Ahri',
          respawnTimer: 0,
          runes: {},
          scores: { assists: 0, creepScore: 0, deaths: 0, kills: 0, wardScore: 0 },
          skinID: 0,
          skinName: '',
          summonerName: '',
          summonerSpells: {
            summonerSpellOne: { id: 4, name: 'Flash' },
            summonerSpellTwo: { id: 3, name: 'Exhaust' }
          },
          team: ''
        }
      ];

      tracker.updateJunglerState(players);
      const state = tracker.getJunglerState();

      expect(state).toBeTruthy();
      expect(state?.championName).toBe('LeeSin');
      expect(state?.region).toBe(MapRegion.MID_JUNGLE);
    });

    test('should return null when no jungler found', () => {
      const players: Player[] = [
        {
          championName: 'Ahri',
          isBot: false,
          isDead: false,
          items: [],
          level: 1,
          position: { x: 7500, y: 7500 },
          rawChampionName: 'Ahri',
          respawnTimer: 0,
          runes: {},
          scores: { assists: 0, creepScore: 0, deaths: 0, kills: 0, wardScore: 0 },
          skinID: 0,
          skinName: '',
          summonerName: '',
          summonerSpells: {
            summonerSpellOne: { id: 4, name: 'Flash' },
            summonerSpellTwo: { id: 3, name: 'Exhaust' }
          },
          team: ''
        }
      ];

      tracker.updateJunglerState(players);
      const state = tracker.getJunglerState();

      expect(state).toBeNull();
    });
  });

  describe('isNearLane', () => {
    test('should detect proximity to lanes', () => {
      const players: Player[] = [
        {
          championName: 'LeeSin',
          isBot: false,
          isDead: false,
          items: [],
          level: 1,
          position: { x: 2500, y: 13000 },
          rawChampionName: 'LeeSin',
          respawnTimer: 0,
          runes: {},
          scores: { assists: 0, creepScore: 0, deaths: 0, kills: 0, wardScore: 0 },
          skinID: 0,
          skinName: '',
          summonerName: '',
          summonerSpells: {
            summonerSpellOne: { id: 11, name: 'Smite' },
            summonerSpellTwo: { id: 4, name: 'Flash' }
          },
          team: ''
        }
      ];

      tracker.updateJunglerState(players);

      // Perto da top lane
      expect(tracker.isNearLane(MapRegion.TOP_LANE)).toBe(true);
      // Longe da bot lane
      expect(tracker.isNearLane(MapRegion.BOT_LANE)).toBe(false);
    });
  });
});
