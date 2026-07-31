# Issue labels

Use labels so agents and humans can filter work consistently.

## Priority (required on new issues)

| Label | Meaning |
| --- | --- |
| `P0` | Production broken, data loss, or security. Drop everything. |
| `P1` | Major feature broken or blocked; no reasonable workaround. |
| `P2` | Important issue with a workaround, or high-value planned work. |
| `P3` | Minor bug, polish, or nice-to-have. |

Issue templates ask for priority; apply the matching `P0`–`P3` label when triage runs.

## Type

| Label | Meaning |
| --- | --- |
| `bug` | Defect in existing behavior |
| `enhancement` | New or improved behavior |
| `documentation` | Docs-only |
| `dependencies` | Dependency bumps |
| `question` | Support / clarification |
| `good first issue` | Small, well-scoped onboarding task |

## Area

Prefer at least one area label when known:

| Label | Meaning |
| --- | --- |
| `web` | Next.js UI |
| `android` | Kotlin client |
| `javascript` | Web/TS package changes (Dependabot) |
| `java` | Android/Gradle changes (Dependabot) |
| `ui` | Presentation / interaction |
| `sync` | Sync protocol or offline merge |
| `api` | `/api/v1` routes or OpenAPI |
| `ci` | GitHub Actions / release tooling |
| `docs` | README, AGENTS, ADRs |
| `privacy` | PII, export/delete, lock screens |
| `editor` | Markdown editing |
| `reminders` | Reminder scheduling / detection |
| `search` | Search / graph features |
| `onboarding` | First-run experience |
| `mobile` | Mobile-specific UX |
| `organization` | Tags, pins, folders |
| `data` | Import/export / migrations |
| `browser` | Browser extension ideas |
| `ai` | AI-assisted features |

## Creating priority labels

If labels are missing on a fork, create them once:

```bash
gh label create P0 --color B60205 --description "Production broken / data loss / security"
gh label create P1 --color D93F0B --description "Major breakage, no workaround"
gh label create P2 --color FBCA04 --description "Important with workaround / planned work"
gh label create P3 --color 0E8A16 --description "Minor / polish / nice-to-have"
```
