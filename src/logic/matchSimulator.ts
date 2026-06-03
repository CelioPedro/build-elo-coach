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

export class MatchSimulator {
  private gameTime = 0;
  private isRunning = false;
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
    this.gameTime += 1;
    this.applyLeeSinLevelThreeScenario();
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

    this.setPlayerState(leeSin, POSITIONS[MapRegion.RIVER], 3, 12);
    leeSin.scores.kills = 1;
  }

  private updateLanePressures(): void {
    const topPressure: LanePressure['pressure'] = this.gameTime >= 105 && this.gameTime < 215
      ? 'pushing'
      : this.gameTime >= 215 ? 'receding' : 'neutral';

    this.lanePressures = [
      { lane: Lane.TOP, pressure: topPressure, towerHealth: 100, inhibitorAlive: true },
      { lane: Lane.MID, pressure: this.gameTime >= 135 && this.gameTime < 190 ? 'pushing' : 'neutral', towerHealth: 100, inhibitorAlive: true },
      { lane: Lane.BOT, pressure: this.gameTime >= 150 && this.gameTime < 210 ? 'receding' : 'neutral', towerHealth: 100, inhibitorAlive: true }
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
  }

  private updateObjectives(): void {
    this.objectives = [
      {
        type: ObjectiveType.DRAGON,
        alive: this.gameTime >= 300,
        respawnAt: this.gameTime < 300 ? 300 : undefined,
        position: { x: 9800, y: 4400 }
      },
      {
        type: ObjectiveType.HERALD,
        alive: this.gameTime >= 840 && this.gameTime < 1200,
        respawnAt: this.gameTime < 840 ? 840 : undefined,
        position: { x: 5000, y: 10400 }
      },
      {
        type: ObjectiveType.BARON,
        alive: this.gameTime >= 1200,
        respawnAt: this.gameTime < 1200 ? 1200 : undefined,
        position: { x: 5000, y: 10400 }
      }
    ];
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
}
