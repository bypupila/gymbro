---
name: better-auth-best-practices
description: Core configurations, common gotchas, and integration guidelines for Better Auth.
---

# better-auth-best-practices Skill

## Core Configuration
- **BETTER_AUTH_SECRET**: Encryption secret (min 32 chars).
- **BETTER_AUTH_URL**: Base URL of your application (must match exactly).
- **baseURL/secret**: Only define in config if env vars are NOT set.

## Database & Adapters
- Pass `pg.Pool`, `mysql2` pool, etc., for direct connections.
- Better Auth uses **adapter model names**, NOT underlying table names (e.g., use `user` instead of `users` if using Prisma).

## Session Management
1. **Secondary Storage**: Sessions go here by default if defined.
2. **Stateless Mode**: No DB + cookieCache.
3. **Cookie Cache Strategies**: `compact` (default), `jwt`, `jwe`.

## Security
- Use `useSecureCookies: true` for HTTPS.
- ⚠️ Avoid `disableCSRFCheck` or `disableOriginCheck`.
- Use `crossSubDomainCookies.enabled: true` for cross-subdomain support.

## Common Gotchas
- **Model vs Table name**: Always check the adapter config.
- **CLI Sync**: Re-run `migrate` or `generate` after changing plugins.
- **Stateless OAuth**: Requires `account.storeAccountCookie`.
- **Stateless mode logout**: Sessions only live in cookie cache; cache expiry = logout.
