import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from app.core.database import Base

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    zone = Column(String(50), index=True)
    type = Column(String(50))  # medical, fire, gate_blockage, stampede, power_outage, suspicious_movement
    severity = Column(String(20))  # low, medium, high, critical
    priority = Column(String(20))  # low, medium, high, critical
    status = Column(String(20), default="active")  # reported, active, resolving, resolved
    description = Column(Text)
    affected_zones = Column(JSON)  # List of zones, e.g. ["Zone A", "Zone B"]
    action_plan = Column(JSON)  # Detailed AI generated response steps
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    responders_dispatched = Column(Integer, default=0)

class CrowdState(Base):
    __tablename__ = "crowd_states"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    zone_data = Column(JSON)  # Dict mapping zone names to detail dicts (density, count, risk, etc.)
    overall_risk_score = Column(Float)
    overall_confidence = Column(Float)
    summary = Column(Text)

class CopilotQuery(Base):
    __tablename__ = "copilot_queries"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query = Column(Text)
    response = Column(Text)
    context_state = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
