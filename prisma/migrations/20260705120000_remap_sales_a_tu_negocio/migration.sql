-- Fase 1 · dos modos — REMAP del modo "sales" (retirado) a "freelance" ("Tu negocio").
--
-- IMPORTANTE: sacá un backup ANTES de aplicar (`npm run db:backup`, o
-- Configuración -> Mis datos -> Exportar a JSON). Revisá el preview de filas
-- afectadas primero (ver el resumen del PR).
--
-- Idempotente: filtra por `track = 'sales'`; tras la primera corrida no quedan
-- filas con ese track, así que re-ejecutarla no cambia nada.

-- 1) Oportunidades: mover al track 'freelance' y remapear la etapa. El modo sales
--    reusaba las keys de jobs (SAVED..CLOSED); en "Tu negocio" las etapas son
--    FL_*. Mapeo por posición en el embudo.
UPDATE "Opportunity"
SET "track" = 'freelance',
    "stage" = CASE "stage"
      WHEN 'SAVED'     THEN 'FL_LEAD'        -- Prospecto   -> Consulta
      WHEN 'APPLIED'   THEN 'FL_PROPOSAL'    -- Contactado  -> Propuesta
      WHEN 'INTERVIEW' THEN 'FL_NEGOTIATION' -- Propuesta   -> Negociación
      WHEN 'OFFER'     THEN 'FL_ACTIVE'      -- Negociación -> En curso
      WHEN 'CLOSED'    THEN 'FL_PAID'        -- Cerrado     -> Cobrado
      ELSE 'FL_LEAD'                         -- fallback defensivo (etapa custom)
    END
WHERE "track" = 'sales';

-- 2) Cuentas (Company) y contactos del modo sales pasan a "Tu negocio".
UPDATE "Company" SET "track" = 'freelance' WHERE "track" = 'sales';
UPDATE "Contact" SET "track" = 'freelance' WHERE "track" = 'sales';

-- 3) Etapas personalizadas del modo sales quedan huérfanas (el track ya no se
--    ofrece). Se borran. Las etapas de "Tu negocio" (track='freelance') NO se
--    tocan: si el usuario ya usó freelance, conserva las suyas; si no, se
--    auto-siembran desde los presets FL_* al abrir el modo (lib/stages.ts).
DELETE FROM "PipelineStage" WHERE "track" = 'sales';

-- 4) Setting `enabledTracks` (lista CSV, sin espacios: se guarda con join(",")):
--    sacar 'sales' para que el modo retirado no siga en el switcher. Se separa
--    en array, se quita el elemento 'sales' y se rejunta. GUARD anti-vacío: si
--    al sacar 'sales' quedara vacío, cae a 'freelance' (nunca dejamos a un
--    usuario sin ningún modo habilitado). Idempotente por el LIKE '%sales%'.
UPDATE "Setting"
SET "value" = COALESCE(
  NULLIF(
    array_to_string(array_remove(string_to_array("value", ','), 'sales'), ','),
    ''
  ),
  'freelance'
)
WHERE "key" = 'enabledTracks' AND "value" LIKE '%sales%';
