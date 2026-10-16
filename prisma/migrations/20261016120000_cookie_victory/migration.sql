-- Galletas de la Victoria (modo empleo): una fila por galleta cumplida.
CREATE TABLE "CookieVictory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fortuneKey" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "daily" BOOLEAN NOT NULL DEFAULT false,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookieVictory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CookieVictory_opportunityId_fortuneKey_key" ON "CookieVictory"("opportunityId", "fortuneKey");

CREATE INDEX "CookieVictory_userId_daily_dayKey_idx" ON "CookieVictory"("userId", "daily", "dayKey");

ALTER TABLE "CookieVictory" ADD CONSTRAINT "CookieVictory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
