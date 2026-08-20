import argparse
import asyncio
import json

from vishwavaani_api.config import get_settings
from vishwavaani_api.provider import ProviderAdapter


async def run() -> int:
    settings = get_settings()
    checks: dict[str, bool] = {
        "provider_configured": settings.provider_configured,
        "speech_synthesis": False,
        "speech_transcription": False,
        "tool_calls": False,
    }
    if not settings.provider_configured:
        print(json.dumps({"passed": False, "checks": checks, "safe_failure": "not_configured"}))
        return 1

    adapter = ProviderAdapter(settings)
    try:
        checks.update(await adapter.conformance_probe())
    finally:
        await adapter.close()

    checks["structured_evaluator"] = bool(settings.ai_evaluator_model)
    passed = all(checks.values())
    print(json.dumps({"passed": passed, "checks": checks}, indent=2))
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Validate an OpenAI-compatible provider before enabling live missions: speech "
            "synthesis, speech transcription, and tool-calling, via a live round trip."
        )
    )
    parser.parse_args()
    return asyncio.run(run())


if __name__ == "__main__":
    raise SystemExit(main())
