import { app, BrowserWindow, ipcMain } from 'electron';
import { RiotProvider } from './providers/riotProvider';
import { MockProvider } from './providers/mockProvider';
import { JunglerTracker } from './logic/junglerTracker';
import { GankPredictor } from './logic/gankPredictor';
import { TacticalEngine } from './logic/tacticalEngine';
import { GameFactors } from './contracts/junglerData';

// Declarações globais injetadas pelo Webpack
declare global {
  const MAIN_WINDOW_WEBPACK_ENTRY: string;
  const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
}

let mainWindow: BrowserWindow;
let provider: RiotProvider | MockProvider;
let junglerTracker: JunglerTracker;
let gankPredictor: GankPredictor;
let gameUpdateInterval: NodeJS.Timeout | null = null;
let consecutiveErrors = 0;

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
    },
  });

  console.log('MAIN_WINDOW_WEBPACK_ENTRY:', MAIN_WINDOW_WEBPACK_ENTRY);
  console.log('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY:', MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Click-through: Ignore mouse events by default (let them pass to game)
  // forward: true is needed to allow hover events to still reach the window (for mouseenter/leave)
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // IPC handlers for mouse events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
  });

  // Log from renderer
  ipcMain.on('renderer-log', (event, message) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Enviar dados iniciais para testar
  mainWindow.webContents.once('did-finish-load', () => {
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
    mainWindow = null as any;
  });
}

// Inicialização da aplicação
app.on('ready', () => {
  // Initialize Riot Provider for live data
  provider = new RiotProvider();
  // provider = new MockProvider();
  junglerTracker = new JunglerTracker();
  gankPredictor = new GankPredictor();

  createMainWindow();

  // Iniciar monitoramento do jogo
  startGameMonitoring();
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

// IPC handlers for simulation
ipcMain.handle('start-simulation', () => {
  if (provider instanceof MockProvider) {
    provider.startSimulation();
    // Change polling to 1s for simulation
    if (gameUpdateInterval) {
      clearInterval(gameUpdateInterval);
    }
    gameUpdateInterval = setInterval(async () => {
      await updateGameData();
    }, 1000);
  }
});

ipcMain.handle('stop-simulation', () => {
  if (provider instanceof MockProvider) {
    provider.stopSimulation();
    // Change back to 2s polling
    if (gameUpdateInterval) {
      clearInterval(gameUpdateInterval);
    }
    gameUpdateInterval = setInterval(async () => {
      await updateGameData();
    }, 2000);
  }
});

// Função para atualizar dados do jogo
async function updateGameData(): Promise<void> {
  try {
    const gameState = await provider.getGameState();
    const gameTime = await provider.getGameTime();

    // Debug log to trace state
    console.log(`[DEBUG] GameState: ${gameState}, GameTime: ${gameTime}`);

    // Default values
    let waveTime = '--:--';
    let isSiege = false;
    let gankRisk: 'low' | 'medium' | 'high' = 'low';
    let gankHypothesis = 'Aguardando partida...';
    let junglerName = 'Desconhecido';
    let players: any[] = [];
    let wards: any[] = [];
    let objectives: any[] = [];
    let lanePressures: any[] = [];
    let error: string | null = null;
    let errorType: string | null = null;

    // If we are not active, check if we have a connection error
    if (gameState === 'not_active' && provider instanceof RiotProvider) {


      if (provider.lastError) {
        const errStr = provider.lastError;
        console.log('[DEBUG] Last Error:', errStr);
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
    if (gameState === 'in_game' || gameState === 'loading') {
      try {
        players = await provider.getPlayerList();

        if (players.length > 0) {
          // Debug logging for champion names
          console.log('[DEBUG] First Player:', JSON.stringify(players[0]));
          console.log(`[DEBUG] Champion: ${players[0].championName}, Raw: ${players[0].rawChampionName}`);
        }

        // Update jungler tracker
        junglerTracker.updateJunglerState(players);
        const junglerState = junglerTracker.getJunglerState();
        junglerName = junglerState?.championName || 'Desconhecido';

        wards = await provider.getWards();
        objectives = await provider.getObjectives();
        lanePressures = await provider.getLanePressures();

        // Calculate strategies if we have time
        const safeGameTime = gameTime || 0;

        const gameFactors: GameFactors = {
          junglerState,
          wards,
          objectives,
          lanePressures,
          gameTime: safeGameTime
        };

        const hypothesisResult = gankPredictor.generateHypothesis(gameFactors);
        gankRisk = hypothesisResult.risk;
        gankHypothesis = hypothesisResult.hypothesis;

        const waveInfo = TacticalEngine.calculateNextWave(safeGameTime);
        waveTime = TacticalEngine.formatTime(waveInfo.timeLeft);
        isSiege = waveInfo.isSiege;

        consecutiveErrors = 0;
      } catch (innerError) {
        console.error('Error processing game data:', innerError);
      }
    } else {
      consecutiveErrors = 0;
    }

    // Send payload to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      const payload = {
        gameState,
        gameTime: gameTime || 0,
        waveTime,
        isSiege,
        gankRisk,
        gankHypothesis,
        junglerName,
        players,
        wards,
        objectives,
        lanePressures,
        error,
        errorType
      };

      // Log payload for debugging if needed
      if (gameState !== 'not_active') {
        // console.log('[DEBUG] Sending Payload:', JSON.stringify(payload));
      }

      mainWindow.webContents.send('game-update', payload);
    }

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
  }
}

// Função para iniciar o monitoramento do jogo
function startGameMonitoring(): void {
  gameUpdateInterval = setInterval(async () => {
    await updateGameData();
  }, 2000); // Atualizar a cada 2 segundos
}
