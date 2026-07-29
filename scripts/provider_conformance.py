import argparse
import asyncio
import json
from pathlib import Path

from vishwavaani_api.config import get_settings
from vishwavaani_api.provider import ProviderAdapter, validate_realtime_events


async def run(sdp_file: Path, events_file: Path) -> int:
    settings = get_settings()
    checks: dict[str, bool] = {
        "provider_configured": settings.provider_configured,
        "webrtc_sdp_exchange": False,
        "server_side_control": False,
    }
    if not settings.provider_configured:
        print(json.dumps({"passed": False, "checks": checks, "safe_failure": "not_configured"}))
        return 1

    adapter = ProviderAdapter(settings)
    try:
        _, call_id = await adapter.exchange_sdp(
            offer_sdp=sdp_file.read_text(encoding="utf-8"),
            instructions="Conformance test: respond briefly and call conformance_complete.",
            tools=[{"name": "conformance_complete"}],
        )
        checks["webrtc_sdp_exchange"] = True
        if call_id:
            checks["server_side_control"] = await adapter.send_sideband_control(
                call_id=call_id,
                event={
                    "type": "session.update",
                    "session": {
                        "instructions": "Conformance test instruction update.",
                        "turn_detection": {"type": "server_vad"},
                        "tools": [{"type": "function", "name": "conformance_complete"}],
                    },
                },
            )
    finally:
        await adapter.close()

    events = json.loads(events_file.read_text(encoding="utf-8"))
    checks.update(validate_realtime_events(events))
    checks["structured_evaluator"] = bool(settings.ai_evaluator_model)
    passed = all(checks.values())
    print(json.dumps({"passed": passed, "checks": checks}, indent=2))
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate an OpenAI-compatible provider before enabling live missions."
    )
    parser.add_argument("--sdp-file", type=Path, required=True)
    parser.add_argument("--events-file", type=Path, required=True)
    args = parser.parse_args()
    return asyncio.run(run(args.sdp_file, args.events_file))


if __name__ == "__main__":
    raise SystemExit(main())
