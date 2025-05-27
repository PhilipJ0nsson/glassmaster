/*
  Warnings:

  - The values [BEKRAFTAD,PAGAENDE] on the enum `ArbetsorderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ArbetsorderStatus_new" AS ENUM ('OFFERT', 'AKTIV', 'SLUTFORD', 'FAKTURERAD', 'AVBRUTEN');
ALTER TABLE "Arbetsorder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Arbetsorder" ALTER COLUMN "status" TYPE "ArbetsorderStatus_new" USING ("status"::text::"ArbetsorderStatus_new");
ALTER TYPE "ArbetsorderStatus" RENAME TO "ArbetsorderStatus_old";
ALTER TYPE "ArbetsorderStatus_new" RENAME TO "ArbetsorderStatus";
DROP TYPE "ArbetsorderStatus_old";
ALTER TABLE "Arbetsorder" ALTER COLUMN "status" SET DEFAULT 'OFFERT';
COMMIT;
