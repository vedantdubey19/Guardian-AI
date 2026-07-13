import asyncio
import random
import datetime
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.models import CrowdState, Incident
from app.services.gemini_service import GeminiService
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

# Zones lists
ZONES = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F", "Zone G", "Zone H"]
GATES = ["Gate A", "Gate B", "Gate C", "Gate D", "Gate E", "Gate F", "Gate G", "Gate H"]
CONCOURSES = [f"Concourse {i}" for i in range(1, 13)]
ALL_NODES = ZONES + GATES + CONCOURSES

class StadiumSimulation:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        
        # Initialize crowd densities (0.0 to 1.0) and visitor counts
        self.densities: Dict[str, float] = {node: 0.15 for node in ALL_NODES}
        self.counts: Dict[str, int] = {node: 1200 for node in ALL_NODES}
        
        # Security and Medical units locations & availability
        self.responders: List[Dict[str, Any]] = [
            {"id": "sec-1", "name": "Security Squad Alpha", "type": "security", "location": "Gate A", "status": "idle"},
            {"id": "sec-2", "name": "Security Squad Beta", "type": "security", "location": "Gate E", "status": "idle"},
            {"id": "sec-3", "name": "Security Squad Gamma", "type": "security", "location": "Concourse 6", "status": "idle"},
            {"id": "med-1", "name": "Medical Crew Red", "type": "medical", "location": "Concourse 2", "status": "idle"},
            {"id": "med-2", "name": "Medical Crew Blue", "type": "medical", "location": "Concourse 10", "status": "idle"}
        ]
        
        self.simulation_time = 0  # Dynamic simulation counter
        self.phase = "ingress"  # ingress, match, egress
        self.gemini = GeminiService()

    async def register(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client registered. Active: {len(self.active_connections)}")
        # Send initial state immediately
        await websocket.send_json(self.get_current_state())

    def unregister(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        
        # Gather dead connections to remove
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
                
        for connection in dead_connections:
            self.unregister(connection)

    def get_current_state(self) -> Dict[str, Any]:
        """
        Gathers live simulation metrics.
        """
        # Calculate overall safety score based on density and incidents
        overall_risk = 10.0
        # If there are active high-density zones or incidents, increase risk
        high_density_count = sum(1 for d in self.densities.values() if d > 0.7)
        overall_risk += high_density_count * 5.0
        
        # Calculate overall confidence
        overall_confidence = max(55.0, 95.0 - (high_density_count * 2.0))
        
        return {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "densities": self.densities,
            "counts": self.counts,
            "responders": self.responders,
            "overall_risk_score": round(min(100.0, overall_risk), 1),
            "overall_confidence": round(overall_confidence, 1),
            "phase": self.phase,
            "simulation_time": self.simulation_time,
            "total_visitors": sum(self.counts.values()),
            "system_health": "nominal" if overall_risk < 60 else "degraded"
        }

    async def update_simulation_step(self):
        """
        Simulates one step of crowd dynamics.
        Ingress -> Match Play -> Egress loop
        """
        self.simulation_time += 1
        
        # Shift phase periodically
        if self.simulation_time % 120 == 0:
            if self.phase == "ingress":
                self.phase = "match"
            elif self.phase == "match":
                self.phase = "egress"
            else:
                self.phase = "ingress"
            logger.info(f"Stadium operational phase shifted to: {self.phase}")

        # Update crowd metrics based on current phase
        if self.phase == "ingress":
            # Spectators entering through gates and moving to seats via concourses
            for gate in GATES:
                # Add people at gates
                self.counts[gate] = min(6000, self.counts[gate] + random.randint(50, 150))
                self.densities[gate] = min(1.0, self.counts[gate] / 6000.0)
            
            for conc in CONCOURSES:
                # People moving from gates to concourses
                self.counts[conc] = min(4000, self.counts[conc] + random.randint(20, 80))
                self.densities[conc] = min(1.0, self.counts[conc] / 4000.0)
                
            for zone in ZONES:
                # Flowing into seats slowly
                self.counts[zone] = min(8000, self.counts[zone] + random.randint(10, 50))
                self.densities[zone] = min(1.0, self.counts[zone] / 8000.0)
                
        elif self.phase == "match":
            # Seating zones dense, gates and concourses empty out
            for gate in GATES:
                self.counts[gate] = max(200, self.counts[gate] - random.randint(50, 150))
                self.densities[gate] = min(1.0, self.counts[gate] / 6000.0)
            
            for conc in CONCOURSES:
                self.counts[conc] = max(400, self.counts[conc] - random.randint(30, 80))
                self.densities[conc] = min(1.0, self.counts[conc] / 4000.0)
                
            for zone in ZONES:
                # Spectators settled in seating areas
                self.counts[zone] = min(10000, self.counts[zone] + random.randint(50, 150))
                self.densities[zone] = min(1.0, self.counts[zone] / 10000.0)
                
        elif self.phase == "egress":
            # Evacuating seating zones, concourses and gates become dense
            for zone in ZONES:
                self.counts[zone] = max(100, self.counts[zone] - random.randint(100, 300))
                self.densities[zone] = min(1.0, self.counts[zone] / 10000.0)
            
            for conc in CONCOURSES:
                self.counts[conc] = min(3500, self.counts[conc] + random.randint(50, 150))
                self.densities[conc] = min(1.0, self.counts[conc] / 4000.0)
                
            for gate in GATES:
                self.counts[gate] = min(5000, self.counts[gate] + random.randint(100, 250))
                self.densities[gate] = min(1.0, self.counts[gate] / 6000.0)

        # Apply incident impact to local densities
        async with AsyncSessionLocal() as session:
            # Query active incidents
            stmt = select(Incident).where(Incident.status == "active")
            result = await session.execute(stmt)
            active_incidents = result.scalars().all()
            
            for inc in active_incidents:
                zone = inc.zone
                severity = inc.severity.lower()
                
                # If there's an emergency, spectators flee the zone, driving density of adjacent concourses high
                if inc.type in ("fire", "stampede"):
                    # Evacuate current zone
                    self.counts[zone] = max(50, self.counts[zone] - 400)
                    self.densities[zone] = min(1.0, self.counts[zone] / 8000.0)
                    
                    # Push densities of connected concourses high (panic routing)
                    # Let's find adjacent concourses and double their densities
                    for neigh in ALL_NODES:
                        if zone in neigh or neigh in zone:
                            self.counts[neigh] = min(4000, self.counts[neigh] + 300)
                            self.densities[neigh] = min(1.0, self.counts[neigh] / 4000.0)
                else:
                    # Minor incidents slow down evacuation, accumulating density locally
                    self.counts[zone] = min(9000, self.counts[zone] + 150)
                    self.densities[zone] = min(1.0, self.counts[zone] / 8000.0)

            # Periodically write crowd state history to DB for analytics
            if self.simulation_time % 15 == 0:
                current_state = self.get_current_state()
                # Store serialized zone data
                zone_data_dict = {}
                for node in ALL_NODES:
                    density = self.densities[node]
                    count = self.counts[node]
                    
                    # Compute mock zone status indicators
                    risk = density * 100.0
                    if any(inc.zone == node for inc in active_incidents):
                        risk = min(100.0, risk + 35.0)
                        
                    zone_data_dict[node] = {
                        "density": density,
                        "count": count,
                        "risk_score": round(risk, 1),
                        "confidence": 90.0,
                        "expected_congestion": "High" if density > 0.7 else ("Normal" if density > 0.3 else "Low"),
                        "recommended_action": "Divert Flow" if density > 0.7 else "Standard Monitoring",
                        "reasoning": "Live queue patterns"
                    }
                
                crowd_record = CrowdState(
                    zone_data=zone_data_dict,
                    overall_risk_score=current_state["overall_risk_score"],
                    overall_confidence=current_state["overall_confidence"],
                    summary=f"Stadium operation state updated in phase {self.phase}. Total spectator count: {current_state['total_visitors']}."
                )
                session.add(crowd_record)
                await session.commit()

        # Randomly generate occasional incidents for demonstration (1% chance per step)
        if random.random() < 0.015:
            await self.trigger_random_incident()

        # Update responder locations - move units towards active incidents
        await self.simulate_responder_movements(active_incidents)

        # Broadcast state to active WebSocket connections
        await self.broadcast(self.get_current_state())

    async def trigger_random_incident(self):
        """
        Simulates spawning a new safety incident.
        """
        async with AsyncSessionLocal() as session:
            # Check active incidents count
            stmt = select(Incident).where(Incident.status == "active")
            result = await session.execute(stmt)
            active_count = len(result.scalars().all())
            
            if active_count >= 3:
                return  # Limit concurrency of incidents to keep map readable
                
            inc_type = random.choice(["medical", "fire", "gate_blockage", "stampede", "power_outage", "suspicious_movement"])
            zone = random.choice(ALL_NODES)
            
            severities = ["low", "medium", "high", "critical"]
            severity = random.choices(severities, weights=[0.4, 0.3, 0.2, 0.1])[0]
            priority = severity  # Direct match

            descriptions = {
                "medical": f"Spectator fainted in {zone}. Possible heat exhaustion. Medical crew needed.",
                "fire": f"Small trash container fire reported in {zone} corridor. Smoke alarms active.",
                "gate_blockage": f"Hardware turnstile sync failure at {zone}. Queue buildup reported.",
                "stampede": f"Crowd bottleneck surge in {zone} walkway. SpecSpectators pushing.",
                "power_outage": f"Sector light grid blackout in {zone}. Emergency lighting active.",
                "suspicious_movement": f"Unauthorized group attempting to scale perimeter gate fencing at {zone}."
            }
            
            description = descriptions[inc_type]
            
            # Generate AI Action Plan
            action_plan_steps = self.gemini.generate_incident_response(
                zone=zone,
                incident_type=inc_type,
                severity=severity,
                description=description
            )
            
            action_plan_serialized = [step.model_dump() for step in action_plan_steps]
            
            new_incident = Incident(
                zone=zone,
                type=inc_type,
                severity=severity,
                priority=priority,
                description=description,
                affected_zones=[zone],
                action_plan=action_plan_serialized,
                status="active"
            )
            session.add(new_incident)
            await session.commit()
            logger.info(f"Simulated incident triggered: {inc_type} at {zone} (Severity: {severity})")

    async def simulate_responder_movements(self, active_incidents: List[Incident]):
        """
        Simulates units responding to active emergencies.
        """
        if not active_incidents:
            # Relocate units back to home bases if idle
            home_bases = {
                "sec-1": "Gate A",
                "sec-2": "Gate E",
                "sec-3": "Concourse 6",
                "med-1": "Concourse 2",
                "med-2": "Concourse 10"
            }
            for rep in self.responders:
                rep["status"] = "idle"
                home = home_bases[rep["id"]]
                if rep["location"] != home:
                    rep["location"] = home
            return

        # Assign responders to active incidents
        # A simple simulator assignment: match type and move location closer
        for inc in active_incidents:
            target_zone = inc.zone
            inc_type = inc.type
            
            # Find an idle responder matching type
            assigned = False
            for rep in self.responders:
                if rep["status"] == "idle":
                    # Match medical incidents to medical units, other to security
                    if (inc_type == "medical" and rep["type"] == "medical") or (inc_type != "medical" and rep["type"] == "security"):
                        rep["status"] = "responding"
                        rep["location"] = target_zone  # Teleport to simulate travel path completion
                        inc.responders_dispatched += 1
                        assigned = True
                        break
            
            if not assigned:
                # If no matching idle responder, pick any idle
                for rep in self.responders:
                    if rep["status"] == "idle":
                        rep["status"] = "responding"
                        rep["location"] = target_zone
                        inc.responders_dispatched += 1
                        break

        # Occasionally resolve incidents over time (10% chance per step for active incidents with responders)
        async with AsyncSessionLocal() as session:
            for inc in active_incidents:
                if inc.responders_dispatched > 0 and random.random() < 0.12:
                    # Fetch database record
                    db_inc = await session.get(Incident, inc.id)
                    if db_inc:
                        db_inc.status = "resolved"
                        db_inc.resolved_at = datetime.datetime.utcnow()
                        await session.commit()
                        logger.info(f"Simulated incident resolved: {inc.type} in {inc.zone}")
                        
                        # Free up the responders assigned to this zone
                        for rep in self.responders:
                            if rep["location"] == inc.zone:
                                rep["status"] = "idle"

# Global simulation runner instance
stadium_sim = StadiumSimulation()

async def run_simulation_loop():
    """
    Main simulation thread loop.
    Runs every 3 seconds to update metrics.
    """
    logger.info("Starting Stadium Simulation background loop...")
    while True:
        try:
            await stadium_sim.update_simulation_step()
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}", exc_info=True)
        await asyncio.sleep(3.0)
