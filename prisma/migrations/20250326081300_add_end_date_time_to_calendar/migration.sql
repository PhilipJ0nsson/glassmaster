-- Först lägger vi till kolumnen som NULL
ALTER TABLE "Kalender" ADD COLUMN "slutDatumTid" TIMESTAMP(3);

-- Uppdatera befintliga rader att ha samma värde som "datumTid" plus 1 timme
UPDATE "Kalender" SET "slutDatumTid" = "datumTid" + INTERVAL '1 hour';

-- Gör kolumnen NOT NULL efter att vi fyllt i värden
ALTER TABLE "Kalender" ALTER COLUMN "slutDatumTid" SET NOT NULL;
