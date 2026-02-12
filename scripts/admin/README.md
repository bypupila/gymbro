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

## Seguridad

- Nunca subas el JSON de service account al repositorio.
- Usa `.gitignore` para excluir credenciales y carpeta de backups.
- Trata estos scripts como herramientas de operacion con permisos altos.
