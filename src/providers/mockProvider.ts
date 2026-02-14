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
        runes: {},
        scores: { assists: 2, creepScore: 45, deaths: 0, kills: 3, wardScore: 10 },
        skinID: 0,
        skinName: '',
        summonerName: 'MockPlayer1',
        summonerSpells: {
          summonerSpellOne: { id: 11, name: 'Smite' },
          summonerSpellTwo: { id: 4, name: 'Flash' }
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
        runes: {},
        scores: { assists: 1, creepScore: 30, deaths: 1, kills: 1, wardScore: 5 },
        skinID: 0,
        skinName: '',
        summonerName: 'MockPlayer2',
        summonerSpells: {
          summonerSpellOne: { id: 4, name: 'Flash' },
          summonerSpellTwo: { id: 3, name: 'Exhaust' }
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
      player.summonerSpells.summonerSpellOne?.id === 11 ||
      player.summonerSpells.summonerSpellTwo?.id === 11
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
}
