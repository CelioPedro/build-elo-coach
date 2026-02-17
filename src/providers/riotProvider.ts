
import { Player } from '../contracts/gameData';
import * as https from 'https';

export enum GameState {
  NotActive = 'not_active',
  Loading = 'loading',
  InGame = 'in_game',
}

export class RiotProvider {
  private baseUrl = 'https://127.0.0.1:2999/liveclientdata';
  public lastError: string | null = null;
  private agent: https.Agent;

  constructor() {
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      keepAliveMsecs: 1000
    });
  }

  private async fetchJson(url: string): Promise<any> {
    // console.log(`[RiotProvider] Fetching: ${url}`); // Reduce noise
    return new Promise((resolve, reject) => {
      const req = https.get(url, { agent: this.agent }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            // console.log(`[RiotProvider] Response ${url}: ${res.statusCode} (Length: ${data.length})`);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Status Code: ${res.statusCode}`));
            }
          } catch (e) {
            console.error(`[RiotProvider] Parse Error ${url}:`, e);
            reject(e);
          }
        });
      });
      req.on('error', (err) => {
        // Only log critical network errors
        // console.error(`[RiotProvider] Network Error ${url}:`, err.message);
        reject(err);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error(`Timeout ao conectar em ${url}`));
      });
    });
  }

  async getGameState(): Promise<GameState> {
    this.lastError = null;

    try {
      // Tentar allgamedata primeiro (disponível durante o jogo)
      await this.fetchJson(`${this.baseUrl}/allgamedata`);
      return GameState.InGame;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    try {
      // Se allgamedata falhar, tentar playerlist (disponível na tela de loading)
      const players = await this.fetchJson(`${this.baseUrl}/playerlist`);
      if (players && players.length > 0) return GameState.Loading;
    } catch (error) {
      if (!this.lastError) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return GameState.NotActive;
  }

  async getGameTime(): Promise<number | null> {
    try {
      // Tentar gamestats primeiro
      const data = await this.fetchJson(`${this.baseUrl}/gamestats`);
      return typeof data.gameTime === 'number' ? data.gameTime : null;
    } catch (error) {
      // Silent fail
    }

    try {
      // Fallback para allgamedata
      const data = await this.fetchJson(`${this.baseUrl}/allgamedata`);
      return typeof data.gameData?.gameTime === 'number' ? data.gameData.gameTime : null;
    } catch (error) {
      // Silent fail
    }

    return null;
  }

  async getPlayerList(): Promise<Player[]> {
    try {
      const data = await this.fetchJson(`${this.baseUrl}/playerlist`);
      if (Array.isArray(data)) return data as Player[];
      return [];
    } catch (error) {
      return [];
    }
  }

  async getJungler(): Promise<Player | null> {
    const players = await this.getPlayerList();
    return players.find(player =>
      player.summonerSpells.summonerSpellOne?.displayName?.includes('Smite') ||
      player.summonerSpells.summonerSpellTwo?.displayName?.includes('Smite')
    ) || null;
  }

  async getJunglerLoading(): Promise<Player | null> {
    return this.getJungler();
  }

  async getWards(): Promise<any[]> {
    // Real API doesn't provide ward data
    return [];
  }

  async getObjectives(): Promise<any[]> {
    // Real API doesn't provide objective data
    return [];
  }

  async getLanePressures(): Promise<any[]> {
    // Real API doesn't provide lane pressure data
    return [];
  }
}
