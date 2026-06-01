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
      this.hasSmite(player.summonerSpells.summonerSpellOne) ||
      this.hasSmite(player.summonerSpells.summonerSpellTwo)
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

  private hasSmite(spell?: Player['summonerSpells']['summonerSpellOne']): boolean {
    const spellName = [
      spell?.name,
      spell?.displayName,
      spell?.rawDisplayName
    ].filter(Boolean).join(' ').toLowerCase();

    return spell?.id === 11 || spellName.includes('smite');
  }
}
