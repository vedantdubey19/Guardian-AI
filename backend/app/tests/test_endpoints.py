import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "guardian-ai-api"}

@pytest.mark.asyncio
async def test_incidents_endpoints(client: AsyncClient):
    # 1. Create Incident
    payload = {
        "zone": "Zone A",
        "type": "medical",
        "severity": "medium",
        "priority": "medium",
        "description": "Visitor with sprained ankle near seating blocks.",
        "affected_zones": ["Zone A"],
        "action_plan": [
            {"step": 1, "actor": "Medical Crew Red", "action": "Dispatch stretchers.", "priority": "high"}
        ]
    }
    
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 200
    created_incident = response.json()
    assert created_incident["id"] is not None
    assert created_incident["zone"] == "Zone A"
    assert created_incident["status"] == "active"
    
    # 2. Get Incidents list
    list_response = await client.get("/api/incidents")
    assert list_response.status_code == 200
    incidents = list_response.json()
    assert len(incidents) > 0
    assert any(inc["id"] == created_incident["id"] for inc in incidents)
    
    # 3. Update / Resolve Incident
    incident_id = created_incident["id"]
    update_payload = {"status": "resolved"}
    update_response = await client.put(f"/api/incidents/{incident_id}", json=update_payload)
    assert update_response.status_code == 200
    updated_incident = update_response.json()
    assert updated_incident["status"] == "resolved"

@pytest.mark.asyncio
async def test_incidents_invalid_inputs(client: AsyncClient):
    # 1. Invalid Zone
    payload = {
        "zone": "Invalid Zone Name",
        "type": "medical",
        "severity": "medium",
        "priority": "medium",
        "description": "Visitor issue.",
        "affected_zones": []
    }
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 400
    
    # 2. Invalid Type
    payload = {
        "zone": "Zone A",
        "type": "tsunami",
        "severity": "medium",
        "priority": "medium",
        "description": "Visitor issue.",
        "affected_zones": []
    }
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_crowd_predictions_endpoint(client: AsyncClient):
    # Valid zone prediction query
    response = await client.get("/api/crowd/predictions?zone=Gate C")
    assert response.status_code == 200
    data = response.json()
    assert data["zone"] == "Gate C"
    assert len(data["predictions"]) == 4

@pytest.mark.asyncio
async def test_crowd_predictions_invalid_zone(client: AsyncClient):
    # Invalid zone predictions query should fail validation check
    response = await client.get("/api/crowd/predictions?zone=Gate Z")
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_copilot_decision_endpoint(client: AsyncClient):
    payload = {
        "query": "Predict next bottleneck",
        "history": []
    }
    response = await client.post("/api/copilot", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "reasoning" in data
    assert data["confidence_score"] > 0

@pytest.mark.asyncio
async def test_copilot_empty_query(client: AsyncClient):
    payload = {
        "query": "  ",
        "history": []
    }
    response = await client.post("/api/copilot", json=payload)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_routing_calculation_endpoint(client: AsyncClient):
    payload = {
        "start_node": "Gate A",
        "end_node": "Zone A",
        "accessibility_required": False,
        "emergency_vehicle": False
    }
    response = await client.post("/api/routes", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "path" in data
    assert "segments" in data
    assert data["safety_rating"] in ("safe", "warning", "dangerous")

@pytest.mark.asyncio
async def test_routing_invalid_nodes(client: AsyncClient):
    payload = {
        "start_node": "Gate Z",
        "end_node": "Zone A"
    }
    response = await client.post("/api/routes", json=payload)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_executive_situation_report_endpoint(client: AsyncClient):
    response = await client.get("/api/reports/situation")
    assert response.status_code == 200
    data = response.json()
    assert "executive_summary" in data
    assert "recommended_actions" in data
