-- Add referensMärkning to Arbetsorder
ALTER TABLE "Arbetsorder" ADD COLUMN "referensMärkning" TEXT;

-- Remove referensMärkning from Foretag (first create a temporary column to save the data)
ALTER TABLE "Arbetsorder" ADD COLUMN "temp_referens" TEXT;

-- Update Arbetsorder with Foretag's referensMärkning where it exists
UPDATE "Arbetsorder" a
SET "temp_referens" = f."referensMärkning"
FROM "Foretag" f
JOIN "Kund" k ON f."kundId" = k."id"
WHERE a."kundId" = k."id" AND f."referensMärkning" IS NOT NULL;

-- Copy temp_referens to referensMärkning
UPDATE "Arbetsorder"
SET "referensMärkning" = "temp_referens"
WHERE "temp_referens" IS NOT NULL;

-- Drop the temporary column
ALTER TABLE "Arbetsorder" DROP COLUMN "temp_referens";

-- Remove the column from Foretag
ALTER TABLE "Foretag" DROP COLUMN "referensMärkning";