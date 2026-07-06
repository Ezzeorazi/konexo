-- Fase 3 · Actividad — elimina el modelo ProjectNote (ya fusionado en Touchpoint
-- por la migración anterior). `IF EXISTS` la hace idempotente/segura.
--
-- OJO orden: esta migración corre DESPUÉS de copy_bitacora, así que la bitácora
-- ya vive en Touchpoint cuando se dropea la tabla. No hay pérdida de datos.
ALTER TABLE "ProjectNote" DROP CONSTRAINT IF EXISTS "ProjectNote_opportunityId_fkey";
DROP TABLE IF EXISTS "ProjectNote";
