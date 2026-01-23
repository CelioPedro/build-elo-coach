import { app, BrowserWindow, screen } from 'electron';
import { RiotProvider, GameState } from './providers/riotProvider';
import { TacticalEngine } from './logic/tacticalEngine';

// Declarações globais injetadas pelo Webpack
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// SSL Bypass para permitir comunicação HTTPS com o servidor local da Riot
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow: BrowserWindow;
let riotProvider: RiotProvider;
let gameUpdateInterval: NodeJS.Timeout | null = null;
let consecutiveErrors = 0;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    height: 150, // Tamanho ideal para um timer de wave
    width: 300,
    x: Math.floor((screen.getPrimaryDisplay().workAreaSize.width - 300) / 2), // Centro horizontal
    y: 0, // Topo da tela
    transparent: true,    // HUD transparente
    backgroundColor: '#00000000', // Fundo 100% transparente
    frame: false,         // Remove bordas e botões do Windows
    alwaysOnTop: true,    // Mantém o Coach acima do LoL
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Isso permite que você jogue LoL "através" do app sem clicar nele
  mainWindow.setIgnoreMouseEvents(true);

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Inicializar provider e começar polling
  riotProvider = new RiotProvider();
  startGamePolling();
});

function startGamePolling() {
  if (gameUpdateInterval) clearInterval(gameUpdateInterval);

  gameUpdateInterval = setInterval(async () => {
    try {
      const gameState = await riotProvider.getGameState();
      console.log('Polling - GameState detectado:', gameState);

      if (gameState === GameState.InGame) {
        const gameTime = await riotProvider.getGameTime();
        console.log('GameState: InGame, GameTime:', gameTime);
        if (gameTime !== null) {
          const waveInfo = TacticalEngine.calculateNextWave(gameTime);
          const gankRisk = TacticalEngine.calculateGankRisk(gameTime);
          const formattedTime = TacticalEngine.formatTime(waveInfo.timeLeft);
          const jungler = await riotProvider.getJungler();
          const junglerName = jungler ? jungler.championName : 'Desconhecido';

          console.log('Enviando update para renderer:', { gameState, gameTime, waveTime: formattedTime, gankRisk, junglerName });
          // Enviar dados para o renderer
          mainWindow.webContents.send('game-update', {
            gameState,
            gameTime,
            waveTime: formattedTime,
            isSiege: waveInfo.isSiege,
            gankRisk,
            junglerName,
          });
          consecutiveErrors = 0; // Reset on success
        } else {
          console.log('GameTime é null mesmo em InGame, fallback para not_active');
          mainWindow.webContents.send('game-update', {
            gameState: GameState.NotActive,
            gameTime: null,
            waveTime: '--:--',
            isSiege: false,
            gankRisk: 'Seguro',
            junglerName: 'Desconhecido',
          });
        }
      } else {
        // Jogo não ativo ou carregando
        console.log('GameState:', gameState);
        let junglerName = 'Desconhecido';
        if (gameState === GameState.Loading) {
          const jungler = await riotProvider.getJunglerLoading();
          junglerName = jungler ? jungler.championName : 'Desconhecido';
        }

        mainWindow.webContents.send('game-update', {
          gameState,
          gameTime: null,
          waveTime: '--:--',
          isSiege: false,
          gankRisk: 'Seguro',
          junglerName,
        });
        consecutiveErrors = 0; // Reset on success
      }
    } catch (error) {
      consecutiveErrors++;
      console.error(`Erro no polling (${consecutiveErrors}):`, error.message);

      if (consecutiveErrors > 5) {
        // Após 5 erros consecutivos, enviar estado de erro
        mainWindow.webContents.send('game-update', {
          gameState: 'error',
          gameTime: null,
          waveTime: '--:--',
          isSiege: false,
          gankRisk: 'Seguro',
          junglerName: 'Erro',
        });
      } else {
        // Ainda tentando, enviar estado not_active
        mainWindow.webContents.send('game-update', {
          gameState: GameState.NotActive,
          gameTime: null,
          waveTime: '--:--',
          isSiege: false,
          gankRisk: 'Seguro',
          junglerName: 'Desconhecido',
        });
      }
    }
  }, 1000); // Polling a cada 1 segundo
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
