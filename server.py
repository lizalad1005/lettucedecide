import base64
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import drex

drex.load_env()

API_URL = "https://api.deepinfra.com/v1/openai/chat/completions"
MODEL = "Qwen/Qwen3.8-27B"
KEENABLE_URL = "https://api.keenable.ai/v1/search"


def deepinfra_request(images, prompt):
    api_key = os.environ.get("DEEPINFRA_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPINFRA_API_KEY is not set")
    content = [{"type": "text", "text": prompt}]
    content.extend({"type": "image_url", "image_url": {"url": image}} for image in images)
    payload = {
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": 1800,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "user", "content": content}],
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"DeepInfra error {error.code}: {detail[:400]}") from error
    text = result["choices"][0]["message"]["content"]
    if text.startswith("```"):
        text = text.strip("`").replace("json", "", 1).strip()
    return json.loads(text)


def keenable_search(query):
    api_key = os.environ.get("KEENABLE_API_KEY")
    if not api_key:
        raise RuntimeError("KEENABLE_API_KEY is not set")
    payload = {"query": query, "mode": "pro", "max_results": 5, "snippet_max_length": 240}
    request = urllib.request.Request(
        KEENABLE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"KeenAble error {error.code}: {detail[:400]}") from error


ASK_INTENTS = {
    "vegetarian": "make the plan, or one day of it, vegetarian or meat-free",
    "swap": "swap, change, replace or reorder meals in the plan",
    "shopping": "a question about the shopping list or what to buy",
    "explain": "asks why the plan was chosen or how decisions were made",
    "other": "anything else",
}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Never serve dotfiles such as .env or .git from the static file server.
        if any(part.startswith(".") and part not in (".", "..") for part in self.path.split("?")[0].split("/")):
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        api_paths = ("/api/analyze-ingredients", "/api/extract-recipe", "/api/research-recipes",
                     "/api/store-sections", "/api/ask-intent")
        if self.path not in api_paths:
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 25 * 1024 * 1024:
                raise RuntimeError("Image upload is too large; use smaller photos.")
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if self.path.endswith("store-sections"):
                self.send_json(200, {"sections": drex.store_sections(body.get("items", []))})
                return
            if self.path.endswith("ask-intent"):
                question = body.get("question", "").strip()
                answers, _, _ = drex.decide(
                    "A family is editing their weekly meal plan in LettuceDecide.",
                    {"intent": drex.choice(f"What does this request ask for? Request: {question}", ASK_INTENTS)},
                )
                answer = answers.get("intent") or {}
                self.send_json(200, {"intent": answer.get("choice"), "probabilities": answer.get("probabilities", {})})
                return
            if self.path.endswith("research-recipes"):
                query = body.get("query", "").strip()
                if not query:
                    raise RuntimeError("Enter a research question first.")
                self.send_json(200, keenable_search(query))
                return
            images = body.get("images", [])
            if not images:
                raise RuntimeError("Please upload at least one image.")
            if self.path.endswith("analyze-ingredients"):
                result = deepinfra_request(
                    images,
                    "Identify every visible food ingredient in these photos. Be exhaustive across all images and include clearly visible items even when they appear in a collage or recipe-card photo. Return JSON exactly as {\"ingredients\":[\"ingredient 1\",\"ingredient 2\"]}. Use simple grocery names, remove duplicates, and do not include prepared dishes or packaging.",
                )
            else:
                result = deepinfra_request(
                    images,
                    "Read this recipe card carefully. Return JSON exactly as {\"name\":\"recipe name\",\"ingredients\":[\"quantity and ingredient\"],\"steps\":[\"step 1\"],\"servings\":\"optional servings\"}. Preserve quantities and do not invent text that is not visible.",
                )
            self.send_json(200, result)
        except Exception as error:
            self.send_json(500, {"error": str(error)})

    def send_json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"LettuceDecide running at http://localhost:{port}")
    ThreadingHTTPServer(("localhost", port), Handler).serve_forever()
