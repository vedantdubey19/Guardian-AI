export interface ActionPlanStep {
  step: number;
  actor: string;
  action: string;
  priority: string;
}

export interface Incident {
  id: number;
  zone: string;
  type: 'medical' | 'fire' | 'gate_blockage' | 'stampede' | 'power_outage' | 'suspicious_movement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: string;
  status: 'active' | 'resolving' | 'resolved';
  description: string;
  affected_zones: string[];
  action_plan: ActionPlanStep[] | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  responders_dispatched: number;
}

export interface ZoneState {
  density: number;
  count: number;
  risk_score: number;
  confidence: number;
  expected_congestion: string;
  recommended_action: string;
  reasoning: string;
}

export interface LiveTelemetry {
  timestamp: string;
  densities: Record<string, number>;
  counts: Record<string, number>;
  responders: {
    id: string;
    name: string;
    type: 'security' | 'medical';
    location: string;
    status: 'idle' | 'responding';
  }[];
  overall_risk_score: number;
  overall_confidence: number;
  phase: 'ingress' | 'match' | 'egress';
  simulation_time: number;
  total_visitors: number;
  system_health: 'nominal' | 'degraded';
}

export interface PredictionItem {
  time_horizon_minutes: number;
  risk_score: number;
  confidence: number;
  reasoning: string;
  expected_congestion: string;
  recommended_actions: string[];
}

export interface CrowdPredictionResponse {
  timestamp: string;
  zone: string;
  predictions: PredictionItem[];
}

export interface CopilotResponse {
  answer: string;
  reasoning: string;
  suggested_actions: string[];
  supporting_evidence: string[];
  confidence_score: number;
}

export interface PathSegment {
  node: string;
  zone: string;
  crowd_density: number;
  risk_factor: number;
  is_blocked: boolean;
}

export interface RouteResponse {
  path: string[];
  segments: PathSegment[];
  total_travel_time_seconds: number;
  safety_rating: 'safe' | 'warning' | 'dangerous';
  reasoning: string;
}

export interface ExecutiveSummaryReport {
  timestamp: string;
  executive_summary: string;
  current_issues_summary: string;
  predicted_issues_summary: string;
  priority_ranking: string[];
  recommended_actions: string[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  details?: CopilotResponse;
}
