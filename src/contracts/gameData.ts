import { Position } from './junglerData';

 export interface Player {
  championName: string;
  isBot: boolean;
  isDead: boolean;
  items: any[]; // TODO: definir interface para items
  level: number;
  position: Position;
  rawChampionName: string;
  respawnTimer: number;
  runes: any; // TODO: definir interface para runes
  scores: {
    assists: number;
    creepScore: number;
    deaths: number;
    kills: number;
    wardScore: number;
  };
  skinID: number;
  skinName: string;
  summonerName: string;
  summonerSpells: {
    summonerSpellOne: any; // TODO: definir
    summonerSpellTwo: any;
  };
  team: string;
}

export interface GameData {
  activePlayer: Player;
  allPlayers: Player[];
  events: {
    Events: any[]; // TODO: definir eventos
  };
  gameData: {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
    mapTerrain: string;
  };
}
