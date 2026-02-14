import { app, BrowserWindow, ipcMain } from 'electron';
import { RiotProvider } from './providers/riotProvider';
import { MockProvider } from './providers/mockProvider';
import { JunglerTracker } from './logic/junglerTracker';
import { GankPredictor } from './logic/gankPredictor';
import { TacticalEngine } from './logic/tacticalEngine';

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

  // Click-through handled by CSS pointer-events

  // Enviar dados iniciais para testar
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.webContents.send('game-update', {
      gameState: 'not_active',
      gameTime: null,
      waveTime: '--:--',
      isSiege: false,
      gankRisk: 'Seguro',
      junglerName: 'Desconhecido'
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });
}

// Inicialização da aplicação
app.on('ready', () => {
  // Use mock provider for testing
  provider = new MockProvider();
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
    let gankRisk: 'Seguro' | 'Atenção' | 'Perigo' = 'Seguro';
    let junglerName = 'Desconhecido';

    if (gameState === 'in_game' && gameTime !== null) {
      const players = await provider.getPlayerList();
      junglerTracker.updateJunglerState(players);

      const junglerState = junglerTracker.getJunglerState();
      if (junglerState) {
        junglerName = junglerState.championName;
        const gankAlerts = gankPredictor.predictGanks(junglerState);
        if (gankAlerts.length > 0) {
          const highestRisk = gankAlerts.reduce((max, alert) =>
            alert.risk === 'high' ? alert : max.risk === 'high' ? max : alert
          );
          gankRisk = highestRisk.risk === 'high' ? 'Perigo' : highestRisk.risk === 'medium' ? 'Atenção' : 'Seguro';
        }
      }

      const waveInfo = TacticalEngine.calculateNextWave(gameTime);
      waveTime = TacticalEngine.formatTime(waveInfo.timeLeft);
      isSiege = waveInfo.isSiege;

      consecutiveErrors = 0;
    } else {
      consecutiveErrors++;
      if (consecutiveErrors > 10) {
        console.log('Muitas tentativas falhadas, pausando monitoramento');
        clearInterval(gameUpdateInterval!);
        gameUpdateInterval = null;
      }
    }

    // Enviar dados para a interface
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game-update', {
        gameState,
        gameTime,
        waveTime,
        isSiege,
        gankRisk,
        junglerName
      });
    }
  } catch (error) {
    console.error('Erro no monitoramento:', error);
    consecutiveErrors++;
  }
}

// Função para iniciar o monitoramento do jogo
function startGameMonitoring(): void {
  gameUpdateInterval = setInterval(async () => {
    await updateGameData();
  }, 2000); // Atualizar a cada 2 segundos
}
