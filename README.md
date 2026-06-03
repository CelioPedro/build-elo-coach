# EloCoach

Overlay desktop em Electron e TypeScript para apoio tatico em partidas competitivas, usando League of Legends como primeiro modelo de dominio.

O projeto nasceu como um experimento antigo com Electron e foi retomado como estudo de produto, arquitetura e regras de negocio para apps sobrepostos a jogos. A versao atual prioriza funcionamento demonstravel sem o jogo instalado, tipagem consistente e uma base expansivel para novos provedores de dados.

## O que o app faz

- Renderiza um HUD transparente e compacto sobre a tela.
- Mantem a janela em modo click-through por padrao, evitando capturar clique durante a partida.
- Ativa modo edicao com `Ctrl+Shift+E` para mover widgets com seguranca.
- Consome dados reais pela Riot Live Client API quando o LoL esta rodando.
- Oferece `start:demo` com provider mockado para demonstracao offline.
- Calcula estado de sessao, relogio de waves, risco de gank e contexto de objetivos.
- Exibe status operacional quando os dados do jogo estao indisponiveis, pausados ou incompletos.

## Por que este projeto existe

Este repositorio esta sendo enriquecido como peca de portfolio. A ideia nao e vender uma ferramenta pronta para uso competitivo, mas mostrar decisoes tecnicas reais em um produto com restricoes interessantes:

- overlay nao pode atrapalhar o input do jogador;
- dados locais do jogo podem estar indisponiveis ou incompletos;
- a UI precisa ser densa, legivel e pequena;
- regras de negocio devem considerar tempo de partida, telemetria incerta e fases do jogo;
- o projeto precisa funcionar em modo demo para avaliacao sem League of Legends instalado.

## Stack

- Electron Forge
- TypeScript
- Webpack
- Jest
- ESLint
- Interact.js
- Riot Live Client API

## Como rodar

Instale as dependencias:

```bash
npm install
```

Rodar tentando usar a API local do LoL:

```bash
npm run start
```

Rodar em modo demo offline:

```bash
npm run start:demo
```

Empacotar:

```bash
npm run package
```

Testes:

```bash
npm test
```

Lint:

```bash
npm run lint
```

## Controles

- `Ctrl+Shift+E`: alterna o modo edicao do overlay.
- Fora do modo edicao, o overlay fica click-through para nao interceptar o mouse.
- No modo edicao, os widgets exibem realce visual e podem ser arrastados pela area superior.

## Arquitetura

```text
src/
  contracts/   Tipos compartilhados entre main, preload, renderer e dominio
  logic/       Regras de negocio, heuristicas e modelos testaveis
  providers/   Fontes de dados reais ou mockadas
  index.ts     Processo principal do Electron
  preload.ts   Ponte IPC tipada e isolada
  renderer.ts  Atualizacao visual do HUD
```

### Providers

`RiotProvider` consulta a Live Client API local. `MockProvider` usa o simulador interno para permitir desenvolvimento, testes e apresentacao do produto sem depender do jogo instalado.

### Logica de dominio

Os modulos em `src/logic` separam a parte testavel do produto:

- `GameSessionTracker`: interpreta estado da partida e confiabilidade do relogio.
- `TacticalEngine`: calcula timers de wave e contexto de minions.
- `ObjectiveTracker`: deriva eventos de objetivos a partir de dados observados.
- `JunglerTracker`: identifica e acompanha o jungler inimigo.
- `GankPredictor`: combina sinais para gerar hipotese e risco.
- `OverlayViewModel`: transforma dados de jogo em um modelo compacto para UI.

## Estado atual

O projeto ja possui:

- demo offline funcional;
- contratos IPC tipados;
- tratamento de telemetria indisponivel;
- HUD compacto;
- modo edicao seguro;
- cobertura de testes para os principais modulos de regra.

## Proximos passos planejados

- Criar mais cenarios mockados para fases diferentes da partida.
- Evoluir a UI para multiplos widgets pequenos e configuraveis.
- Adicionar um painel de diagnostico para explicar a origem dos sinais taticos.
- Separar melhor o dominio por jogo para permitir expansao alem de LoL.
- Documentar decisoes de arquitetura e limitacoes da Riot Live Client API.

## Aprendizados destacados

- Electron exige cuidado com seguranca, preload e isolamento de contexto.
- Overlay para jogos precisa tratar input como requisito de produto, nao detalhe visual.
- TypeScript ajuda mais quando contratos atravessam processos e fontes de dados.
- Mock provider transforma um projeto dependente de ambiente externo em algo demonstravel.
- Regras de negocio ficam mais sustentaveis quando separadas da UI e cobertas por testes.

## Aviso

EloCoach e um projeto educacional e experimental. Ele nao e afiliado, endossado ou aprovado pela Riot Games.
