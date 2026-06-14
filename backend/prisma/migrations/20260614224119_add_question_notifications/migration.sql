-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "questionId" TEXT,
ALTER COLUMN "noteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
