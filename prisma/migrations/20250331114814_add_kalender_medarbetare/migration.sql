-- CreateTable
CREATE TABLE "KalenderMedarbetare" (
  "kalenderId" INTEGER NOT NULL,
  "anvandareId" INTEGER NOT NULL,

  PRIMARY KEY ("kalenderId", "anvandareId"),
  CONSTRAINT "KalenderMedarbetare_kalenderId_fkey" FOREIGN KEY ("kalenderId") REFERENCES "Kalender" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KalenderMedarbetare_anvandareId_fkey" FOREIGN KEY ("anvandareId") REFERENCES "Anvandare" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);