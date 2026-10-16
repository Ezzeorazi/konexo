-- "Evaluar fit" (modo empleo): puntaje, veredicto y reporte de la evaluación.
ALTER TABLE "Opportunity" ADD COLUMN     "fitEvaluatedAt" TIMESTAMP(3),
ADD COLUMN     "fitReport" TEXT,
ADD COLUMN     "fitScore" INTEGER,
ADD COLUMN     "fitVerdict" TEXT;
