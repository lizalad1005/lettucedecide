| Metric | Drex | DeepInfra Qwen/Qwen3.8-27B |
|---|---|---|
| Accuracy | 100.0% | 100.0% |
| Avg latency | 338 ms | 1506 ms |
| Cost / 1k decisions | not reported | $0.1182 |
| Invalid answers | 0 | 0 |
| Request errors | 0 | 0 |

107 decisions per model: 45 store sections, 31 vegetarian, 31 weekday-friendly.
Cost is what each API reported per call (Drex `usage.cost`, DeepInfra `estimated_cost`); "not reported" means the API returned no cost. Latency is wall-clock per call, 6 calls in parallel.
