# Branch protection for `main`

These are **recommendations for maintainers** of the Recall repository. They keep `main`
deployable and prevent force-pushes or unreviewed changes from landing on the default
branch. Apply them on GitHub for the `main` branch only.

## How to reach the settings

1. Open the repository on GitHub: https://github.com/definitelynotguru/Recall
2. Go to **Settings** (top tab).
3. In the left sidebar, click **Branches** (under "Code and automation").
4. Under "Branch protection rules", click **Add branch protection rule**.
5. In "Branch name pattern", enter `main`.
6. Configure the options below, then **Create** / **Save changes**.

## Recommended rules

### Require a pull request before merging
- Enable **Require a pull request before merging**.
- Set **Required approvals** to **1** (or more for larger teams).
- Enable **Dismiss stale pull request approvals when new commits are pushed** so a
  reviewer must re-approve after changes.
- Optionally enable **Require review from Code Owners** if a `CODEOWNERS` file is added.

### Require status checks to pass before merging
- Enable **Require status checks to pass before merging**.
- Enable **Require branches to be up to date before merging**.
- Add the required checks produced by the CI workflows. The corresponding workflow files
  live in `.github/workflows/`:

  | Check (workflow)      | Workflow file       | Job name        | What it verifies                          |
  | --------------------- | ------------------- | --------------- | ----------------------------------------- |
  | `web-test`            | `web-test.yml`      | `test`          | lint, unit tests (Vitest), Next.js build  |
  | `build-apk`           | `build-apk.yml`     | `assemble-debug`| Android unit tests, lint, debug APK build |
  | `secret-scan`         | `secret-scan.yml`   | `gitleaks`      | Secret scanning via gitleaks              |
  | `api-smoke`           | `api-smoke.yml`     | `smoke`         | Production health/login/sync-auth checks  |

  > Note: `api-smoke.yml` currently runs on a **daily schedule** and manual dispatch
  > only (it has no `pull_request` trigger). To use `smoke` as a *required* PR check,
  > add a `pull_request` trigger to that workflow; otherwise it will never report a
  > status on PRs and will block merges. Until then, keep it as an informative
  > (non-required) check and rely on `web-test`, `build-apk`, and `secret-scan` as
  > required PR gates.

  GitHub surfaces status checks by their job name (e.g. `test`, `assemble-debug`,
  `gitleaks`). When in doubt, run a PR and copy the exact check name from the GitHub
  checks UI into the "Required status checks" search box.

### Require linear history and restrict pushes
- Enable **Require linear history** (merge commits are not allowed; use squash or rebase merges).
- Enable **Do not allow bypassing the above settings** (or restrict bypass to admins only).
- Optionally enable **Restrict who can push to matching branches** to the maintainer team.

### Force pushes and deletions
- Enable **Do not allow force pushes for all users** (prevents history rewrites).
- Enable **Do not allow deletions** (prevents deleting `main`).

### Signed commits (optional)
- Optionally enable **Require signed commits** if contributors sign commits with GPG,
  SSH, or S/MIME. Leave disabled if not all contributors can sign, since it will block
  otherwise valid PRs.

## Notes

- Forks run `web-test` and `build-apk` without maintainer secrets; `deploy-web`,
  `db-push`, and production-bound `api-smoke` need fork-specific credentials/variables.
- These rules apply to `main` only. Feature branches (e.g. `web-frontend-docs-batch-2`)
  do not need protection.
- Re-evaluate required checks whenever a workflow is renamed or its job id changes; a
  renamed check stops matching and can block merges until updated.
