from vishwavaani_api.mission_catalog import MISSION_CATALOG


class ScenarioState:
    """Small deterministic mission-state helper used by tests and future sideband events."""

    def __init__(self, mission_slug: str) -> None:
        mission = MISSION_CATALOG[mission_slug]
        self.graph = mission["graph"]
        self.node = "start"
        self.assistance: list[str] = []

    def transition(self, next_node: str) -> None:
        allowed = self.graph.get(self.node, [])
        if next_node not in allowed:
            raise ValueError(f"Invalid scenario transition: {self.node} -> {next_node}")
        self.node = next_node

    def record_assistance(self, kind: str) -> None:
        if kind not in {"repeat", "slower", "meaning", "hint", "mute", "unmute"}:
            raise ValueError(f"Unsupported assistance event: {kind}")
        self.assistance.append(kind)
