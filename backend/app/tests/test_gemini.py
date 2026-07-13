import pytest
from app.services.gemini_service import GeminiService
from app.schemas.schemas import CrowdPredictionResponse, ExecutiveSummaryReport, CopilotResponse

def test_gemini_service_crowd_prediction_mock():
    # Arrange
    service = GeminiService()
    # Temporarily disable API execution to trigger fallback mock logic
    service.api_enabled = False
    
    zone = "Gate C"
    current_density = 0.85
    active_incidents = [{"zone": "Gate C", "type": "gate_blockage", "severity": "high"}]
    
    # Act
    prediction = service.generate_crowd_prediction(
        zone=zone,
        current_density=current_density,
        active_incidents=active_incidents
    )
    
    # Assert
    assert isinstance(prediction, CrowdPredictionResponse)
    assert prediction.zone == zone
    assert len(prediction.predictions) == 4
    # The first horizon is 5 mins
    assert prediction.predictions[0].time_horizon_minutes == 5
    assert prediction.predictions[0].risk_score > 50

def test_gemini_service_incident_response_mock():
    # Arrange
    service = GeminiService()
    service.api_enabled = False
    
    # Act
    steps = service.generate_incident_response(
        zone="Zone A",
        incident_type="fire",
        severity="critical",
        description="Trash can fire"
    )
    
    # Assert
    assert len(steps) == 4
    assert steps[0].step == 1
    assert steps[0].priority == "critical"
    assert "Fire" in steps[0].actor or "fire" in steps[0].action.lower()

def test_gemini_service_copilot_chat_mock():
    # Arrange
    service = GeminiService()
    service.api_enabled = False
    
    stadium_state = {
        "densities": {"Gate C": 0.85},
        "counts": {"Gate C": 5000},
        "overall_risk_score": 50.0,
        "overall_confidence": 90.0,
        "phase": "ingress",
        "total_visitors": 12000,
        "active_incidents": []
    }
    
    # Act
    response = service.copilot_chat(
        query="Why is Gate C crowded?",
        stadium_state_summary=stadium_state,
        history=[]
    )
    
    # Assert
    assert isinstance(response, CopilotResponse)
    assert "Gate C" in response.answer or "density" in response.answer.lower() or "gate" in response.answer.lower()
    assert response.confidence_score > 0

def test_gemini_service_situation_report_mock():
    # Arrange
    service = GeminiService()
    service.api_enabled = False
    
    stadium_state = {
        "densities": {"Gate C": 0.85},
        "overall_risk_score": 50.0,
        "overall_confidence": 90.0,
        "phase": "ingress",
        "total_visitors": 12000,
        "active_incidents": []
    }
    
    # Act
    report = service.generate_situation_report(stadium_state_summary=stadium_state)
    
    # Assert
    assert isinstance(report, ExecutiveSummaryReport)
    assert report.executive_summary != ""
    assert len(report.recommended_actions) > 0
