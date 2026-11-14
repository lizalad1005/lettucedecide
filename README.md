# LettuceDecide

LettuceDecide turns messy family recipe cards into a weekly meal plan and combined shopping list. Drex helps make the decisions, while Ask Lettuce handles follow-up changes.

## Run locally

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Recipe photos

Place photos in `public/recipes/`, for example `public/recipes/pasta.jpg`, and reference them from recipe data as `./public/recipes/pasta.jpg`.

## Current MVP

- Paste recipe cards
- Generate a seven-day meal plan
- Combine ingredients into a shopping list
- Upload ingredient photos and remove ingredients already on hand
- Ask Lettuce follow-up questions

Recipe data is stored in [`data/recipes.json`](data/recipes.json), including each dish's image, ingredients, dietary tags, preparation time, and meal type.

## Intern evidence

Project rules for Intern are in [`AGENTS.md`](AGENTS.md), and the required screenshot checklist is in [`docs/intern_evidence.md`](docs/intern_evidence.md). Capture screenshots only from a real Intern session with System 1/Drex and System 2 visible.

The ingredient-photo flow lets users confirm or uncheck the ingredients returned by vision analysis.

## DeepInfra vision setup

The app includes a local Python proxy for DeepInfra so the API key is never exposed in browser code. Set your key in the terminal, then run:

```bash
export DEEPINFRA_API_KEY="your-key-here"
python3 server.py
```

Open <http://localhost:8000>. Use **Analyze ingredients with Drex** for ingredient photos and **Extract recipe with Drex** for recipe-card photos. The proxy uses DeepInfra's OpenAI-compatible multimodal chat endpoint.
