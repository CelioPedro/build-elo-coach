# Requisitos do EloCoach

## 1. Visão Geral do Produto
O EloCoach é um assistente tático de alto nível para League of Legends, desenvolvido em Electron com TypeScript e Webpack. O objetivo é fornecer informações críticas (Timings de Wave e Alertas de Gank) através de um HUD passivo e não intrusivo que respeita integralmente as diretrizes de integridade da Riot Games.

## 2. Requisitos Funcionais (RF)
### Épico: Inteligência de Jogo
- **RF01 - Sincronização de GameTime**: O sistema deve consumir o gameTime da Live Client API da Riot a cada 1.000ms para servir de base a todos os cálculos de tempo.
- **RF02 - Cronômetro de Waves**: Calcular e exibir o tempo restante para a próxima wave (ciclos de 30s), identificando visualmente waves de "Canhão" (Siege Minions).
- **RF03 - Heurística de Gank (Jungler Tracking)**:
  - Identificar o campeão Jungler inimigo e seus feitiços de invocador no início da partida.
  - Emitir alertas baseados em janelas de tempo (ex: 2:45 a 3:20) sincronizadas com o pathing padrão de selva.
  - Gerar "Níveis de Risco" (Seguro, Atenção, Perigo) cruzando a posição conhecida do Jungler e o tempo decorrido.
- **RF04 - Gestão de Estado da UI**: A interface deve alternar automaticamente entre os estados: Aguardando Jogo, Carregando, Em Partida e Resumo Pós-Jogo.

### Épico: Interface de Usuário (Overlay)
- **RF05 - Overlay Transparente**: A janela do aplicativo deve possuir fundo 100% transparente, mantendo apenas os elementos do HUD visíveis.
- **RF06 - Click-Through (Passividade)**: Implementar setIgnoreMouseEvents(true) para que o jogador possa clicar nos elementos do jogo através da interface do EloCoach.
- **RF07 - Estética Hextech**: O design deve seguir a paleta oficial (Azul Profundo #010a13, Dourado #c8aa6e e Ciano #00ffcc).

## 3. Requisitos Não Funcionais (RNF)
### Épico: Engenharia e Performance
- **RNF01 - Tipagem Estrita e Contratos**: Proibição do uso de tipo any. Todos os retornos da API da Riot devem ser mapeados em interfaces TypeScript (D.T.O.s) para garantir previsibilidade.
- **RNF02 - Segurança de Conexão (SSL Bypass)**: O processo principal deve inicializar com a flag ignore-certificate-errors para permitir comunicação HTTPS com o servidor local da Riot.
- **RNF03 - Arquitetura Modular**: Separação clara entre RiotProvider (dados), TacticalEngine (lógica/heurística) e UIController (renderização).
- **RNF04 - Eficiência de Recursos (Throttling)**: O consumo de CPU deve ser reduzido em 80% quando o jogo não estiver em primeiro plano ou a partida estiver pausada.
- **RNF05 - Escalabilidade de DPI**: O CSS deve ser construído com unidades relativas para suportar resoluções de 1080p a 4K sem perda de legibilidade.
- **RNF06 - Tratamento de Erros**: Implementar handling robusto para desconexões da API, timeouts e mudanças na estrutura de resposta da Riot, com fallbacks e logs detalhados.
- **RNF07 - Métricas de Qualidade**: Incluir logging de latência da API, taxa de sucesso de detecção e uso de recursos, com dashboards para monitoramento.

### Épico: Usabilidade e Testabilidade
- **RNF08 - Feedback Visual e Auditivo**: Alertas devem incluir indicadores visuais dinâmicos (cores, animações sutis) e opcionais sonoros/vibração, configuráveis pelo usuário.
- **RNF09 - Testabilidade**: Cobertura de testes unitários >80% para lógica crítica (waves, ganks), testes de integração com mocks da API Riot, e testes E2E para UI.
- **RNF10 - Escalabilidade de Modos**: Suporte inicial para Summoner's Rift, com arquitetura preparada para ARAM, TFT e outros modos futuros.

## 4. Matriz de Riscos e Mitigações

| Risco Identificado          | Impacto | Estratégia de Mitigação |
|-----------------------------|---------|--------------------------|
| Dessincronização de Clock    | Médio  | Usar exclusivamente o tempo da API da Riot, sem contadores locais independentes. |
| Conflito de Overlay (FPS)    | Alto   | Minimizar o uso de animações CSS pesadas e manter o DOM simplificado. |
| Certificado SSL Inválido     | Crítico| Implementação forçada da flag de comando no Electron Main Process. |
| Banimento por Cheating       | Crítico| Restringir o app estritamente à leitura de dados oficiais da porta 2999 (sem leitura de memória). |
| Mudanças na API da Riot      | Alto   | Implementar versionamento de contratos e fallbacks; monitorar atualizações da Riot. |
| Detecção de Anti-Cheat       | Crítico| Testar extensivamente em contas não-premium; manter overlay minimalista e passivo. |
| Performance em Máquinas Fracas| Médio | Otimizar polling; considerar WebSockets se disponível; implementar throttling avançado. |
| Atualizações Legais/Compliance| Alto  | Monitorar termos da Riot; implementar atualizações automáticas e disclaimers. |
| Concorrência (Múltiplas Instâncias)| Baixo | Detectar e prevenir execuções múltiplas; usar locks de sistema. |

## 5. Arquitetura de Base (Baseline)
A estrutura de pastas seguirá o padrão Electron Forge + Webpack + TS já inicializado com sucesso:

- src/index.ts: Gerenciamento da janela, transparência e permissões de sistema.
- src/renderer.ts: Lógica de consumo da API e orquestração dos observadores.
- src/contracts/: Interfaces de dados (Contratos técnicos).
- src/logic/: Módulos de cálculo de waves e heurística de gank.
