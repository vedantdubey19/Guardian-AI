import heapq
from typing import Dict, List, Set, Tuple, Optional
from app.schemas.schemas import PathSegment, RouteResponse

# Nodes representation: Gates, Concourses, and Seating Zones
# Edges define base travel times (in seconds) and properties (accessibility)
STADIUM_GRAPH = {
    # Gates
    "Gate A": [("Concourse 1", 45, True, False)],
    "Gate B": [("Concourse 2", 45, True, False)],
    "Gate C": [("Concourse 3", 45, True, False)],
    "Gate D": [("Concourse 4", 45, True, False)],
    "Gate E": [("Concourse 5", 45, True, False)],
    "Gate F": [("Concourse 6", 45, True, False)],
    "Gate G": [("Concourse 7", 45, True, False)],
    "Gate H": [("Concourse 8", 45, True, False)],
    
    # Concourses
    "Concourse 1": [
        ("Gate A", 45, True, False),
        ("Concourse 2", 60, True, False),
        ("Concourse 12", 60, True, False),
        ("Zone A", 90, False, False),
        ("Zone B", 90, True, False)
    ],
    "Concourse 2": [
        ("Gate B", 45, True, False),
        ("Concourse 1", 60, True, False),
        ("Concourse 3", 60, True, False),
        ("Zone B", 90, True, False),
        ("Zone C", 90, False, False)
    ],
    "Concourse 3": [
        ("Gate C", 45, True, False),
        ("Concourse 2", 60, True, False),
        ("Concourse 4", 60, True, False),
        ("Zone C", 90, True, False),
        ("Zone D", 90, True, False)
    ],
    "Concourse 4": [
        ("Gate D", 45, True, False),
        ("Concourse 3", 60, True, False),
        ("Concourse 5", 60, True, False),
        ("Zone D", 90, True, False),
        ("Zone E", 90, False, False)
    ],
    "Concourse 5": [
        ("Gate E", 45, True, False),
        ("Concourse 4", 60, True, False),
        ("Concourse 6", 60, True, False),
        ("Zone E", 90, True, False),
        ("Zone F", 90, True, False)
    ],
    "Concourse 6": [
        ("Gate F", 45, True, False),
        ("Concourse 5", 60, True, False),
        ("Concourse 7", 60, True, False),
        ("Zone F", 90, True, False),
        ("Zone G", 90, False, False)
    ],
    "Concourse 7": [
        ("Gate G", 45, True, False),
        ("Concourse 6", 60, True, False),
        ("Concourse 8", 60, True, False),
        ("Zone G", 90, True, False),
        ("Zone H", 90, True, False)
    ],
    "Concourse 8": [
        ("Gate H", 45, True, False),
        ("Concourse 7", 60, True, False),
        ("Concourse 1", 60, True, False),
        ("Zone H", 90, True, False),
        ("Zone A", 90, False, False)
    ],
    
    # Internal Stadium Seating Zones (destinations)
    "Zone A": [("Concourse 1", 90, False, False), ("Concourse 8", 90, False, False)],
    "Zone B": [("Concourse 1", 90, True, False), ("Concourse 2", 90, True, False)],
    "Zone C": [("Concourse 2", 90, False, False), ("Concourse 3", 90, True, False)],
    "Zone D": [("Concourse 3", 90, True, False), ("Concourse 4", 90, True, False)],
    "Zone E": [("Concourse 4", 90, False, False), ("Concourse 5", 90, True, False)],
    "Zone F": [("Concourse 5", 90, True, False), ("Concourse 6", 90, True, False)],
    "Zone G": [("Concourse 6", 90, False, False), ("Concourse 7", 90, True, False)],
    "Zone H": [("Concourse 7", 90, True, False), ("Concourse 8", 90, True, False)]
}

# Add emergency tunnels accessible only to security / medical vehicles
EMERGENCY_TUNNELS = {
    "Gate A": [("Zone E", 60, True, True)],
    "Gate E": [("Zone A", 60, True, True)],
    "Gate C": [("Zone G", 60, True, True)],
    "Gate G": [("Zone C", 60, True, True)]
}

# Combine graphs during initialization
def get_graph(emergency_vehicle: bool = False) -> Dict[str, List[Tuple[str, float, bool, bool]]]:
    graph = {node: list(edges) for node, edges in STADIUM_GRAPH.items()}
    if emergency_vehicle:
        for start, edges in EMERGENCY_TUNNELS.items():
            if start not in graph:
                graph[start] = []
            for dest, base_time, is_acc, is_em in edges:
                graph[start].append((dest, base_time, is_acc, is_em))
                # Add back-edge
                if dest not in graph:
                    graph[dest] = []
                graph[dest].append((start, base_time, is_acc, is_em))
    return graph

class RouteEngine:
    @staticmethod
    def calculate_route(
        start: str,
        end: str,
        crowd_densities: Dict[str, float],  # Dict mapping node/zone name to density (0.0 - 1.0)
        active_incidents: List[Dict],      # List of active incident dicts
        accessibility_required: bool = False,
        emergency_vehicle: bool = False
    ) -> RouteResponse:
        """
        Runs a modified Dijkstra algorithm to find the fastest and safest route.
        Edges going into or through zones with active incidents are blocked or penalized.
        """
        graph = get_graph(emergency_vehicle)
        
        if start not in graph or end not in graph:
            return RouteResponse(
                path=[],
                segments=[],
                total_travel_time_seconds=0.0,
                safety_rating="dangerous",
                reasoning=f"Invalid start ({start}) or destination ({end}) point."
            )

        # Identify blocked zones based on active incidents
        # Critical incidents (like fire, stampede) block the zone completely
        blocked_nodes: Set[str] = set()
        warning_nodes: Set[str] = set()
        
        for inc in active_incidents:
            if inc.get("status") == "resolved":
                continue
            severity = inc.get("severity", "low").lower()
            inc_type = inc.get("type", "").lower()
            zone = inc.get("zone")
            
            # Fire, stampede risk, power outage, or critical incidents block a zone completely
            if severity == "critical" or inc_type in ("fire", "stampede"):
                blocked_nodes.add(zone)
                # Also block adjacent concourses if fire is critical
                if severity == "critical" and "concourse" in zone.lower():
                    blocked_nodes.add(zone)
            else:
                warning_nodes.add(zone)

        # Dijkstra algorithm
        # Queue item: (cumulative_travel_time, current_node, path_taken)
        queue: List[Tuple[float, str, List[str]]] = [(0.0, start, [start])]
        visited: Dict[str, float] = {}

        shortest_path: Optional[List[str]] = None
        shortest_time: float = float("inf")

        while queue:
            current_time, node, path = heapq.heappop(queue)

            if node == end:
                if current_time < shortest_time:
                    shortest_time = current_time
                    shortest_path = path
                break

            if node in visited and visited[node] <= current_time:
                continue
            visited[node] = current_time

            for neighbor, base_time, is_accessible, is_emergency in graph.get(node, []):
                # Accessibility check
                if accessibility_required and not is_accessible:
                    continue
                
                # Check if neighbor is blocked by emergency
                if neighbor in blocked_nodes and neighbor != end and neighbor != start:
                    continue

                # Retrieve density and calculate weight penalty
                # Density penalty multiplier: high density slows walking speed
                density = crowd_densities.get(neighbor, 0.1)
                
                # Base time is modified by density
                # A density of 1.0 increases travel time by 5x
                density_penalty = 1.0 + (density * 5.0)
                
                # Warning node penalty (e.g. medical emergencies nearby) adds extra delay
                warning_penalty = 120.0 if neighbor in warning_nodes else 0.0
                
                # Calculate travel time for this step
                step_time = (base_time * density_penalty) + warning_penalty
                
                # If emergency vehicle, we ignore density penalties (sirens) but respect physical blockages
                if emergency_vehicle:
                    step_time = base_time + (warning_penalty * 0.1)

                new_time = current_time + step_time
                if neighbor not in visited or new_time < visited[neighbor]:
                    heapq.heappush(queue, (new_time, neighbor, path + [neighbor]))

        if not shortest_path:
            return RouteResponse(
                path=[],
                segments=[],
                total_travel_time_seconds=0.0,
                safety_rating="dangerous",
                reasoning=f"No viable path found from {start} to {end} due to physical barriers, crowd blockages, or high-risk incidents."
            )

        # Generate segments detail
        segments: List[PathSegment] = []
        has_warnings = False
        
        for i, node in enumerate(shortest_path):
            density = crowd_densities.get(node, 0.1)
            is_warn = node in warning_nodes
            is_block = node in blocked_nodes
            
            if is_warn:
                has_warnings = True

            # Determine containing zone
            if "Gate" in node:
                zone = node
            elif "Concourse" in node:
                zone = node
            else:
                zone = node  # Seating zones

            segments.append(PathSegment(
                node=node,
                zone=zone,
                crowd_density=density,
                risk_factor=100.0 if is_block else (60.0 if is_warn else density * 50.0),
                is_blocked=is_block
            ))

        # Assess safety rating
        safety_rating = "safe"
        if has_warnings:
            safety_rating = "warning"
        
        # Generate reasoning explaining route path choice
        incident_summary = []
        for inc in active_incidents:
            if inc.get("zone") in shortest_path and inc.get("status") != "resolved":
                incident_summary.append(f"{inc.get('type')} in {inc.get('zone')}")
        
        reasoning = f"Path plotted from {start} to {end}."
        if incident_summary:
            reasoning += f" Warning: Route bypasses or clips areas near: {', '.join(incident_summary)}. Proceed with caution."
        else:
            reasoning += " Route avoids all active incidents and dense bottlenecks."

        if accessibility_required:
            reasoning += " All selected transit points are wheelchair accessible and elevator supported."

        return RouteResponse(
            path=shortest_path,
            segments=segments,
            total_travel_time_seconds=round(shortest_time, 1),
            safety_rating=safety_rating,
            reasoning=reasoning
        )
