import base64
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

API_URL = "https://api.deepinfra.com/v1/openai/chat/completions"
MODEL = "Qwen/Qwen3.8-27B"


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


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ("/api/analyze-ingredients", "/api/extract-recipe"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 25 * 1024 * 1024:
                raise RuntimeError("Image upload is too large; use smaller photos.")
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            images = body.get("images", [])
            if not images:
                raise RuntimeError("Please upload at least one image.")
            if self.path.endswith("analyze-ingredients"):
                result = deepinfra_request(
                    images,
                    "Identify the visible food ingredients in these photos. Return JSON exactly as {\"ingredients\":[\"ingredient 1\",\"ingredient 2\"]}. Use simple grocery names and do not include prepared dishes, packaging, or guesses with low confidence.",
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
    print("LettuceDecide running at http://localhost:8000")
    ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
