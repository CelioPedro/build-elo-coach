import { Player } from '../contracts/gameData';
import * as https from 'https';

export enum GameState {
  NotActive = 'not_active',
  Loading = 'loading',
  InGame = 'in_game',
}

export class RiotProvider {
  private baseUrl = 'https://127.0.0.1:2999/liveclientdata';

  private async fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Status Code: ${res.statusCode}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error(`Timeout ao conectar em ${url}`));
      });
    });
  }

  async getGameState(): Promise<GameState> {
    try {
      // Tentar allgamedata primeiro (disponível durante o jogo)
      await this.fetchJson(`${this.baseUrl}/allgamedata`);
      return GameState.InGame;
    } catch (error) {
      // Ignorar erro
    }

    try {
      // Se allgamedata falhar, tentar playerlist (disponível na tela de loading)
      const players = await this.fetchJson(`${this.baseUrl}/playerlist`);
      if (players && players.length > 0) return GameState.Loading;
    } catch (error) {
      // Ignorar erro
    }

    return GameState.NotActive;
  }

  async getGameTime(): Promise<number | null> {
    try {
      // Tentar gamestats primeiro
      const data = await this.fetchJson(`${this.baseUrl}/gamestats`);
      return data.gameTime || null;
    } catch (error) {
      // Silent fail
    }

    try {
      // Fallback para allgamedata
      const data = await this.fetchJson(`${this.baseUrl}/allgamedata`);
      return data.gameData?.gameTime || null;
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
