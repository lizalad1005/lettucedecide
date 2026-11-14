# LettuceDecide

LettuceDecide turns messy family recipe cards into a weekly meal plan and combined shopping list. Drex helps make the decisions, while Ask Lettuce handles follow-up changes.

## Run locally

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Recipe photos

Place photos in `public/recipes/`, for example `public/recipes/pasta.jpg`, and reference them from recipe data as `/recipes/pasta.jpg`.

## Current MVP

- Paste recipe cards
- Generate a seven-day meal plan
- Combine ingredients into a shopping list
- Ask Lettuce follow-up questions
