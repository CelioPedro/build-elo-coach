import { Player } from '../contracts/gameData';
import { GameState } from './riotProvider';
import { MatchSimulator } from '../logic/matchSimulator';

export class MockProvider {
  private mockGameTime = 0;
  private mockGameState: GameState = GameState.NotActive;
  private mockPlayers: Player[] = [];
  private simulator: MatchSimulator | null = null;
  private isSimulating = false;

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock players with jungler
    this.mockPlayers = [
      {
        championName: 'LeeSin',
        isBot: false,
        isDead: false,
        items: [],
        level: 7,
        position: { x: 7000, y: 7000 },
        rawChampionName: 'leesin',
        respawnTimer: 0,
        runes: {
          keystone: { displayName: 'Conqueror', id: 8010, rawDescription: '', rawDisplayName: 'Conqueror' },
          primaryRuneTree: { displayName: 'Precision', id: 8000, rawDescription: '', rawDisplayName: 'Precision' },
          secondaryRuneTree: { displayName: 'Domination', id: 8100, rawDescription: '', rawDisplayName: 'Domination' }
        },
        scores: { assists: 2, creepScore: 45, deaths: 0, kills: 3, wardScore: 10 },
        skinID: 0,
        skinName: '',
        summonerName: 'MockPlayer1',
        summonerSpells: {
          summonerSpellOne: { displayName: 'Smite', rawDescription: '', rawDisplayName: 'Smite' },
          summonerSpellTwo: { displayName: 'Flash', rawDescription: '', rawDisplayName: 'Flash' }
        },
        team: 'ORDER'
      },
      {
        championName: 'Ahri',
        isBot: false,
        isDead: false,
        items: [],
        level: 6,
        position: { x: 7500, y: 7500 },
        rawChampionName: 'ahri',
        respawnTimer: 0,
        runes: {
          keystone: { displayName: 'Electrocute', id: 8112, rawDescription: '', rawDisplayName: 'Electrocute' },
          primaryRuneTree: { displayName: 'Domination', id: 8100, rawDescription: '', rawDisplayName: 'Domination' },
          secondaryRuneTree: { displayName: 'Sorcery', id: 8200, rawDescription: '', rawDisplayName: 'Sorcery' }
        },
        scores: { assists: 1, creepScore: 30, deaths: 1, kills: 1, wardScore: 5 },
        skinID: 0,
        skinName: '',
        summonerName: 'MockPlayer2',
        summonerSpells: {
          summonerSpellOne: { displayName: 'Flash', rawDescription: '', rawDisplayName: 'Flash' },
          summonerSpellTwo: { displayName: 'Exhaust', rawDescription: '', rawDisplayName: 'Exhaust' }
        },
        team: 'CHAOS'
      }
    ];
  }

  async getGameState(): Promise<GameState> {
    if (this.isSimulating) {
      return this.mockGameState;
    }
    // Simulate game starting after some time
    if (this.mockGameTime > 10) {
      this.mockGameState = GameState.InGame;
    }
    return this.mockGameState;
  }

  async getGameTime(): Promise<number | null> {
    if (this.isSimulating && this.simulator) {
      return this.simulator.getGameTime();
    }
    if (this.mockGameState === GameState.InGame) {
      this.mockGameTime += 2; // Simulate 2s per call
      return this.mockGameTime;
    }
    return null;
  }

  async getPlayerList(): Promise<Player[]> {
    if (this.isSimulating && this.simulator) {
      return this.simulator.getPlayers();
    }
    return this.mockPlayers;
  }

  async getJungler(): Promise<Player | null> {
    return this.mockPlayers.find(player =>
      player.summonerSpells.summonerSpellOne?.displayName === 'Smite' ||
      player.summonerSpells.summonerSpellTwo?.displayName === 'Smite'
    ) || null;
  }

  async getJunglerLoading(): Promise<Player | null> {
    return this.getJungler();
  }

  startSimulation(): void {
    if (this.simulator) {
      this.simulator.stop();
    }
    this.simulator = new MatchSimulator();
    this.simulator.start();
    this.isSimulating = true;
    this.mockGameState = GameState.InGame;
  }

  stopSimulation(): void {
    if (this.simulator) {
      this.simulator.stop();
      this.simulator = null;
    }
    this.isSimulating = false;
    this.mockGameState = GameState.NotActive;
    this.mockGameTime = 0;
  }

  isSimulationRunning(): boolean {
    return this.isSimulating && this.simulator?.isSimulating() === true;
  }

  async getWards(): Promise<any[]> {
    if (this.isSimulating && this.simulator) {
      return this.simulator.getWards();
    }
    return [];
  }

  async getObjectives(): Promise<any[]> {
    if (this.isSimulating && this.simulator) {
      return this.simulator.getObjectives();
    }
    return [];
  }

  async getLanePressures(): Promise<any[]> {
    if (this.isSimulating && this.simulator) {
      return this.simulator.getLanePressures();
    }
    return [];
  }
}
