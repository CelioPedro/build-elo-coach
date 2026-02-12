import { app, BrowserWindow, ipcMain } from 'electron';
import { RiotProvider } from './providers/riotProvider';
import { JunglerTracker } from './logic/junglerTracker';
import { GankPredictor } from './logic/gankPredictor';

// Declarações globais injetadas pelo Webpack
declare global {
  const MAIN_WINDOW_WEBPACK_ENTRY: string;
  const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
}

let mainWindow: BrowserWindow;
let riotProvider: RiotProvider;
let junglerTracker: JunglerTracker;
let gankPredictor: GankPredictor;
let gameUpdateInterval: NodeJS.Timeout | null = null;
let consecutiveErrors = 0;

// Função para criar a janela principal
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  console.log('MAIN_WINDOW_WEBPACK_ENTRY:', MAIN_WINDOW_WEBPACK_ENTRY);
  console.log('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY:', MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.show();
  mainWindow.focus();

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
  riotProvider = new RiotProvider();
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

// Função para iniciar o monitoramento do jogo
function startGameMonitoring(): void {
  gameUpdateInterval = setInterval(async () => {
    try {
      const gameState = await riotProvider.getGameState();

      if (gameState === 'in_game') {
        const players = await riotProvider.getPlayerList();
        junglerTracker.updateJunglerState(players);

        const junglerState = junglerTracker.getJunglerState();
        if (junglerState) {
          const gankAlerts = gankPredictor.predictGanks(junglerState);
          // TODO: Enviar alertas para a interface
          console.log('Gank alerts:', gankAlerts);
        }

        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        if (consecutiveErrors > 10) {
          console.log('Muitas tentativas falhadas, pausando monitoramento');
          clearInterval(gameUpdateInterval!);
          gameUpdateInterval = null;
        }
      }
    } catch (error) {
      console.error('Erro no monitoramento:', error);
      consecutiveErrors++;
    }
  }, 2000); // Atualizar a cada 2 segundos
}
