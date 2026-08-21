-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "recordingId" TEXT;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
