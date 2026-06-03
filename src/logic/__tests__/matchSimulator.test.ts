import { Lane, MapRegion, ObjectiveType } from '../../contracts/junglerData';
import { JunglerTracker } from '../junglerTracker';
import { MatchSimulator } from '../matchSimulator';

describe('MatchSimulator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('scripts Lee Sin level 3 on top side around 2:40', () => {
    const simulator = new MatchSimulator();

    simulator.start();
    jest.advanceTimersByTime(160_000);

    const players = simulator.getPlayers();
    const leeSin = players.find(player => player.championName === 'LeeSin');
    const topPressure = simulator.getLanePressures().find(lane => lane.lane === Lane.TOP);

    expect(simulator.getGameTime()).toBe(160);
    expect(leeSin?.level).toBe(3);
    expect(leeSin?.scores.creepScore).toBe(12);
    expect(JunglerTracker.getRegionFromCoords(leeSin?.position.x ?? 0, leeSin?.position.y ?? 0)).toBe(MapRegion.TOP_JUNGLE);
    expect(topPressure?.pressure).toBe('pushing');

    simulator.stop();
  });

  test('replays the same scenario deterministically', () => {
    const first = new MatchSimulator();
    const second = new MatchSimulator();

    first.start();
    jest.advanceTimersByTime(180_000);
    const firstSnapshot = {
      time: first.getGameTime(),
      players: first.getPlayers(),
      wards: first.getWards(),
      objectives: first.getObjectives(),
      lanes: first.getLanePressures()
    };
    first.stop();

    second.start();
    jest.advanceTimersByTime(180_000);
    const secondSnapshot = {
      time: second.getGameTime(),
      players: second.getPlayers(),
      wards: second.getWards(),
      objectives: second.getObjectives(),
      lanes: second.getLanePressures()
    };
    second.stop();

    expect(secondSnapshot).toEqual(firstSnapshot);
  });

  test('scripts first dragon setup and objective resolution', () => {
    const simulator = new MatchSimulator();

    simulator.start();
    jest.advanceTimersByTime(300_000);

    const leeSinAtDragon = simulator.getPlayers().find(player => player.championName === 'LeeSin');
    const dragonSpawned = simulator.getObjectives().find(objective => objective.type === ObjectiveType.DRAGON);
    const botPressure = simulator.getLanePressures().find(lane => lane.lane === Lane.BOT);

    expect(simulator.getGameTime()).toBe(300);
    expect(leeSinAtDragon?.level).toBe(4);
    expect(leeSinAtDragon?.scores.creepScore).toBe(20);
    expect(JunglerTracker.getRegionFromCoords(leeSinAtDragon?.position.x ?? 0, leeSinAtDragon?.position.y ?? 0)).toBe(MapRegion.RIVER);
    expect(dragonSpawned?.alive).toBe(true);
    expect(botPressure?.pressure).toBe('receding');

    jest.advanceTimersByTime(42_000);
    const dragonTaken = simulator.getObjectives().find(objective => objective.type === ObjectiveType.DRAGON);

    expect(simulator.getGameTime()).toBe(342);
    expect(dragonTaken?.alive).toBe(false);
    expect(dragonTaken?.killedAt).toBe(342);
    expect(dragonTaken?.respawnAt).toBe(642);

    simulator.stop();
  });
});
