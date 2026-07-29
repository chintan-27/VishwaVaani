import hashlib
import hmac
import json
from typing import Any


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_value(value: str | None) -> str:
    if value is None:
        raise ValueError("Cannot hash an empty value")
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def fingerprint(payload: Any) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
