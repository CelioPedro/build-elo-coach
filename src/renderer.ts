console.log('EloCoach renderer iniciado');

// Elementos da UI
const waveTimer = document.getElementById('wave-timer') as HTMLElement;
const gankAlert = document.getElementById('gank-alert') as HTMLElement;
const gankHypothesisEl = document.getElementById('gank-hypothesis') as HTMLElement;
const gameStatus = document.getElementById('game-status') as HTMLElement;
const junglerInfo = document.getElementById('jungler-info') as HTMLElement;
const waveSection = document.getElementById('wave-section') as HTMLElement;
const gankSection = document.getElementById('gank-section') as HTMLElement;
const enemyTeam = document.getElementById('enemy-team') as HTMLElement;
const enemyChampions = document.getElementById('enemy-champions') as HTMLElement;
// const simulationButton = document.getElementById('simulation-button') as HTMLButtonElement;

// Estado do jogo
let isGameActive = false;
let isSimulating = false;

// Funções para atualizar seções específicas
function updateEnemyChampions(players: any[], wards: any[], gameTime: number | null) {
  const enemyPlayers = players.filter(p => p.team === 'CHAOS');
  enemyChampions.innerHTML = '';

  enemyPlayers.forEach(player => {
    const champDiv = document.createElement('div');
    champDiv.className = `enemy-champion ${player.isDead ? 'dead' : ''}`;

    // Adicionar imagem do campeão
    // Adicionar imagem do campeão
    const champImg = document.createElement('img');

    // Normalização do nome para DDragon
    // Tentativa 1: DDragon com rawChampionName sanitizado
    const safeChampName = player.rawChampionName.replace(/[^a-zA-Z0-9]/g, '');
    const ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${safeChampName}.png`;

    // Tentativa 2: CommunityDragon (Generic, costuma ser mais permissivo ou usar IDs)
    const cdragonUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${player.skinID || 0}.png`;

    champImg.src = ddragonUrl;
    champImg.style.width = '20px';
    champImg.style.height = '20px';
    champImg.style.borderRadius = '2px';
    champImg.setAttribute('data-fallback-index', '0');

    // Error handler for fallback sequence
    champImg.onerror = () => {
      const fallbackIndex = parseInt(champImg.getAttribute('data-fallback-index') || '0');
      if (fallbackIndex === 0) {
        console.warn(`[EloCoach] Falha DDragon (${ddragonUrl}). Tentando CDragon.`);
        champImg.src = cdragonUrl;
        champImg.setAttribute('data-fallback-index', '1');
      } else if (fallbackIndex === 1) {
        console.warn(`[EloCoach] Falha CDragon (${cdragonUrl}). Usando placeholder.`);
        champImg.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg';
        champImg.setAttribute('data-fallback-index', '2');
      }
    };
    champDiv.appendChild(champImg);

    // Verificar se foi visto recentemente por ward
    const recentWards = wards.filter(w => gameTime && (gameTime - w.placedAt) < 30); // wards dos últimos 30s
    const isVisible = recentWards.some(w => isNearWard(player.position, w.position));

    if (isVisible) {
      const lastSeen = Math.floor((gameTime || 0) - (recentWards[0]?.placedAt || 0));
      const visionDiv = document.createElement('div');
      visionDiv.className = 'champion-vision';
      visionDiv.textContent = `Visto ${lastSeen}s atrás`;
      visionDiv.style.fontSize = '6px';
      visionDiv.style.color = '#00ffcc';
      visionDiv.style.marginTop = '2px';
      champDiv.appendChild(visionDiv);
    }

    champDiv.title = `${player.championName} (Lv.${player.level}) - ${player.isDead ? 'Morto' : 'Vivo'}`;
    enemyChampions.appendChild(champDiv);
  });
}

function isNearWard(playerPos: any, wardPos: any, range = 1000): boolean {
  const dx = playerPos.x - wardPos.x;
  const dy = playerPos.y - wardPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= range;
}



// Função para atualizar UI com dados do jogo
function updateUI(data: {
  gameState: string;
  gameTime: number | null;
  waveTime: string;
  isSiege: boolean;
  gankRisk: string;
  gankHypothesis: string;
  junglerName: string;
  players: any[];
  wards: any[];
  objectives: any[];
  lanePressures: any[];
}) {
  const { gameState, gameTime, waveTime, isSiege, gankRisk, gankHypothesis, junglerName, players, wards, objectives, lanePressures } = data;

  if (gameState === 'in_game' && gameTime !== null) {
    if (!isGameActive) {
      console.log('🎮 Jogo detectado!');
      isGameActive = true;
    }

    // Show detailed sections
    waveSection.style.display = 'block';
    gankSection.style.display = 'block';
    junglerInfo.style.display = 'block';
    enemyTeam.style.display = 'block';

    // Update additional sections
    updateEnemyChampions(players, wards, gameTime);

    waveTimer.textContent = waveTime;
    waveTimer.style.color = isSiege ? '#ff6b35' : '#00ffcc'; // Laranja para Siege, ciano normal

    const riskText = gankRisk === 'low' ? 'Baixo' : gankRisk === 'medium' ? 'Médio' : 'Alto';
    gankAlert.textContent = riskText;
    gankAlert.className = `alert ${gankRisk === 'low' ? 'seguro' : gankRisk === 'medium' ? 'atencao' : 'perigo'}`;

    gankHypothesisEl.textContent = gankHypothesis;

    if (gameStatus.textContent?.includes('Erro')) {
      // Keep error message if present
    } else {
      gameStatus.textContent = ''; // Limpar "Aguardando partida"
    }

  } else {
    if (isGameActive) {
      console.log('❌ Jogo encerrado');
      isGameActive = false;
    }

    // Hide detailed sections
    waveSection.style.display = 'none';
    gankSection.style.display = 'none';
    junglerInfo.style.display = 'none';
    enemyTeam.style.display = 'none';

    // Show debug info if no error
    if (!gameStatus.textContent?.includes('Erro')) {
      gameStatus.innerHTML = 'Aguardando partida...<br><span style="font-size: 8px; color: #666;">Verificando API Riot...</span>';
    }
    gankHypothesisEl.textContent = '';
  }
}

// Função para alternar simulação (Removida)
// async function toggleSimulation() { ... }

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 EloCoach inicializado');

  // Lógica de Click-Through para elementos interativos
  const interactiveElements = [document.querySelector('.coach-hud')];

  interactiveElements.forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      (window as any).electronAPI.setIgnoreMouseEvents(false);
    });
    el.addEventListener('mouseleave', () => {
      (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
    });
  });

  // Escutar atualizações do main process via preload
  (window as any).electronAPI.onGameUpdate((event: any, data: any) => {
    console.log('Recebido game-update:', data);
    if (data.error) {
      gameStatus.textContent = `Erro: ${data.error}`;
      gameStatus.style.color = '#ff4444';
    } else {
      gameStatus.style.color = '#a09b8c';
      updateUI(data);
    }
  });
});
