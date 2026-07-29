import asyncio
import json
import logging
from dataclasses import dataclass, field

from redis.asyncio import Redis

from vishwavaani_api.config import get_settings
from vishwavaani_api.mission_catalog import MISSION_CATALOG

logger = logging.getLogger(__name__)


@dataclass
class ScenarioState:
    """Authoritative, deterministic mission state held by the sideband controller."""

    mission_slug: str
    node: str = "start"
    observed_slots: set[str] = field(default_factory=set)
    assistance: list[str] = field(default_factory=list)
    sequence: int = 0
    completed: bool = False

    @property
    def graph(self) -> dict[str, list[str]]:
        return MISSION_CATALOG[self.mission_slug]["graph"]

    @property
    def required_slots(self) -> list[str]:
        return MISSION_CATALOG[self.mission_slug]["required_slots"]

    def transition(self, destination: str) -> None:
        allowed = self.graph.get(self.node, [])
        if destination not in allowed:
            raise ValueError(f"Invalid scenario transition: {self.node} -> {destination}")
        self.node = destination
        self.sequence += 1
        self.completed = destination == "completed"

    def record_slot(self, slot: str) -> None:
        if slot not in self.required_slots:
            raise ValueError(f"Unknown required slot: {slot}")
        self.observed_slots.add(slot)
        self.sequence += 1

    def record_assistance(self, kind: str) -> None:
        if kind not in {"repeat", "slower", "meaning", "hint"}:
            raise ValueError(f"Unknown assistance kind: {kind}")
        self.assistance.append(kind)
        self.sequence += 1

    def serialize(self) -> str:
        return json.dumps(
            {
                "mission_slug": self.mission_slug,
                "node": self.node,
                "observed_slots": sorted(self.observed_slots),
                "assistance": self.assistance,
                "sequence": self.sequence,
                "completed": self.completed,
            },
            separators=(",", ":"),
        )


async def run() -> None:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    logger.info("VishwaVaani realtime controller ready")
    last_id = "$"
    try:
        while True:
            batches = await redis.xread({"realtime:events": last_id}, block=15_000, count=20)
            for _, events in batches:
                for event_id, payload in events:
                    last_id = event_id
                    logger.info(
                        "realtime_event_received",
                        extra={
                            "event_id": event_id,
                            "event_type": payload.get("type", "unknown"),
                        },
                    )
    finally:
        await redis.aclose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run())
