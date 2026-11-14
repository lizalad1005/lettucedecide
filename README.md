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

The ingredient-photo flow currently uses a transparent demo detection list that the user can confirm or uncheck. It is ready for a vision-model API connection in the next iteration.
