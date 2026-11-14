"""Minimal Drex (Nace System 1) client, standard library only.

Protocol (same one Intern uses for System 1):
    POST https://console.nace.ai/v1/systemone
    Authorization: Bearer $NACE_API_KEY
    {"model": "drex-latest", "state": "...",
     "questions": {"name": {"type": "choice", "instructions": "...", "criteria": {"option": "meaning"}}}}
    -> {"answers": {"name": {"choice": "...", "probabilities": {...}}}, "usage": {"cost": ..., ...}}
"""

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

DREX_URL = os.environ.get("DREX_BASE_URL", "https://console.nace.ai").rstrip("/") + "/v1/systemone"
DREX_MODEL = os.environ.get("DREX_MODEL", "drex-latest")
MAX_QUESTIONS_PER_CALL = 16

SECTIONS = {
    "Produce": "fresh fruit, vegetables and herbs",
    "Dairy": "milk, cheese, yogurt, butter, cream, eggs, paneer, ghee",
    "Meat & Fish": "fresh or packaged meat, poultry, fish and seafood",
    "Pantry": "shelf-stable dry goods, grains, pasta, spices, oils, sauces, canned or packaged food",
    "Frozen": "items sold in the freezer aisle",
    "Bakery": "bread, buns, tortillas, bagels and other baked goods",
}


def load_env(path=Path(__file__).with_name(".env")):
    """Read KEY=value lines from .env without overriding variables already set in the shell."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def decide(state, questions, timeout=60):
    """Ask Drex up to 16 questions in one call. Returns (answers, usage, latency_seconds)."""
    api_key = os.environ.get("NACE_API_KEY") or os.environ.get("DREX_API_KEY")
    if not api_key:
        raise RuntimeError("NACE_API_KEY is not set")
    payload = {"model": DREX_MODEL, "state": state, "questions": questions}
    request = urllib.request.Request(
        DREX_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Drex error {error.code}: {detail[:400]}") from error
    return body["answers"], body.get("usage") or {}, time.perf_counter() - started


def choice(instructions, options):
    """Build a choice question. `options` is a dict of option -> meaning, or a list of options."""
    criteria = options if isinstance(options, dict) else {option: option for option in options}
    return {"type": "choice", "instructions": instructions, "criteria": criteria}


def store_sections(items):
    """Sort ingredient names into store sections with Drex. Returns {item: {"section", "confidence"}}."""
    items = list(dict.fromkeys(item for item in items if item))
    result = {}
    for start in range(0, len(items), MAX_QUESTIONS_PER_CALL):
        batch = items[start : start + MAX_QUESTIONS_PER_CALL]
        questions = {
            f"item_{i}": choice(f"Which grocery store section is '{item}' usually found in?", SECTIONS)
            for i, item in enumerate(batch)
        }
        answers, _, _ = decide("A shopper is sorting a weekly grocery list by store section.", questions)
        for i, item in enumerate(batch):
            answer = answers.get(f"item_{i}") or {}
            section = answer.get("choice")
            probabilities = answer.get("probabilities") or {}
            result[item] = {"section": section, "confidence": probabilities.get(section)}
    return result
