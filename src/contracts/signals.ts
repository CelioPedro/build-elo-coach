import { Lane } from './junglerData';
import { TelemetrySource } from './provider';

export type SignalKind = 'gank' | 'wave' | 'objective' | 'vision' | 'tempo' | 'jungle_track';
export type SignalSeverity = 'info' | 'watch' | 'danger';
export type SignalConfidence = 'low' | 'medium' | 'high';

export interface SignalEvidence {
  label: string;
  weight: number;
  source: TelemetrySource;
  freshnessSeconds?: number;
}

export interface CompetitiveSignal {
  id: string;
  kind: SignalKind;
  lane?: Lane;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  timeWindow: {
    from: number;
    to: number;
  };
  label: string;
  reason: string;
  evidence: SignalEvidence[];
  score: number;
}
