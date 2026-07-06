-- Fase 1 · dos modos — ELIMINACIÓN del modelo Venture (emprendimientos).
--
-- Feature nunca usada: 0 filas en "Venture" y 0 oportunidades con "ventureId" al
-- momento de la auditoría. El `IF EXISTS` hace la migración idempotente y segura
-- aunque se corra dos veces o el objeto ya no exista.
--
-- DDL base generada por `prisma migrate diff` + `IF EXISTS` agregado a mano.

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT IF EXISTS "Opportunity_ventureId_fkey";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN IF EXISTS "ventureId";

-- DropTable
DROP TABLE IF EXISTS "Venture";
