import { Player } from '../contracts/gameData';
import { Position, MapRegion, PathingProfile, Lane } from '../contracts/junglerData';

export class MatchSimulator {
  private gameTime: number = 0;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private players: Player[] = [];
  private junglerIndex: number = 0;
  private pathIndex: number = 0;
  private timeInRegion: number = 0;
  private regionTravelTime: number = 0;

  // Region positions (approximate centers)
  private regionPositions: { [key in MapRegion]: Position } = {
    [MapRegion.BASE]: { x: 1500, y: 1500 },
    [MapRegion.TOP_JUNGLE]: { x: 2500, y: 11000 },
    [MapRegion.MID_JUNGLE]: { x: 7500, y: 7500 },
    [MapRegion.BOT_JUNGLE]: { x: 11000, y: 2500 },
    [MapRegion.TOP_LANE]: { x: 2500, y: 13000 },
    [MapRegion.MID_LANE]: { x: 7500, y: 7500 },
    [MapRegion.BOT_LANE]: { x: 12500, y: 2500 },
    [MapRegion.RIVER]: { x: 5000, y: 5000 }
  };

  constructor() {
    this.initializePlayers();
  }

  private initializePlayers(): void {
    // Mock players with jungler
    this.players = [
      {
        championName: 'LeeSin',
        isBot: false,
        isDead: false,
        items: [],
        level: 7,
        position: this.regionPositions[MapRegion.BOT_JUNGLE], // Start in bot jungle
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

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.gameTime = 0; // Reset for simulation
    this.pathIndex = 0;
    this.timeInRegion = 0;
    this.regionTravelTime = 0;
    this.intervalId = setInterval(() => this.update(), 1000);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private update(): void {
    this.gameTime += 1;

    // Update jungler position based on pathing
    this.updateJunglerPosition();

    // Simulate some random movement for other players (slight)
    this.players.forEach((player, index) => {
      if (index !== this.junglerIndex) {
        player.position.x += (Math.random() - 0.5) * 100;
        player.position.y += (Math.random() - 0.5) * 100;
        // Keep within bounds
        player.position.x = Math.max(0, Math.min(15000, player.position.x));
        player.position.y = Math.max(0, Math.min(15000, player.position.y));
      }
    });
  }

  private updateJunglerPosition(): void {
    const jungler = this.players[this.junglerIndex];
    if (!jungler) return;

    const profile = this.getPathingProfile(jungler.championName);
    if (!profile || profile.preferredPath.length === 0) return;

    const currentRegion = profile.preferredPath[this.pathIndex];
    const nextRegion = profile.preferredPath[(this.pathIndex + 1) % profile.preferredPath.length];

    if (this.timeInRegion < 30) { // Stay in region for 30s
      this.timeInRegion++;
      jungler.position = { ...this.regionPositions[currentRegion] };
      // Add some variation
      jungler.position.x += (Math.random() - 0.5) * 500;
      jungler.position.y += (Math.random() - 0.5) * 500;
    } else {
      // Travel to next region
      if (this.regionTravelTime < 20) { // Travel time 20s
        this.regionTravelTime++;
        // Interpolate position
        const startPos = this.regionPositions[currentRegion];
        const endPos = this.regionPositions[nextRegion];
        const t = this.regionTravelTime / 20;
        jungler.position.x = startPos.x + (endPos.x - startPos.x) * t;
        jungler.position.y = startPos.y + (endPos.y - startPos.y) * t;
      } else {
        // Arrived at next region
        this.pathIndex = (this.pathIndex + 1) % profile.preferredPath.length;
        this.timeInRegion = 0;
        this.regionTravelTime = 0;
      }
    }
  }

  private getPathingProfile(championName: string): PathingProfile {
    // Simplified, match JunglerTracker profiles
    const profiles: { [key: string]: PathingProfile } = {
      'leesin': {
        championName: 'LeeSin',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.8,
        aggressionLevel: 9,
        commonTargets: [Lane.MID, Lane.TOP],
        averageGankDuration: 25
      }
    };
    return profiles[championName.toLowerCase()] || {
      championName,
      preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE, MapRegion.BOT_JUNGLE],
      gankFrequency: 0.7,
      aggressionLevel: 6,
      commonTargets: [Lane.MID],
      averageGankDuration: 25
    };
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getPlayers(): Player[] {
    return this.players.map(p => ({ ...p })); // Return copies
  }

  isSimulating(): boolean {
    return this.isRunning;
  }
}
