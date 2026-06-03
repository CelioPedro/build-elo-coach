import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { IncomingMessage } from 'http';
import { RiotProvider } from './providers/riotProvider';
import { MockProvider } from './providers/mockProvider';
import { JunglerTracker } from './logic/junglerTracker';
import { GankPredictor } from './logic/gankPredictor';
import { TacticalEngine } from './logic/tacticalEngine';
import { CompetitiveSignalEngine } from './logic/competitiveSignalEngine';
import { GameSessionState, GameSessionTracker, ProviderMode } from './logic/gameSessionTracker';
import { GameFactors, LanePressure, Objective, Ward } from './contracts/junglerData';
import { GameDataProvider, GameState, Telemetry } from './contracts/provider';
import { ExternalFetchType, WidgetPosition } from './contracts/ipc';
import { Player } from './contracts/gameData';
import { CompetitiveSignal } from './contracts/signals';

// Declarações globais injetadas pelo Webpack
declare global {
  const MAIN_WINDOW_WEBPACK_ENTRY: string;
  const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
}

let mainWindow: BrowserWindow | null = null;
let provider: GameDataProvider;
let providerMode: ProviderMode = 'riot';
let sessionTracker: GameSessionTracker;
let junglerTracker: JunglerTracker;
let gankPredictor: GankPredictor;
let signalEngine: CompetitiveSignalEngine;
let gameUpdateTimer: NodeJS.Timeout | null = null;
let editModeEnabled = false;

const POLLING_INTERVAL_MS: Record<GameSessionState, number> = {
  idle: 5000,
  loading: 1000,
  live: 1000,
  stalled: 2500,
  reconnecting: 2000,
  ended: 5000,
  demo: 1000
};

function applyEditMode(enabled: boolean): boolean {
  editModeEnabled = enabled;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(!editModeEnabled, editModeEnabled ? undefined : { forward: true });
    mainWindow.webContents.send('edit-mode-changed', editModeEnabled);
  }

  console.log(`[MAIN] Overlay edit mode: ${editModeEnabled ? 'enabled' : 'disabled'}`);
  return editModeEnabled;
}

// Função para criar a janela principal
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
  });

  console.log('MAIN_WINDOW_WEBPACK_ENTRY:', MAIN_WINDOW_WEBPACK_ENTRY);
  console.log('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY:', MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Click-through: Ignore mouse events by default (let them pass to game)
  // forward: true lets renderer receive lightweight pointer feedback without capturing clicks.
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // IPC handlers for mouse events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
  });

  ipcMain.handle('set-edit-mode', (_event, enabled: boolean) => applyEditMode(enabled));
  ipcMain.handle('get-edit-mode', () => editModeEnabled);

  // Log from renderer
  ipcMain.on('renderer-log', (event, message) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Widget position persistence
  const positionsFile = path.join(app.getPath('userData'), 'widget-positions.json');

  ipcMain.handle('save-widget-position', async (_event, id: string, pos: WidgetPosition) => {
    try {
      let positions: Record<string, WidgetPosition> = {};
      if (fs.existsSync(positionsFile)) {
        positions = JSON.parse(fs.readFileSync(positionsFile, 'utf-8'));
      }
      positions[id] = pos;
      fs.writeFileSync(positionsFile, JSON.stringify(positions, null, 2), 'utf-8');
      console.log(`[Widget] Saved position for ${id}: (${pos.x}, ${pos.y})`);
    } catch (err) {
      console.error('[Widget] Failed to save position:', err);
    }
  });

  ipcMain.handle('load-widget-positions', async () => {
    try {
      if (fs.existsSync(positionsFile)) {
        return JSON.parse(fs.readFileSync(positionsFile, 'utf-8'));
      }
    } catch (err) {
      console.error('[Widget] Failed to load positions:', err);
    }
    return {};
  });

  // Enviar dados iniciais para testar
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.webContents.send('edit-mode-changed', editModeEnabled);
    mainWindow?.webContents.send('game-update', {
      gameState: 'not_active',
      gameTime: null,
      waveTime: '--:--',
      isSiege: false,
      gankRisk: 'low',
      gankHypothesis: 'Aguardando partida...',
      junglerName: 'Desconhecido'
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicialização da aplicação
app.on('ready', () => {
  providerMode = process.env.ELOCOACH_PROVIDER === 'mock' ? 'mock' : 'riot';
  provider = providerMode === 'mock'
    ? new MockProvider({ autoStart: true })
    : new RiotProvider();
  console.log(`[MAIN] Data provider: ${providerMode}`);
  sessionTracker = new GameSessionTracker(providerMode);
  junglerTracker = new JunglerTracker();
  gankPredictor = new GankPredictor();
  signalEngine = new CompetitiveSignalEngine();

  createMainWindow();

  globalShortcut.register('CommandOrControl+Shift+E', () => {
    applyEditMode(!editModeEnabled);
  });

  startGameMonitoring();

  // Test Connectivity from Main Process
  const ddragonUrl = 'https://ddragon.leagueoflegends.com/cdn/15.1.1/data/en_US/champion.json';
  console.log(`[MAIN] Testing connectivity to ${ddragonUrl}...`);
  https.get(ddragonUrl, (res: IncomingMessage) => {
    console.log(`[MAIN] Connectivity Test: Status ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('[MAIN] SUCCESS: Main process can reach DDragon.');
    } else {
      console.log('[MAIN] FAIL: Main process returned non-200.');
    }
  }).on('error', (e: Error) => {
    console.log(`[MAIN] FAIL: Connection error: ${e.message}`);
  });
});

// Quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  stopGameMonitoring();
  globalShortcut.unregisterAll();
});

// IPC handlers for simulation
ipcMain.handle('fetch-external', async (_event, url: string, type: ExternalFetchType) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            if (type === 'json') {
              resolve(JSON.parse(buffer.toString()));
            } else {
              // Return base64 for images
              resolve(buffer.toString('base64'));
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
});

ipcMain.handle('start-simulation', () => {
  if (provider instanceof MockProvider) {
    provider.startSimulation();
    startGameMonitoring();
  }
});

ipcMain.handle('stop-simulation', () => {
  if (provider instanceof MockProvider) {
    provider.stopSimulation();
    startGameMonitoring();
  }
});

// Função para atualizar dados do jogo
async function updateGameData(): Promise<GameSessionState> {
  try {
    const gameState = await provider.getGameState();
    const gameTime = await provider.getGameTime();
    const session = sessionTracker.update({ gameState, gameTime });

    // Default values
    let waveTime = '--:--';
    let isSiege = false;
    let gankRisk: 'low' | 'medium' | 'high' = 'low';
    let gankHypothesis = 'Aguardando partida...';
    let junglerName = 'Desconhecido';
    let players: Player[] = [];
    let wards: Ward[] = [];
    let objectives: Objective[] = [];
    let lanePressures: LanePressure[] = [];
    let wardTelemetry: Telemetry<Ward[]> | null = null;
    let objectiveTelemetry: Telemetry<Objective[]> | null = null;
    let lanePressureTelemetry: Telemetry<LanePressure[]> | null = null;
    let signals: CompetitiveSignal[] = [];
    let error: string | null = null;
    let errorType: string | null = null;

    // If we are not active, check if we have a connection error
    if (gameState === GameState.NotActive && provider instanceof RiotProvider) {


      if (provider.lastError) {
        const errStr = provider.lastError;
        if (errStr.includes('ECONNREFUSED')) {
          error = errStr;
          errorType = 'connect_refused';
        } else if (errStr.includes('Timeout')) {
          error = errStr;
          errorType = 'timeout';
        }
      }
    }

    // Process game data if active (InGame or Loading)
    // Relaxed check: Allow null gameTime (use 0) to ensure UI updates during loading/glitches
    if (gameState === GameState.InGame || gameState === GameState.Loading) {
      try {
        players = await provider.getPlayerList();

        // Update jungler tracker
        junglerTracker.updateJunglerState(players);
        const junglerState = junglerTracker.getJunglerState();
        junglerName = junglerState?.championName || 'Desconhecido';

        wardTelemetry = await provider.getWardTelemetry();
        objectiveTelemetry = await provider.getObjectiveTelemetry();
        lanePressureTelemetry = await provider.getLanePressureTelemetry();
        wards = wardTelemetry.value || [];
        objectives = objectiveTelemetry.value || [];
        lanePressures = lanePressureTelemetry.value || [];

        const effectiveGameTime = session.gameTime;

        const gameFactors: GameFactors = {
          junglerState,
          wards,
          objectives,
          lanePressures,
          gameTime: effectiveGameTime || 0,
          wardTelemetry,
          objectiveTelemetry,
          lanePressureTelemetry
        };

        if (effectiveGameTime !== null) {
          signals = signalEngine.generateSignals(gameFactors);
          const hypothesisResult = gankPredictor.generateHypothesis(gameFactors);
          gankRisk = hypothesisResult.risk;
          gankHypothesis = hypothesisResult.hypothesis;

          const waveInfo = TacticalEngine.calculateNextWave(effectiveGameTime);
          waveTime = TacticalEngine.formatTime(waveInfo.timeLeft);
          isSiege = waveInfo.isSiege;
        } else {
          gankHypothesis = session.state === 'loading'
            ? 'Carregando partida...'
            : 'Aguardando game time confiável...';
        }

      } catch (innerError) {
        console.error('Error processing game data:', innerError);
      }
    }

    // Send payload to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      const payload = {
        gameState,
        sessionState: session.state,
        isClockAdvancing: session.isClockAdvancing,
        gameTime: session.gameTime,
        rawGameTime: gameTime,
        waveTime,
        isSiege,
        gankRisk,
        gankHypothesis,
        signals,
        junglerName,
        players,
        wards,
        objectives,
        lanePressures,
        telemetry: {
          wards: wardTelemetry,
          objectives: objectiveTelemetry,
          lanePressures: lanePressureTelemetry
        },
        error,
        errorType
      };

      mainWindow.webContents.send('game-update', payload);
    }

    return session.state;
  } catch (error) {
    console.error('Erro no monitoramento:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      let errorType = 'unknown';
      if (errorMsg.includes('ECONNREFUSED')) errorType = 'connect_refused';
      if (errorMsg.includes('Timeout')) errorType = 'timeout';
      if (errorMsg.includes('Status Code: 404')) errorType = 'not_found';

      mainWindow.webContents.send('game-update', {
        error: errorMsg,
        errorType: errorType
      });
    }
    return 'reconnecting';
  }
}

// Função para iniciar o monitoramento do jogo
function startGameMonitoring(): void {
  scheduleNextGameMonitoringTick(0);
}

function stopGameMonitoring(): void {
  if (gameUpdateTimer) {
    clearTimeout(gameUpdateTimer);
    gameUpdateTimer = null;
  }
}

function scheduleNextGameMonitoringTick(delayMs: number): void {
  if (gameUpdateTimer) {
    clearTimeout(gameUpdateTimer);
  }

  gameUpdateTimer = setTimeout(async () => {
    const sessionState = await updateGameData();
    scheduleNextGameMonitoringTick(POLLING_INTERVAL_MS[sessionState]);
  }, delayMs);
}
