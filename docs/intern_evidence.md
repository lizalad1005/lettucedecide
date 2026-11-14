# Intern evidence checklist

This project is being developed with Intern in the VS Code terminal.

Capture and save these real screenshots from an Intern session:

- `docs/intern_system1.png` — Intern terminal showing the System 1 decision model.
- `docs/intern_system2.png` — Intern terminal showing the System 2 coding model working on this repository.
- `docs/intern_result.png` — Intern's final summary showing the files or feature it changed.

Suggested session command:

```bash
intern --json --cwd /Users/liza/Desktop/LettuceDecide --max-turns 3 \
  "Review the current LettuceDecide app against AGENTS.md. Make one small, safe improvement to the recipe-planning UX. Do not expose secrets, do not modify API authentication, and do not commit or push. Report the files changed and verification performed."
```
