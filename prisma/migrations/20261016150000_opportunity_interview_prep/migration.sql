-- Prep de entrevista (modo empleo): último pack, tipo de entrevista y fecha.
ALTER TABLE "Opportunity" ADD COLUMN     "interviewPrep" TEXT,
ADD COLUMN     "interviewPrepAt" TIMESTAMP(3),
ADD COLUMN     "interviewPrepStage" TEXT;
