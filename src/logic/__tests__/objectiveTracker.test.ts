import { ObjectiveType } from '../../contracts/junglerData';
import { ObjectiveTracker } from '../objectiveTracker';

describe('ObjectiveTracker', () => {
  test('derives dragon kills from live client events', () => {
    const objectives = ObjectiveTracker.fromEvents([
      { EventID: 1, EventName: 'DragonKill', EventTime: 360, DragonType: 'Fire' }
    ]);

    expect(objectives).toHaveLength(1);
    expect(objectives[0]).toMatchObject({
      type: ObjectiveType.DRAGON,
      alive: false,
      killedAt: 360,
      respawnAt: 660
    });
  });

  test('derives baron and herald kills without claiming they are alive', () => {
    const objectives = ObjectiveTracker.fromEvents([
      { EventID: 1, EventName: 'HeraldKill', EventTime: 720 },
      { EventID: 2, EventName: 'BaronKill', EventTime: 1500 }
    ]);

    expect(objectives.map(objective => objective.type)).toEqual([
      ObjectiveType.HERALD,
      ObjectiveType.BARON
    ]);
    expect(objectives.every(objective => objective.alive === false)).toBe(true);
  });

  test('ignores non-objective events', () => {
    const objectives = ObjectiveTracker.fromEvents([
      { EventID: 1, EventName: 'ChampionKill', EventTime: 300 }
    ]);

    expect(objectives).toEqual([]);
  });
});
