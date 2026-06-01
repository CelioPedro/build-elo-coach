
import { GameData, Player } from '../contracts/gameData';
import { GameDataProvider, GameState, Telemetry } from '../contracts/provider';
import { LanePressure, Objective, Ward } from '../contracts/junglerData';
import { ObjectiveTracker } from '../logic/objectiveTracker';
import * as https from 'https';

export { GameState };

export class RiotProvider implements GameDataProvider {
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

  private async fetchJson<T>(url: string): Promise<T> {
    // console.log(`[RiotProvider] Fetching: ${url}`); // Reduce noise
    return new Promise((resolve, reject) => {
      const req = https.get(url, { agent: this.agent }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            // console.log(`[RiotProvider] Response ${url}: ${res.statusCode} (Length: ${data.length})`);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data) as T);
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
      await this.fetchJson<unknown>(`${this.baseUrl}/allgamedata`);
      return GameState.InGame;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    try {
      // Se allgamedata falhar, tentar playerlist (disponível na tela de loading)
      const players = await this.fetchJson<Player[]>(`${this.baseUrl}/playerlist`);
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
      const data = await this.fetchJson<{ gameTime?: number }>(`${this.baseUrl}/gamestats`);
      return typeof data.gameTime === 'number' ? data.gameTime : null;
    } catch (error) {
      // Silent fail
    }

    try {
      // Fallback para allgamedata
      const data = await this.fetchJson<{ gameData?: { gameTime?: number } }>(`${this.baseUrl}/allgamedata`);
      return typeof data.gameData?.gameTime === 'number' ? data.gameData.gameTime : null;
    } catch (error) {
      // Silent fail
    }

    return null;
  }

  async getPlayerList(): Promise<Player[]> {
    try {
      const data = await this.fetchJson<unknown>(`${this.baseUrl}/playerlist`);
      if (Array.isArray(data)) return data as Player[];
      return [];
    } catch (error) {
      return [];
    }
  }

  async getJungler(): Promise<Player | null> {
    const players = await this.getPlayerList();
    return players.find(player =>
      this.hasSmite(player.summonerSpells.summonerSpellOne) ||
      this.hasSmite(player.summonerSpells.summonerSpellTwo)
    ) || null;
  }

  async getJunglerLoading(): Promise<Player | null> {
    return this.getJungler();
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
    // Real API doesn't provide ward data
    return this.unavailableTelemetry('live-api', 'Live Client API does not expose ward positions.');
  }

  async getObjectiveTelemetry(): Promise<Telemetry<Objective[]>> {
    try {
      const data = await this.fetchJson<Partial<GameData>>(`${this.baseUrl}/allgamedata`);
      const events = data.events?.Events || [];

      return {
        status: 'available',
        source: 'event-api',
        value: ObjectiveTracker.fromEvents(events),
        capturedAt: Date.now(),
        message: 'Objective telemetry is derived from kill events only.'
      };
    } catch (error) {
      return this.unavailableTelemetry('event-api', 'Objective events are not available right now.');
    }
  }

  async getLanePressureTelemetry(): Promise<Telemetry<LanePressure[]>> {
    // Real API doesn't provide lane pressure data
    return this.unavailableTelemetry('inferred', 'Lane pressure is not available from the live API yet.');
  }

  private hasSmite(spell?: Player['summonerSpells']['summonerSpellOne']): boolean {
    const spellName = [
      spell?.name,
      spell?.displayName,
      spell?.rawDisplayName
    ].filter(Boolean).join(' ').toLowerCase();

    return spell?.id === 11 || spellName.includes('smite');
  }

  private unavailableTelemetry<T>(source: Telemetry<T>['source'], message: string): Telemetry<T> {
    return {
      status: 'unavailable',
      source,
      value: null,
      capturedAt: Date.now(),
      message
    };
  }
}
