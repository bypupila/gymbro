# GymBro Secure Deploy Checklist

Date: 2026-02-24

## 1. Environment and Secrets

1. Ensure these variables are configured in production:
   - `GEMINI_API_KEY`
   - `FIREBASE_API_KEY`
   - Firebase web config vars (`VITE_FIREBASE_*`)
2. Keep dev bypass disabled:
   - `VITE_ENABLE_DEV_AUTH_BYPASS=0`
3. Do not configure `VITE_GEMINI_API_KEY` for production.
4. Verify `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` is available only in admin/CI contexts, never in client bundle.

## 2. Firestore and Auth Security

1. Deploy updated Firestore rules.
2. Confirm exercise catalog write access is claim-based (`admin=true`).
3. Set/verify admin claims:
   - `npm run admin:set-admin-claim -- --alias=<alias> --admin=true`

## 3. Dependency Security Gate

1. Run dependency checks:
   - `npm audit --omit=dev`
   - `npm audit` (root)
   - `npm audit` in `functions/`
2. Block deploy if any high/critical vulnerability appears.

## 4. Build and Regression Gate

1. Run:
   - `npm run lint`
   - `npm run build`
2. Run minimum regression suite:
   - `npx playwright test tests/firebaseService.regression.spec.ts --project=chromium`

## 5. Live Partner/Sync Validation

1. Ensure `.env` contains:
   - `GYMBRO_EMAIL`, `GYMBRO_PASSWORD`
   - `GYMBRO_EMAIL_2`, `GYMBRO_PASSWORD_2`
   - `GYMBRO_BASE_URL=https://gym.bypupila.com`
2. Execute:
   - `npx playwright test tests/live-auth-smoke.spec.ts --project=chromium --workers=1`
   - `npx playwright test tests/partner-unlink-symmetry-live.spec.ts --project=chromium --workers=1`
   - `npx playwright test tests/partner-routine-sync-live.spec.ts --project=chromium --workers=1`

## 6. Data Consistency Check

1. Run:
   - `npm run admin:audit:partners`
2. Require `Findings: 0` before release.

## 7. Post-Deploy Runtime Checks

1. Confirm API endpoint `/api/gemini` works only with authenticated bearer token.
2. Confirm security headers are present from edge config:
   - `Content-Security-Policy`
   - `X-Frame-Options`
   - `X-Content-Type-Options`
   - `Referrer-Policy`
   - `Permissions-Policy`
3. Confirm invitation/link/routine sync user flows from two real accounts.

## 8. Operational Follow-up

1. Rotate QA passwords after live validation:
   - `npm run admin:rotate:test-passwords`
2. Archive Playwright HTML report from the release run.
3. Track remaining hardening backlog:
   - remove remaining CSP `style-src 'unsafe-inline'` where feasible
   - tune and monitor API rate limiting for `/api/gemini`

## 9. CI/CD Gate Secrets

1. Configure repository secrets for `.github/workflows/security-regression-gate.yml`:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (preferred), or:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
2. Configure live validation secrets:
   - `GYMBRO_EMAIL`, `GYMBRO_PASSWORD`
   - `GYMBRO_EMAIL_2`, `GYMBRO_PASSWORD_2`
   - `GYMBRO_BASE_URL`
3. Mark `Security and Build Gate` as required status check in branch protection.
4. Mark all gate jobs as required status checks in branch protection:
   - `Security and Build Gate`
   - `Partner Data Consistency`
   - `Live Partner Flows`
5. Enforce PR-only changes on `main`:
   - require at least 1 approving review
   - enable stale review dismissal
   - require last push approval
   - enforce rules for admins
   - require conversation resolution before merge
