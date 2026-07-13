import pytest
from app.services.simulation import StadiumSimulation

@pytest.mark.asyncio
async def test_simulation_initial_state():
    # Arrange
    sim = StadiumSimulation()
    
    # Act
    state = sim.get_current_state()
    
    # Assert
    assert state["phase"] == "ingress"
    assert state["system_health"] == "nominal"
    assert state["overall_risk_score"] >= 10.0
    assert len(state["densities"]) > 0
    assert len(state["counts"]) > 0

@pytest.mark.asyncio
async def test_simulation_step_updates():
    # Arrange
    sim = StadiumSimulation()
    initial_time = sim.simulation_time
    
    # Act
    await sim.update_simulation_step()
    
    # Assert
    assert sim.simulation_time == initial_time + 1
    # Check that counts changed for some nodes (due to random additions)
    assert any(sim.counts[n] != 1200 for n in sim.counts)

@pytest.mark.asyncio
async def test_simulation_responder_movement():
    # Arrange
    sim = StadiumSimulation()
    
    # Mock an active incident in Zone F
    class MockIncident:
        def __init__(self):
            self.id = 1
            self.zone = "Zone F"
            self.type = "medical"
            self.severity = "high"
            self.responders_dispatched = 0
            
    active_incidents = [MockIncident()]
    
    # Act
    await sim.simulate_responder_movements(active_incidents)
    
    # Assert
    # At least one responder should now be responding at Zone F
    responding_responders = [rep for rep in sim.responders if rep["status"] == "responding"]
    assert len(responding_responders) > 0
    assert responding_responders[0]["location"] == "Zone F"
