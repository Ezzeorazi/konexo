-- Fase 3 · Actividad — copia la bitácora (ProjectNote) al stream de Touchpoint.
--
-- La bitácora pasa a ser Actividad interna: kind "idea" -> tipo IDEA, cualquier
-- otro (incluye el default "avance") -> AVANCE. body -> note; createdAt ->
-- occurredAt; opportunityId se conserva; contactId queda NULL (son notas de
-- ejecución, sin persona). El id se prefija con 'mig_pn_' + <id original> y el
-- WHERE NOT EXISTS hace el INSERT idempotente (re-correrlo no duplica).
--
-- IMPORTANTE: esta migración PRESERVA la bitácora antes de que la siguiente
-- (drop_project_note) elimine la tabla. Sacá un backup COMPLETO (`npm run
-- db:backup`, pg_dump) antes de aplicar: el export JSON de la app NO incluye
-- ProjectNote.
INSERT INTO "Touchpoint" (
  "id", "userId", "type", "note", "occurredAt", "contactId", "opportunityId", "createdAt"
)
SELECT
  'mig_pn_' || pn."id",
  pn."userId",
  (CASE pn."kind" WHEN 'idea' THEN 'IDEA' ELSE 'AVANCE' END)::"TouchpointType",
  pn."body",
  pn."createdAt",
  NULL,
  pn."opportunityId",
  pn."createdAt"
FROM "ProjectNote" pn
WHERE NOT EXISTS (
  SELECT 1 FROM "Touchpoint" t WHERE t."id" = 'mig_pn_' || pn."id"
);
