-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "columnId" TEXT;

-- CreateTable
CREATE TABLE "feedback_column" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "feedback_column_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_column_projectId_position_idx" ON "feedback_column"("projectId", "position");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "feedback_column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_column" ADD CONSTRAINT "feedback_column_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the three default columns for every existing project so the board renders
-- exactly as it did before columns were configurable (ADR-0010).
INSERT INTO "feedback_column" ("id", "updatedAt", "projectId", "name", "category", "position")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, p."id", d."name", d."category", d."position"
FROM "project" p
CROSS JOIN (VALUES
    ('New', 'new', 0),
    ('In Progress', 'in_progress', 1),
    ('Resolved', 'resolved', 2)
) AS d("name", "category", "position");

-- Pin existing cards to their column so a later reorder within a category
-- doesn't move them. Archived ("closed") feedback has no column.
UPDATE "feedback" f
SET "columnId" = c."id"
FROM "feedback_column" c
WHERE c."projectId" = f."projectId"
  AND c."category" = f."status";
