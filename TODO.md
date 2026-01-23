# TODO - EloCoach Development

## Fase 1: Infraestrutura e Conectividade (1-2 dias)
- [x] Configurar SSL Bypass: Implementar flag `ignore-certificate-errors` no main process (src/index.ts)
- [x] Criar estrutura de pastas: src/contracts/, src/logic/, src/providers/
- [x] Implementar RiotProvider básico: Classe para consumir Live Client API
- [x] Testar conexão com API: Verificar acesso a https://127.0.0.1:2999/liveclientdata/allgamedata

## Fase 2: Sincronização de Tempo e Waves (2-3 dias)
- [x] Implementar polling de gameTime: Consumir gameTime a cada 1s
- [x] Criar TacticalEngine: Módulo para cálculos de tempo
- [x] Lógica de waves: Calcular ciclos de 30s e identificar Siege Minions
- [x] Atualizar UI do timer: Substituir estático por dinâmico baseado em gameTime
- [x] Exibir status do jogo: Detectar se partida está ativa

## Fase 3: Overlay Transparente (1 dia)
- [x] Configurar janela transparente: Fundo 100% transparente
- [x] Implementar click-through: setIgnoreMouseEvents(true)
- [x] Posicionamento fixo: Overlay no topo da tela, ajustável
- [x] Testar transparência: Verificar que HUD é visível sobre o jogo

## Fase 4: Heurística Básica de Gank (3-4 dias)
- [x] Identificar Jungler: Detectar campeão e spells no loading screen
- [x] Alertas simples: Notificações baseadas em janelas de tempo fixas (ex: 2:45-3:20)
- [x] Estados de UI: Alternar entre Aguardando Jogo, Carregando, Em Partida, Resumo
- [x] Feedback visual: Cores dinâmicas para níveis de risco (Seguro, Atenção, Perigo)

## Fase 5: Refinamentos e Testes (2-3 dias)
- [ ] Tratamento de erros: Fallbacks para desconexões da API
- [ ] Otimização de recursos: Throttling quando jogo pausado/fundo
- [ ] Métricas básicas: Logging de latência e uso de recursos
- [ ] Testes unitários: Cobertura >80% para lógica crítica
- [ ] Testes de integração: Mocks para API da Riot

## Notas Gerais
- Priorizar compliance com Riot: Nunca ler memória, só API oficial
- Manter arquitetura modular: RiotProvider, TacticalEngine, UIController
- Testar em contas não-premium para evitar bans
- Documentar decisões técnicas no README.md
