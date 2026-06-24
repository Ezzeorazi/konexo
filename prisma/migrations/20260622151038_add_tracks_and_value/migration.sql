-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'jobs',
    "website" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("createdAt", "id", "industry", "location", "name", "notes", "source", "updatedAt", "website") SELECT "createdAt", "id", "industry", "location", "name", "notes", "source", "updatedAt", "website" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'jobs',
    "role" TEXT,
    "companyId" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "phone" TEXT,
    "relationshipStrength" TEXT NOT NULL DEFAULT 'COLD',
    "nextFollowUpAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("companyId", "createdAt", "email", "id", "linkedinUrl", "name", "nextFollowUpAt", "notes", "phone", "relationshipStrength", "role", "updatedAt") SELECT "companyId", "createdAt", "email", "id", "linkedinUrl", "name", "nextFollowUpAt", "notes", "phone", "relationshipStrength", "role", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE TABLE "new_Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'jobs',
    "companyId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'SAVED',
    "url" TEXT,
    "location" TEXT,
    "salaryRange" TEXT,
    "value" REAL,
    "jobDescription" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "appliedAt" DATETIME,
    "nextFollowUpAt" DATETIME,
    "cvVersionId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_cvVersionId_fkey" FOREIGN KEY ("cvVersionId") REFERENCES "CVVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Opportunity" ("appliedAt", "companyId", "createdAt", "cvVersionId", "id", "jobDescription", "location", "nextFollowUpAt", "notes", "priority", "salaryRange", "stage", "title", "updatedAt", "url") SELECT "appliedAt", "companyId", "createdAt", "cvVersionId", "id", "jobDescription", "location", "nextFollowUpAt", "notes", "priority", "salaryRange", "stage", "title", "updatedAt", "url" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
