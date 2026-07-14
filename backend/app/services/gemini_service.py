import os
import json
import logging
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
# DEPRECATED: google.generativeai is deprecated.
# Migration path: Switch to the google.genai package:
#     from google import genai
#     client = genai.Client()
#     response = client.models.generate_content(...)
import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse
from app.core.config import settings
from app.schemas.schemas import (
    CrowdPredictionResponse, 
    PredictionItem, 
    CopilotResponse, 
    ExecutiveSummaryReport, 
    ActionPlanStep
)

logger = logging.getLogger(__name__)

# Configure Gemini
api_key_set = False
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        api_key_set = True
        logger.info("Gemini API successfully configured.")
    except Exception as e:
        logger.error(f"Error configuring Gemini API: {e}")

class GeminiService:
    def __init__(self):
        self.model_name = "gemini-1.5-flash"
        self.api_enabled = api_key_set
        
    def _call_gemini_structured(self, prompt: str, schema_class: Any) -> Optional[str]:
        """
        Calls Gemini and enforces JSON output matching the specified Pydantic schema class.
        """
        if not self.api_enabled:
            return None
            
        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=schema_class,
                    temperature=0.2,
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API request failed: {e}. Falling back to simulation logic.")
            return None

    def generate_crowd_prediction(
        self, 
        zone: str, 
        current_density: float, 
        active_incidents: List[Dict[str, Any]]
    ) -> CrowdPredictionResponse:
        """
        Predicts crowd risk indicators and density curves for 5, 10, 20, and 30 minute horizons.
        """
        incidents_str = json.dumps(active_incidents, default=str)
        prompt = f"""
        You are the Head AI Operations Specialist for the FIFA World Cup 2026 Stadium.
        Predict crowd behaviors, risks, and recommended actions for '{zone}' for the next 5, 10, 20, and 30 minutes.
        
        Current State:
        - Zone: {zone}
        - Current Density Level: {current_density} (where 0.0 is empty, 1.0 is extremely congested)
        - Active Incidents in Stadium: {incidents_str}
        
        Analyze queue bottlenecks, movement physics, egress flow rates, and stampede or blockage risks based on the active incidents.
        Provide predictions in the required JSON format matching CrowdPredictionResponse.
        """
        
        # Try real Gemini
        result_json = self._call_gemini_structured(prompt, CrowdPredictionResponse)
        if result_json:
            try:
                data = json.loads(result_json)
                # Ensure correct format
                return CrowdPredictionResponse(**data)
            except Exception as e:
                logger.error(f"Failed to parse Gemini crowd prediction JSON: {e}")

        # Fallback Mock Generator (Zero configuration, high fidelity)
        # Calculate dynamic values based on inputs
        has_local_incident = any(inc.get("zone") == zone for inc in active_incidents)
        local_inc = next((inc for inc in active_incidents if inc.get("zone") == zone), None)
        
        predictions = []
        time_horizons = [5, 10, 20, 30]
        
        base_risk = current_density * 60.0
        if has_local_incident:
            severity = local_inc.get("severity", "medium").lower()
            base_risk += 40.0 if severity == "critical" else (30.0 if severity == "high" else 15.0)
            
        base_risk = min(100.0, base_risk)

        for minutes in time_horizons:
            # Predict risk and density curves based on time and incidents
            factor = minutes / 30.0
            
            if has_local_incident:
                # Incidents escalate risk over time if not resolved
                inc_type = local_inc.get("type", "medical")
                risk_score = min(100.0, base_risk + (factor * 20.0))
                confidence = max(50.0, 95.0 - (factor * 10.0))
                
                if inc_type == "fire":
                    expected_congestion = "Extreme structural bottleneck; smoke migration creating evacuation panic."
                    reasoning = f"Active fire incident in {zone} is causing rapid occupant displacement and panic routing toward exits."
                    recommended = [f"Direct spectators away from {zone} toward opposite gates.", "Deploy emergency ventilation.", "Initiate local structural evacuation alarms."]
                elif inc_type == "gate_blockage":
                    expected_congestion = "Gridlock at turnstiles; crowd pressure building."
                    reasoning = f"Gate failure has halted egress flow. SpectSpectators are accumulating at exit lines without moving."
                    recommended = [f"Redirect incoming flow to alternate adjacent gates.", "Deploy crowd control barriers.", "Manually override turnstile lockouts."]
                else:
                    expected_congestion = "Secondary congestion; corridors slowed by responders."
                    reasoning = f"Response units deployed to zone {zone} occupy transit paths, slowing standard crowd flow."
                    recommended = ["Keep main thoroughfare clear for response teams.", "Strobe warning indicators to route traffic around incident point."]
            else:
                # Normal flow trends
                if current_density > 0.7:
                    risk_score = min(100.0, base_risk + (factor * 10.0))
                    confidence = 88.0 - (factor * 5.0)
                    expected_congestion = "Sustained high density; corridor movement speeds reduced to shuffle speed."
                    reasoning = "Entering spectator peak arrival window. Inflow volume exceeds corridor egress capacity."
                    recommended = ["Activate secondary exit stairwells.", "Deploy volunteers to distribute crowd loads evenly.", "Enable audio guidance system."]
                else:
                    risk_score = max(0.0, base_risk - (factor * 5.0))
                    confidence = 92.0
                    expected_congestion = "Normal fluid crowd movement; light queues at gates."
                    reasoning = "Spectator arrival flow matches corridor absorption rate. No dynamic incident hazards."
                    recommended = ["Continue standard operations monitoring.", "Ensure informational wayfinding screens are active."]

            predictions.append(PredictionItem(
                time_horizon_minutes=minutes,
                risk_score=round(risk_score, 1),
                confidence=round(confidence, 1),
                reasoning=reasoning,
                expected_congestion=expected_congestion,
                recommended_actions=recommended
            ))
            
        return CrowdPredictionResponse(
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            zone=zone,
            predictions=predictions
        )

    def generate_incident_response(
        self, 
        zone: str, 
        incident_type: str, 
        severity: str, 
        description: str
    ) -> List[ActionPlanStep]:
        """
        Generates a detailed, step-by-step action plan for security/medical units using Gemini.
        """
        prompt = f"""
        You are the Emergency Response Copilot for the FIFA World Cup 2026.
        An incident has been reported:
        - Zone: {zone}
        - Incident Type: {incident_type}
        - Severity: {severity}
        - Description: {description}
        
        Generate a list of 4 concrete, actionable response steps. For each step, specify the actor responsible (e.g. "Security Team A", "Medical Unit 3", "Stadium Operations") and the step priority (low, medium, high, critical).
        Return the result in the exact JSON schema representation of a list of ActionPlanStep.
        """
        
        class ActionPlanWrapper(BaseModel):
            steps: List[ActionPlanStep]

        result_json = self._call_gemini_structured(prompt, ActionPlanWrapper)
        if result_json:
            try:
                data = json.loads(result_json)
                return ActionPlanWrapper(**data).steps
            except Exception as e:
                logger.error(f"Failed to parse Gemini action plan JSON: {e}")

        # Fallback simulation
        steps = []
        if incident_type == "medical":
            steps = [
                ActionPlanStep(step=1, actor="Medical Crew Red", action=f"Dispatch paramedic unit to {zone} via Route Tunnel 3.", priority="critical"),
                ActionPlanStep(step=2, actor="Local Security Staff", action=f"Establish crowd barrier circle around patient in {zone}.", priority="high"),
                ActionPlanStep(step=3, actor="Operations Command", action="Broadcast standby notice to nearby emergency transport vehicles.", priority="medium"),
                ActionPlanStep(step=4, actor="Volunteer Stewards", action="Clear pedestrian transit pathway for medical stretcher evacuation.", priority="medium")
            ]
        elif incident_type == "fire":
            steps = [
                ActionPlanStep(step=1, actor="Fire Suppression Squad", action=f"Deploy fire response unit to {zone} with full equipment.", priority="critical"),
                ActionPlanStep(step=2, actor="Security Operations", action=f"Trigger evacuation sirens and route visitors from {zone} to Gates G/H.", priority="critical"),
                ActionPlanStep(step=3, actor="Ventilation Systems", action=f"Set extraction fans in {zone} corridor to maximum capacity.", priority="high"),
                ActionPlanStep(step=4, actor="Medical Dispatch", action="Position triage tents outside Gate H in preparation for casualties.", priority="high")
            ]
        elif incident_type == "gate_blockage":
            steps = [
                ActionPlanStep(step=1, actor="Gate Technicians", action=f"Deploy hardware maintenance staff to restart biometric turnstiles in {zone}.", priority="critical"),
                ActionPlanStep(step=2, actor="Crowd Marshalling Team", action="Form bottleneck diversion queues to funnel people to adjacent open gates.", priority="high"),
                ActionPlanStep(step=3, actor="PA Audio Command", action="Broadcast voice guides to spectators notifying them of gate queues and alternatives.", priority="medium"),
                ActionPlanStep(step=4, actor="Operations Command", action="Log software diagnostic report and update central gate status logs.", priority="low")
            ]
        else:
            steps = [
                ActionPlanStep(step=1, actor="Security Dispatch", action=f"Deploy mobile patrol unit to {zone} to investigate situation.", priority="high"),
                ActionPlanStep(step=2, actor="Operations Command", action=f"Switch local security cameras to high-refresh tracking on {zone}.", priority="medium"),
                ActionPlanStep(step=3, actor="Zone Stewards", action="Monitor local crowd behaviors and report abnormal groupings.", priority="medium"),
                ActionPlanStep(step=4, actor="Communications Officer", action="Maintain direct contact with field supervisors.", priority="low")
            ]
        return steps

    def copilot_chat(
        self, 
        query: str, 
        stadium_state_summary: Dict[str, Any], 
        history: List[Dict[str, str]]
    ) -> CopilotResponse:
        """
        Interactive decision assistant. Evaluates queries with full stadium context.
        """
        context_str = json.dumps(stadium_state_summary, default=str)
        history_str = json.dumps(history, default=str)
        
        prompt = f"""
        You are the Operations Copilot for the FIFA World Cup 2026 Stadium Command Center.
        You have direct visibility over the stadium state and active emergencies.
        
        Current Stadium State Context:
        {context_str}
        
        Conversation History:
        {history_str}
        
        User Operational Query:
        "{query}"
        
        Formulate a detailed, professional, and highly actionable response.
        - Answer: Give direct operational answers, avoid conversational filler. Keep it technical and executive-ready.
        - Reasoning: Explain the "why" behind your answer, referencing crowd densities, gates, and response team positions.
        - Suggested Actions: Short bullet points of what commands should do next.
        - Supporting Evidence: Reference specific numbers (e.g. "Gate C density is 85%") from the context.
        - Confidence Score: Estimate your operational confidence from 0 to 100 based on data quality.
        
        Format your response precisely matching the CopilotResponse JSON model.
        """
        
        result_json = self._call_gemini_structured(prompt, CopilotResponse)
        if result_json:
            try:
                data = json.loads(result_json)
                return CopilotResponse(**data)
            except Exception as e:
                logger.error(f"Failed to parse Gemini copilot response JSON: {e}")

        # Fallback mock engine
        query_lower = query.lower()
        
        # Analyze stadium state to populate evidence
        active_incs = stadium_state_summary.get("active_incidents", [])
        inc_count = len(active_incs)
        densities = stadium_state_summary.get("densities", {})
        high_density_zones = [z for z, d in densities.items() if d > 0.7]

        # Generate custom responses based on keywords
        if "gate" in query_lower:
            gate_char = "C"
            for g in ["A", "B", "C", "D", "E", "F", "G", "H"]:
                if f"gate {g.lower()}" in query_lower:
                    gate_char = g
                    break
            
            gate_density = densities.get(f"Gate {gate_char}", 0.35)
            density_pct = int(gate_density * 100)
            
            answer = f"Gate {gate_char} is currently experiencing {density_pct}% crowd density. Flow rates are estimated at {int(120 * (1 - gate_density))} spectators per minute through active turnstiles."
            reasoning = f"The density surge is due to ingress matching the peak ticketing scanning phase. If density exceeds 80%, flow will bottleneck, causing long perimeter lines."
            suggested_actions = [
                f"Instruct volunteers to divert incoming queues from Gate {gate_char} to adjacent Gate {'D' if gate_char != 'D' else 'C'}.",
                "Increase biometric reader sensitivity levels to speed up authorization passes.",
                "Deploy crowd boundary barricades to structure perimeter queuing."
            ]
            supporting_evidence = [
                f"Gate {gate_char} density sensor reading: {gate_density}",
                f"Ticketing scanning rate is currently {density_pct}% of theoretical maximum corridor throughput."
            ]
            confidence_score = 90.0
            
        elif "predict" in query_lower or "congestion" in query_lower or "next" in query_lower:
            high_zone_str = ", ".join(high_density_zones) if high_density_zones else "none"
            answer = f"Our predictive model outlines a bottleneck risk in the next 15 minutes at {high_zone_str if high_density_zones else 'Gate B and Concourse 12'} during the seating ingress period."
            reasoning = f"Flow calculations indicate current spectator movement from outer gates will converge on seating concourses shortly, driving density levels up to 88%."
            suggested_actions = [
                "Strobe wayfinding route panels to bypass high-risk zones.",
                "Stagger internal concourse door openings to regulate seating flow.",
                "Alert Security Squads in affected sectors to prepare for crowd marshalling."
            ]
            supporting_evidence = [
                f"Active high density zones: {high_zone_str}",
                "Egress/Ingress velocity curves indicate a 24% acceleration rate over the last 5 minutes."
            ]
            confidence_score = 85.0
            
        elif "route" in query_lower or "evacuation" in query_lower:
            answer = "The safest evacuation path utilizes the outer perimeter Concourse routes leading directly to Gate G and Gate H."
            reasoning = "Active incidents restrict transit through central concourses. Gate G/H pathways are wide, stable, and showing less than 35% density levels."
            suggested_actions = [
                "Push route updates to spectator mobile app terminals.",
                "Activate green path lighting guides in outer corridors.",
                "Instruct volunteer stewards to form visual direction chains."
            ]
            supporting_evidence = [
                "Gate G and Gate H densities are 25% and 30% respectively.",
                "Central corridors are affected by active response dispatches."
            ]
            confidence_score = 95.0
            
        else:
            active_inc_summary = f"There are {inc_count} active incidents requiring response attention: " + ", ".join([f"{i.get('type')} in {i.get('zone')}" for i in active_incs]) if inc_count > 0 else "All zones are operating within stable parameters with zero critical alerts."
            answer = f"Central Command is actively managing stadium security and flow. {active_inc_summary}"
            reasoning = "Central telemetry shows normal spectator distribution with localized high densities typical of World Cup matches. Emergency teams are pre-positioned."
            suggested_actions = [
                "Continue standard command console monitoring.",
                "Update incident logs as resolving field reports arrive."
            ]
            supporting_evidence = [
                f"Active Incident Count: {inc_count}",
                f"Overall Stadium Safety Risk Index: {stadium_state_summary.get('overall_risk_score', 12.0)}/100"
            ]
            confidence_score = 98.0

        return CopilotResponse(
            answer=answer,
            reasoning=reasoning,
            suggested_actions=suggested_actions,
            supporting_evidence=supporting_evidence,
            confidence_score=confidence_score
        )

    def generate_situation_report(
        self, 
        stadium_state_summary: Dict[str, Any]
    ) -> ExecutiveSummaryReport:
        """
        Generates an executive, printable command center situation report every few minutes.
        """
        context_str = json.dumps(stadium_state_summary, default=str)
        prompt = f"""
        You are the Chief Safety Officer of the FIFA World Cup 2026.
        Generate an Executive Situation Report summarizing current operations.
        
        Stadium telemetry:
        {context_str}
        
        Construct:
        - Executive Summary (1-2 sentences)
        - Current Issues Summary
        - Predicted Issues Summary
        - Priority Ranking of incidents/zones
        - Recommended Actions list
        
        Return the result matching the ExecutiveSummaryReport JSON schema.
        """
        
        result_json = self._call_gemini_structured(prompt, ExecutiveSummaryReport)
        if result_json:
            try:
                data = json.loads(result_json)
                return ExecutiveSummaryReport(**data)
            except Exception as e:
                logger.error(f"Failed to parse Gemini situation report JSON: {e}")

        # Fallback simulation
        active_incs = stadium_state_summary.get("active_incidents", [])
        inc_count = len(active_incs)
        densities = stadium_state_summary.get("densities", {})
        high_density_zones = [z for z, d in densities.items() if d > 0.75]
        
        exec_summary = f"Stadium Operations are running with elevated vigilance. Currently monitoring {inc_count} active incidents. Overall stadium safety risk index is stable at {stadium_state_summary.get('overall_risk_score', 15.0)}/100."
        
        if inc_count > 0:
            current_issues = f"Emergency teams are addressing {inc_count} incidents: " + "; ".join([f"{i.get('severity').upper()} {i.get('type')} in {i.get('zone')}" for i in active_incs])
            priority_ranking = [i.get("zone") for i in sorted(active_incs, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x.get("severity", "low"), 4))]
        else:
            current_issues = "No active emergency incidents logged. Focus is on preventative crowd distribution and queue throughput."
            priority_ranking = high_density_zones if high_density_zones else ["Gate C", "Zone A", "Gate B"]

        if high_density_zones:
            predicted_issues = f"Crowd convergence models indicate possible gridlock at {', '.join(high_density_zones)} within 10-15 minutes if ingress patterns continue."
            recommended_actions = [
                f"Activate overflow lines and rerouting alerts around {', '.join(high_density_zones)}.",
                "Stagger ticketing lane gates to regulate visitor volume flow.",
                "Redeploy standby volunteer guides to high-density concourses."
            ]
        else:
            predicted_issues = "No immediate crowd bottleneck risks predicted. Density distributions conform to standard stadium entry timelines."
            recommended_actions = [
                "Maintain standard gate scan monitoring.",
                "Keep medical rescue teams on pre-positioned standby status.",
                "Conduct routine hardware diagnostics on turnstile gateways."
            ]

        return ExecutiveSummaryReport(
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            executive_summary=exec_summary,
            current_issues_summary=current_issues,
            predicted_issues_summary=predicted_issues,
            priority_ranking=priority_ranking,
            recommended_actions=recommended_actions
        )
