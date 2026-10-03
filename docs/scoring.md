# Scoring

> **Prototype methodology.** Not an official government or IGBC certification, and must never be presented as one.

## 100-point framework

| Category | Points |
|---|---|
| Energy | 25 |
| Water | 20 |
| Waste | 15 |
| Green Cover & Site | 10 |
| Sustainable Materials | 10 |
| Indoor Environment | 5 |
| Sustainable Mobility | 5 |
| Climate Resilience | 10 |
| **Total** | **100** |

## How a score is calculated

Everything lives in `packages/shared/src/scoring/config.ts` (config) and `engine.ts` (pure functions).

- Each parameter's `weight` is its maximum points; weights in a category add up to the category max (unit-tested).
- A parameter earns `weight × fraction` where the fraction (0-1) depends on its kind:
  boolean → 0/1 · percent → value/100 · level (None/Basic/Good/Excellent) → 0/0.4/0.75/1 · number → a rule that
  normalises by building size or occupants (e.g. kWh/m²/year, litres/person/day, kWp per 1,000 m²).
- Blank parameters earn 0. A numeric parameter that cannot be normalised (missing area/occupants) is excluded from
  that category's denominator and listed in `unscoredParameters`.
- `calculatePreliminaryScore(parameters, context)` returns `{ totalScore, breakdown, methodologyVersion, unscoredParameters }`.

**To change the methodology**, edit `scoring/config.ts` (weights, rules, bands) and bump `methodologyVersion`.
The tests in `packages/shared/src/__tests__` check the 100-point total, the weights, and the registry/config match.

## Other calculations

- **Improvements catalogue** (`improvements.ts`): ~17 practical upgrades. Each one's gain is measured by the engine.
  Powers the recommendations and the what-if simulator. Projected scores are labelled projections.
- **Carbon estimate** (`carbon.ts`): grid electricity × 0.82 kg CO₂e/kWh (indicative). Not an audited footprint.
- **Simulated helpers** (`simulation.ts`): fake ML fallback and demo score history. Always labelled simulated.
