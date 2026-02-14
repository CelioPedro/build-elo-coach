import { Player } from '../contracts/gameData';
import { Position, MapRegion, PathingProfile, Lane, Ward, WardType, Objective, ObjectiveType, LanePressure } from '../contracts/junglerData';

export class MatchSimulator {
  private gameTime = 0;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private players: Player[] = [];
  private junglerIndex = 0;
  private pathIndex = 0;
  private timeInRegion = 0;
  private regionTravelTime = 0;
  private wards: Ward[] = [];
  private objectives: Objective[] = [];
  private lanePressures: LanePressure[] = [];
  private wardCounter = 0;

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
    this.initializeObjectives();
    this.initializeLanePressures();
  }

  private initializePlayers(): void {
    // Blue Team (ORDER)
    const blueTeam = [
      {
        championName: 'Darius',
        role: 'TOP',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.TOP_LANE],
        rawChampionName: 'darius',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 1, creepScore: 120, deaths: 0, kills: 2, wardScore: 0 },
        skinID: 0,
        skinName: '',
        summonerName: 'BlueTop',
        summonerSpells: { summonerSpellOne: { id: 12, name: 'Teleport' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'ORDER' as const
      },
      {
        championName: 'LeeSin',
        role: 'JUNGLE',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.BOT_JUNGLE],
        rawChampionName: 'leesin',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 3, creepScore: 85, deaths: 0, kills: 4, wardScore: 15 },
        skinID: 0,
        skinName: '',
        summonerName: 'BlueJungle',
        summonerSpells: { summonerSpellOne: { id: 11, name: 'Smite' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'ORDER' as const
      },
      {
        championName: 'Ahri',
        role: 'MID',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.MID_LANE],
        rawChampionName: 'ahri',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 2, creepScore: 110, deaths: 1, kills: 3, wardScore: 5 },
        skinID: 0,
        skinName: '',
        summonerName: 'BlueMid',
        summonerSpells: { summonerSpellOne: { id: 4, name: 'Flash' }, summonerSpellTwo: { id: 14, name: 'Ignite' } },
        team: 'ORDER' as const
      },
      {
        championName: 'Jinx',
        role: 'ADC',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.BOT_LANE],
        rawChampionName: 'jinx',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 4, creepScore: 140, deaths: 0, kills: 5, wardScore: 0 },
        skinID: 0,
        skinName: '',
        summonerName: 'BlueADC',
        summonerSpells: { summonerSpellOne: { id: 7, name: 'Heal' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'ORDER' as const
      },
      {
        championName: 'Leona',
        role: 'SUPPORT',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 6,
        position: this.regionPositions[MapRegion.BOT_LANE],
        rawChampionName: 'leona',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 6, creepScore: 25, deaths: 1, kills: 0, wardScore: 25 },
        skinID: 0,
        skinName: '',
        summonerName: 'BlueSupport',
        summonerSpells: { summonerSpellOne: { id: 4, name: 'Flash' }, summonerSpellTwo: { id: 3, name: 'Exhaust' } },
        team: 'ORDER' as const
      }
    ];

    // Red Team (CHAOS)
    const redTeam = [
      {
        championName: 'Fiora',
        role: 'TOP',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.TOP_LANE],
        rawChampionName: 'fiora',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 1, creepScore: 115, deaths: 1, kills: 1, wardScore: 0 },
        skinID: 0,
        skinName: '',
        summonerName: 'RedTop',
        summonerSpells: { summonerSpellOne: { id: 12, name: 'Teleport' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'CHAOS' as const
      },
      {
        championName: 'Elise',
        role: 'JUNGLE',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 6,
        position: this.regionPositions[MapRegion.TOP_JUNGLE],
        rawChampionName: 'elise',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 2, creepScore: 70, deaths: 1, kills: 2, wardScore: 10 },
        skinID: 0,
        skinName: '',
        summonerName: 'RedJungle',
        summonerSpells: { summonerSpellOne: { id: 11, name: 'Smite' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'CHAOS' as const
      },
      {
        championName: 'Zed',
        role: 'MID',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.MID_LANE],
        rawChampionName: 'zed',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 3, creepScore: 105, deaths: 0, kills: 4, wardScore: 5 },
        skinID: 0,
        skinName: '',
        summonerName: 'RedMid',
        summonerSpells: { summonerSpellOne: { id: 4, name: 'Flash' }, summonerSpellTwo: { id: 14, name: 'Ignite' } },
        team: 'CHAOS' as const
      },
      {
        championName: 'Caitlyn',
        role: 'ADC',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 7,
        position: this.regionPositions[MapRegion.BOT_LANE],
        rawChampionName: 'caitlyn',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 3, creepScore: 135, deaths: 1, kills: 3, wardScore: 0 },
        skinID: 0,
        skinName: '',
        summonerName: 'RedADC',
        summonerSpells: { summonerSpellOne: { id: 7, name: 'Heal' }, summonerSpellTwo: { id: 4, name: 'Flash' } },
        team: 'CHAOS' as const
      },
      {
        championName: 'Thresh',
        role: 'SUPPORT',
        isBot: false,
        isDead: false,
        items: [] as any[],
        level: 6,
        position: this.regionPositions[MapRegion.BOT_LANE],
        rawChampionName: 'thresh',
        respawnTimer: 0,
        runes: {},
        scores: { assists: 5, creepScore: 20, deaths: 0, kills: 1, wardScore: 30 },
        skinID: 0,
        skinName: '',
        summonerName: 'RedSupport',
        summonerSpells: { summonerSpellOne: { id: 4, name: 'Flash' }, summonerSpellTwo: { id: 3, name: 'Exhaust' } },
        team: 'CHAOS' as const
      }
    ];

    this.players = [...blueTeam, ...redTeam];
  }

  private initializeObjectives(): void {
    this.objectives = [
      {
        type: ObjectiveType.DRAGON,
        alive: true,
        position: { x: 9800, y: 4400 }
      },
      {
        type: ObjectiveType.BARON,
        alive: true,
        position: { x: 5000, y: 10400 }
      },
      {
        type: ObjectiveType.HERALD,
        alive: true,
        position: { x: 5000, y: 10400 }
      }
    ];
  }

  private initializeLanePressures(): void {
    this.lanePressures = [
      { lane: Lane.TOP, pressure: 'neutral', inhibitorAlive: true },
      { lane: Lane.MID, pressure: 'pushing', inhibitorAlive: true },
      { lane: Lane.BOT, pressure: 'neutral', inhibitorAlive: true }
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

    // Simulate ward placement
    this.updateWards();

    // Simulate objective respawns
    this.updateObjectives();

    // Simulate lane pressure changes
    this.updateLanePressures();
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
        gankFrequency: 0.9,
        aggressionLevel: 10,
        commonTargets: [Lane.MID, Lane.TOP, Lane.BOT],
        averageGankDuration: 25
      },
      'elise': {
        championName: 'Elise',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.6,
        aggressionLevel: 4,
        commonTargets: [Lane.BOT, Lane.TOP],
        averageGankDuration: 20
      },
      'nidalee': {
        championName: 'Nidalee',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.8,
        aggressionLevel: 8,
        commonTargets: [Lane.MID, Lane.TOP],
        averageGankDuration: 22
      },
      'vi': {
        championName: 'Vi',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.7,
        aggressionLevel: 7,
        commonTargets: [Lane.TOP, Lane.MID],
        averageGankDuration: 28
      },
      'reksai': {
        championName: 'RekSai',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.8,
        aggressionLevel: 9,
        commonTargets: [Lane.BOT, Lane.TOP],
        averageGankDuration: 30
      },
      'kindred': {
        championName: 'Kindred',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.BOT_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.7,
        aggressionLevel: 6,
        commonTargets: [Lane.TOP, Lane.BOT],
        averageGankDuration: 20
      },
      'graves': {
        championName: 'Graves',
        preferredPath: [MapRegion.BOT_JUNGLE, MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE],
        gankFrequency: 0.6,
        aggressionLevel: 5,
        commonTargets: [Lane.BOT, Lane.MID],
        averageGankDuration: 18
      },
      'udyr': {
        championName: 'Udyr',
        preferredPath: [MapRegion.TOP_JUNGLE, MapRegion.MID_JUNGLE, MapRegion.BOT_JUNGLE],
        gankFrequency: 0.5,
        aggressionLevel: 3,
        commonTargets: [Lane.TOP],
        averageGankDuration: 15
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

  private updateWards(): void {
    // Remove expired wards
    this.wards = this.wards.filter(ward => this.gameTime - ward.placedAt < ward.duration);

    // Occasionally place new wards
    if (Math.random() < 0.1) { // 10% chance per second
      const positions = [
        { x: 5000, y: 5000 }, // River
        { x: 2500, y: 11000 }, // Top jungle
        { x: 11000, y: 2500 }, // Bot jungle
        { x: 7500, y: 7500 }  // Mid
      ];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const type = Math.random() < 0.7 ? WardType.VISION : WardType.PINK;
      const team = Math.random() < 0.5 ? 'ORDER' : 'CHAOS';
      const duration = type === WardType.PINK ? 150 : 90; // 2.5min pink, 1.5min vision

      this.wards.push({
        id: `ward_${this.wardCounter++}`,
        position: pos,
        type,
        team,
        placedAt: this.gameTime,
        duration
      });
    }
  }

  private updateObjectives(): void {
    this.objectives.forEach(obj => {
      if (!obj.alive && obj.respawnAt && this.gameTime >= obj.respawnAt) {
        obj.alive = true;
        obj.killedAt = undefined;
        obj.respawnAt = undefined;
      }
    });

    // Occasionally kill objectives
    if (Math.random() < 0.05) { // 5% chance per second
      const aliveObjs = this.objectives.filter(obj => obj.alive);
      if (aliveObjs.length > 0) {
        const obj = aliveObjs[Math.floor(Math.random() * aliveObjs.length)];
        obj.alive = false;
        obj.killedAt = this.gameTime;
        // Respawn times: Dragon 5min, Baron 6min, Herald 8min
        const respawnTime = obj.type === ObjectiveType.DRAGON ? 300 :
                           obj.type === ObjectiveType.BARON ? 360 : 480;
        obj.respawnAt = this.gameTime + respawnTime;
      }
    }
  }

  private updateLanePressures(): void {
    // Randomly change lane pressures
    this.lanePressures.forEach(lp => {
      if (Math.random() < 0.2) { // 20% chance per second
        const pressures: ('pushing' | 'neutral' | 'receding')[] = ['pushing', 'neutral', 'receding'];
        lp.pressure = pressures[Math.floor(Math.random() * pressures.length)];
      }
    });
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getPlayers(): Player[] {
    return this.players.map(p => ({ ...p })); // Return copies
  }

  getWards(): Ward[] {
    return [...this.wards];
  }

  getObjectives(): Objective[] {
    return this.objectives.map(o => ({ ...o }));
  }

  getLanePressures(): LanePressure[] {
    return [...this.lanePressures];
  }

  isSimulating(): boolean {
    return this.isRunning;
  }
}
