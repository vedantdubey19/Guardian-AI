import { 
  Incident, 
  CrowdPredictionResponse, 
  CopilotResponse, 
  RouteResponse, 
  ExecutiveSummaryReport,
  ActionPlanStep
} from '../types';

const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_BASE = `${getApiUrl()}/api`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Incidents
  async getIncidents(status?: string): Promise<Incident[]> {
    const url = status ? `${API_BASE}/incidents?status=${status}` : `${API_BASE}/incidents`;
    const response = await fetch(url, { cache: 'no-store' });
    return handleResponse<Incident[]>(response);
  },

  async createIncident(incident: {
    zone: string;
    type: string;
    severity: string;
    priority: string;
    description: string;
    affected_zones: string[];
  }): Promise<Incident> {
    const response = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });
    return handleResponse<Incident>(response);
  },

  async updateIncident(
    id: number,
    update: {
      status?: string;
      severity?: string;
      priority?: string;
      responders_dispatched?: number;
      action_plan?: ActionPlanStep[];
    }
  ): Promise<Incident> {
    const response = await fetch(`${API_BASE}/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    return handleResponse<Incident>(response);
  },

  // Crowd Predictions
  async getCrowdPredictions(zone: string): Promise<CrowdPredictionResponse> {
    const response = await fetch(`${API_BASE}/crowd/predictions?zone=${encodeURIComponent(zone)}`, {
      cache: 'no-store',
    });
    return handleResponse<CrowdPredictionResponse>(response);
  },

  // AI Operations Copilot
  async askCopilot(query: string, history: { role: 'user' | 'assistant'; content: string }[] = []): Promise<CopilotResponse> {
    const response = await fetch(`${API_BASE}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    });
    return handleResponse<CopilotResponse>(response);
  },

  // Dynamic Routing
  async calculateRoute(params: {
    start_node: string;
    end_node: string;
    accessibility_required?: boolean;
    emergency_vehicle?: boolean;
  }): Promise<RouteResponse> {
    const response = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<RouteResponse>(response);
  },

  // Executive Situation Report
  async getSituationReport(): Promise<ExecutiveSummaryReport> {
    const response = await fetch(`${API_BASE}/reports/situation`, { cache: 'no-store' });
    return handleResponse<ExecutiveSummaryReport>(response);
  },
};
