from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Security, Request, status
from fastapi.security import HTTPBearer, APIKeyHeader, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any
import datetime

from app.core.database import get_db
from app.models.models import Incident, CrowdState, CopilotQuery
from app.schemas.schemas import (
    IncidentCreate, IncidentUpdate, IncidentResponse,
    CrowdPredictionResponse, PredictionItem,
    CopilotRequest, CopilotResponse,
    RouteRequest, RouteResponse,
    ExecutiveSummaryReport
)
from app.services.simulation import stadium_sim, ALL_NODES
from app.services.route_engine import RouteEngine
from app.services.gemini_service import GeminiService
from app.core.limiter import limiter

router = APIRouter()
gemini = GeminiService()

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

async def verify_api_key(
    api_key: Optional[str] = Security(api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
):
    from app.core.config import settings
    expected_key = settings.GUARDIAN_API_KEY
    token = api_key or (bearer.credentials if bearer else None)
    if not token or token != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key or bearer token"
        )
    return token

# ----------------------------------------------------
# WebSocket Endpoint for Live Telemetry
# ----------------------------------------------------
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming of crowd density heatmaps,
    incident updates, and responder positions.
    """
    await stadium_sim.register(websocket)
    try:
        while True:
            # Keep-alive loop (receive messages from clients if any)
            data = await websocket.receive_text()
            # If client sends a trigger command, we can handle it
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        stadium_sim.unregister(websocket)
    except Exception as e:
        stadium_sim.unregister(websocket)

# ----------------------------------------------------
# Incident Operations Endpoints
# ----------------------------------------------------
@router.get("/incidents", response_model=List[IncidentResponse])
async def get_incidents(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100, description="Max number of incidents to return"),
    offset: int = Query(0, ge=0, description="Number of incidents to skip"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve active or resolved emergency incidents.
    """
    query = select(Incident)
    if status:
        if status not in ("active", "resolved", "resolving", "reported"):
            raise HTTPException(status_code=400, detail="Invalid incident status value")
        query = query.where(Incident.status == status)
    
    query = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/incidents", response_model=IncidentResponse)
async def create_incident(
    incident_in: IncidentCreate, 
    db: AsyncSession = Depends(get_db),
    token: str = Depends(verify_api_key)
):
    """
    Manual reporting of a security or medical incident.
    Triggers immediate AI action planning using Gemini.
    """
    if incident_in.zone not in ALL_NODES:
        raise HTTPException(status_code=400, detail=f"Invalid zone location: {incident_in.zone}")
    
    if incident_in.type not in ("medical", "fire", "gate_blockage", "stampede", "power_outage", "suspicious_movement"):
        raise HTTPException(status_code=400, detail=f"Invalid incident type: {incident_in.type}")
        
    if incident_in.severity not in ("low", "medium", "high", "critical"):
        raise HTTPException(status_code=400, detail=f"Invalid severity value: {incident_in.severity}")

    action_plan = incident_in.action_plan
    if action_plan:
        action_plan = [step.model_dump() if hasattr(step, "model_dump") else step for step in action_plan]
    else:
        steps = gemini.generate_incident_response(
            zone=incident_in.zone,
            incident_type=incident_in.type,
            severity=incident_in.severity,
            description=incident_in.description
        )
        action_plan = [step.model_dump() for step in steps]

    new_incident = Incident(
        zone=incident_in.zone,
        type=incident_in.type,
        severity=incident_in.severity,
        priority=incident_in.priority,
        description=incident_in.description,
        affected_zones=incident_in.affected_zones,
        action_plan=action_plan,
        status="active"
    )
    
    db.add(new_incident)
    await db.commit()
    await db.refresh(new_incident)
    
    # Broadcast update via WebSockets
    await stadium_sim.broadcast({"event": "incident_created", "incident": IncidentResponse.model_validate(new_incident).model_dump(mode="json")})
    return new_incident

@router.put("/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int, 
    incident_in: IncidentUpdate, 
    db: AsyncSession = Depends(get_db),
    token: str = Depends(verify_api_key)
):
    """
    Updates incident status, response crews, or resolves an active emergency.
    """
    db_incident = await db.get(Incident, incident_id)
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = incident_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "action_plan" and val:
            setattr(db_incident, field, [step.model_dump() if hasattr(step, "model_dump") else step for step in val])
        else:
            setattr(db_incident, field, val)

    await db.commit()
    await db.refresh(db_incident)
    
    # Trigger broadcast update
    await stadium_sim.broadcast({"event": "incident_updated", "incident": IncidentResponse.model_validate(db_incident).model_dump(mode="json")})
    return db_incident

# ----------------------------------------------------
# Crowd Prediction Endpoints
# ----------------------------------------------------
@router.get("/crowd/predictions", response_model=CrowdPredictionResponse)
@limiter.limit("10/minute")
async def get_crowd_predictions(
    request: Request,
    zone: str = Query(..., description="Target stadium zone for forecasting"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate crowd density predictions for 5, 10, 20, 30 minute horizons.
    Uses Gemini API to forecast queue changes and recommended dispatch actions.
    """
    if zone not in ALL_NODES:
        raise HTTPException(status_code=400, detail=f"Invalid zone: {zone}")
    # Fetch active incidents to provide context to predictive AI
    stmt = select(Incident).where(Incident.status == "active")
    result = await db.execute(stmt)
    active_incidents = [
        {"type": inc.type, "zone": inc.zone, "severity": inc.severity, "description": inc.description} 
        for inc in result.scalars().all()
    ]
    
    # Get current density from simulation
    current_density = stadium_sim.densities.get(zone, 0.15)
    
    prediction = gemini.generate_crowd_prediction(
        zone=zone,
        current_density=current_density,
        active_incidents=active_incidents
    )
    return prediction

# ----------------------------------------------------
# AI Copilot Decision Endpoint
# ----------------------------------------------------
@router.post("/copilot", response_model=CopilotResponse)
@limiter.limit("10/minute")
async def ask_copilot(
    request: Request,
    copilot_request: CopilotRequest, 
    db: AsyncSession = Depends(get_db),
    token: str = Depends(verify_api_key)
):
    """
    Operations Command Decision Copilot. Ask questions about stadium logistics,
    safety risks, resource planning, and evacuation routing.
    """
    if not copilot_request.query or not copilot_request.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty")
    # Fetch active incidents
    stmt = select(Incident).where(Incident.status == "active")
    result = await db.execute(stmt)
    active_incidents = [
        {"type": inc.type, "zone": inc.zone, "severity": inc.severity, "description": inc.description} 
        for inc in result.scalars().all()
    ]
    
    # Construct current stadium status summary
    sim_state = stadium_sim.get_current_state()
    stadium_state_summary = {
        "densities": stadium_sim.densities,
        "counts": stadium_sim.counts,
        "overall_risk_score": sim_state["overall_risk_score"],
        "overall_confidence": sim_state["overall_confidence"],
        "phase": sim_state["phase"],
        "total_visitors": sim_state["total_visitors"],
        "active_incidents": active_incidents
    }
    
    response = gemini.copilot_chat(
        query=copilot_request.query,
        stadium_state_summary=stadium_state_summary,
        history=copilot_request.history or []
    )
    
    # Persist the copilot query log asynchronously
    query_record = CopilotQuery(
        query=copilot_request.query,
        response=response.answer,
        context_state=stadium_state_summary
    )
    db.add(query_record)
    await db.commit()
    
    return response

# ----------------------------------------------------
# Dynamic Smart Routing Endpoints
# ----------------------------------------------------
@router.post("/routes", response_model=RouteResponse)
async def calculate_route(
    route_request: RouteRequest, 
    db: AsyncSession = Depends(get_db),
    token: str = Depends(verify_api_key)
):
    """
    Calculates safety-optimized routes avoiding incidents and high-density bottlenecks.
    Supports accessibility parameters and emergency responder tunnels.
    """
    if route_request.start_node not in ALL_NODES:
        raise HTTPException(status_code=400, detail=f"Invalid starting node: {route_request.start_node}")
    if route_request.end_node not in ALL_NODES:
        raise HTTPException(status_code=400, detail=f"Invalid destination node: {route_request.end_node}")
    # Fetch active incidents
    stmt = select(Incident).where(Incident.status == "active")
    result = await db.execute(stmt)
    active_incidents = [
        {"type": inc.type, "zone": inc.zone, "severity": inc.severity} 
        for inc in result.scalars().all()
    ]
    
    # Run route Dijkstra calculator
    route = RouteEngine.calculate_route(
        start=route_request.start_node,
        end=route_request.end_node,
        crowd_densities=stadium_sim.densities,
        active_incidents=active_incidents,
        accessibility_required=route_request.accessibility_required,
        emergency_vehicle=route_request.emergency_vehicle
    )
    return route

# ----------------------------------------------------
# AI Executive Situation Report
# ----------------------------------------------------
@router.get("/reports/situation", response_model=ExecutiveSummaryReport)
@limiter.limit("10/minute")
async def get_situation_report(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates an executive-ready Situation Report summarizing operations,
    priority actions, and congestion risks.
    """
    # Fetch active incidents
    stmt = select(Incident).where(Incident.status == "active")
    result = await db.execute(stmt)
    active_incidents = [
        {"type": inc.type, "zone": inc.zone, "severity": inc.severity, "description": inc.description} 
        for inc in result.scalars().all()
    ]
    
    # Construct stadium state
    sim_state = stadium_sim.get_current_state()
    stadium_state_summary = {
        "densities": stadium_sim.densities,
        "overall_risk_score": sim_state["overall_risk_score"],
        "overall_confidence": sim_state["overall_confidence"],
        "phase": sim_state["phase"],
        "total_visitors": sim_state["total_visitors"],
        "active_incidents": active_incidents
    }
    
    report = gemini.generate_situation_report(stadium_state_summary)
    return report
