import { Player } from '../contracts/gameData';
import { Position, MapRegion, JunglerState, PathingProfile, Lane } from '../contracts/junglerData';

export class JunglerTracker {
  private junglerState: JunglerState | null = null;
  private pathingProfiles: Map<string, PathingProfile> = new Map();

  constructor() {
    this.initializePathingProfiles();
  }

  /**
   * Converte coordenadas da API para região do mapa
   */
  static getRegionFromCoords(x: number, y: number): MapRegion {
    // Coordenadas normalizadas (0-15000 do LoL)
    // Base inimiga (aprox)
    if (x < 2000 && y < 2000) return MapRegion.BASE;

    // Lane detection (simplified)
    if (y > 12000 && x < 5000) return MapRegion.TOP_LANE;
    if (y < 3000 && x > 12000) return MapRegion.BOT_LANE;
    if (x > 7000 && x < 8000) return MapRegion.MID_LANE;

    // Jungle Top
    if (x < 5000 && y > 10000) return MapRegion.TOP_JUNGLE;

    // Jungle Bot
    if (x > 10000 && y < 5000) return MapRegion.BOT_JUNGLE;

    // Jungle Mid
    if (x > 5000 && x < 10000 && y > 5000 && y < 10000) return MapRegion.MID_JUNGLE;

    // River
    if ((x > 4000 && x < 11000 && y > 4000 && y < 11000) &&
        !(x > 5000 && x < 10000 && y > 5000 && y < 10000)) {
      return MapRegion.RIVER;
    }

    // Default to mid jungle if unclear
    return MapRegion.MID_JUNGLE;
  }

  /**
   * Calcula distância entre duas posições
   */
  static calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  /**
   * Atualiza estado do jungler baseado nos dados dos jogadores
   */
  updateJunglerState(players: Player[]): void {
    const jungler = players.find(player =>
      player.summonerSpells.summonerSpellOne?.id === 11 ||
      player.summonerSpells.summonerSpellTwo?.id === 11
    );

    if (!jungler) {
      this.junglerState = null;
      return;
    }

    const position: Position = jungler.position;

    const region = JunglerTracker.getRegionFromCoords(position.x, position.y);
    const profile = this.getPathingProfile(jungler.championName);

    this.junglerState = {
      championName: jungler.championName,
      position,
      region,
      lastSeen: Date.now(),
      pathingProfile: profile,
      isVisible: true
    };
  }

  /**
   * Retorna estado atual do jungler
   */
  getJunglerState(): JunglerState | null {
    return this.junglerState;
  }

  /**
   * Verifica se jungler está próximo de uma lane
   */
  isNearLane(lane: MapRegion): boolean {
    if (!this.junglerState) return false;

    const lanePositions: { [key in MapRegion]?: Position } = {
      [MapRegion.TOP_LANE]: { x: 2500, y: 13000 },
      [MapRegion.MID_LANE]: { x: 7500, y: 7500 },
      [MapRegion.BOT_LANE]: { x: 12500, y: 2500 }
    };

    const lanePos = lanePositions[lane];
    if (!lanePos) return false;

    const distance = JunglerTracker.calculateDistance(this.junglerState.position, lanePos);
    return distance < 2000; // ~2k unidades = próximo da lane
  }

  /**
   * Inicializa perfis de pathing para campeões comuns
   */
  private initializePathingProfiles(): void {
    const profiles: PathingProfile[] = [
      {
        championName: 'LeeSin',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.8,
        aggressionLevel: 9,
        commonTargets: [Lane.MID, Lane.TOP],
        averageGankDuration: 25
      },
      {
        championName: 'Elise',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.6,
        aggressionLevel: 4,
        commonTargets: [Lane.BOT],
        averageGankDuration: 20
      },
      {
        championName: 'Kindred',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE, MapRegion.BOT_JUNGLE],
        gankFrequency: 0.7,
        aggressionLevel: 7,
        commonTargets: [Lane.TOP, Lane.MID],
        averageGankDuration: 22
      },
      {
        championName: 'Nidalee',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE, MapRegion.TOP_JUNGLE],
        gankFrequency: 0.9,
        aggressionLevel: 8,
        commonTargets: [Lane.MID, Lane.BOT],
        averageGankDuration: 28
      },
      {
        championName: 'Rengar',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 1.0,
        aggressionLevel: 10,
        commonTargets: [Lane.TOP, Lane.MID, Lane.BOT],
        averageGankDuration: 30
      }
    ];

    profiles.forEach(profile => {
      this.pathingProfiles.set(profile.championName.toLowerCase(), profile);
    });
  }

  /**
   * Retorna perfil de pathing para um campeão
   */
  private getPathingProfile(championName: string): PathingProfile {
    const profile = this.pathingProfiles.get(championName.toLowerCase());
    if (profile) return profile;

    // Perfil padrão para campeões não mapeados
    return {
      championName,
      preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE, MapRegion.BOT_JUNGLE],
      gankFrequency: 0.7,
      aggressionLevel: 6,
      commonTargets: [Lane.MID],
      averageGankDuration: 25
    };
  }
}
