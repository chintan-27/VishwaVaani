import json
from pathlib import Path

schema_path = Path("packages/contracts/openapi.json")
schema = json.loads(schema_path.read_text(encoding="utf-8"))
paths = schema.get("paths", {})

operations: list[tuple[str, str, str]] = []
methods_by_path: dict[str, list[str]] = {}
for path, path_item in sorted(paths.items()):
    methods = []
    for method in ("get", "post", "put", "patch", "delete"):
        operation = path_item.get(method)
        if not operation:
            continue
        operation_id = operation.get("operationId") or (
            f"{method}_{path.strip('/').replace('/', '_').replace('{', '').replace('}', '')}"
        )
        operations.append((operation_id, method.upper(), path))
        methods.append(method.upper())
    methods_by_path[path] = methods

path_union = " | ".join(json.dumps(path) for path in methods_by_path) or "never"
operation_rows = "\n".join(
    f"  {json.dumps(operation_id)}: {{ method: {json.dumps(method)}, path: {json.dumps(path)} }},"
    for operation_id, method, path in operations
)
method_rows = "\n".join(
    f"  {json.dumps(path)}: {' | '.join(json.dumps(method) for method in methods)};"
    for path, methods in methods_by_path.items()
)
path_rows = "\n".join(
    f"  {json.dumps(path)}: {{ [method: string]: unknown }};" for path in methods_by_path
)

types_output = f"""/**
 * Generated from packages/contracts/openapi.json. Do not edit by hand.
 */
export type ApiPath = {path_union};

export interface ApiMethodByPath {{
{method_rows}
}}

export interface paths {{
{path_rows}
}}
"""

client_output = f"""/**
 * Generated from packages/contracts/openapi.json. Do not edit by hand.
 */
export const operations = {{
{operation_rows}
}} as const;

export type OperationId = keyof typeof operations;
export type OperationDefinition = (typeof operations)[OperationId];
"""

web_api_dir = Path("apps/web/src/lib/api")
web_api_dir.mkdir(parents=True, exist_ok=True)
(web_api_dir / "schema.d.ts").write_text(types_output, encoding="utf-8")
(web_api_dir / "generated-client.ts").write_text(client_output, encoding="utf-8")
print(f"Generated {len(operations)} API operations")
