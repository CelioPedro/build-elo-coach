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
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
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
      await this.fetchJson(`${this.baseUrl}/playerlist`);
      return GameState.Loading;
    } catch (error) {
      // Ignorar erro
    }

    return GameState.NotActive;
  }

  async getGameTime(): Promise<number | null> {
    try {
      // Tentar gamestats primeiro
      const data = await this.fetchJson(`${this.baseUrl}/gamestats`);
      console.log('Gamestats response:', data);
      return data.gameTime || null;
    } catch (error) {
      console.log('Gamestats failed, trying allgamedata');
    }

    try {
      // Fallback para allgamedata
      const data = await this.fetchJson(`${this.baseUrl}/allgamedata`);
      console.log('Allgamedata response gameTime:', data.gameData?.gameTime);
      return data.gameData?.gameTime || null;
    } catch (error) {
      console.log('Allgamedata failed');
    }

    return null;
  }

  async getPlayerList(): Promise<Player[]> {
    try {
      return await this.fetchJson(`${this.baseUrl}/playerlist`);
    } catch (error) {
      // Ignorar erro
    }
    return [];
  }

  async getJungler(): Promise<Player | null> {
    const players = await this.getPlayerList();
    return players.find(player =>
      player.summonerSpells.summonerSpellOne?.id === 11 ||
      player.summonerSpells.summonerSpellTwo?.id === 11
    ) || null; // Smite ID
  }

  async getJunglerLoading(): Promise<Player | null> {
    // Mesmo método, pois playerlist está disponível na loading
    return this.getJungler();
  }
}
