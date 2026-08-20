import json
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

from vishwavaani_api.models import SessionTurn
from vishwavaani_api.provider import ProviderAdapter

MAX_TOOL_ROUNDS = 4


@dataclass
class MissionTurnResult:
    agent_text: str
    recorded_slots: list[str] = field(default_factory=list)
    mission_complete: bool = False


def mission_system_prompt(
    *, mission_title: str, mission_objective: str, required_slots: list[str]
) -> str:
    return (
        f"You are the conversation partner for {mission_title}. Objective: {mission_objective} "
        "Ask one short question at a time, in plain natural English. Never request real personal "
        "or document details — this is a practice scenario. "
        f"The required slots are {', '.join(required_slots)}. "
        "Call record_slot as soon as each required detail is understood from the learner's reply. "
        "Call complete_mission once every required slot has been recorded."
    )


def mission_tools(required_slots: list[str]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": "record_slot",
                "description": "Record one required mission detail as understood.",
                "parameters": {
                    "type": "object",
                    "properties": {"slot": {"type": "string", "enum": required_slots}},
                    "required": ["slot"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "complete_mission",
                "description": "Finish the mission once every required slot is recorded.",
                "parameters": {"type": "object", "properties": {}},
            },
        },
    ]


def build_messages(
    system_prompt: str, turns: Iterable[SessionTurn]
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for turn in turns:
        if not turn.transcript:
            continue
        role = "assistant" if turn.actor == "agent" else "user"
        messages.append({"role": role, "content": turn.transcript})
    return messages


async def advance_mission_turn(
    adapter: ProviderAdapter,
    *,
    required_slots: list[str],
    messages: list[dict[str, Any]],
) -> MissionTurnResult:
    """Drive the mission conversation forward from `messages` (already ending with the learner's
    latest turn, or a synthetic kickoff for the opening line) until the model produces something to
    speak aloud. Tool calls are resolved in-process; the loop is capped so a provider that keeps
    calling tools instead of replying cannot hang a request."""
    tools = mission_tools(required_slots)
    history = list(messages)
    recorded_slots: list[str] = []
    mission_complete = False

    for _ in range(MAX_TOOL_ROUNDS):
        message = await adapter.mission_completion(
            messages=history, tools=[] if mission_complete else tools
        )
        tool_calls = message.get("tool_calls") or []
        if not tool_calls:
            agent_text = (message.get("content") or "").strip()
            if not agent_text and mission_complete:
                agent_text = "Thank you. That completes this mission."
            return MissionTurnResult(agent_text, recorded_slots, mission_complete)

        history.append(
            {"role": "assistant", "content": message.get("content"), "tool_calls": tool_calls}
        )
        for call in tool_calls:
            function = call.get("function", {})
            name = function.get("name")
            if name == "record_slot":
                try:
                    slot = json.loads(function.get("arguments") or "{}").get("slot")
                except ValueError:
                    slot = None
                if isinstance(slot, str) and slot in required_slots:
                    recorded_slots.append(slot)
            elif name == "complete_mission":
                mission_complete = True
            history.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id", ""),
                    "content": json.dumps({"accepted": True}),
                }
            )

    # ponytail: a capped fallback, not a real conversational recovery. Reachable only if the
    # provider keeps calling tools past MAX_TOOL_ROUNDS instead of ever replying with content.
    return MissionTurnResult("Let's continue with the next step.", recorded_slots, mission_complete)
