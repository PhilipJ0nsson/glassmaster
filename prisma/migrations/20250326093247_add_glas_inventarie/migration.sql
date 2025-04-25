-- CreateTable
CREATE TABLE "GlasInventarie" (
    "id" SERIAL NOT NULL,
    "bredd" INTEGER NOT NULL,
    "hojd" INTEGER NOT NULL,
    "antal" INTEGER NOT NULL,
    "beskrivning" TEXT,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlasInventarie_pkey" PRIMARY KEY ("id")
);
