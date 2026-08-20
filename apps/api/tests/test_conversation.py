from typing import Any

import pytest
from vishwavaani_api.conversation import MAX_TOOL_ROUNDS, advance_mission_turn


class ScriptedAdapter:
    """Stands in for ProviderAdapter, returning one scripted mission_completion() message per
    call so the tool-calling loop can be tested without a network."""

    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = list(responses)
        self.calls: list[list[dict[str, Any]]] = []
        self.tools_per_call: list[list[dict[str, Any]]] = []

    async def mission_completion(
        self, *, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> dict[str, Any]:
        self.calls.append(messages)
        self.tools_per_call.append(tools)
        return self.responses.pop(0)


def content_message(text: str) -> dict[str, Any]:
    return {"role": "assistant", "content": text}


def tool_call_message(name: str, arguments: str = "{}", call_id: str = "call-1") -> dict[str, Any]:
    return {
        "role": "assistant",
        "content": None,
        "tool_calls": [{"id": call_id, "function": {"name": name, "arguments": arguments}}],
    }


@pytest.mark.asyncio
async def test_returns_content_directly_when_no_tool_call() -> None:
    adapter = ScriptedAdapter([content_message("Good evening. May I see your passport?")])
    result = await advance_mission_turn(
        adapter,
        required_slots=["purpose"],
        messages=[{"role": "system", "content": "..."}],
    )
    assert result.agent_text == "Good evening. May I see your passport?"
    assert result.recorded_slots == []
    assert result.mission_complete is False


@pytest.mark.asyncio
async def test_records_slot_then_continues_for_spoken_reply() -> None:
    adapter = ScriptedAdapter(
        [
            tool_call_message("record_slot", '{"slot": "purpose"}'),
            content_message("Thank you. How long will you stay?"),
        ]
    )
    result = await advance_mission_turn(
        adapter,
        required_slots=["purpose", "duration"],
        messages=[{"role": "user", "content": "I am here for a holiday."}],
    )
    assert result.recorded_slots == ["purpose"]
    assert result.agent_text == "Thank you. How long will you stay?"
    assert result.mission_complete is False
    # the tool result must be threaded back in before asking for the follow-up reply
    assert adapter.calls[1][-1]["role"] == "tool"


@pytest.mark.asyncio
async def test_ignores_slot_not_in_required_list() -> None:
    adapter = ScriptedAdapter(
        [
            tool_call_message("record_slot", '{"slot": "not-a-real-slot"}'),
            content_message("Okay."),
        ]
    )
    result = await advance_mission_turn(
        adapter, required_slots=["purpose"], messages=[{"role": "user", "content": "hi"}]
    )
    assert result.recorded_slots == []


@pytest.mark.asyncio
async def test_complete_mission_stops_offering_tools_and_produces_closing_line() -> None:
    adapter = ScriptedAdapter(
        [
            tool_call_message("complete_mission", call_id="call-2"),
            content_message("Thank you. That completes this mission."),
        ]
    )
    result = await advance_mission_turn(
        adapter, required_slots=["purpose"], messages=[{"role": "user", "content": "done"}]
    )
    assert result.mission_complete is True
    assert result.agent_text == "Thank you. That completes this mission."
    # once complete, the follow-up call for the closing line must not offer tools again
    assert adapter.tools_per_call[1] == []


@pytest.mark.asyncio
async def test_complete_mission_falls_back_to_default_closing_line_if_model_stays_silent() -> None:
    adapter = ScriptedAdapter([tool_call_message("complete_mission"), content_message("")])
    result = await advance_mission_turn(
        adapter, required_slots=["purpose"], messages=[{"role": "user", "content": "done"}]
    )
    assert result.mission_complete is True
    assert result.agent_text == "Thank you. That completes this mission."


@pytest.mark.asyncio
async def test_caps_tool_calling_rounds_so_a_stuck_model_cannot_hang_the_request() -> None:
    adapter = ScriptedAdapter(
        [tool_call_message("record_slot", '{"slot": "purpose"}')] * MAX_TOOL_ROUNDS
    )
    result = await advance_mission_turn(
        adapter, required_slots=["purpose"], messages=[{"role": "user", "content": "hi"}]
    )
    assert len(adapter.calls) == MAX_TOOL_ROUNDS
    assert result.agent_text == "Let's continue with the next step."
    assert result.recorded_slots == ["purpose"] * MAX_TOOL_ROUNDS
