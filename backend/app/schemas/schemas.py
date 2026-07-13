import datetime
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class ActionPlanStep(BaseModel):
    step: int
    actor: str  # e.g., "Security Team A", "Medical Unit 3", "Operations Command"
    action: str
    priority: str

class IncidentBase(BaseModel):
    zone: str
    type: str  # medical, fire, gate_blockage, stampede, power_outage, suspicious_movement
    severity: str  # low, medium, high, critical
    priority: str  # low, medium, high, critical
    description: str
    affected_zones: List[str] = Field(default_factory=list)
    action_plan: Optional[List[ActionPlanStep]] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    action_plan: Optional[List[ActionPlanStep]] = None
    resolved_at: Optional[datetime.datetime] = None
    responders_dispatched: Optional[int] = None

class IncidentResponse(IncidentBase):
    id: int
    status: str  # active, resolving, resolved
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    responders_dispatched: int

    class Config:
        from_attributes = True

class ZoneState(BaseModel):
    density: float  # 0.0 to 1.0
    count: int
    risk_score: float  # 0 to 100
    confidence: float  # 0 to 100
    expected_congestion: str
    recommended_action: str
    reasoning: str

class CrowdStateResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    zone_data: Dict[str, ZoneState]
    overall_risk_score: float
    overall_confidence: float
    summary: str

    class Config:
        from_attributes = True

class PredictionItem(BaseModel):
    time_horizon_minutes: int  # 5, 10, 20, 30
    risk_score: float
    confidence: float
    reasoning: str
    expected_congestion: str
    recommended_actions: List[str]

class CrowdPredictionResponse(BaseModel):
    timestamp: datetime.datetime
    zone: str
    predictions: List[PredictionItem]

class CopilotRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)  # list of {"role": "user/assistant", "content": "..."}

class CopilotResponse(BaseModel):
    answer: str
    reasoning: str
    suggested_actions: List[str]
    supporting_evidence: List[str]
    confidence_score: float

class RouteRequest(BaseModel):
    start_node: str
    end_node: str
    accessibility_required: bool = False
    emergency_vehicle: bool = False

class PathSegment(BaseModel):
    node: str
    zone: str
    crowd_density: float
    risk_factor: float
    is_blocked: bool

class RouteResponse(BaseModel):
    path: List[str]
    segments: List[PathSegment]
    total_travel_time_seconds: float
    safety_rating: str  # safe, warning, dangerous
    reasoning: str

class ExecutiveSummaryReport(BaseModel):
    timestamp: datetime.datetime
    executive_summary: str
    current_issues_summary: str
    predicted_issues_summary: str
    priority_ranking: List[str]
    recommended_actions: List[str]
