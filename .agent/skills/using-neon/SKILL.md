---
name: using-neon
description: Guidelines for working with Neon Serverless Postgres, including documentation referencing and core features.
---

# using-neon Skill

## Overview
Neon is a serverless Postgres platform that separates compute and storage. It offers autoscaling, branching, instant restore, and scale-to-zero.

## Documentation Referencing
Always reference the Neon documentation as the source of truth:
- LLMs.txt index: `https://neon.tech/llms.txt`
- Fetch markdown: `curl -H "Accept: text/markdown" https://neon.tech/docs/<path>`

## Core Areas
- **Drivers & ORMs**: Use `@neondatabase/serverless` for HTTP/WebSocket queries.
- **Auth & Data API**: Use `@neondatabase/auth` for managed auth and `@neondatabase/neon-js` for Data API.
- **Platform API**: Use `@neondatabase/api-client` for managing resources.

## Best Practices
1. Use branching for migrations.
2. Use the serverless driver in serverless/edge environments.
3. Configure connection pooling (`-pooler`) for stateful applications.
