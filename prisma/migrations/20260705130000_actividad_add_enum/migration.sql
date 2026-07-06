-- Fase 3 · Actividad — agrega al enum los tipos internos de la ex-bitácora.
--
-- Va en su PROPIA migración, separada del INSERT que los usa (migración
-- siguiente): Postgres no permite usar un valor de enum recién agregado dentro
-- de la misma transacción. `IF NOT EXISTS` la hace idempotente.
ALTER TYPE "TouchpointType" ADD VALUE IF NOT EXISTS 'IDEA';
ALTER TYPE "TouchpointType" ADD VALUE IF NOT EXISTS 'AVANCE';
