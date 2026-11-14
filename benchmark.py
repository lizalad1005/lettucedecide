"""Benchmark: Drex vs. a DeepInfra LLM on LettuceDecide's decisions.

Tasks (one decision per call for both contenders, so latency is comparable):
  1. Store section for 45 ingredients (6 options, hand-labelled answer key below)
  2. Vegetarian? for every recipe in data/recipes.json (key: the recipe's diet tags)
  3. Weekday-friendly? for every recipe (key: prepMinutes <= 30)

Both contenders get the same instructions and the same option descriptions.
LLM parsing rule: any <think>...</think> block is stripped, then the reply must equal one allowed
option (case-insensitive, surrounding quotes/period ignored). Anything else counts as an invalid answer.

Run:  export NACE_API_KEY=...  DEEPINFRA_API_KEY=...   (or put them in .env)
      python3 benchmark.py
Writes results/benchmark_rows.csv, results/summary.json, results/summary.md, results/chart.svg.
"""

import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import drex

ROOT = Path(__file__).parent
RESULTS = ROOT / "results"
LLM_URL = "https://api.deepinfra.com/v1/openai/chat/completions"
LLM_MODEL = os.environ.get("BENCHMARK_LLM_MODEL", "Qwen/Qwen3.8-27B")
WORKERS = 6

STORE_KEY = {
    # Produce
    "spinach": "Produce", "tomatoes": "Produce", "onion": "Produce", "garlic": "Produce", "ginger": "Produce",
    "cilantro": "Produce", "lime": "Produce", "avocado": "Produce", "bell pepper": "Produce",
    "potatoes": "Produce", "mango": "Produce", "mint": "Produce",
    # Dairy
    "cheddar": "Dairy", "butter": "Dairy", "greek yogurt": "Dairy", "paneer": "Dairy", "mozzarella": "Dairy",
    "milk": "Dairy", "eggs": "Dairy", "ghee": "Dairy", "heavy cream": "Dairy",
    # Meat & Fish
    "salmon": "Meat & Fish", "chicken thighs": "Meat & Fish", "ground beef": "Meat & Fish",
    "shrimp": "Meat & Fish", "bacon": "Meat & Fish",
    # Pantry
    "rice": "Pantry", "lentils": "Pantry", "canned chickpeas": "Pantry", "pasta": "Pantry",
    "olive oil": "Pantry", "garam masala": "Pantry", "soy sauce": "Pantry", "canned tomatoes": "Pantry",
    "flour": "Pantry", "sugar": "Pantry",
    # Frozen
    "frozen peas": "Frozen", "ice cream": "Frozen", "frozen spinach": "Frozen", "frozen berries": "Frozen",
    # Bakery
    "bagels": "Bakery", "tortillas": "Bakery", "sourdough bread": "Bakery", "burger buns": "Bakery", "naan": "Bakery",
}

VEG_OPTIONS = {
    "yes": "vegetarian: no meat, poultry, fish or seafood (eggs and dairy are allowed)",
    "no": "contains meat, poultry, fish or seafood",
}
WEEKDAY_OPTIONS = {
    "yes": "weekday-friendly: total time is 30 minutes or less",
    "no": "takes more than 30 minutes",
}


def ingredient_name(text):
    return re.split(r"\s+[-–—]\s+", text)[0].strip()


def build_tasks():
    tasks = []
    for item, truth in STORE_KEY.items():
        tasks.append({
            "task": "store_section", "item": item, "truth": truth, "options": drex.SECTIONS,
            "state": "A shopper is sorting a weekly grocery list by store section.",
            "question": f"Which grocery store section is '{item}' usually found in?",
        })
    recipes = json.loads((ROOT / "data" / "recipes.json").read_text())
    for recipe in recipes:
        ingredients = ", ".join(ingredient_name(i) for i in recipe["ingredients"])
        tasks.append({
            "task": "vegetarian", "item": recipe["name"],
            "truth": "yes" if "vegetarian" in recipe.get("diet", []) else "no", "options": VEG_OPTIONS,
            "state": f"Recipe: {recipe['name']}. Ingredients: {ingredients}.",
            "question": f"Is the recipe '{recipe['name']}' vegetarian?",
        })
        tasks.append({
            "task": "weekday_friendly", "item": recipe["name"],
            "truth": "yes" if recipe.get("prepMinutes", 999) <= 30 else "no", "options": WEEKDAY_OPTIONS,
            "state": f"Recipe: {recipe['name']}. Total time: {recipe.get('prepMinutes')} minutes.",
            "question": f"Is the recipe '{recipe['name']}' weekday-friendly?",
        })
    return tasks


def ask_drex(task):
    answers, usage, latency = drex.decide(task["state"], {"q": drex.choice(task["question"], task["options"])})
    answer = answers.get("q") or {}
    choice = answer.get("choice", "")
    confidence = (answer.get("probabilities") or {}).get(choice)
    return {"answer": choice, "raw": choice, "latency_s": latency, "cost_usd": float(usage.get("cost") or 0),
            "confidence": confidence}


def parse_llm(text, options):
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip().strip("\"'`*. ").strip()
    for option in options:
        if cleaned.lower() == option.lower():
            return option
    return None


def ask_llm(task):
    api_key = os.environ.get("DEEPINFRA_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPINFRA_API_KEY is not set")
    options = "\n".join(f"- {name}: {meaning}" for name, meaning in task["options"].items())
    prompt = (f"{task['state']}\n\n{task['question']}\n\nOptions:\n{options}\n\n"
              f"Answer with exactly one option name ({', '.join(task['options'])}) and nothing else.")
    payload = {"model": LLM_MODEL, "temperature": 0, "max_tokens": 200,
               "messages": [{"role": "user", "content": prompt}]}
    request = urllib.request.Request(
        LLM_URL, data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"DeepInfra error {error.code}: {error.read().decode('utf-8', 'replace')[:300]}") from error
    latency = time.perf_counter() - started
    raw = body["choices"][0]["message"].get("content") or ""
    usage = body.get("usage") or {}
    return {"answer": parse_llm(raw, task["options"]) or "", "raw": raw, "latency_s": latency,
            "cost_usd": float(usage.get("estimated_cost") or 0), "confidence": None}


def run(name, fn, tasks):
    def one(task):
        try:
            result = fn(task)
            error = ""
        except Exception as exc:  # recorded, never hidden
            result = {"answer": "", "raw": "", "latency_s": None, "cost_usd": 0.0, "confidence": None}
            error = str(exc)
        return {"model": name, "task": task["task"], "item": task["item"], "truth": task["truth"],
                "answer": result["answer"], "correct": result["answer"] == task["truth"],
                "valid": result["answer"] in task["options"], "latency_s": result["latency_s"],
                "cost_usd": result["cost_usd"], "confidence": result["confidence"],
                "raw": result["raw"][:200], "error": error}

    print(f"Running {name} on {len(tasks)} decisions…", flush=True)
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return list(pool.map(one, tasks))


def summarize(rows):
    summary = {}
    for model in dict.fromkeys(r["model"] for r in rows):
        mine = [r for r in rows if r["model"] == model]
        latencies = [r["latency_s"] for r in mine if r["latency_s"] is not None]
        answered = [r for r in mine if not r["error"]]
        per_task = {}
        for task in dict.fromkeys(r["task"] for r in mine):
            subset = [r for r in mine if r["task"] == task]
            per_task[task] = round(100 * sum(r["correct"] for r in subset) / len(subset), 1)
        summary[model] = {
            "decisions": len(mine),
            "errors": len(mine) - len(answered),
            "accuracy_pct": round(100 * sum(r["correct"] for r in mine) / len(mine), 1),
            "accuracy_by_task_pct": per_task,
            "invalid_answers": sum(1 for r in answered if not r["valid"]),
            "avg_latency_ms": round(1000 * sum(latencies) / len(latencies)) if latencies else None,
            # None when the API reported no cost at all, so a missing price never reads as "free".
            "cost_per_1k_usd": (round(1000 * sum(r["cost_usd"] for r in answered) / len(answered), 4)
                                if answered and any(r["cost_usd"] for r in answered) else None),
        }
    return summary


def write_chart(summary, path):
    models = list(summary)
    colors = ["#2f7d32", "#8a6d3b"]
    metrics = [("Accuracy (%)", "accuracy_pct", 100), ("Avg latency (ms)", "avg_latency_ms", None)]
    width, panel_h, bar_h = 640, 130, 26
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{panel_h * 2 + 40}" '
             f'font-family="Helvetica, Arial, sans-serif" font-size="13">',
             f'<rect width="100%" height="100%" fill="#ffffff"/>',
             f'<text x="20" y="26" font-size="16" font-weight="bold">Drex vs. {LLM_MODEL} (measured)</text>']
    for p, (label, key, scale_max) in enumerate(metrics):
        top = 50 + p * panel_h
        values = [summary[m][key] or 0 for m in models]
        scale = scale_max or (max(values) or 1)
        parts.append(f'<text x="20" y="{top + 12}" font-weight="bold">{label}</text>')
        for i, (model, value) in enumerate(zip(models, values)):
            y = top + 24 + i * (bar_h + 10)
            bar = 380 * value / scale
            parts.append(f'<text x="20" y="{y + 18}">{model}</text>')
            parts.append(f'<rect x="170" y="{y}" width="{bar:.1f}" height="{bar_h}" fill="{colors[i % 2]}" rx="3"/>')
            parts.append(f'<text x="{176 + bar:.1f}" y="{y + 18}">{value}</text>')
    parts.append("</svg>")
    path.write_text("\n".join(parts))


def main():
    drex.load_env()
    missing = [k for k in ("NACE_API_KEY", "DEEPINFRA_API_KEY") if not os.environ.get(k)]
    if missing:
        sys.exit(f"Set {', '.join(missing)} first (export it, or add it to .env).")
    tasks = build_tasks()
    rows = run("Drex", ask_drex, tasks) + run(f"DeepInfra {LLM_MODEL}", ask_llm, tasks)
    RESULTS.mkdir(exist_ok=True)
    with open(RESULTS / "benchmark_rows.csv", "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    summary = summarize(rows)
    (RESULTS / "summary.json").write_text(json.dumps(summary, indent=2))
    models = list(summary)
    lines = [f"| Metric | {' | '.join(models)} |", f"|---|{'---|' * len(models)}"]
    for label, key, fmt in [("Accuracy", "accuracy_pct", "{}%"), ("Avg latency", "avg_latency_ms", "{} ms"),
                            ("Cost / 1k decisions", "cost_per_1k_usd", "${}"),
                            ("Invalid answers", "invalid_answers", "{}"), ("Request errors", "errors", "{}")]:
        cells = [fmt.format(summary[m][key]) if summary[m][key] is not None else "not reported" for m in models]
        lines.append(f"| {label} | {' | '.join(cells)} |")
    lines.append(f"\n{len(tasks)} decisions per model: {len(STORE_KEY)} store sections, "
                 f"{(len(tasks) - len(STORE_KEY)) // 2} vegetarian, {(len(tasks) - len(STORE_KEY)) // 2} weekday-friendly.")
    lines.append("Cost is what each API reported per call (Drex `usage.cost`, DeepInfra `estimated_cost`); "
                 "\"not reported\" means the API returned no cost. Latency is wall-clock per call, 6 calls in parallel.")
    (RESULTS / "summary.md").write_text("\n".join(lines) + "\n")
    write_chart(summary, RESULTS / "chart.svg")
    print("\n".join(lines))
    print(f"\nSaved results to {RESULTS}/")


if __name__ == "__main__":
    main()
