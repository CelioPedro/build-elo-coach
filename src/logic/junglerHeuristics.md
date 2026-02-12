# Heurísticas de Gank - EloCoach

## Visão Geral

Este documento descreve o sistema de heurísticas para detecção e alerta de ganks do jungler inimigo no League of Legends. O sistema combina análise de posição, pathing típico e timing para fornecer alertas precisos e contextuais.

## Arquitetura

### Componentes Principais

#### 1. JunglerTracker
- **Responsabilidade**: Monitorar posição e movimento do jungler
- **Dados**: Coordenadas X,Y, timestamp, região do mapa
- **Método**: Polling contínuo via RiotProvider

#### 2. PathingEngine
- **Responsabilidade**: Calcular probabilidades de movimento
- **Dados**: Perfis de campeão, distâncias, tempos de viagem
- **Método**: Algoritmos de pathfinding simplificados

#### 3. GankPredictor
- **Responsabilidade**: Combinar dados para gerar alertas
- **Dados**: Estado atual + histórico + heurísticas
- **Método**: Sistema de pontuação de risco

#### 4. AlertManager
- **Responsabilidade**: Gerenciar e priorizar alertas
- **Dados**: Fila de alertas ativos
- **Método**: Filtragem e throttling

## Sistema de Posicionamento

### Mapa de Regiões

O mapa do Summoner's Rift é dividido em regiões para análise simplificada:

```typescript
enum MapRegion {
  BASE = 'base',           // Base inimiga
  TOP_JUNGLE = 'top_jungle',
  MID_JUNGLE = 'mid_jungle',
  BOT_JUNGLE = 'bot_jungle',
  TOP_LANE = 'top_lane',
  MID_LANE = 'mid_lane',
  BOT_LANE = 'bot_lane',
  RIVER = 'river'
}
```

### Conversão de Coordenadas

As coordenadas da API (0-15000) são convertidas para regiões:

```typescript
function getRegionFromCoords(x: number, y: number): MapRegion {
  // Lógica de mapeamento baseada em zonas do mapa
}
```

## Perfis de Pathing

### Estrutura do Perfil

Cada campeão jungler tem um perfil de pathing:

```typescript
interface PathingProfile {
  championName: string;
  preferredPath: MapRegion[];     // Ordem típica de farming
  gankFrequency: number;          // Ganks por minuto
  aggressionLevel: number;        // 1-10 (1=defensivo, 10=agressivo)
  commonTargets: Lane[];          // Lanes preferidas para gank
  averageGankDuration: number;    // Tempo médio em lane (segundos)
}
```

### Exemplos de Perfis

#### Lee Sin (Agressivo)
```typescript
{
  championName: 'LeeSin',
  preferredPath: ['bot_jungle', 'top_jungle', 'mid_jungle'],
  gankFrequency: 0.8,     // ~1 gank a cada 1.25 min
  aggressionLevel: 9,
  commonTargets: ['mid_lane', 'top_lane'],
  averageGankDuration: 25
}
```

#### Elise (Defensivo)
```typescript
{
  championName: 'Elise',
  preferredPath: ['top_jungle', 'bot_jungle', 'mid_jungle'],
  gankFrequency: 0.6,
  aggressionLevel: 4,
  commonTargets: ['bot_lane'],
  averageGankDuration: 20
}
```

## Algoritmo de Detecção de Gank

### Fatores de Risco

1. **Proximidade Temporal**: Tempo desde último gank conhecido
2. **Proximidade Espacial**: Distância da lane alvo
3. **Pathing Score**: Compatibilidade com perfil do campeão
4. **Timing Score**: Alinhamento com janelas típicas

### Cálculo de Probabilidade

```typescript
function calculateGankProbability(
  junglerState: JunglerState,
  targetLane: Lane,
  gameTime: number
): number {
  const timeFactor = getTimeFactor(gameTime);
  const distanceFactor = getDistanceFactor(junglerState.position, targetLane);
  const pathingFactor = getPathingFactor(junglerState, targetLane);
  const timingFactor = getTimingFactor(gameTime);

  return (timeFactor + distanceFactor + pathingFactor + timingFactor) / 4;
}
```

### Níveis de Alerta

- **Seguro (0-0.3)**: Verde, sem alerta
- **Atenção (0.3-0.7)**: Amarelo, alerta moderado
- **Perigo (0.7-1.0)**: Vermelho, alerta crítico

## Sistema de Alertas

### Tipos de Alerta

1. **Proximidade**: "Jungler se aproximando do Top"
2. **Gank Iminente**: "Gank em 15s no Mid"
3. **Gank Ativo**: "Jungler no Bot (gankando)"
4. **Retorno**: "Jungler voltando para selva"

### UI/UX

- **Visual**: Ícones animados + cores dinâmicas
- **Sonoro**: Beeps opcionais (configurável)
- **Texto**: Mensagens contextuais
- **Duração**: 10-30s dependendo da severidade

## Aprendizado Adaptativo

### Histórico de Ganks

```typescript
interface GankHistory {
  timestamp: number;
  lane: Lane;
  success: boolean;        // Se resultou em kill/assist
  duration: number;        // Tempo gasto na lane
  position: Position;      // Posição exata
}
```

### Ajuste de Perfis

- Após cada gank observado, ajustar pesos do perfil
- Learning rate gradual para evitar overfitting
- Reset periódico para manter perfis atualizados

## Limitações e Mitigações

### Limitações Técnicas
- Sem acesso a visão/wards do inimigo
- Pathing aproximado (não considera obstáculos)
- Sem dados de comunicação do time

### Mitigações
- Fallback para timing-based alerts
- Margem de erro conservadora
- Validação com dados históricos

## Métricas de Qualidade

### KPIs Principais
- **Precisão**: % de alertas corretos
- **Recall**: % de ganks detectados
- **Falsos Positivos**: % de alertas incorretos
- **Latência**: Tempo entre evento e alerta

### Target
- Precisão: >75%
- Recall: >80%
- Falsos Positivos: <20%
- Latência: <2s

## Roadmap de Melhorias

### Fase 1 (Atual)
- Detecção básica de posição
- Alertas por proximidade
- Perfis estáticos de campeão

### Fase 2 (Próxima)
- Pathing dinâmico
- Aprendizado adaptativo
- Alertas contextuais

### Fase 3 (Futuro)
- Integração com wards
- Análise de comunicação
- Previsão multi-lane

## Testes e Validação

### Cenários de Teste
1. Gank bem-sucedido vs falha
2. Counter-gank
3. Ganks consecutivos
4. Pathing não-padrão

### Dados de Validação
- Logs de posição durante jogos
- Comparação com replays
- Feedback de usuários beta
