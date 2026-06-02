import { initDragManager } from './dragManager';
import { Player } from './contracts/gameData';
import { DataDragonChampionResponse, GameUpdatePayload } from './contracts/ipc';
import { Position, Ward } from './contracts/junglerData';
import { createOverlayViewModel } from './logic/overlayViewModel';
import './index.css';

const championMap: Record<string, string> = {};
const championImageCache: Record<string, string> = {};

const waveTimer = document.getElementById('wave-timer') as HTMLElement;
const gankAlert = document.getElementById('gank-alert') as HTMLElement;
const gankHypothesisEl = document.getElementById('gank-hypothesis') as HTMLElement;
const gameStatus = document.getElementById('game-status') as HTMLElement;
const junglerInfo = document.getElementById('jungler-info') as HTMLElement;
const waveSection = document.getElementById('wave-section') as HTMLElement;
const gankSection = document.getElementById('gank-section') as HTMLElement;
const coachHud = document.getElementById('coach-hud') as HTMLElement;
const enemyTeam = document.getElementById('enemy-team') as HTMLElement;
const enemyChampions = document.getElementById('enemy-champions') as HTMLElement;

let isGameActive = false;
let ddragonVersion = '15.1.1';
const electronAPI = window.electronAPI;

electronAPI.fetchExternal<string[]>('https://ddragon.leagueoflegends.com/api/versions.json', 'json')
  .then((versions) => {
    if (!versions || versions.length === 0) {
      throw new Error('No versions found');
    }

    ddragonVersion = versions[0];
    electronAPI.log(`[EloCoach] DDragon Version updated to: ${ddragonVersion}`);
    gameStatus.setAttribute('data-version', ddragonVersion);

    return electronAPI.fetchExternal<DataDragonChampionResponse>(
      `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`,
      'json'
    );
  })
  .then((data) => {
    Object.keys(data.data).forEach(key => {
      const champ = data.data[key];
      championMap[champ.id] = champ.image.full;
      championMap[champ.name] = champ.image.full;
      championMap[champ.name.replace(/[^a-zA-Z0-9]/g, '')] = champ.image.full;
    });

    electronAPI.log(`[EloCoach] Champion mappings loaded: ${Object.keys(championMap).length} entries`);
  })
  .catch((err: Error) => {
    electronAPI.log(`[EloCoach] Failed to fetch DDragon data: ${err.message}`);
  });

async function loadProxyImage(imgElement: HTMLImageElement, imageFilename: string, safeChampName: string): Promise<void> {
  if (championImageCache[imageFilename]) {
    imgElement.src = championImageCache[imageFilename];
    return;
  }

  const urls = [
    `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${imageFilename}`,
    `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${safeChampName}.png`,
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg'
  ];

  for (const url of urls) {
    try {
      const imageData = await electronAPI.fetchExternal<string>(url, 'buffer');
      if (imageData) {
        const dataUri = `data:image/png;base64,${imageData}`;
        championImageCache[imageFilename] = dataUri;
        imgElement.src = dataUri;
        return;
      }
    } catch (_err) {
      // Expected while walking through fallback URLs.
    }
  }

  imgElement.src = urls[2];
}

function updateEnemyChampions(players: Player[], wards: Ward[], gameTime: number | null): void {
  const enemyPlayers = players.filter(p => p.team === 'CHAOS');

  enemyPlayers.forEach(player => {
    let champDiv = enemyChampions.querySelector(`.enemy-champion[data-summoner="${player.summonerName}"]`) as HTMLElement;

    if (!champDiv) {
      champDiv = document.createElement('div');
      champDiv.className = 'enemy-champion';
      champDiv.setAttribute('data-summoner', player.summonerName);

      const champImg = document.createElement('img');
      champImg.className = 'champion-img';

      const nameToUse = player.championName || player.rawChampionName || '';
      const safeChampName = nameToUse.replace(/[^a-zA-Z0-9]/g, '');
      let imageFilename = `${safeChampName}.png`;
      if (championMap[nameToUse]) imageFilename = championMap[nameToUse];
      else if (championMap[safeChampName]) imageFilename = championMap[safeChampName];
      else if (championMap[player.rawChampionName]) imageFilename = championMap[player.rawChampionName];

      loadProxyImage(champImg, imageFilename, safeChampName);
      champDiv.appendChild(champImg);

      const visionDiv = document.createElement('div');
      visionDiv.className = 'champion-vision is-hidden';
      champDiv.appendChild(visionDiv);

      enemyChampions.appendChild(champDiv);
    }

    champDiv.classList.toggle('dead', player.isDead);
    champDiv.title = `${player.championName} (Lv.${player.level}) - ${player.isDead ? 'Morto' : 'Vivo'}`;

    const visionDiv = champDiv.querySelector('.champion-vision') as HTMLElement;
    if (visionDiv) {
      const recentWards = wards.filter(w => gameTime !== null && (gameTime - w.placedAt) < 30);
      const isVisible = recentWards.some(w => isNearWard(player.position, w.position));

      if (isVisible && gameTime !== null) {
        const lastSeen = Math.floor(gameTime - (recentWards[0]?.placedAt || 0));
        visionDiv.textContent = `${lastSeen}s`;
        setHidden(visionDiv, false);
      } else {
        setHidden(visionDiv, true);
      }
    }
  });

  const currentSummoners = enemyPlayers.map(p => p.summonerName);
  enemyChampions.querySelectorAll('.enemy-champion').forEach(div => {
    const summonerName = div.getAttribute('data-summoner');
    if (summonerName && !currentSummoners.includes(summonerName)) {
      div.remove();
    }
  });
}

function isNearWard(playerPos: Position, wardPos: Position, range = 1000): boolean {
  const dx = playerPos.x - wardPos.x;
  const dy = playerPos.y - wardPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= range;
}

function updateUI(data: GameUpdatePayload): void {
  const viewModel = createOverlayViewModel(data);
  const {
    gameState,
    gameTime = null,
    waveTime = '--:--',
    isSiege = false,
    players = [],
    wards = []
  } = data;

  coachHud.dataset.mode = viewModel.mode;

  if (gameState === 'in_game' || gameState === 'loading') {
    if (!isGameActive) {
      console.log('Jogo detectado!');
      isGameActive = true;
    }

    setHidden(waveSection, !viewModel.showWave);
    setHidden(gankSection, !viewModel.showRisk);
    setHidden(junglerInfo, !viewModel.showDetails);
    setHidden(enemyTeam, !viewModel.showEnemies);

    updateEnemyChampions(players, wards, gameTime);

    waveTimer.textContent = waveTime;
    waveTimer.style.color = isSiege ? '#ff6b35' : '#00ffcc';
    gankAlert.textContent = viewModel.riskLabel;
    gankAlert.className = `alert ${viewModel.riskClass}`;
    gankHypothesisEl.textContent = viewModel.showDetails ? viewModel.reason : '';
    gameStatus.textContent = viewModel.statusText;
    return;
  }

  if (isGameActive) {
    console.log('Jogo encerrado');
    isGameActive = false;
  }

  setHidden(waveSection, true);
  setHidden(gankSection, true);
  setHidden(junglerInfo, true);
  setHidden(enemyTeam, true);
  gameStatus.textContent = viewModel.statusText;
  gankHypothesisEl.textContent = '';
}

function setHidden(element: HTMLElement, hidden: boolean): void {
  element.classList.toggle('is-hidden', hidden);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('EloCoach inicializado');
  initDragManager();

  electronAPI.onGameUpdate((data) => {
    console.log('Recebido game-update:', data);

    if (data.error) {
      const viewModel = createOverlayViewModel(data);
      coachHud.dataset.mode = viewModel.mode;
      gameStatus.textContent = viewModel.statusText;
      gameStatus.style.color = data.errorType === 'connect_refused' ? '#ffaa00' : '#ff4444';
      return;
    }

    gameStatus.style.color = '#a09b8c';
    updateUI(data);
  });
});
