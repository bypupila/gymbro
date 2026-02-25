# GymBro Security Monitoring Runbook

Date: 2026-02-25

## Objetivo

Monitorear abuso y privacidad alrededor de `/api/gemini` con:

1. rate limit por IP y por usuario autenticado,
2. deteccion de intentos sin token o token invalido,
3. reporte operativo accionable desde logs de Vercel.

## Variables recomendadas

Configura en runtime (Vercel project env):

1. `GEMINI_RATE_LIMIT_WINDOW_MS` (default `60000`)
2. `GEMINI_RATE_LIMIT_MAX_PER_IP` (default `60`)
3. `GEMINI_RATE_LIMIT_MAX_PER_USER` (default `30`)
4. `SECURITY_LOG_SALT` (recomendado, para hash estable y no reversible en logs)

## Flujo operativo rapido

### 1) Capturar logs de seguridad

PowerShell:

```powershell
New-Item -ItemType Directory -Force logs | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
vercel logs https://gym.bypupila.com --format=json > "logs/vercel-gemini-security-$stamp.jsonl"
```

Notas:

1. `vercel logs` muestra logs desde "ahora" por hasta 5 minutos por ejecucion.
2. Repite la captura cuando quieras ampliar ventana.

### 2) Generar resumen

```powershell
npm run admin:security:report -- --in="logs/vercel-gemini-security-YYYYMMDD-HHMMSS.jsonl"
```

### 3) Modo alerta (para automatizar)

```powershell
npm run admin:security:report -- `
  --in="logs/vercel-gemini-security-YYYYMMDD-HHMMSS.jsonl" `
  --alertRateLimit=80 `
  --alertAuthFailures=120 `
  --failOnAlert
```

Si supera umbrales con `--failOnAlert`, el script termina con exit code `2`.

## Eventos que debes vigilar

1. `gemini_rate_limited_ip`: posible scraping/bot por origen.
2. `gemini_rate_limited_user`: abuso de cuenta autenticada o automatizacion.
3. `gemini_auth_missing_token`: trafico anonimo contra endpoint protegido.
4. `gemini_auth_invalid_token`: replay/token invalido o cliente roto.
5. `gemini_payload_too_large`: intentos de sobrecarga de payload.

## Respuesta sugerida por severidad

1. Baja: pocos eventos dispersos.
   - Mantener umbrales actuales.
2. Media: picos repetidos en mismo `ipHash` o `userHash`.
   - Bajar `GEMINI_RATE_LIMIT_MAX_PER_IP` o `GEMINI_RATE_LIMIT_MAX_PER_USER`.
   - Revisar cliente para loops/retries agresivos.
3. Alta: volumen sostenido de `auth_invalid` o `rate_limited`.
   - Aplicar bloqueo adicional en edge/WAF por IP.
   - Rotar `SECURITY_LOG_SALT` solo si hay necesidad de cortar correlacion historica.
   - Abrir incidente y guardar evidencia de logs.

## Checklist semanal

1. Capturar logs 1-2 veces en hora pico.
2. Ejecutar reporte con umbrales.
3. Registrar:
   - total de eventos,
   - top `ipHash`,
   - top `userHash`,
   - decisiones de tuning.
4. Ajustar rate limits si hay tendencia.
