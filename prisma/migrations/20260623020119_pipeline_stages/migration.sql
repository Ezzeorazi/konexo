-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "track" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'open',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PipelineStage_track_order_idx" ON "PipelineStage"("track", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_track_key_key" ON "PipelineStage"("track", "key");
