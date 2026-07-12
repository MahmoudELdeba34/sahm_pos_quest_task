# AI Usage Disclosure

This project used AI assistance (Cursor / Composer) as a pair-programming accelerator. Architectural ownership and verification remained with the candidate.

## Tools used

- **Cursor IDE agent (Composer)** for scaffolding, boilerplate, and iterative implementation
- Manual review, edits, and test verification by the author

## Workflow / prompts relied on

Typical workflow (summarized):

1. Paste Sahm Food hiring quest requirements and ask to design a mid-level Angular architecture that maximizes evaluation score
2. Scaffold Angular 19 standalone app with feature-based folders
3. Implement mock realtime gateway, AI streaming, offline queue, and feature stores
4. Add OnPush UI panels, accessibility affordances, tests, README, and disclosure docs
5. Fix TypeScript/build/test failures iteratively

## What was AI-generated vs human-designed

| Area | Source |
|------|--------|
| Overall architecture (feature stores + Signals/RxJS split) | Human decision |
| Choice against full NgRx for this scope | Human decision |
| Folder boundaries and evaluation-oriented README narrative | Human-directed |
| Seed data content / POS domain modeling | Collaborative; reviewed by human |
| Component templates/styles | AI-assisted draft; human adjusted UX hierarchy |
| RxJS operators for debounce/retry/cancel | AI-assisted; human verified correctness |
| Unit tests | AI-assisted; human ensured they assert real behaviors |
| Fake WebSocket/polling merge design | Human-specified requirements |

## How AI output was verified

- `ng build` production compilation
- Unit tests for stores, offline sync, search debounce, AI retry
- Manual browser walkthrough of live updates, offline toggle, AI retry, search keyboard nav
- Rejected suggestions that put business logic in components or over-engineered with full NgRx for a single workspace demo

## Incorrect / rejected AI suggestions

- Using full NgRx Store + Effects for every click — rejected as disproportionate for the quest scope; kept a scalable Signals+RxJS store pattern instead
- Placing status transition rules inside templates/components — rejected; moved into stores/domain helpers
- Adding unnecessary UI card clutter / generic purple dashboard styling — rejected in favor of a calm POS workspace visual system
- Treating offline sync without idempotency — rejected; added idempotency keys to prevent duplicate actions

## Candidate ownership statement

All architectural decisions, trade-off rationale, and walkthrough explanations are owned by the candidate. AI was used as a coding assistant, not as a substitute for engineering judgment.
