-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "environmentColors" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "project_domain_rule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "fixedTags" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL,

    CONSTRAINT "project_domain_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_domain_rule_projectId_position_idx" ON "project_domain_rule"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "project_domain_rule_projectId_pattern_key" ON "project_domain_rule"("projectId", "pattern");

-- AddForeignKey
ALTER TABLE "project_domain_rule" ADD CONSTRAINT "project_domain_rule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
