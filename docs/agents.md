# EloCoach Specialist Agents

Este arquivo define os agentes conceituais do projeto. Eles nao precisam ser processos permanentes: sao papeis de analise e execucao que podem ser acionados conforme o backlog evolui.

## 1. Product Context Agent

Responsabilidade:
- Entender o espaco de companion apps, overlays e ferramentas de treino para jogos competitivos.
- Manter o produto dentro de uma linha passiva, honesta e demonstravel.
- Separar recursos in-game de recursos pos-jogo.

Perguntas que responde:
- Essa feature ajuda o jogador a aprender ou joga por ele?
- A informacao exibida existe para todos no jogo?
- Isso deve aparecer durante a partida ou depois?
- Como transformar uma limitacao tecnica em aprendizado de portfolio?

Entregas:
- Regras de produto.
- Matriz de risco de compliance.
- Escrita de README/case study.
- Priorizacao de roadmap.

## 2. LoL Domain Agent

Responsabilidade:
- Modelar regras especificas de League of Legends.
- Traduzir dados da Live Client Data API em sinais confiaveis.
- Evitar inferencias que dependam de dados nao fornecidos oficialmente.

Escopo inicial:
- Game clock.
- Minion waves.
- Siege/super minions.
- Jungle pathing basico.
- Objetivos via eventos.
- Estados de partida, reconnect e pausa.

Entregas:
- `WaveModel`.
- `ObjectiveTracker`.
- `JunglerSignalModel`.
- Testes de borda por tempo de jogo.

## 3. Competitive Signal Agent

Responsabilidade:
- Transformar dados crus e simulados em sinais com peso, fonte e confianca.
- Trocar conclusoes absolutas por evidencias explicaveis.

Modelo sugerido:

```ts
type SignalConfidence = 'low' | 'medium' | 'high';

interface CompetitiveSignal {
  id: string;
  kind: 'wave' | 'gank' | 'objective' | 'vision' | 'tempo';
  severity: 'info' | 'watch' | 'danger';
  confidence: SignalConfidence;
  source: 'live-api' | 'event-api' | 'simulated' | 'manual' | 'inferred';
  freshnessSeconds: number;
  label: string;
  shortReason: string;
}
```

Entregas:
- Sistema de evidencias.
- Remocao de aleatoriedade em producao.
- Degradacao segura quando dados estao ausentes.

## 4. Data Provider Agent

Responsabilidade:
- Isolar fontes de dados: Riot Live Client API, mock, simulador e futuros jogos.
- Garantir contratos consistentes e testaveis.

Entregas:
- `GameDataProvider` interface.
- `RiotLiveProvider`.
- `DemoProvider`.
- `Telemetry<T>`.
- Fixtures deterministicas para testes e screenshots.

## 5. Overlay UX Agent

Responsabilidade:
- Projetar HUD para uso real em jogo competitivo.
- Manter informacao minima, legivel e nao intrusiva.
- Criar modos compacto, expandido e edicao.

Regras:
- O HUD em partida deve ser pequeno.
- Risco baixo deve ser quase silencioso.
- Risco alto deve ser perceptivel sem animacao constante.
- Nao depender apenas de cor.
- Drag/click so em modo edicao.
- Debug nunca deve competir com a tela do jogo.

Entregas:
- Layout compacto.
- Estados visuais.
- Presets de posicao.
- Tema visual.
- Checklist de DPI e legibilidade.

## 6. Electron Platform Agent

Responsabilidade:
- Manter janela transparente, always-on-top e click-through estaveis.
- Cuidar de IPC, preload, seguranca e performance.

Entregas:
- Modo edicao via hotkey.
- Persistencia de layout.
- Polling adaptativo.
- Separacao main/preload/renderer com contratos seguros.

## 7. Quality and Portfolio Agent

Responsabilidade:
- Garantir que o projeto conte uma historia tecnica clara no GitHub.
- Transformar legado em aprendizado: problemas, decisoes e trade-offs.

Entregas:
- README revisado.
- Testes verdes.
- Scripts de demo.
- Screenshots/GIFs.
- Secao "Lessons learned".

## Ordem de Acionamento

1. Product Context Agent define limites e narrativa.
2. Data Provider Agent estabiliza mock/live.
3. LoL Domain Agent corrige modelos centrais.
4. Competitive Signal Agent cria confianca e evidencias.
5. Overlay UX Agent redesenha o HUD.
6. Electron Platform Agent fortalece execucao.
7. Quality and Portfolio Agent fecha a apresentacao.
