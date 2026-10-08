-- AlterTable
ALTER TABLE "reviewer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "tokenCiphertext" TEXT;

-- CreateTable
CREATE TABLE "project_domain" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "includeSubdomains" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "project_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_link_send" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "projectDomainId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "message" TEXT,

    CONSTRAINT "reviewer_link_send_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_domain_projectId_idx" ON "project_domain"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_domain_projectId_host_key" ON "project_domain"("projectId", "host");

-- CreateIndex
CREATE INDEX "reviewer_link_send_reviewerId_idx" ON "reviewer_link_send"("reviewerId");

-- CreateIndex
CREATE INDEX "reviewer_link_send_projectId_createdAt_idx" ON "reviewer_link_send"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "project_domain" ADD CONSTRAINT "project_domain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_link_send" ADD CONSTRAINT "reviewer_link_send_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_link_send" ADD CONSTRAINT "reviewer_link_send_projectDomainId_fkey" FOREIGN KEY ("projectDomainId") REFERENCES "project_domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: each Project's current domain becomes its primary entry. Subdomains
-- stay included so every live install keeps its access (ADR-0013).
INSERT INTO "project_domain" ("id", "updatedAt", "projectId", "url", "host", "includeSubdomains", "isPrimary")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, p."id", 'https://' || p."url", lower(p."url"), true, true
FROM "project" p;
