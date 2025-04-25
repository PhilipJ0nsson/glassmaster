-- CreateEnum
CREATE TYPE "PrissattningTyp" AS ENUM ('ST', 'M', 'M2', 'TIM');

-- AlterTable
ALTER TABLE "Orderrad" ADD COLUMN     "bredd" DOUBLE PRECISION,
ADD COLUMN     "enhetsPrissattningTyp" "PrissattningTyp",
ADD COLUMN     "hojd" DOUBLE PRECISION,
ADD COLUMN     "langd" DOUBLE PRECISION,
ADD COLUMN     "tid" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Prislista" ADD COLUMN     "prissattningTyp" "PrissattningTyp" NOT NULL DEFAULT 'ST';
