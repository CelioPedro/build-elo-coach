import { initDragManager } from './dragManager';
import { Player } from './contracts/gameData';
import { DataDragonChampionResponse, GameUpdatePayload } from './contracts/ipc';
import { Lane, LanePressure, Objective, ObjectiveType, Position, Ward } from './contracts/junglerData';
import { CompetitiveSignal } from './contracts/signals';
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
const threatChip = document.getElementById('threat-chip') as HTMLElement;
const threatSeverity = document.getElementById('threat-severity') as HTMLElement;
const threatWindow = document.getElementById('threat-window') as HTMLElement;
const threatLabel = document.getElementById('threat-label') as HTMLElement;
const threatReason = document.getElementById('threat-reason') as HTMLElement;
const tempoRail = document.getElementById('tempo-rail') as HTMLElement;
const matchClock = document.getElementById('match-clock') as HTMLElement;
const objectivePanel = document.getElementById('objective-panel') as HTMLElement;
const visionPanel = document.getElementById('vision-panel') as HTMLElement;
const matchupPanel = document.getElementById('matchup-panel') as HTMLElement;

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
    wards = [],
    objectives = [],
    lanePressures = []
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
    updateMatchClock(gameTime);
    updateObjectivePanel(objectives, gameTime);
    updateVisionPanel(players, wards, gameTime);
    updateMatchupPanel(players, lanePressures, gameTime);
    updateThreatChip(data);
    updateTempoRail(data.signals || []);

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
  setHidden(threatChip, true);
  setHidden(tempoRail, true);
  setHidden(objectivePanel, true);
  setHidden(visionPanel, true);
  setHidden(matchupPanel, true);
  matchClock.textContent = '--:--';
  gameStatus.textContent = viewModel.statusText;
  gankHypothesisEl.textContent = '';
}

function updateMatchClock(gameTime: number | null): void {
  matchClock.textContent = gameTime === null ? '--:--' : formatClock(gameTime);
}

function updateObjectivePanel(objectives: Objective[], gameTime: number | null): void {
  if (gameTime === null || objectives.length === 0) {
    setHidden(objectivePanel, true);
    return;
  }

  const order = [ObjectiveType.DRAGON, ObjectiveType.HERALD, ObjectiveType.BARON];
  const rows = order
    .map(type => objectives.find(objective => objective.type === type))
    .filter((objective): objective is Objective => objective !== undefined)
    .map(objective => createInfoRow(
      objectiveLabel(objective.type),
      objectiveStatus(objective, gameTime),
      'objective'
    ));

  objectivePanel.replaceChildren(...rows);
  setHidden(objectivePanel, rows.length === 0);
}

function updateVisionPanel(players: Player[], wards: Ward[], gameTime: number | null): void {
  if (gameTime === null || players.length === 0) {
    setHidden(visionPanel, true);
    return;
  }

  const alliedWards = wards.filter(ward => ward.team === 'ORDER');
  const missingEnemies = players
    .filter(player => player.team === 'CHAOS' && !player.isDead)
    .filter(player => !alliedWards.some(ward => isNearWard(player.position, ward.position, 1200)))
    .map(player => player.championName)
    .slice(0, 3);
  const visionValue = alliedWards.length > 0
    ? `${alliedWards.length} ward${alliedWards.length > 1 ? 's' : ''}`
    : 'sem wards';
  const missingValue = missingEnemies.length > 0 ? missingEnemies.join(', ') : 'ninguem';

  visionPanel.replaceChildren(
    createInfoRow('Visao', visionValue, 'compact'),
    createInfoRow('Sumidos', missingValue, 'compact', missingEnemies.length >= 3 ? 'danger' : missingEnemies.length > 0 ? 'watch' : undefined)
  );
  setHidden(visionPanel, false);
}

function updateMatchupPanel(players: Player[], lanePressures: LanePressure[], gameTime: number | null): void {
  if (gameTime === null || players.length === 0) {
    setHidden(matchupPanel, true);
    return;
  }

  const jax = players.find(player => player.championName === 'Jax');
  const renekton = players.find(player => player.championName === 'Renekton');
  if (!jax || !renekton) {
    setHidden(matchupPanel, true);
    return;
  }

  const topPressure = lanePressures.find(lane => lane.lane === Lane.TOP)?.pressure;
  const renektonHasEclipse = hasItem(renekton, 'Eclipse');
  const jaxHasTrinity = hasItem(jax, 'Trinity Force');
  const jaxHasBlade = hasItem(jax, 'Blade of the Ruined King');
  const enemyItems = importantItems([renekton, players.find(player => player.championName === 'Draven'), players.find(player => player.championName === 'LeeSin')]);

  let tradeText = 'troca neutra';
  let severity: 'danger' | 'watch' | undefined;
  if (renektonHasEclipse && !jaxHasTrinity) {
    tradeText = 'Renekton spike';
    severity = 'danger';
  } else if (jaxHasTrinity && !jaxHasBlade) {
    tradeText = 'Jax pode contestar';
    severity = 'watch';
  } else if (jaxHasTrinity && jaxHasBlade) {
    tradeText = 'Jax escala melhor';
  } else if (topPressure === 'pushing') {
    tradeText = 'top exposta';
    severity = 'watch';
  }

  matchupPanel.replaceChildren(
    createInfoRow('Trade top', tradeText, 'compact', severity),
    createInfoRow('Itens inimigos', enemyItems || 'sem spike', 'compact')
  );
  setHidden(matchupPanel, false);
}

function updateThreatChip(data: GameUpdatePayload): void {
  const signal = data.signals?.[0];
  if (!signal) {
    setHidden(threatChip, true);
    return;
  }

  threatChip.dataset.severity = signal.severity;
  threatSeverity.textContent = signal.severity === 'danger'
    ? 'PERIGO'
    : signal.severity === 'watch' ? 'ATENCAO' : 'INFO';
  threatWindow.textContent = `${formatClock(signal.timeWindow.from)}-${formatClock(signal.timeWindow.to)}`;
  threatLabel.textContent = signal.label;
  threatReason.textContent = signal.reason;
  setHidden(threatChip, false);
}

function createInfoRow(label: string, value: string, classPrefix: 'objective' | 'compact', severity?: 'danger' | 'watch'): HTMLElement {
  const row = document.createElement('div');
  row.className = `${classPrefix}-row`;

  const name = document.createElement('span');
  name.className = `${classPrefix}-name`;
  name.textContent = label;

  const info = document.createElement('span');
  info.className = classPrefix === 'objective' ? `${classPrefix}-time` : `${classPrefix}-value`;
  if (severity) info.classList.add(severity);
  info.textContent = value;

  row.append(name, info);
  return row;
}

function objectiveLabel(type: ObjectiveType): string {
  if (type === ObjectiveType.DRAGON) return 'Dragao';
  if (type === ObjectiveType.HERALD) return 'Herald';
  return 'Baron';
}

function objectiveStatus(objective: Objective, gameTime: number): string {
  if (objective.alive) return 'vivo';
  if (objective.respawnAt !== undefined && objective.respawnAt > gameTime) {
    return formatClock(objective.respawnAt - gameTime);
  }
  return 'morto';
}

function hasItem(player: Player, itemName: string): boolean {
  return player.items.some(item => item.displayName === itemName);
}

function importantItems(players: Array<Player | undefined>): string {
  return players
    .filter((player): player is Player => player !== undefined)
    .flatMap(player => player.items
      .filter(item => ['Eclipse', 'Trinity Force', 'The Collector', 'Infinity Edge', 'Black Cleaver', 'Death\'s Dance'].includes(item.displayName))
      .map(item => `${player.championName}: ${item.displayName}`))
    .slice(0, 2)
    .join(' | ');
}

function updateTempoRail(signals: CompetitiveSignal[]): void {
  const railSignals = signals.slice(0, 3);

  if (railSignals.length === 0) {
    tempoRail.replaceChildren();
    setHidden(tempoRail, true);
    return;
  }

  const items = railSignals.map(signal => {
    const item = document.createElement('div');
    item.className = 'tempo-item';
    item.dataset.severity = signal.severity;

    const time = document.createElement('div');
    time.className = 'tempo-time';
    time.textContent = `${formatClock(signal.timeWindow.from)}`;

    const label = document.createElement('div');
    label.className = 'tempo-label';
    label.textContent = signal.label;

    item.append(time, label);
    return item;
  });

  tempoRail.replaceChildren(...items);
  setHidden(tempoRail, false);
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
