from typing import Any

MISSION_CATALOG: dict[str, dict[str, Any]] = {
    "us-immigration": {
        "title": "US Immigration",
        "objective": "Explain your visit, stay, and return plan to a border officer.",
        "duration_minutes": 8,
        "required_slots": ["purpose", "duration", "accommodation", "return-plan"],
        "graph": {
            "start": ["identity"],
            "identity": ["purpose"],
            "purpose": ["duration", "purpose-repair"],
            "purpose-repair": ["purpose", "end-unscored"],
            "duration": ["accommodation"],
            "accommodation": ["return-plan"],
            "return-plan": ["completed"],
        },
    },
    "hotel-check-in": {
        "title": "Hotel Check-in",
        "objective": "Find your booking, confirm the room, and ask one practical question.",
        "duration_minutes": 7,
        "required_slots": ["booking-name", "identity", "room", "hotel-question"],
        "graph": {
            "start": ["booking-name"],
            "booking-name": ["identity", "booking-repair"],
            "booking-repair": ["booking-name", "end-unscored"],
            "identity": ["room"],
            "room": ["hotel-question"],
            "hotel-question": ["completed"],
        },
    },
    "restaurant-ordering": {
        "title": "Restaurant Ordering",
        "objective": "Ask about a dish, order clearly, and settle the bill.",
        "duration_minutes": 8,
        "required_slots": ["dish", "dietary-check", "quantity", "bill"],
        "graph": {
            "start": ["dish"],
            "dish": ["dietary-check", "menu-repair"],
            "menu-repair": ["dish", "end-unscored"],
            "dietary-check": ["quantity"],
            "quantity": ["bill"],
            "bill": ["completed"],
        },
    },
    "asking-directions": {
        "title": "Asking for Directions",
        "objective": "Find a place and confirm the route before you leave.",
        "duration_minutes": 6,
        "required_slots": ["destination", "landmark", "turns", "confirmation"],
        "graph": {
            "start": ["destination"],
            "destination": ["landmark"],
            "landmark": ["turns", "landmark-repair"],
            "landmark-repair": ["landmark", "end-unscored"],
            "turns": ["confirmation"],
            "confirmation": ["completed"],
        },
    },
    "missing-baggage": {
        "title": "Missing Baggage",
        "objective": "Report your bag, identify it, and arrange delivery.",
        "duration_minutes": 8,
        "required_slots": ["bag-tag", "description", "contact", "delivery-address"],
        "graph": {
            "start": ["bag-tag"],
            "bag-tag": ["description", "tag-repair"],
            "tag-repair": ["bag-tag", "end-unscored"],
            "description": ["contact"],
            "contact": ["delivery-address"],
            "delivery-address": ["completed"],
        },
    },
}

MISSION_VERSION = "2026.07.1"
PROMPT_VERSION = "travel-core.1"
RUBRIC_VERSION = "independence.1"
LOCALIZATION_VERSION = "indic-hints.1"
SUPPORTED_LOCALES = ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"]


def validate_graph(slug: str, graph: dict[str, list[str]]) -> list[str]:
    errors: list[str] = []
    if "start" not in graph:
        errors.append(f"{slug}: missing start node")
    destinations = {destination for destinations in graph.values() for destination in destinations}
    defined = set(graph) | {"completed", "end-unscored"}
    missing = destinations - defined
    if missing:
        errors.append(f"{slug}: undefined nodes {sorted(missing)}")
    if "completed" not in destinations:
        errors.append(f"{slug}: no completion path")
    return errors
