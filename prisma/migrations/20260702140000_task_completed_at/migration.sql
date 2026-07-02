-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: las tareas ya hechas quedan con completedAt = su fecha de creación
-- (aprox), para no perder el histórico; las nuevas se setean al tildar.
UPDATE "ProjectTask" SET "completedAt" = "createdAt" WHERE "done" = true;
