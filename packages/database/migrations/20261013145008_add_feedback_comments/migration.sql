-- CreateTable
CREATE TABLE "feedback_comment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "feedbackId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "fromColumnName" TEXT,
    "toColumnName" TEXT,

    CONSTRAINT "feedback_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_comment_feedbackId_createdAt_idx" ON "feedback_comment"("feedbackId", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_comment_authorId_idx" ON "feedback_comment"("authorId");

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
