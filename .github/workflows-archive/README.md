# Workflows archivados

Esta carpeta contiene workflows de GitHub Actions **que ya no se ejecutan**. No están en
`.github/workflows/`, así que GitHub no los lista ni permite lanzarlos desde la interfaz.

Se archivaron el **2 de noviembre de 2026** durante la limpieza posterior a la auditoría del
consumo de Render (`docs/auditoria-consumo-render-2026-11-02.md`).

## Por qué se movieron aquí y no se borraron

Son el registro de cómo se diagnosticó la caída de la API (arranque lento, límite de 512 MiB,
deploy atascado). Sirven como referencia histórica si el problema vuelve. Se conservan, pero
fuera del camino.

Ninguno tenía disparador automático: todos eran `workflow_dispatch`. Por eso no consumían
minutos de CI ni tocaban la API por su cuenta. El motivo del archivo es de **superficie de
riesgo y ruido**: 16 entradas en la lista de Actions escondían los tres workflows que sí se
usan y dejaban a un clic de distancia dos operaciones destructivas.

## Advertencia: dos de estos son peligrosos

**No los muevas de vuelta sin leerlos completos.**

- **`render-final-fix.yml`** ejecuta `PUT /v1/services/{id}/env-vars/JWT_SECRET` con un valor
  nuevo. Eso **rota el secreto de producción**: cierra todas las sesiones abiertas del panel
  admin y del POS en el siguiente request.
- **`db-push.yml`** lee el `DATABASE_URL` real desde la API de Render y ejecuta
  `prisma db push --skip-generate` **contra la base de producción**. No usa migraciones: `db push`
  sincroniza el schema a la fuerza y puede alterar o eliminar columnas y datos.

Los demás son de solo lectura: consultan la API de Render, bajan logs, comparan archivos del
contenedor o reproducen el build en Docker. El nombre de cada uno está en su campo `name`.

## Qué queda activo en `.github/workflows/`

| Archivo | Disparador | Para qué |
|---|---|---|
| `ci.yml` | push a `main`/`staging`, PR | lint, tipos, tests y build de backend y frontend |
| `deploy-render.yml` | solo manual | crear o monitorear un deploy puntual en Render |
| `render-audit-readonly.yml` | solo manual | auditoría de solo lectura del servicio y sus logs |
| `render-verify-live.yml` | solo manual | comprobar que la API responde y cronometrar el arranque en frío |
| `keep-alive.yml` | programado, **deshabilitado a mano** | histórico; se dejó sin borrar y desactivado |

El despliegue normal de la API **no** lo hace ninguno de estos: lo hace el `autoDeploy` del
propio servicio en Render, que se dispara cuando cambia `backend/` en `main`. `deploy-render.yml`
se dejó solo manual justamente porque duplicaba ese despliegue.
