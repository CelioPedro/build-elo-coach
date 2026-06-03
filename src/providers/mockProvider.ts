import { Player } from '../contracts/gameData';
import { GameDataProvider, GameState, Telemetry } from '../contracts/provider';
import { MatchSimulator } from '../logic/matchSimulator';
import { LanePressure, Objective, Ward } from '../contracts/junglerData';

interface MockProviderOptions {
  autoStart?: boolean;
}

export class MockProvider implements GameDataProvider {
  private mockGameTime = 0;
  private mockGameState: GameState = GameState.NotActive;
  private mockPlayers: Player[] = [];
  private simulator: MatchSimulator | null = null;
  private isSimulating = false;

  public lastError: string | null = null;

  constructor(options: MockProviderOptions = {}) {
    this.initializeMockData();
    if (options.autoStart) {
      this.startSimulation();
    }
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
      if (this.simulator?.isEnded()) {
        this.mockGameState = GameState.NotActive;
        return this.mockGameState;
      }
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
      this.hasSmite(player.summonerSpells.summonerSpellOne) ||
      this.hasSmite(player.summonerSpells.summonerSpellTwo)
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

  async getWards(): Promise<Ward[]> {
    const telemetry = await this.getWardTelemetry();
    return telemetry.value || [];
  }

  async getObjectives(): Promise<Objective[]> {
    const telemetry = await this.getObjectiveTelemetry();
    return telemetry.value || [];
  }

  async getLanePressures(): Promise<LanePressure[]> {
    const telemetry = await this.getLanePressureTelemetry();
    return telemetry.value || [];
  }

  async getWardTelemetry(): Promise<Telemetry<Ward[]>> {
    if (this.isSimulating && this.simulator) {
      return this.simulatedTelemetry(this.simulator.getWards());
    }
    return this.simulatedTelemetry([]);
  }

  async getObjectiveTelemetry(): Promise<Telemetry<Objective[]>> {
    if (this.isSimulating && this.simulator) {
      return this.simulatedTelemetry(this.simulator.getObjectives());
    }
    return this.simulatedTelemetry([]);
  }

  async getLanePressureTelemetry(): Promise<Telemetry<LanePressure[]>> {
    if (this.isSimulating && this.simulator) {
      return this.simulatedTelemetry(this.simulator.getLanePressures());
    }
    return this.simulatedTelemetry([]);
  }

  private hasSmite(spell?: Player['summonerSpells']['summonerSpellOne']): boolean {
    const spellName = [
      spell?.name,
      spell?.displayName,
      spell?.rawDisplayName
    ].filter(Boolean).join(' ').toLowerCase();

    return spell?.id === 11 || spellName.includes('smite');
  }

  private simulatedTelemetry<T>(value: T): Telemetry<T> {
    return {
      status: 'simulated',
      source: 'simulated',
      value,
      capturedAt: Date.now()
    };
  }
}
