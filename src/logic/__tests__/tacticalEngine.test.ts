import { TacticalEngine } from '../tacticalEngine';

describe('TacticalEngine wave model', () => {
  test('counts down to the first wave spawn at 1:05', () => {
    const wave = TacticalEngine.calculateNextWave(0);

    expect(wave.waveNumber).toBe(1);
    expect(wave.spawnTime).toBe(65);
    expect(wave.timeLeft).toBe(65);
    expect(wave.isSiege).toBe(false);
    expect(wave.phase).toBe('early');
  });

  test('uses the next spawn after a wave has just spawned', () => {
    const wave = TacticalEngine.calculateNextWave(65);

    expect(wave.waveNumber).toBe(2);
    expect(wave.spawnTime).toBe(95);
    expect(wave.timeLeft).toBe(30);
  });

  test('marks the third wave as the first siege wave', () => {
    const wave = TacticalEngine.calculateNextWave(96);

    expect(wave.waveNumber).toBe(3);
    expect(wave.spawnTime).toBe(125);
    expect(wave.isSiege).toBe(true);
    expect(wave.composition.siege).toBe(1);
  });

  test('switches siege cadence to every other wave at 15:05', () => {
    const siegeWave = TacticalEngine.calculateNextWave(900);
    const nonSiegeWave = TacticalEngine.calculateNextWave(905);

    expect(siegeWave.waveNumber).toBe(29);
    expect(siegeWave.phase).toBe('mid');
    expect(siegeWave.isSiege).toBe(true);

    expect(nonSiegeWave.waveNumber).toBe(30);
    expect(nonSiegeWave.isSiege).toBe(false);
  });

  test('marks every wave as siege from 25:05 onward', () => {
    const wave = TacticalEngine.calculateNextWave(1505);

    expect(wave.phase).toBe('late');
    expect(wave.isSiege).toBe(true);
    expect(wave.composition.siege).toBe(1);
  });

  test('formats seconds as minute clock text', () => {
    expect(TacticalEngine.formatTime(65)).toBe('1:05');
  });
});
