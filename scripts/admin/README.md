# Firebase Admin Scripts

Este directorio contiene herramientas administrativas para Firestore usando Firebase Admin SDK.

## Que resuelve

- Acceso administrativo a Firestore (sin depender de reglas del cliente).
- Auditoria y reparacion de inconsistencias de partners.
- Backups JSON de colecciones.
- Base para migraciones y limpiezas masivas.

## 1) Configuracion de credenciales

1. Abre Firebase Console.
2. Ve a `Project settings > Service accounts`.
3. Crea y descarga una clave JSON.
4. Guarda el archivo en una ruta privada del proyecto, por ejemplo:
   `credentials/firebase-admin.json`

## 2) Variables de entorno

Configura en tu `.env`:

```env
FIREBASE_PROJECT_ID=gymbro-582c3
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=credentials/firebase-admin.json
```

Alternativa: puedes usar `FIREBASE_SERVICE_ACCOUNT_JSON` con el JSON completo en una sola variable.

## 3) Verificar setup

```bash
npm run admin:check
```

Si el setup es correcto, veras un probe de lectura exitoso sobre `users`.

## 4) Auditoria y reparacion de partners

Auditar (dry-run):

```bash
npm run admin:audit:partners
```

Reparar (preview, no escribe):

```bash
npm run admin:fix:partners
```

Reparar y aplicar cambios:

```bash
npm run admin:fix:partners -- --apply
```

Si usas Windows y npm no pasa `--apply` correctamente, usa este fallback:

```bash
node scripts/admin/fix-partner-consistency.mjs --apply
```

Filtrar por usuarios concretos:

```bash
npm run admin:fix:partners -- --userId=UID_1 --userId=UID_2 --apply
```

## 5) Backup de colecciones

Backup completo:

```bash
npm run admin:backup -- --collection=users
```

Backup con archivo de salida especifico:

```bash
npm run admin:backup -- --collection=linkRequests --out=backups/linkRequests.json
```

Backup limitado (por ejemplo, primeras 200 filas):

```bash
npm run admin:backup -- --collection=users --limit=200
```

## 6) Crear cuentas QA para smoke tests

Genera dos cuentas de prueba en Firebase Auth, asegura sus perfiles base en Firestore y actualiza `.env`:

```bash
npm run admin:create:test-accounts
```

Variables actualizadas:

1. `GYMBRO_EMAIL`
2. `GYMBRO_PASSWORD`
3. `GYMBRO_EMAIL_2`
4. `GYMBRO_PASSWORD_2`
5. `GYMBRO_BASE_URL` (si no existia)

Nota:

1. El perfil QA se reescribe completo (sin merge) para evitar residuos de `routineSync/syncMeta` entre corridas.
2. El horario QA se inicializa con 7 dias base para que siempre pueda editarse desde `Configurar Horario`.

## 7) Borrar usuarios completos (Auth + Firestore)

Dry-run por email:

```bash
npm run admin:delete:users -- --email=usuario1@mail.com --email=usuario2@mail.com
```

Aplicar borrado:

```bash
npm run admin:delete:users -- --email=usuario1@mail.com --email=usuario2@mail.com --apply
```

Por UID:

```bash
npm run admin:delete:users -- --uid=UID_1 --uid=UID_2 --apply
```

Si usas Windows y npm no pasa `--apply`, usa fallback directo:

```bash
node scripts/admin/delete-users.mjs --email=usuario1@mail.com --email=usuario2@mail.com --apply
```

Que elimina:

1. Usuario en Firebase Auth.
2. `users/{uid}` completo (incluye `profile`, subcolecciones, tokens).
3. `userAliases` asociados.
4. Referencias globales en `linkRequests`, `relationshipActions`, `routineRequests`, `trainingInvitations`.
5. Sesiones en `liveSessions` relacionadas (por `participants` o `createdBy`).

## 8) Gestionar custom claim admin

El catalogo ahora usa custom claim `admin=true` para permisos de escritura.

```bash
# Dar permisos admin por alias
npm run admin:set-admin-claim -- --alias=bypupila --admin=true

# Quitar permisos admin por email
npm run admin:set-admin-claim -- --email=usuario@mail.com --admin=false
```

## 9) Rotar credenciales QA para pruebas live

Rota solo las contrasenas de las cuentas QA existentes en `.env` (`GYMBRO_EMAIL` y `GYMBRO_EMAIL_2`) y actualiza `GYMBRO_PASSWORD` / `GYMBRO_PASSWORD_2`.

```bash
npm run admin:rotate:test-passwords
```

## 10) Subir secrets rotados a GitHub Actions

Sube los secretos requeridos para el gate CI/CD desde `.env` y/o `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` al repo remoto de `origin`.

```bash
# Preview (sin subir)
npm run admin:push:github-secrets -- --dry-run

# Subir al repo origin detectado automaticamente
npm run admin:push:github-secrets

# O repo explicito
npm run admin:push:github-secrets -- --repo=bypupila/gymbro
```

Requiere autenticacion previa en GitHub CLI:

```bash
gh auth login
```

## 11) Monitoreo de seguridad (rate limit y abuso en Gemini)

La API `/api/gemini` emite eventos de seguridad estructurados en logs (`channel=security`), incluyendo:

1. `gemini_rate_limited_ip`
2. `gemini_rate_limited_user`
3. `gemini_auth_missing_token`
4. `gemini_auth_invalid_token`
5. `gemini_payload_too_large`

Importante:

1. Configura `SECURITY_LOG_SALT` en runtime para mantener hashes anonimos y estables entre ejecuciones.
2. Si no existe esa variable, el backend usa salt efimero por proceso (mas privado, pero dificulta correlacion historica).

Captura logs de Vercel en JSON y genera reporte:

```bash
# 1) Stream de logs (5 min max por ejecucion de vercel logs)
vercel logs https://gym.bypupila.com --format=json > logs/vercel-gemini-security.jsonl

# 2) Resumen legible
npm run admin:security:report -- --in=logs/vercel-gemini-security.jsonl

# 3) Salida JSON (si quieres automatizar)
npm run admin:security:report -- --in=logs/vercel-gemini-security.jsonl --json
```

Opciones de alerta:

```bash
npm run admin:security:report -- \
  --in=logs/vercel-gemini-security.jsonl \
  --alertRateLimit=80 \
  --alertAuthFailures=120 \
  --failOnAlert
```

El script retorna exit code `2` cuando supera umbrales y `--failOnAlert` esta habilitado.

## Seguridad

- Nunca subas el JSON de service account al repositorio.
- Usa `.gitignore` para excluir credenciales y carpeta de backups.
- Trata estos scripts como herramientas de operacion con permisos altos.
