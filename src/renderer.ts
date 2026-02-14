console.log('EloCoach renderer iniciado');

// Elementos da UI
const waveTimer = document.getElementById('wave-timer') as HTMLElement;
const gankAlert = document.getElementById('gank-alert') as HTMLElement;
const gameStatus = document.getElementById('game-status') as HTMLElement;
const junglerInfo = document.getElementById('jungler-info') as HTMLElement;
const waveSection = document.getElementById('wave-section') as HTMLElement;
const gankSection = document.getElementById('gank-section') as HTMLElement;
const simulationButton = document.getElementById('simulation-button') as HTMLButtonElement;

// Estado do jogo
let isGameActive = false;
let isSimulating = false;

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

  if (gameState === 'in_game' && gameTime !== null) {
    if (!isGameActive) {
      console.log('🎮 Jogo detectado!');
      isGameActive = true;
    }

    // Show detailed sections
    waveSection.style.display = 'block';
    gankSection.style.display = 'block';
    junglerInfo.style.display = 'block';

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

    // Hide detailed sections
    waveSection.style.display = 'none';
    gankSection.style.display = 'none';
    junglerInfo.style.display = 'none';

    gameStatus.textContent = 'Aguardando partida...';
  }
}

// Função para alternar simulação
async function toggleSimulation() {
  if (isSimulating) {
    await (window as any).electronAPI.stopSimulation();
    simulationButton.textContent = 'Iniciar Simulação';
    isSimulating = false;
  } else {
    await (window as any).electronAPI.startSimulation();
    simulationButton.textContent = 'Parar Simulação';
    isSimulating = true;
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 EloCoach inicializado');

  // Configurar botão de simulação
  simulationButton.addEventListener('click', toggleSimulation);

  // Escutar atualizações do main process via preload
  (window as any).electronAPI.onGameUpdate((event: any, data: any) => {
    console.log('Recebido game-update:', data);
    updateUI(data);
  });
});
