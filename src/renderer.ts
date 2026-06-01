import { initDragManager } from './dragManager';
import { Player } from './contracts/gameData';
import { DataDragonChampionResponse, GameUpdatePayload } from './contracts/ipc';
import { Position, Ward } from './contracts/junglerData';

// Estado global para mapeamento de campeões
const championMap: Record<string, string> = {};
// Cache para imagens de campeões (Blob URLs)
const championImageCache: Record<string, string> = {};

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
let ddragonVersion = '15.1.1'; // Fallback
const electronAPI = window.electronAPI;

// Fetch latest version and champion data
// Fetch latest version and champion data
// Use proxy to avoid renderer network issues
electronAPI.fetchExternal<string[]>('https://ddragon.leagueoflegends.com/api/versions.json', 'json')
  .then((versions) => {
    if (versions && versions.length > 0) {
      ddragonVersion = versions[0];
      electronAPI.log(`[EloCoach] DDragon Version updated to: ${ddragonVersion}`);
      // Show version in UI for debug
      const statusEl = document.getElementById('game-status');
      if (statusEl) statusEl.setAttribute('data-version', ddragonVersion);

      // Fetch champion.json for accurate name mapping
      return electronAPI.fetchExternal<DataDragonChampionResponse>(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`, 'json');
    } else {
      throw new Error('No versions found');
    }
  })
  .then((data) => {
    if (data && data.data) {
      // Populate championMap
      // DDragon format: data.data["MonkeyKing"] = { id: "MonkeyKing", name: "Wukong", image: { full: "MonkeyKing.png" } ... }
      Object.keys(data.data).forEach(key => {
        const champ = data.data[key];
        // Ensure both ID (MonkeyKing) and Name (Wukong) map to the image filename (MonkeyKing.png)
        championMap[champ.id] = champ.image.full;
        championMap[champ.name] = champ.image.full;

        // Also map "normalize" versions just in case
        const safeName = champ.name.replace(/[^a-zA-Z0-9]/g, '');
        championMap[safeName] = champ.image.full;
      });
      electronAPI.log(`[EloCoach] Champion mappings loaded: ${Object.keys(championMap).length} entries`);
      const statusEl = document.getElementById('game-status');
      if (statusEl) {
        const currentText = statusEl.innerHTML;
        statusEl.innerHTML = currentText + `<br><span style="font-size:8px;color:#0f0;">Maps: ${Object.keys(championMap).length}</span>`;
      }
    }
  })
  .catch((err: Error) => {
    electronAPI.log(`[EloCoach] Failed to fetch DDragon data: ${err.message}`);
    const statusEl = document.getElementById('game-status');
    // Use 'Data Fail' instead of 'Error' to avoid preventing UI clearance
    if (statusEl) statusEl.innerHTML += `<br><span style="font-size:8px;color:#f00;">Data Fail: ${err.message}</span>`;
  });

async function loadProxyImage(imgElement: HTMLImageElement, imageFilename: string, safeChampName: string) {
  // Check cache first
  if (championImageCache[imageFilename]) {
    imgElement.src = championImageCache[imageFilename];
    return;
  }

  const ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${imageFilename}`;
  const cdragonNameUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${safeChampName}.png`;
  const placeholderUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg';

  const urls = [ddragonUrl, cdragonNameUrl, placeholderUrl];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      // Use fetchExternal for images, expecting 'buffer' type
      const imageData = await electronAPI.fetchExternal<string>(url, 'buffer');
      if (imageData) {
        const dataUri = `data:image/png;base64,${imageData}`;
        championImageCache[imageFilename] = dataUri;
        imgElement.src = dataUri;
        electronAPI.log(`[IMG OK] Loaded ${url} via proxy.`);
        return;
      }
    } catch (_err) {
      // Silent fail for expected Fallbacks
    }
  }
  imgElement.src = placeholderUrl;
  electronAPI.log(`[IMG FAIL] All image fallbacks failed for ${imageFilename}.`);
}

// Funções para atualizar seções específicas
function updateEnemyChampions(players: Player[], wards: Ward[], gameTime: number | null) {
  const enemyPlayers = players.filter(p => p.team === 'CHAOS');
  const container = enemyChampions; // existing reference

  // 1. Mark all existing as "stale" potentially? No, just diff by summoner name.
  // We need a unique key. SummonerName is unique in a game.

  enemyPlayers.forEach(player => {
    let champDiv = container.querySelector(`.enemy-champion[data-summoner="${player.summonerName}"]`) as HTMLElement;

    if (!champDiv) {
      // CREATE NEW
      champDiv = document.createElement('div');
      champDiv.className = 'enemy-champion';
      champDiv.setAttribute('data-summoner', player.summonerName);

      const champImg = document.createElement('img');
      champImg.className = 'champion-img';
      champImg.style.width = '20px';
      champImg.style.height = '20px';
      champImg.style.borderRadius = '2px';

      // Determine names for loading
      const nameToUse = player.championName || player.rawChampionName || '';
      const safeChampName = nameToUse.replace(/[^a-zA-Z0-9]/g, '');
      let imageFilename = `${safeChampName}.png`;
      if (championMap[nameToUse]) imageFilename = championMap[nameToUse];
      else if (championMap[safeChampName]) imageFilename = championMap[safeChampName];
      else if (championMap[player.rawChampionName]) imageFilename = championMap[player.rawChampionName];

      loadProxyImage(champImg, imageFilename, safeChampName);
      champDiv.appendChild(champImg);

      // Vision div holder
      const visionDiv = document.createElement('div');
      visionDiv.className = 'champion-vision';
      visionDiv.style.fontSize = '6px';
      visionDiv.style.color = '#00ffcc';
      visionDiv.style.marginTop = '2px';
      visionDiv.style.textAlign = 'center';
      visionDiv.style.display = 'none'; // Hidden by default
      champDiv.appendChild(visionDiv);

      container.appendChild(champDiv);
    }

    // UPDATE EXISTING
    // Update Dead/Alive Status
    if (player.isDead) {
      champDiv.classList.add('dead');
    } else {
      champDiv.classList.remove('dead');
    }
    champDiv.title = `${player.championName} (Lv.${player.level}) - ${player.isDead ? 'Morto' : 'Vivo'}`;

    // Update Vision Status
    const visionDiv = champDiv.querySelector('.champion-vision') as HTMLElement;
    if (visionDiv) {
      const recentWards = wards.filter(w => gameTime && (gameTime - w.placedAt) < 30);
      const isVisible = recentWards.some(w => isNearWard(player.position, w.position));

      if (isVisible) {
        const lastSeen = Math.floor((gameTime || 0) - (recentWards[0]?.placedAt || 0));
        visionDiv.textContent = `Visto ${lastSeen}s atrás`;
        visionDiv.style.display = 'block';
      } else {
        visionDiv.style.display = 'none';
      }
    }
  });

  // Remove players that no longer exist (unlikely but good hygiene)
  const currentSummoners = enemyPlayers.map(p => p.summonerName);
  const existingDivs = container.querySelectorAll('.enemy-champion');
  existingDivs.forEach(div => {
    const sumName = div.getAttribute('data-summoner');
    if (sumName && !currentSummoners.includes(sumName)) {
      div.remove();
    }
  });
}

function isNearWard(playerPos: Position, wardPos: Position, range = 1000): boolean {
  const dx = playerPos.x - wardPos.x;
  const dy = playerPos.y - wardPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= range;
}



// Função para atualizar UI com dados do jogo
function updateUI(data: GameUpdatePayload) {
  const {
    gameState,
    sessionState,
    gameTime = null,
    waveTime = '--:--',
    isSiege = false,
    gankRisk = 'low',
    gankHypothesis = '',
    players = [],
    wards = []
  } = data;

  // Show UI if in_game OR loading (so we see the HUD during load/early game)
  if (gameState === 'in_game' || gameState === 'loading') {
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
    } else if (sessionState === 'stalled') {
      gameStatus.textContent = 'Tempo pausado ou travado';
    } else if (sessionState === 'reconnecting') {
      gameStatus.textContent = 'Reconectando telemetria...';
    } else if (sessionState === 'demo') {
      gameStatus.textContent = 'Demo offline';
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

  // Initialize draggable widgets (handles click-through + drag + persistence)
  initDragManager();

  // Escutar atualizações do main process via preload
  if (electronAPI) {
    electronAPI.onGameUpdate((data) => {
      console.log('Recebido game-update:', data);
      if (data.error) {
        // Format specific error messages for better user feedback
        let statusHtml = `Erro: ${data.error}`;
        let color = '#ff4444';

        if (data.errorType === 'connect_refused') {
          statusHtml = 'API Offline (Jogo Fechado?)<br><span style="font-size: 8px; color: #aaa;">Abra o LoL e entre na partida.</span>';
          color = '#ffaa00'; // Orange for warning
        } else if (data.errorType === 'timeout') {
          statusHtml = 'Erro: Timeout API<br><span style="font-size: 8px; color: #aaa;">API lenta ou travada.</span>';
        } else if (data.errorType === 'not_found') {
          statusHtml = 'Aguardando partida...<br><span style="font-size: 8px; color: #666;">Jogo ainda não iniciado (404)</span>';
          color = '#a09b8c';
        }

        gameStatus.innerHTML = statusHtml;
        gameStatus.style.color = color;
      } else {
        gameStatus.style.color = '#a09b8c';
        updateUI(data);
      }
    });
  }
});
