# Repeat Grammar

`repeat_rule` accepts legacy values and structured key/value rules.

Legacy:
- `daily`
- `weekly`
- `monthly`
- `yearly`

Structured:
- `freq=daily;interval=2`
- `freq=weekly;days=MO,WE;interval=1`
- `freq=monthly;day=15;interval=1`
- `freq=yearly;month=6;day=5`

Fields:
- `freq`: `daily`, `weekly`, `monthly`, or `yearly`
- `interval`: positive integer, default `1`, max `365`
- `days`: weekly only, comma list of `MO,TU,WE,TH,FR,SA,SU`
- `day`: day of month, clamped to month length
- `month`: yearly only, `1..12`

Unknown fields are ignored. Invalid rules fall back to no advancement.
