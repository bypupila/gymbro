# Security Best Practices Report - GymBro (Post-Remediation)

Date: 2026-02-24  
Scope: React/Vite PWA, Firestore rules, Firebase flows, Cloud Functions, package supply chain.

## Executive Summary

Critical security gaps identified in the prior assessment were remediated in this cycle.

Current verification status:
1. `npm audit` (root): **0 vulnerabilities**.
2. `npm audit --omit=dev` (root): **0 vulnerabilities**.
3. `npm audit` (`functions/`): **0 vulnerabilities**.
4. `npm run admin:audit:partners`: **Findings: 0**.
5. `npm run lint`: passes (warnings only, no errors).
6. `npm run build`: passes.

`Infalible` security is not achievable in software systems, but the current baseline is now significantly hardened and aligned with secure-by-default patterns.

---

## Closed Findings

### F-001 - Privilege escalation via mutable role/admin metadata - CLOSED
- Changes:
  - Firestore admin write on exercises now requires custom claim:
    - `firestore.rules` (`request.auth.token.admin == true`).
  - User metadata writes restricted to explicit allowlist.
  - Client admin gate switched to ID token claims:
    - `src/services/authService.ts` (`isCurrentUserAdmin`).
    - `src/pages/CatalogPage.tsx`.
- Outcome:
  - Removed client-side role/alias trust model for authorization.

### F-002 - Broad user/profile privacy exposure - CLOSED
- Changes:
  - `firestore.rules` now deny list/enumeration for sensitive collections.
  - `/users/{userId}` get/write owner-scoped with strict field allowlist.
  - `/users/{userId}/profile/**` read owner + linked partner only.
  - `/userAliases/{alias}` list denied.
- Outcome:
  - Cross-user metadata/profile exposure paths were tightened.

### F-003 - Training invitation tampering - CLOSED
- Changes:
  - `firestore.rules` now enforce immutable invitation fields on update.
  - Recipient can only transition pending invite to `accepted|declined` with constrained keys.
  - `src/services/trainingInvitationService.ts` updated to write only allowed fields.
- Outcome:
  - Recipient-side payload tampering path removed.

### F-004 - Live session integrity tampering - CLOSED
- Changes:
  - `firestore.rules` now limit `liveSessions/{sessionId}` updates to status/timestamps only.
  - Participant list mutation blocked from participant updates.
- Outcome:
  - Unauthorized participant injection via session doc update removed.

### F-005 - Client-side Gemini secret exposure risk - CLOSED
- Changes:
  - Gemini access moved behind server endpoint:
    - `api/gemini.ts`.
  - Frontend now calls proxy with Firebase ID token:
    - `src/services/geminiService.ts`.
  - `.env.example` updated to server-side key model (`GEMINI_API_KEY`).
- Outcome:
  - No direct client use of Gemini API key.

### F-006 - Missing hardening headers - CLOSED
- Changes:
  - Added security headers in `vercel.json`:
    - CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Outcome:
  - Production baseline browser hardening improved.

### F-007 - Unvalidated external video URL handling - CLOSED
- Changes:
  - Added strict URL allowlist utility:
    - `src/utils/urlSafety.ts`.
  - Applied in catalog/routine/active-workout views.
  - External opens use `noopener,noreferrer`.
- Outcome:
  - Reduced phishing/open-redirect style risk via poisoned exercise links.

### F-008 - Supply chain vulnerabilities - CLOSED
- Changes:
  - Removed `react-grab` dependency and debug import in `src/main.tsx`.
  - Reduced exposed runtime dependency surface (build tooling moved to dev deps).
  - Added package overrides for vulnerable transitive chains.
  - `functions/package.json` hardened with overrides and dependency cleanup.
- Outcome:
  - `npm audit` clean in both app and functions.

### F-009 - Dev auth bypass controls - HARDENED
- Changes:
  - Dev bypass now requires explicit env switch:
    - `src/App.tsx` + `.env.example` (`VITE_ENABLE_DEV_AUTH_BYPASS=0` default).
- Outcome:
  - Reduced risk of accidental bypass activation outside intended development flow.

---

## Additional Verification Results

### Build and functional regression checks
- `npx playwright test tests/firebaseService.regression.spec.ts --project=chromium`: **8 passed**.
- Live Playwright suites were executed and **skipped** in this environment:
  - `tests/live-auth-smoke.spec.ts`
  - `tests/partner-unlink-symmetry-live.spec.ts`
  - `tests/partner-routine-sync-live.spec.ts`

### Partner consistency
- `npm run admin:audit:partners` output:
  - `Scanned users: 4`
  - `Findings: 0`
  - `Fixable profiles: 0`

---

## Residual Risks (Expected / Operational)

1. CSP currently includes `'unsafe-inline'` for scripts/styles due app compatibility; migrating to nonce/hash CSP would further improve XSS resilience.
2. API abuse controls for `/api/gemini` (per-user rate limits/quota/circuit breaking) are recommended as next hardening step.
3. Live end-to-end partner flows require periodic production-like validation with test accounts (already scaffolded by current test suite).

---

## Recommended Next Security Iteration

1. Add request rate limiting and abuse telemetry for `/api/gemini`.
2. Move toward strict CSP without `'unsafe-inline'`.
3. Add CI security gates:
   - `npm audit` (root + functions),
   - lint/build,
   - selected Playwright security regressions,
   - optional Firestore rules regression tests.

