import json
from pathlib import Path

from vishwavaani_api.main import app

output = Path("packages/contracts/openapi.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
print(f"Wrote {output}")
