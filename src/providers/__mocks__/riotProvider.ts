import { GameState } from '../riotProvider';
import { Player } from '../../contracts/gameData';

export class MockRiotProvider {
  private mockGameState: GameState = GameState.NotActive;
  private mockGameTime: number | null = null;
  private mockPlayers: Player[] = [];
  private shouldFail = false;

  // Métodos de controle do mock
  setGameState(state: GameState): void {
    this.mockGameState = state;
  }

  setGameTime(time: number | null): void {
    this.mockGameTime = time;
  }

  setPlayers(players: Player[]): void {
    this.mockPlayers = players;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  // Métodos mockados
  async getGameState(): Promise<GameState> {
    if (this.shouldFail) {
      throw new Error('Mock failure');
    }
    return this.mockGameState;
  }

  async getGameTime(): Promise<number | null> {
    if (this.shouldFail) {
      throw new Error('Mock failure');
    }
    return this.mockGameTime;
  }

  async getPlayerList(): Promise<Player[]> {
    if (this.shouldFail) {
      throw new Error('Mock failure');
    }
    return this.mockPlayers;
  }

  async getJungler(): Promise<Player | null> {
    if (this.shouldFail) {
      throw new Error('Mock failure');
    }
    return this.mockPlayers.find(player =>
      player.summonerSpells.summonerSpellOne?.id === 11 ||
      player.summonerSpells.summonerSpellTwo?.id === 11
    ) || null;
  }

  async getJunglerLoading(): Promise<Player | null> {
    return this.getJungler();
  }

  shouldThrottle(): boolean {
    return false;
  }

  getMetrics(): any {
    return {
      totalRequests: 10,
      successfulRequests: 8,
      failedRequests: 2,
      averageLatency: 150,
      lastRequestTime: Date.now(),
      circuitBreakerStatus: 'closed',
      isGamePaused: false
    };
  }
}
