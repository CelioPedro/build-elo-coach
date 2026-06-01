export interface WaveInfo {
  timeLeft: number;
  isSiege: boolean;
  waveNumber: number;
  spawnTime: number;
  phase: 'pre_spawn' | 'early' | 'mid' | 'late';
  composition: {
    melee: number;
    caster: number;
    siege: number;
    super: number;
  };
}

export type GankRisk = 'Seguro' | 'Atencao' | 'Perigo';

export class TacticalEngine {
  private static readonly FIRST_WAVE_SPAWN = 65;
  private static readonly WAVE_INTERVAL = 30;
  private static readonly MID_SIEGE_START = 905; // 15:05
  private static readonly LATE_SIEGE_START = 1505; // 25:05

  static calculateNextWave(gameTime: number): WaveInfo {
    const normalizedTime = Math.max(0, gameTime);
    const waveNumber = this.getNextWaveNumber(normalizedTime);
    const spawnTime = this.getWaveSpawnTime(waveNumber);
    const timeLeft = Math.max(0, spawnTime - normalizedTime);
    const isSiege = this.isSiegeWave(waveNumber, spawnTime);

    return {
      timeLeft,
      isSiege,
      waveNumber,
      spawnTime,
      phase: this.getWavePhase(spawnTime),
      composition: {
        melee: 3,
        caster: 3,
        siege: isSiege ? 1 : 0,
        super: 0
      }
    };
  }

  static calculateGankRisk(gameTime: number): GankRisk {
    const highRiskWindows = [
      [165, 200], // 2:45 - 3:20
      [345, 380], // 5:45 - 6:20
      [525, 560], // 8:45 - 9:20
      [705, 740], // 11:45 - 12:20
    ];

    const mediumRiskWindows = [
      [120, 165], // 2:00 - 2:45
      [200, 240], // 3:20 - 4:00
      [300, 345], // 5:00 - 5:45
      [380, 420], // 6:20 - 7:00
      [480, 525], // 8:00 - 8:45
      [560, 600], // 9:20 - 10:00
      [660, 705], // 11:00 - 11:45
      [740, 780], // 12:20 - 13:00
    ];

    for (const [start, end] of highRiskWindows) {
      if (gameTime >= start && gameTime <= end) return 'Perigo';
    }

    for (const [start, end] of mediumRiskWindows) {
      if (gameTime >= start && gameTime <= end) return 'Atencao';
    }

    return 'Seguro';
  }

  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private static getNextWaveNumber(gameTime: number): number {
    if (gameTime < this.FIRST_WAVE_SPAWN) {
      return 1;
    }

    return Math.floor((gameTime - this.FIRST_WAVE_SPAWN) / this.WAVE_INTERVAL) + 2;
  }

  private static getWaveSpawnTime(waveNumber: number): number {
    return this.FIRST_WAVE_SPAWN + ((waveNumber - 1) * this.WAVE_INTERVAL);
  }

  private static isSiegeWave(waveNumber: number, spawnTime: number): boolean {
    if (spawnTime >= this.LATE_SIEGE_START) {
      return true;
    }

    if (spawnTime >= this.MID_SIEGE_START) {
      return waveNumber % 2 === 1;
    }

    return waveNumber % 3 === 0;
  }

  private static getWavePhase(spawnTime: number): WaveInfo['phase'] {
    if (spawnTime < this.FIRST_WAVE_SPAWN) return 'pre_spawn';
    if (spawnTime >= this.LATE_SIEGE_START) return 'late';
    if (spawnTime >= this.MID_SIEGE_START) return 'mid';
    return 'early';
  }
}
