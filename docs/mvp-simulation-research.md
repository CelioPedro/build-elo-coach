# MVP Simulation Research

Este documento transforma pesquisa de dominio em um plano implementavel para deixar o EloCoach apresentavel como MVP. A meta nao e criar um app que "jogue pelo usuario", mas uma demo offline que pareca uma partida real, explique sinais competitivos com contexto e respeite limites de fair play.

## Guardrails de Produto

- O HUD deve mostrar sinais, nao conclusoes absolutas.
- Toda mensagem em partida deve caber em uma frase curta e ter fonte/confianca.
- O app nao deve expor informacao escondida nem rastrear automaticamente cooldowns inimigos que o jogador nao teria como saber.
- O modo demo pode simular dados ricos, mas deve marcar esses dados como `simulated`.
- Analises profundas ficam no modo treino/pos-jogo; em partida, o HUD deve reduzir carga cognitiva.

Fontes principais:

- Riot Third Party Applications: https://support-leagueoflegends.riotgames.com/hc/en-us/articles/225266848-Third-Party-Applications
- Riot Live Client Data API: https://developer.riotgames.com/docs/lol
- Patch 26.1 notes: https://www.leagueoflegends.com/en-us/news/game-updates/patch-26-1-notes/
- Lee Sin guide: https://mobalytics.gg/lol/guides/lee-sin-guide
- Jungle guide 2026: https://www.dodge.gg/en-US/lol/news/jungle-guide-2026
- Jungle timers reference: https://leagueoflegendstools.com/tools/jungle-respawn-timers/
- Voidgrub camp reference: https://leagueoflegends.fandom.com/wiki/Voidgrub_camp

## Fatos de Jogo que Precisam Entrar na Simulacao

### Relogio e fases

- 0:00-1:30: setup inicial, leash, ward defensiva/invasao.
- 1:30-3:30: primeira rota de jungle e primeira janela real de gank/invade.
- 3:30-5:30: segunda decisao de tempo, recall, scuttle, reset e preparacao de dragao.
- 5:00+: dragao pode estar vivo.
- 6:00-14:00: pressao de Voidgrubs/Rift Herald no lado superior, conforme regras atuais da temporada.
- 14:00+: Rift Herald substitui a leitura de grubs em varias fontes atuais.
- 20:00+: Baron muda o centro de gravidade do mapa.

### Minions e wave

O modelo antigo do projeto assume wave simples em loop fixo. Isso nao serve mais para uma demo convincente.

Pontos relevantes para o MVP:

- Patch 26.1 reduziu o primeiro spawn de minions para 0:30.
- A partir de 14:00, waves passam a spawnar a cada 25s.
- A partir de 30:00, waves passam a spawnar a cada 20s.
- O primeiro cannon agora aparece na wave 3.
- Cannon/siege deixa de ser so "tem canhao"; ele vira sinal de recall, dive, pressao de torre e setup de objetivo.

O HUD nao deve mostrar apenas "proxima wave". Deve responder:

- "pode resetar agora?"
- "cannon chegando, preserve HP"
- "wave avancada + jungler fora do mapa = risco real"
- "objective em 35s, nao prenda recall numa wave ruim"

### Jungle

O jogo competitivo gira em torno de tempo, rota provavel e custo de oportunidade.

Timers-base para simulacao:

- Red/Blue: spawn 1:30, respawn 5:00.
- Gromp/Krugs/Raptors/Wolves: spawn 1:30, respawn 2:15.
- Dragon: spawn 5:00, respawn 5:00.
- Voidgrubs: janela inicial no topo do mapa, com segunda leva condicional conforme tomada da primeira.
- Rift Herald: janela de mid game no pit superior antes do Baron.
- Baron: spawn 20:00, respawn 6:00.

Sinais importantes:

- CS de jungler: cada camp normalmente representa 4 CS. 12 CS por volta de 2:45 sugere clear de 3 camps e possibilidade de gank/invade; 24 CS por volta de 3:30 sugere full clear.
- Leash/start side: bot/top lane chegando atrasada pode indicar onde o jungler comecou.
- Path direction: se comecou bot e esta fazendo clear para cima, top/mid entram em janela de risco.
- Lane priority: invade e objetivo so sao bons quando as lanes podem chegar primeiro.
- Champion identity: Lee Sin/Elise/Rek'Sai tendem a pressionar cedo; Karthus/Shyvana/Master Yi tendem a valorizar clear/escala.

### Lee Sin como primeiro cenario de demonstracao

Lee Sin e excelente para a demo porque tem identidade clara:

- forte early game;
- gank nivel 3;
- invade/countergank realista;
- depende de alvo com CC, wave avancada ou inimigo sem Flash;
- usa Energia, entao Red Buff costuma ter alto valor para ganks iniciais;
- se fica atras no early, perde parte da janela de dominancia.

Modelo recomendado:

- Perfil: `early_carnivore`.
- Primeira janela forte: 2:30-3:15.
- Rotas candidatas:
  - Red > Blue > Gromp > top/mid.
  - Red > Krugs > Raptors > mid/top.
  - Blue start quando o plano e terminar bot.
- Preferencias de alvo:
  - lane com CC aliado;
  - inimigo avancado;
  - alvo sem Flash;
  - lane snowball;
  - invade no segundo buff se o jungler inimigo for fraco cedo.

Mensagem de HUD boa:

- "2:42 | Lee lvl3 provavel | top/mid expostos"
- "Lee 12 CS visto top river | nao alongar trade mid"
- "Bot tem Nautilus + wave vindo | Lee pode inverter rota"

Mensagem ruim:

- "Risco de gank: alto"
- "Lee Sin vai gankar bot"

## Modelo de Simulacao Proposto

Trocar o simulador aleatorio por cenarios deterministas com timeline.

### Entidades

```ts
interface DemoScenario {
  id: string;
  title: string;
  playerTeam: 'ORDER' | 'CHAOS';
  activeLane: 'top' | 'mid' | 'bot' | 'jungle' | 'support';
  championDraft: DemoChampion[];
  timeline: DemoEvent[];
}

interface DemoEvent {
  at: number;
  type:
    | 'camp_clear'
    | 'jungler_seen'
    | 'lane_state'
    | 'summoner_spell_burned'
    | 'ward_placed'
    | 'objective_spawn'
    | 'objective_taken'
    | 'recall_window'
    | 'gank_attempt'
    | 'death'
    | 'tower_plate';
  payload: unknown;
}
```

### Cenarios iniciais

1. `lee_sin_lvl3_top_threat`
   - Lee comeca bot side no Red.
   - Top aliado esta empurrando sem ward.
   - Mid inimigo tem CC leve.
   - Aos 2:42, Lee aparece com 12 CS no rio top.
   - HUD deve alertar top/mid, nao bot.

2. `lee_sin_inverse_bot_setup`
   - Bot inimigo tem Draven + Nautilus.
   - Lee comeca top side para terminar bot.
   - Bot aliado empurra wave 2 sem trinket.
   - HUD antecipa "bot e lane alvo", mas baixa confianca se ward profunda confirma outra rota.

3. `scaling_jungler_full_clear`
   - Karthus/Shyvana faz full clear.
   - Risco de gank cedo e baixo, mas alerta de objetivo/tempo de recall aumenta perto de 5:00-6:00.

4. `objective_trade_window`
   - Jungler inimigo aparece top quando dragao vai nascer.
   - HUD sugere contexto: "info: top side visto, drag window aberta", sem mandar o jogador tomar acao.

5. `bad_data_reconnect`
   - Live API perde gameTime por alguns ticks.
   - HUD deve congelar sinais, mostrar "clock incerto" e reduzir confianca.

## Motor de Sinais

Substituir score unico de risco por evidencias ponderadas.

```ts
type SignalKind = 'gank' | 'wave' | 'objective' | 'vision' | 'tempo' | 'jungle_track';
type SignalSeverity = 'info' | 'watch' | 'danger';
type SignalConfidence = 'low' | 'medium' | 'high';

interface CompetitiveSignal {
  id: string;
  kind: SignalKind;
  lane?: 'top' | 'mid' | 'bot';
  severity: SignalSeverity;
  confidence: SignalConfidence;
  timeWindow: { from: number; to: number };
  label: string;
  reason: string;
  evidence: SignalEvidence[];
}

interface SignalEvidence {
  label: string;
  weight: number;
  source: 'live-api' | 'simulated' | 'inferred' | 'event-api';
  freshnessSeconds?: number;
}
```

### Exemplo de pontuacao para gank

Base:

- champion archetype: Lee Sin `+25`
- janela lvl 3 ativa: `+20`
- path previsto termina no lado da lane: `+20`
- lane avancada: `+15`
- CC aliado ao jungler inimigo: `+10`
- Flash queimado: `+15`
- ward recente cobrindo rota: `-20`
- jungler visto no lado oposto: `-35`
- objective vivo do lado oposto: `-10` ou `+10`, dependendo do plano provavel.

Classificacao:

- 0-34: info
- 35-64: watch
- 65+: danger

Importante: o HUD mostra o top 1 ou top 2 sinais, nunca a arvore completa durante a partida.

## HUD Proposto

O HUD pode virar multiplos widgets pequenos:

### 1. Threat Chip

Pequeno bloco proximo ao minimapa ou lateral:

```text
DANGER 2:40-3:10
Lee lvl3 -> top/mid
12 CS route + top avancada
```

### 2. Tempo Rail

Linha vertical discreta com proximos marcos:

```text
2:40 Lee lvl3
5:00 Dragon
6:00 Void
```

### 3. Wave/Recall Nudge

Aparece apenas quando existe acao de tempo:

```text
Cannon wave chegando
reset seguro em ~18s
```

### 4. Confidence Dot

Indicador pequeno:

- verde: dado live/simulado confiavel;
- amarelo: inferido;
- cinza: API/stale.

### 5. Training Drawer

Somente no modo demo/edicao:

```text
Por que apareceu?
+ Lee early ganker
+ rota Red > Blue > Gromp
+ top sem ward
- ward river ainda cobre entrada
```

## Backlog Recomendado

### Passo 1 - Dados deterministas

- Criar `DemoScenario`.
- Trocar `Math.random()` por timeline.
- Adicionar pelo menos 3 cenarios.
- Expor evento atual e snapshots consistentes no `MockProvider`.

### Passo 2 - CompetitiveSignal

- Criar contrato de sinais.
- Implementar engine pura e testavel.
- Converter gank/wave/objective em sinais explicaveis.

### Passo 3 - HUD multipainel

- Renderizar Threat Chip, Tempo Rail e Training Drawer.
- Manter click-through por padrao.
- Mostrar drawer apenas no modo edicao/demo.

### Passo 4 - Wave model 26.1

- Atualizar `TacticalEngine` para spawn 0:30, intervalos 25s/20s por fase e cannon wave 3.
- Separar spawn de wave, chegada estimada e uso tatico.

### Passo 5 - Champion archetypes

- Criar dados pequenos para archetypes:
  - early_carnivore: Lee Sin, Elise, Rek'Sai, Jarvan IV.
  - farming_scaler: Karthus, Shyvana, Master Yi.
  - lvl6_ganker: Nocturne, Vi, Fiddlesticks.
  - tempo_duelist: Graves, Nidalee, Kindred.

## Definicao de MVP Apresentavel

O MVP fica apresentavel quando:

- `npm run start:demo` abre uma partida simulada sem LoL instalado.
- A demo mostra pelo menos uma janela real de gank, uma janela de wave/recall e uma decisao de objetivo.
- O HUD explica "por que agora" em uma frase curta.
- O modo edicao mostra detalhes de evidencias.
- Os sinais sao deterministas, testaveis e reproduziveis para video/screenshot.
