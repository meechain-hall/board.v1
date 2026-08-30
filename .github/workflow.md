# Legacy workflow example (not active)

This file is historical reference only and is **not** an executable GitHub
Actions workflow. The active workflow is
[`.github/workflows/ci-cd.yaml`](workflows/ci-cd.yaml).

## Vercel secret names used by the active workflow

Configure these repository secrets under **Settings → Secrets and variables →
Actions**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Do not use the older, unseparated names (`VERCELTOKEN`, `VERCELORGID`, and
`VERCELPROJECTID`): the active workflow does not read them. Secret values must
be configured in GitHub and must never be committed to the repository.
