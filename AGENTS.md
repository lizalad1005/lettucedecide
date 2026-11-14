# LettuceDecide project rules

## Product goal

LettuceDecide turns recipe cards and ingredient photos into a weekly meal plan and a shopping list.

## Working rules

- Keep the app usable with the existing buildless HTML, CSS, and JavaScript setup.
- Keep API keys out of source files, browser code, screenshots, and Git history.
- Preserve user-provided recipe photos and recipe text.
- Ingredient photos must be analyzed before the weekly plan is generated.
- Recipe-card extraction must preserve quantities and cooking steps for user review.
- Shopping lists display ingredient names only; recipe details may display measurements.
- Test JSON syntax and run `git diff --check` after changes.
- Do not push to GitHub unless the user explicitly asks.

## Demo acceptance path

Upload ingredient photos → analyze with Drex → confirm ingredients → plan week → click a meal photo to view its recipe.
