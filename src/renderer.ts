console.log('EloCoach renderer iniciado');

// Elementos da UI
const waveTimer = document.getElementById('wave-timer') as HTMLElement;
const gankAlert = document.getElementById('gank-alert') as HTMLElement;
const gameStatus = document.getElementById('game-status') as HTMLElement;
const junglerInfo = document.getElementById('jungler-info') as HTMLElement;

// Estado do jogo
let isGameActive = false;

// Função para atualizar UI com dados do jogo
function updateUI(data: {
  gameState: string;
  gameTime: number | null;
  waveTime: string;
  isSiege: boolean;
  gankRisk: string;
  junglerName: string;
}) {
  const { gameState, gameTime, waveTime, isSiege, gankRisk, junglerName } = data;

  junglerInfo.textContent = `Jungler: ${junglerName}`;

  if (gameState === 'in_game' && gameTime !== null) {
    if (!isGameActive) {
      console.log('🎮 Jogo detectado!');
      isGameActive = true;
    }

    waveTimer.textContent = waveTime;
    waveTimer.style.color = isSiege ? '#ff6b35' : '#00ffcc'; // Laranja para Siege, ciano normal

    gankAlert.textContent = gankRisk;
    gankAlert.className = `alert ${gankRisk.toLowerCase()}`;

    gameStatus.textContent = `Jogo ativo - ${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, '0')}`;
  } else {
    if (isGameActive) {
      console.log('❌ Jogo encerrado');
      isGameActive = false;
    }

    waveTimer.textContent = waveTime;
    waveTimer.style.color = '#00ffcc';
    gankAlert.textContent = gankRisk;
    gankAlert.className = 'alert seguro';

    if (gameState === 'loading') {
      gameStatus.textContent = 'Carregando partida...';
    } else if (gameState === 'not_active') {
      gameStatus.textContent = 'Aguardando jogo';
    } else {
      gameStatus.textContent = 'Resumo pós-jogo';
    }
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 EloCoach inicializado');

  // Escutar atualizações do main process via preload
  (window as any).electronAPI.onGameUpdate((event: any, data: any) => {
    console.log('Recebido game-update:', data);
    updateUI(data);
  });
});
