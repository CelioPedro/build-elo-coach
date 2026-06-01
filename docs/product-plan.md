# EloCoach Product Plan

EloCoach deve ser tratado como um estudo de produto e engenharia para overlays competitivos, com League of Legends como primeiro dominio. O objetivo de curto prazo nao e lancar um app competitivo completo, mas criar uma demo offline forte, honesta e reproduzivel para portfolio, preservando uma arquitetura que permita evoluir para outros jogos.

## Principios

- O app deve ser passivo: observar, organizar e contextualizar informacao, sem automatizar a jogada do usuario.
- Toda conclusao exibida em partida deve carregar fonte, frescor e confianca.
- Dados ausentes devem ser modelados como `unknown`, nao como listas vazias.
- O modo demo/mock deve ser uma experiencia de primeira classe, nao um fallback escondido.
- O HUD deve reduzir carga cognitiva: alerta quando importa, silencio quando nao importa.
- Regras especificas de LoL devem ficar atras de adaptadores para permitir outros jogos no futuro.

## Contexto Externo

- A politica de aplicativos de terceiros da Riot alerta contra apps que revelam informacao escondida, agem pelo jogador, tiram conclusoes por ele durante a partida ou alteram o campo de inteligencia.
- A Live Client Data API e local, via HTTPS em `127.0.0.1:2999`, e retorna dados de partida ativa, jogadores, eventos e `gamestats`.
- Vanguard nao deveria bloquear apps que usam APIs in-game/LCU, mas ferramentas de leitura de memoria nao sao caminho aceitavel.
- A documentacao do Electron confirma o uso de janelas transparentes e `setIgnoreMouseEvents`, que e base correta para um overlay click-through.

Fontes:
- https://support-leagueoflegends.riotgames.com/hc/en-us/articles/225266848-Third-Party-Applications
- https://developer.riotgames.com/docs/lol
- https://www.riotgames.com/en/DevRel/vanguard-faq
- https://www.electronjs.org/docs/latest/api/browser-window

## Problemas Encontrados

### P0 - Compliance e promessa de produto

O produto atual chama hipoteses de gank e inferencias como se fossem certezas. Isso e perigoso tecnicamente e sensivel para fair play. O app deve se posicionar como HUD de consciencia situacional e ferramenta de treino, nao como coach automatico que decide pelo jogador.

Acao:
- Renomear textos e modelos para "signals", "context", "confidence" e "training insights".
- Separar recursos permitidos em partida de analises pos-jogo.

### P0 - Provider real nao entrega tudo que a logica espera

`RiotProvider` retorna `[]` para wards, objetivos e pressao de lane. O `GankPredictor` interpreta isso como estado real, gerando falsa confianca.

Arquivos:
- `src/providers/riotProvider.ts`
- `src/logic/gankPredictor.ts`
- `src/index.ts`

Acao:
- Criar `Telemetry<T>` com `status: available | unavailable | stale | simulated`.
- Exibir "sem telemetria confiavel" quando a fonte real nao suportar o dado.

### P0 - Modo mock precisa virar demo oficial

O app importa `MockProvider`, mas inicializa `RiotProvider` por padrao. A simulacao existe, mas nao e caminho principal para quem nao tem LoL instalado.

Acao:
- Criar `GameDataProvider` interface.
- Permitir `ELOCOACH_PROVIDER=mock`.
- Iniciar `MatchSimulator` automaticamente em demo.
- Criar cenario deterministico para screenshots e videos.

### P0 - Identificacao do jungler esta inconsistente

O tracker local usa `summonerSpell.id === 11`, enquanto o contrato nao tem `id` e o provider real usa `displayName.includes('Smite')`. Tambem nao ha filtro claro para jungler inimigo.

Acao:
- Ajustar contrato de `SummonerSpell`.
- Normalizar spell por `displayName`, `rawDisplayName` e `id` opcional.
- Identificar time do active player e filtrar inimigos.

### P1 - Wave timer e simples demais

Hoje a wave e um loop de 30 segundos com siege a cada 180 segundos desde 1:30. Isso ignora:
- primeiro spawn em 1:05;
- diferenca entre spawn no nexus e chegada na lane;
- cadence de siege por fase;
- super minions por inibidor;
- pausas, reconnects e tempo congelado.

Acao:
- Criar `WaveModel` por mapa e lane.
- Separar `spawnTime`, `arrivalEstimate` e `composition`.
- Parametrizar siege cadence: early, mid, late.
- Suspender calculos quando `gameTime` nao avanca.

### P1 - Gank risk deve virar motor de evidencias

O modelo atual retorna risco alto quando o jungler esta visivel em qualquer posicao conhecida, e ainda possui estimativa aleatoria em `predictGanks`.

Acao:
- Remover aleatoriedade.
- Criar `Evidence[]` com peso e confianca.
- Considerar: ultimo visto, lado do mapa, distancia ate lane, estado morto/vivo, pressao de lane, objetivo vivo, tempo de jogo, perfil do campeao e frescor do dado.
- Retornar risco + explicacao curta + detalhes opcionais.

### P1 - State machine de partida

O loop atual usa `gameTime || 0`, o que pode resetar comportamento durante loading/reconnect.

Acao:
- Criar estados: `idle`, `loading`, `live`, `stalled`, `reconnecting`, `ended`, `demo`.
- Guardar ultimo snapshot valido.
- Reduzir polling quando fora de partida.

### P1 - HUD precisa ser menor e mais inteligente

O HUD atual parece painel de debug: fundo opaco, textos pequenos, frases longas e interacao de drag por hover. Para jogo competitivo, deve existir:
- modo compacto em partida;
- modo expandido apenas em configuracao;
- click-through sempre ativo durante jogo;
- modo edicao por hotkey/botao;
- alertas por forma + cor, nao apenas cor;
- texto curto: `PERIGO | JG bot side | bot avancada`.

### P2 - Qualidade tecnica

Acao:
- Corrigir `tsc --noEmit`.
- Corrigir testes com contratos reais.
- Mover CSS inline para `src/index.css`.
- Reduzir `any`.
- Remover logs por tick.
- Adicionar testes para wave, gank, provider, reconnect e dados ausentes.

## Roadmap Proposto

### Fase 1 - Demo confiavel para portfolio

Entregas:
- Provider interface.
- Demo mock por env.
- Contratos corrigidos.
- Testes voltando a rodar.
- README reposicionado como case study.

### Fase 2 - Motor de contexto

Entregas:
- `Telemetry<T>` com confianca/fonte/frescor.
- State machine de partida.
- Wave model realista.
- Objective tracker via eventos quando disponivel.

### Fase 3 - HUD competitivo

Entregas:
- Layout compacto/expandido.
- Modo edicao seguro.
- Presets de posicao.
- Indicadores visuais discretos.
- Cenarios deterministas de demo.

### Fase 4 - Arquitetura multi-game

Entregas:
- `GameAdapter`.
- `GameClock`.
- `CompetitiveSignalEngine`.
- `OverlayLayoutProfile`.
- Primeiro estudo para outro jogo, sem implementar ainda.

## Ideias Criativas

- "Radar de atencao": HUD quase invisivel em estado seguro, respirando uma vez quando o risco muda.
- "Linha do tempo de sinais": ultimos 3 eventos relevantes com confianca, sem frases longas.
- "Modo treino": durante replay/demo, explicar por que o sinal apareceu.
- "Streamer safe": preset sem nomes de jogadores e com dados sensiveis reduzidos.
- "Post-game reflection": as conclusoes mais detalhadas ficam depois da partida, evitando ultrapassar limites de fair play.
