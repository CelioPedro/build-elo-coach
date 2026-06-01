import { GameEvent } from '../contracts/gameData';
import { Objective, ObjectiveType, Position } from '../contracts/junglerData';

const OBJECTIVE_POSITIONS: Record<ObjectiveType, Position> = {
  [ObjectiveType.DRAGON]: { x: 9800, y: 4400 },
  [ObjectiveType.BARON]: { x: 5000, y: 10400 },
  [ObjectiveType.HERALD]: { x: 5000, y: 10400 }
};

const RESPAWN_SECONDS: Record<ObjectiveType, number> = {
  [ObjectiveType.DRAGON]: 300,
  [ObjectiveType.BARON]: 360,
  [ObjectiveType.HERALD]: 480
};

export class ObjectiveTracker {
  static fromEvents(events: GameEvent[]): Objective[] {
    return events
      .map(event => this.objectiveFromEvent(event))
      .filter((objective): objective is Objective => objective !== null);
  }

  private static objectiveFromEvent(event: GameEvent): Objective | null {
    const type = this.objectiveTypeFromEventName(event.EventName);
    if (!type) return null;

    return {
      type,
      alive: false,
      killedAt: event.EventTime,
      respawnAt: event.EventTime + RESPAWN_SECONDS[type],
      position: OBJECTIVE_POSITIONS[type]
    };
  }

  private static objectiveTypeFromEventName(eventName: string): ObjectiveType | null {
    const normalized = eventName.toLowerCase();

    if (normalized.includes('dragon')) return ObjectiveType.DRAGON;
    if (normalized.includes('baron')) return ObjectiveType.BARON;
    if (normalized.includes('herald')) return ObjectiveType.HERALD;

    return null;
  }
}
