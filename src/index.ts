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

    let waveTime = '--:--';
    let isSiege = false;
    let gankRisk: 'low' | 'medium' | 'high' = 'low';
    let gankHypothesis = 'Aguardando partida...';
    let junglerName = 'Desconhecido';

    if (gameState === 'in_game' && gameTime !== null) {
      const players = await provider.getPlayerList();
      junglerTracker.updateJunglerState(players);

      const junglerState = junglerTracker.getJunglerState();
      junglerName = junglerState?.championName || 'Desconhecido';

      // Gather game factors
      const wards = await provider.getWards();
      const objectives = await provider.getObjectives();
      const lanePressures = await provider.getLanePressures();

      const gameFactors: GameFactors = {
        junglerState,
        wards,
        objectives,
        lanePressures,
        gameTime
      };

      // Generate hypothesis
      const hypothesisResult = gankPredictor.generateHypothesis(gameFactors);
      gankRisk = hypothesisResult.risk;
      gankHypothesis = hypothesisResult.hypothesis;

      const waveInfo = TacticalEngine.calculateNextWave(gameTime);
      waveTime = TacticalEngine.formatTime(waveInfo.timeLeft);
      isSiege = waveInfo.isSiege;

      consecutiveErrors = 0;
    } else {
      // Game not active, just wait. Do not increment errors.
      consecutiveErrors = 0;
    }

    // Enviar dados para a interface
    if (mainWindow && !mainWindow.isDestroyed()) {
      const players = gameState === 'in_game' ? await provider.getPlayerList() : [];
      const wards = gameState === 'in_game' ? await provider.getWards() : [];
      const objectives = gameState === 'in_game' ? await provider.getObjectives() : [];
      const lanes = gameState === 'in_game' ? await provider.getLanePressures() : [];

      mainWindow.webContents.send('game-update', {
        gameState,
        gameTime,
        waveTime,
        isSiege,
        gankRisk,
        gankHypothesis,
        junglerName,
        players,
        wards,
        objectives,
        lanePressures: lanes,
        error: null // Clear previous errors
      });
    }
  } catch (error) {
    console.error('Erro no monitoramento:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game-update', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    // Do not increment consecutiveErrors to keep retrying
    // consecutiveErrors++;
  }
}

// Função para iniciar o monitoramento do jogo
function startGameMonitoring(): void {
  gameUpdateInterval = setInterval(async () => {
    await updateGameData();
  }, 2000); // Atualizar a cada 2 segundos
}
