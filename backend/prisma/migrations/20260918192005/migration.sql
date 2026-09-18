-- AlterTable
ALTER TABLE "providerprofiles" ADD COLUMN     "contactConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactMediums" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "headlineSkill" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "idVerification" JSONB,
ADD COLUMN     "keyAchievement" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "preferredProjectDuration" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "professionalTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "videoIntroUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "voiceIntroUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappAvailability" JSONB,
ADD COLUMN     "workHours" JSONB;
