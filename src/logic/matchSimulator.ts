import { Player, PlayerRole, SummonerSpells } from '../contracts/gameData';
import { Lane, LanePressure, MapRegion, Objective, ObjectiveType, Position, Ward, WardType } from '../contracts/junglerData';

type Team = Player['team'];

interface DemoChampion {
  championName: string;
  role: PlayerRole;
  team: Team;
  summonerName: string;
  summonerSpells: SummonerSpells;
  position: Position;
}

const POSITIONS: Record<MapRegion, Position> = {
  [MapRegion.BASE]: { x: 1500, y: 1500 },
  [MapRegion.TOP_JUNGLE]: { x: 3000, y: 10800 },
  [MapRegion.MID_JUNGLE]: { x: 7600, y: 7200 },
  [MapRegion.BOT_JUNGLE]: { x: 11200, y: 2800 },
  [MapRegion.TOP_LANE]: { x: 2600, y: 12800 },
  [MapRegion.MID_LANE]: { x: 7600, y: 7600 },
  [MapRegion.BOT_LANE]: { x: 12400, y: 2600 },
  [MapRegion.RIVER]: { x: 4200, y: 9400 }
};

const SMITE_FLASH: SummonerSpells = {
  summonerSpellOne: { id: 11, name: 'Smite', displayName: 'Smite' },
  summonerSpellTwo: { id: 4, name: 'Flash', displayName: 'Flash' }
};

const FLASH_TELEPORT: SummonerSpells = {
  summonerSpellOne: { id: 4, name: 'Flash', displayName: 'Flash' },
  summonerSpellTwo: { id: 12, name: 'Teleport', displayName: 'Teleport' }
};

const FLASH_IGNITE: SummonerSpells = {
  summonerSpellOne: { id: 4, name: 'Flash', displayName: 'Flash' },
  summonerSpellTwo: { id: 14, name: 'Ignite', displayName: 'Ignite' }
};

const FLASH_EXHAUST: SummonerSpells = {
  summonerSpellOne: { id: 4, name: 'Flash', displayName: 'Flash' },
  summonerSpellTwo: { id: 3, name: 'Exhaust', displayName: 'Exhaust' }
};

const FLASH_HEAL: SummonerSpells = {
  summonerSpellOne: { id: 4, name: 'Flash', displayName: 'Flash' },
  summonerSpellTwo: { id: 7, name: 'Heal', displayName: 'Heal' }
};

const DEMO_DRAFT: DemoChampion[] = [
  {
    championName: 'Renekton',
    role: 'TOP',
    team: 'CHAOS',
    summonerName: 'RedTop',
    summonerSpells: FLASH_TELEPORT,
    position: POSITIONS[MapRegion.TOP_LANE]
  },
  {
    championName: 'LeeSin',
    role: 'JUNGLE',
    team: 'CHAOS',
    summonerName: 'RedJungle',
    summonerSpells: SMITE_FLASH,
    position: POSITIONS[MapRegion.BOT_JUNGLE]
  },
  {
    championName: 'Ahri',
    role: 'MID',
    team: 'CHAOS',
    summonerName: 'RedMid',
    summonerSpells: FLASH_IGNITE,
    position: POSITIONS[MapRegion.MID_LANE]
  },
  {
    championName: 'Draven',
    role: 'ADC',
    team: 'CHAOS',
    summonerName: 'RedADC',
    summonerSpells: FLASH_HEAL,
    position: POSITIONS[MapRegion.BOT_LANE]
  },
  {
    championName: 'Nautilus',
    role: 'SUPPORT',
    team: 'CHAOS',
    summonerName: 'RedSupport',
    summonerSpells: FLASH_EXHAUST,
    position: POSITIONS[MapRegion.BOT_LANE]
  },
  {
    championName: 'Jax',
    role: 'TOP',
    team: 'ORDER',
    summonerName: 'BlueTop',
    summonerSpells: FLASH_TELEPORT,
    position: { x: 3200, y: 12100 }
  },
  {
    championName: 'Sejuani',
    role: 'JUNGLE',
    team: 'ORDER',
    summonerName: 'BlueJungle',
    summonerSpells: SMITE_FLASH,
    position: POSITIONS[MapRegion.TOP_JUNGLE]
  },
  {
    championName: 'Orianna',
    role: 'MID',
    team: 'ORDER',
    summonerName: 'BlueMid',
    summonerSpells: FLASH_IGNITE,
    position: POSITIONS[MapRegion.MID_LANE]
  },
  {
    championName: 'Jinx',
    role: 'ADC',
    team: 'ORDER',
    summonerName: 'BlueADC',
    summonerSpells: FLASH_HEAL,
    position: POSITIONS[MapRegion.BOT_LANE]
  },
  {
    championName: 'Lulu',
    role: 'SUPPORT',
    team: 'ORDER',
    summonerName: 'BlueSupport',
    summonerSpells: FLASH_EXHAUST,
    position: POSITIONS[MapRegion.BOT_LANE]
  }
];

const MATCH_END_TIME = 1500;

export class MatchSimulator {
  private gameTime = 0;
  private isRunning = false;
  private hasEnded = false;
  private intervalId: NodeJS.Timeout | null = null;
  private players: Player[] = [];
  private wards: Ward[] = [];
  private objectives: Objective[] = [];
  private lanePressures: LanePressure[] = [];

  constructor() {
    this.resetScenario();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.hasEnded = false;
    this.gameTime = 0;
    this.resetScenario();
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
    if (this.hasEnded) return;

    this.gameTime += 1;
    this.applyLeeSinLevelThreeScenario();

    if (this.gameTime >= MATCH_END_TIME) {
      this.completeMatch();
    }
  }

  private resetScenario(): void {
    this.players = DEMO_DRAFT.map(champion => this.createPlayer(champion));
    this.applyLeeSinLevelThreeScenario();
  }

  private applyLeeSinLevelThreeScenario(): void {
    this.updateLeeSinPath();
    this.updateLanePressures();
    this.updateWards();
    this.updateObjectives();
  }

  private updateLeeSinPath(): void {
    const leeSin = this.findPlayer('LeeSin');
    if (!leeSin) return;

    leeSin.isDead = false;
    leeSin.respawnTimer = 0;

    if (this.gameTime < 90) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.BASE], 1, 0);
      return;
    }

    if (this.gameTime < 120) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.BOT_JUNGLE], 1, 0);
      return;
    }

    if (this.gameTime < 140) {
      this.setPlayerState(leeSin, { x: 12100, y: 1900 }, 2, 4);
      return;
    }

    if (this.gameTime < 160) {
      this.setPlayerState(leeSin, { x: 9100, y: 4300 }, 2, 8);
      return;
    }

    if (this.gameTime < 192) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.TOP_JUNGLE], 3, 12);
      return;
    }

    if (this.gameTime < 218) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.TOP_LANE], 3, 12);
      return;
    }

    leeSin.scores.kills = 1;

    if (this.gameTime < 245) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.RIVER], 3, 12);
      return;
    }

    if (this.gameTime < 270) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.BASE], 4, 16);
      return;
    }

    if (this.gameTime < 300) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.BOT_JUNGLE], 4, 20);
      return;
    }

    if (this.gameTime < 342) {
      this.setPlayerState(leeSin, { x: 9600, y: 4700 }, 4, 20);
      return;
    }

    if (this.gameTime < 420) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.BOT_JUNGLE], 5, 32);
      return;
    }

    if (this.gameTime < 540) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.TOP_JUNGLE], 6, 48);
      return;
    }

    if (this.gameTime < 690) {
      this.setPlayerState(leeSin, { x: 9600, y: 4700 }, 7, 64);
      return;
    }

    if (this.gameTime < 840) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.TOP_JUNGLE], 8, 80);
      return;
    }

    if (this.gameTime < 900) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.RIVER], 9, 92);
      return;
    }

    if (this.gameTime < 1080) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.MID_LANE], 10, 108);
      return;
    }

    if (this.gameTime < 1200) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.TOP_JUNGLE], 11, 128);
      return;
    }

    if (this.gameTime < 1260) {
      this.setPlayerState(leeSin, { x: 5000, y: 10400 }, 12, 140);
      return;
    }

    if (this.gameTime < 1440) {
      this.setPlayerState(leeSin, POSITIONS[MapRegion.MID_LANE], 14, 164);
      leeSin.scores.kills = 4;
      leeSin.scores.assists = 8;
      return;
    }

    this.setPlayerState(leeSin, { x: 14000, y: 14000 }, 15, 180);
    leeSin.scores.kills = 5;
    leeSin.scores.assists = 10;
  }

  private updateLanePressures(): void {
    const topPressure: LanePressure['pressure'] = this.gameTime >= 105 && this.gameTime < 215
      ? 'pushing'
      : this.gameTime >= 215 ? 'receding' : 'neutral';

    const midPressure: LanePressure['pressure'] = this.gameTime >= 900 && this.gameTime < 1080
      ? 'pushing'
      : this.gameTime >= 1260 ? 'pushing' : this.gameTime >= 135 && this.gameTime < 190 ? 'pushing' : 'neutral';
    const botPressure: LanePressure['pressure'] = this.gameTime >= 620 && this.gameTime < 690
      ? 'pushing'
      : this.gameTime >= 285 && this.gameTime < 345 ? 'receding' : 'neutral';

    this.lanePressures = [
      { lane: Lane.TOP, pressure: this.gameTime >= 810 && this.gameTime < 900 ? 'pushing' : topPressure, towerHealth: this.gameTime >= 900 ? 45 : 100, inhibitorAlive: this.gameTime < 1380 },
      { lane: Lane.MID, pressure: midPressure, towerHealth: this.gameTime >= 1080 ? 35 : 100, inhibitorAlive: this.gameTime < 1440 },
      { lane: Lane.BOT, pressure: botPressure, towerHealth: this.gameTime >= 690 ? 65 : 100, inhibitorAlive: true }
    ];

    const jax = this.findPlayer('Jax');
    if (jax) {
      jax.position = topPressure === 'pushing'
        ? { x: 3500, y: 11800 }
        : { x: 2600, y: 12800 };
      jax.isDead = this.gameTime >= 218 && this.gameTime < 238;
      jax.respawnTimer = jax.isDead ? 12 : 0;
      jax.scores.deaths = this.gameTime >= 218 ? 1 : 0;
    }
  }

  private updateWards(): void {
    this.wards = [];

    if (this.gameTime >= 128 && this.gameTime < 218) {
      this.wards.push({
        id: 'order_top_river_trinket',
        position: { x: 3900, y: 10100 },
        type: WardType.VISION,
        team: 'ORDER',
        placedAt: 128,
        duration: 90
      });
    }

    if (this.gameTime >= 580 && this.gameTime < 690) {
      this.wards.push({
        id: 'chaos_dragon_control',
        position: { x: 9300, y: 5100 },
        type: WardType.PINK,
        team: 'CHAOS',
        placedAt: 580,
        duration: 180
      });
    }

    if (this.gameTime >= 1140 && this.gameTime < 1260) {
      this.wards.push({
        id: 'chaos_baron_control',
        position: { x: 5200, y: 9900 },
        type: WardType.PINK,
        team: 'CHAOS',
        placedAt: 1140,
        duration: 180
      });
    }
  }

  private updateObjectives(): void {
    this.objectives = [
      this.getDragonState(),
      {
        type: ObjectiveType.HERALD,
        alive: this.gameTime >= 840 && this.gameTime < 900,
        killedAt: this.gameTime >= 900 ? 900 : undefined,
        respawnAt: this.gameTime < 840 ? 840 : undefined,
        position: { x: 5000, y: 10400 }
      },
      {
        type: ObjectiveType.BARON,
        alive: this.gameTime >= 1200 && this.gameTime < 1260,
        killedAt: this.gameTime >= 1260 ? 1260 : undefined,
        respawnAt: this.gameTime < 1200 ? 1200 : this.gameTime >= 1260 ? 1620 : undefined,
        position: { x: 5000, y: 10400 }
      }
    ];
  }

  private getDragonState(): Objective {
    if (this.gameTime < 300) {
      return { type: ObjectiveType.DRAGON, alive: false, respawnAt: 300, position: { x: 9800, y: 4400 } };
    }

    if (this.gameTime < 342) {
      return { type: ObjectiveType.DRAGON, alive: true, position: { x: 9800, y: 4400 } };
    }

    if (this.gameTime < 642) {
      return { type: ObjectiveType.DRAGON, alive: false, killedAt: 342, respawnAt: 642, position: { x: 9800, y: 4400 } };
    }

    if (this.gameTime < 690) {
      return { type: ObjectiveType.DRAGON, alive: true, position: { x: 9800, y: 4400 } };
    }

    return { type: ObjectiveType.DRAGON, alive: false, killedAt: 690, respawnAt: 990, position: { x: 9800, y: 4400 } };
  }

  private completeMatch(): void {
    this.hasEnded = true;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private createPlayer(champion: DemoChampion): Player {
    return {
      championName: champion.championName,
      role: champion.role,
      isBot: false,
      isDead: false,
      items: [],
      level: 1,
      position: { ...champion.position },
      rawChampionName: champion.championName.toLowerCase(),
      respawnTimer: 0,
      runes: {},
      scores: { assists: 0, creepScore: 0, deaths: 0, kills: 0, wardScore: 0 },
      skinID: 0,
      skinName: '',
      summonerName: champion.summonerName,
      summonerSpells: champion.summonerSpells,
      team: champion.team
    };
  }

  private findPlayer(championName: string): Player | undefined {
    return this.players.find(player => player.championName === championName);
  }

  private setPlayerState(player: Player, position: Position, level: number, creepScore: number): void {
    player.position = { ...position };
    player.level = level;
    player.scores.creepScore = creepScore;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  getPlayers(): Player[] {
    return this.players.map(player => ({
      ...player,
      position: { ...player.position },
      scores: { ...player.scores },
      summonerSpells: {
        summonerSpellOne: { ...player.summonerSpells.summonerSpellOne },
        summonerSpellTwo: { ...player.summonerSpells.summonerSpellTwo }
      }
    }));
  }

  getWards(): Ward[] {
    return this.wards.map(ward => ({ ...ward, position: { ...ward.position } }));
  }

  getObjectives(): Objective[] {
    return this.objectives.map(objective => ({ ...objective, position: { ...objective.position } }));
  }

  getLanePressures(): LanePressure[] {
    return this.lanePressures.map(lanePressure => ({ ...lanePressure }));
  }

  isSimulating(): boolean {
    return this.isRunning;
  }

  isEnded(): boolean {
    return this.hasEnded;
  }
}
