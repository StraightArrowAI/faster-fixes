-- AlterTable
ALTER TABLE "feedback_comment" ADD COLUMN     "agentName" TEXT,
ADD COLUMN     "agentTokenId" TEXT;

-- CreateIndex
CREATE INDEX "feedback_comment_agentTokenId_idx" ON "feedback_comment"("agentTokenId");

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_agentTokenId_fkey" FOREIGN KEY ("agentTokenId") REFERENCES "agent_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
