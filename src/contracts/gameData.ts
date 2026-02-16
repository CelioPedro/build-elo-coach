import { Position } from './junglerData';


export interface Item {
  canUse: boolean;
  consumable: boolean;
  count: number;
  displayName: string;
  itemID: number;
  price: number;
  rawDescription: string;
  rawDisplayName: string;
  slot: number;
}

export interface Rune {
  displayName: string;
  id: number;
  rawDescription: string;
  rawDisplayName: string;
}

export interface Runes {
  keystone: Rune;
  primaryRuneTree: Rune;
  secondaryRuneTree: Rune;
}

export interface SummonerSpell {
  displayName: string;
  rawDescription: string;
  rawDisplayName: string;
}

export interface SummonerSpells {
  summonerSpellOne: SummonerSpell;
  summonerSpellTwo: SummonerSpell;
}

export interface PlayerScores {
  assists: number;
  creepScore: number;
  deaths: number;
  kills: number;
  wardScore: number;
}

export interface Player {
  championName: string;
  isBot: boolean;
  isDead: boolean;
  items: Item[];
  level: number;
  position: Position;
  rawChampionName: string;
  respawnTimer: number;
  runes: Runes;
  scores: PlayerScores;
  skinID: number;
  skinName: string;
  summonerName: string;
  summonerSpells: SummonerSpells;
  team: 'ORDER' | 'CHAOS';
}

export interface GameEvent {
  EventID: number;
  EventName: string;
  EventTime: number;
  // Outros campos dependem do tipo de evento
}

export interface GameData {
  activePlayer: Player;
  allPlayers: Player[];
  events: {
    Events: GameEvent[];
  };
  gameData: {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
    mapTerrain: string;
  };
}
