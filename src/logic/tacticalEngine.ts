export interface WaveInfo {
  timeLeft: number;
  isSiege: boolean;
}

export type GankRisk = 'Seguro' | 'Atenção' | 'Perigo';

export class TacticalEngine {
  /**
   * Calcula informações da próxima wave
   */
  static calculateNextWave(gameTime: number): WaveInfo {
    const waveInterval = 30; // segundos
    const siegeStart = 90; // 1:30
    const siegeInterval = 180; // 3 minutos

    const nextWave = Math.ceil(gameTime / waveInterval) * waveInterval;
    const timeLeft = nextWave - gameTime;

    // Verifica se é wave de Siege
    const isSiege = (nextWave >= siegeStart) && ((nextWave - siegeStart) % siegeInterval === 0);

    return { timeLeft, isSiege };
  }

  /**
   * Calcula nível de risco de gank baseado no tempo
   */
  static calculateGankRisk(gameTime: number): GankRisk {
    // Janelas de alto risco baseadas em timings típicos de gank
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
      if (gameTime >= start && gameTime <= end) return 'Atenção';
    }

    return 'Seguro';
  }

  /**
   * Formata tempo em MM:SS
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
