# Codex - Base Operativa y Trazabilidad IA

Autor principal: `Codex`
Proyecto: `Gymbro`
Ubicacion: `docs/CODEX_BASE_OPERATIVA.md`
Fecha base: `2026-02-12`

## 1. Objetivo del documento

Este archivo es la base tecnica y operativa del proyecto para:

1. Entender como funciona la app hoy.
2. Dejar trazabilidad de cambios hechos por IA.
3. Estandarizar validaciones y despliegues.
4. Evitar regresiones en vinculación partner, sincronización y rutina.

Regla operativa: cada vez que Codex modifique lógica funcional, este archivo debe actualizarse en la sección `10. Changelog Codex`.

## 2. Restricciones de plataforma (estado real)

1. Proyecto Firebase: `gymbro-582c3`.
2. Plan actual: Spark/Free Tier.
3. Consecuencia: Cloud Functions no se pueden desplegar (requiere Blaze por `cloudbuild`/`artifactregistry`).
4. Implicación arquitectónica: flujos críticos deben funcionar sin depender de Functions.

Comandos de verificación usados:

```bash
firebase functions:list --project gymbro-582c3
```

Resultado de referencia: `No functions found`.

## 3. Arquitectura funcional vigente

### 3.1 Vinculación partner (Spark-safe)

Fuente de verdad operativa:

1. Eventos `linkRequests` (`accepted`).
2. Eventos `relationshipActions` (`UNLINK`).
3. Estado derivado en cliente por `onAcceptedLinkRequestsChange(...)`.

Materialización local:

1. `AuthProvider` escucha aceptadas y pendientes.
2. `setPartners(...)` actualiza `partnerId`, `partnerIds`, `activePartnerId` en store.
3. `CloudSyncManager` persiste diff del perfil del usuario autenticado.

Regla de seguridad:

1. No se hacen writes cross-user desde cliente.
2. Cada usuario escribe solo su `users/{uid}/profile/main`.

### 3.2 Guardado de rutina

Patrón vigente:

1. `RoutineDetailPage.updateRoutine(...)` hace update optimista local.
2. Si hay usuario autenticado, llama `firebaseService.saveRoutine(...)`.
3. Si falla, marca `lastSyncError` y muestra toast; no hace rollback destructivo.

Serialización:

1. Serializer único: `toRoutineSyncPayload(...)`.
2. Sin `undefined` en payload (evita `setDoc invalid data`).
3. Conserva `syncMeta`.
4. Incluye `updatedAt`.

### 3.3 Copia de rutina (Spark-safe)

Flujo vigente:

1. Se crea `routineRequest`.
2. Al aceptar, `RoutineRequestNotifier` (target user) aplica copia client-side:
   1. Lee perfil origen.
   2. Aplica rutina en store.
   3. Persiste con `saveRoutine`.
   4. Marca request como `applied`.

Esto elimina dependencia obligatoria de `onRoutineRequestAccepted` en Functions.

### 3.4 Sincronización cloud y listeners

Hardening activo:

1. Listeners `onSnapshot` con callback de error.
2. `permission-denied` se degrada sin throw.
3. Gating por auth: suscripciones solo si `authUid === userId`.
4. `CloudSyncManager` aplica estrategia `deferredRemoteProfile` y control por `updatedAt`.

## 4. PWA / Cache Strategy

Configuración activa:

1. `injectRegister: 'auto'`.
2. Workbox:
   1. `cleanupOutdatedCaches: true`
   2. `clientsClaim: true`
   3. `skipWaiting: true`
3. Registro SW en `main.tsx` con refresh inmediato (`updateSW(true)` en `onNeedRefresh`).

Objetivo: reducir problemas de bundle viejo en cliente.

## 5. Contratos importantes

1. `setRutina(...)`: reemplazo completo (archiva/versiona historial).
2. `setRutinaInPlace(...)`: edición incremental sin archivar historial.
3. `saveRoutine(...)`: persistencia robusta de `rutina` + `updatedAt`.
4. `onAcceptedLinkRequestsChange(...)`: deriva partners desde eventos; no hace writes directos.

## 6. Flujo de despliegue recomendado

Orden estándar:

1. `firebase deploy --only firestore:rules --project gymbro-582c3`
2. `vercel --prod`
3. Scripts admin:
   1. `npm run admin:check`
   2. `npm run admin:audit:partners`
   3. `npm run admin:fix:partners -- --apply`

Nota:

1. `firebase deploy --only functions` fallará en Spark hasta migrar a Blaze.

## 6.1 Provisionamiento QA (cuentas de prueba)

Script oficial:

```bash
npm run admin:create:test-accounts
```

Qué hace:

1. Crea/actualiza 2 usuarios reales en Firebase Auth.
2. Crea/actualiza documentos `users/{uid}` y `users/{uid}/profile/main` para ambos.
3. Escribe en `.env`:
   1. `GYMBRO_EMAIL`
   2. `GYMBRO_PASSWORD`
   3. `GYMBRO_EMAIL_2`
   4. `GYMBRO_PASSWORD_2`
   5. `GYMBRO_BASE_URL` (si no existía, por defecto `https://gym.bypupila.com`)

Archivo del script:

1. `scripts/admin/create-test-accounts.mjs`

## 7. Suite de validación estándar

1. Lint:

```bash
npm run lint
```

2. Tests (Chromium):

```bash
npx playwright test --project=chromium --reporter=line
```

3. Build:

```bash
npm run build
```

4. Smoke auth real (requiere env):

```bash
npx playwright test tests/live-auth-smoke.spec.ts --project=chromium --reporter=line
```

Variables requeridas:

1. `GYMBRO_EMAIL`
2. `GYMBRO_PASSWORD`
3. `GYMBRO_BASE_URL` (opcional)

Smoke con segunda cuenta:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=\s]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
[System.Environment]::SetEnvironmentVariable('GYMBRO_EMAIL', $env:GYMBRO_EMAIL_2, 'Process')
[System.Environment]::SetEnvironmentVariable('GYMBRO_PASSWORD', $env:GYMBRO_PASSWORD_2, 'Process')
npx playwright test tests/live-auth-smoke.spec.ts --project=chromium --reporter=line
```

## 8. Riesgos residuales

1. Sin credenciales de smoke auth no se puede certificar login/rutas protegidas E2E.
2. En Spark, si ningún cliente abre sesión tras aceptación de partner, la materialización en perfil puede demorar (event-driven client).
3. Warnings `no-explicit-any` en `firebaseService.ts` siguen presentes (no bloqueantes).

## 9. Guía de trabajo para futuras IAs

Antes de tocar código:

1. Leer este archivo completo.
2. Confirmar plan Firebase (Spark vs Blaze).
3. No asumir Cloud Functions disponibles.

Al finalizar cambios:

1. Ejecutar la suite de `7. Suite de validación estándar`.
2. Actualizar `10. Changelog Codex`.
3. Registrar archivos modificados y razón técnica.

## 10. Changelog Codex

### 2026-02-12 - Estabilización Spark + rutina + PWA

Autor: `Codex`

Cambios clave:

1. Se agregó `setRutinaInPlace(...)` para edición incremental sin archivar.
2. `RoutineDetailPage` migrado a guardado robusto con `setRutinaInPlace` y manejo de error sin rollback destructivo.
3. Serialización de rutina unificada con `toRoutineSyncPayload(...)`.
4. `saveRoutine(...)` persiste `updatedAt`.
5. Fallback Spark:
   1. `AuthProvider` volvió a suscribirse a aceptadas para derivar partner sin Functions.
   2. `RoutineRequestNotifier` aplica copia client-side al aceptar request.
6. Hardening PWA:
   1. Workbox cleanup/claim/skipWaiting.
   2. Registro SW con refresh inmediato.
7. Despliegues ejecutados:
   1. Firestore rules: OK.
   2. Frontend Vercel: OK, alias `gym.bypupila.com`.
   3. Functions: no desplegables en Spark (documentado).
8. Scripts admin:
   1. `admin:check` OK.
   2. `admin:audit:partners` sin inconsistencias.
   3. `admin:fix:partners -- --apply` sin cambios.

Validación:

1. `npm run lint`: 0 errores, 5 warnings existentes.
2. `npx playwright test --project=chromium`: 10 pass, 1 skip.
3. `npm run build`: OK.

### 2026-02-12 - QA auto-provisioning + smoke dual account

Autor: `Codex`

Cambios clave:

1. Se agregó script `scripts/admin/create-test-accounts.mjs`.
2. Se agregó comando npm `admin:create:test-accounts`.
3. El script crea 2 cuentas QA reales y actualiza `.env` con credenciales de smoke.
4. Se ejecutó smoke autenticado con cuenta 1 y cuenta 2: ambos OK.

Validación:

1. `npm run lint`: 0 errores, warnings no bloqueantes existentes.
2. `npx playwright test --project=chromium --reporter=line`: 11/11 pass.
3. `npm run build`: OK.

### 2026-02-12 - Deploy-first + validacion E2E partner/rutina

Autor: `Codex`

Despliegue ejecutado:

1. `vercel --prod --yes` (alias activo `https://gym.bypupila.com`).
2. `firebase deploy --only firestore:rules --project gymbro-582c3`.

Validaciones ejecutadas contra produccion:

1. `tests/live-auth-smoke.spec.ts` cuenta 1: PASS.
2. `tests/live-auth-smoke.spec.ts` cuenta 2: PASS.
3. `tests/partner-routine-sync-live.spec.ts`: FAIL.

Fallo observado en E2E live:

1. La solicitud de rutina creada por usuario A queda en `routineRequests` con `status: pending` y `applyStatus: pending`.
2. Usuario B no llega a aplicar copia de rutina en ese ciclo E2E.
3. La validacion de propagacion posterior (A modifica -> B recibe) queda bloqueada por el punto anterior.

Cambios de soporte aplicados:

1. `src/components/LinkRequestsNotifier.tsx`: boton de aceptar con `title` y `aria-label` para accion estable/automatizable.
2. `tests/partner-routine-sync-live.spec.ts`: usa primero el modal de vinculacion inicial para enviar copia, y luego fallback al boton del perfil.

### 2026-02-12 - Cierre de sync partner-rutina en Spark (flujo E2E verde)

Autor: `Codex`

Problemas raiz cerrados en esta tanda:

1. Acumulacion de `routineRequests` pendientes que generaba aceptaciones ambiguas.
2. `routineSync` local/remoto desalineado tras aceptar copia.
3. Campos anidados stale en `rutina` por writes con merge, que podian dejar `syncMeta` viejo.
4. Carrera temporal al activar sync auto donde el primer cambio podia no propagarse al partner.

Cambios aplicados:

1. `src/services/routineRequestService.ts`
   1. Dedupe al crear request: cancela pendientes duplicadas del mismo flujo sender/target.
   2. `onIncomingRequests` emite solo la solicitud mas nueva por flujo.
2. `src/components/RoutineRequestNotifier.tsx`
   1. Alinear `routineSync` en store local para source y target al aceptar/aplicar.
   2. Seed de `syncMeta` local en origen y persistencia inmediata (`saveRoutine`) al consolidar sync.
   3. `aria-label/title` en boton aceptar solicitud de rutina.
3. `src/services/firebaseService.ts`
   1. `saveRoutine` ahora usa `updateDoc` (con fallback `setDoc` si `not-found`) para reemplazar `rutina` completa y evitar campos stale anidados.
4. `src/components/CloudSyncManager.tsx`
   1. Al recibir rutina nueva del partner (`incomingVersion > localVersion`), persiste inmediatamente en nube para evitar perdida por refresh si el autosave se retrasa.
5. `scripts/admin/create-test-accounts.mjs`
   1. Reset de perfil QA sin `merge` para evitar residuos de estado en cuentas de prueba.
6. `tests/partner-routine-sync-live.spec.ts`
   1. Limpieza completa de requests entrantes/salientes de ambas cuentas al iniciar.
   2. Seleccion de solicitud por remitente (`aliasA`) para evitar falsos positivos.
   3. Verificacion de propagacion final basada en perfil nube + confirmacion UI en `/routine`.

Despliegue ejecutado:

1. Frontend publicado y aliasado en `https://gym.bypupila.com` (ultima corrida).

Validacion final:

1. `tests/partner-routine-sync-live.spec.ts` (Chromium, prod): PASS.
2. `tests/live-auth-smoke.spec.ts` cuenta 1 (prod): PASS.
3. `tests/live-auth-smoke.spec.ts` cuenta 2 (prod): PASS.

Revalidacion adicional (misma fecha):

1. Segunda corrida de `tests/partner-routine-sync-live.spec.ts` en prod: PASS (38s).
2. Nueva corrida de smoke cuenta 1: PASS.
3. Nueva corrida de smoke cuenta 2: PASS.

### 2026-02-12 - Fix horario editable/persistente para cuentas con `dias` vacio

Autor: `Codex`

Problema:

1. Algunas cuentas (incluyendo QA) tenian `perfil.horario.dias = []`.
2. En ese estado, la edicion de horario quedaba inconsistente y no siempre persistia correctamente en nube.

Cambios aplicados:

1. Nuevo util `src/utils/scheduleDefaults.ts`:
   1. `ensureScheduleDays(...)` para autocorregir horarios vacios.
   2. `getDefaultScheduleDays()` con los 7 dias base.
2. `src/pages/SchedulePage.tsx`:
   1. Inicializa dias con `ensureScheduleDays(...)` (siempre renderiza 7 dias).
   2. Guardado explicito en nube con `firebaseService.saveSchedule(...)` al presionar `Guardar Cambios`.
3. `src/pages/Onboarding.tsx`:
   1. Misma normalizacion de dias.
   2. Guardado explicito en nube al completar onboarding de horarios.
4. `src/services/firebaseService.ts`:
   1. Nuevo metodo `saveSchedule(userId, days)`.
   2. Creacion de perfil fallback en `shareRoutine` ahora usa dias por defecto, no `[]`.
5. `scripts/admin/create-test-accounts.mjs`:
   1. Cuentas QA se crean con horario de 7 dias por defecto (no vacio).

Validacion:

1. Build: OK.
2. Verificacion en produccion (`/profile/schedule`) con cuenta QA:
   1. Se muestran los dias (incluyendo `Lunes`).
   2. Toggle + guardar persiste en Firestore (`horario.dias.length = 7`, `Lunes.entrena` actualizado).

### 2026-02-12 - Rutina desacoplada de filtro duro por horario (`entrena=true`)

Autor: `Codex`

Problema reportado:

1. En cuentas con horario inconsistente o sin dias activos, en `RoutineDetailPage` solo aparecia `Limpiar` al agregar/editar ejercicios.
2. El flujo de rutina estaba usando `perfil.horario.dias.filter(d => d.entrena)` como filtro estricto de chips de dias.
3. Esto contradecia la regla funcional: el horario semanal es guia, no restriccion para ejecutar/editar rutina.

Cambios aplicados:

1. `src/pages/RoutineDetailPage.tsx`
   1. Se normaliza horario con `ensureScheduleDays(...)`.
   2. Se calculan `availableRoutineDays` con los 7 dias base + dias ya usados en la rutina.
   3. Se reemplaza el filtro estricto `entrena=true` por opciones siempre disponibles en:
      1. modal `Anadir Ejercicio`.
      2. edicion de ejercicio (`ExerciseCardComponent`).
   4. Se mantiene `Limpiar` para dejar ejercicio sin dia asignado (entrenamiento libre).
   5. Se agregan pistas visuales:
      1. chips de dias no marcados en horario siguen habilitados pero con menor enfasis.
      2. helper text explicito: "Guia opcional...".
   6. Correccion menor de clave de estilo de dia: `Sabado` (antes `Sibado`).

Validacion:

1. `npx eslint src/pages/RoutineDetailPage.tsx`: OK.
2. `npm run build`: OK.
