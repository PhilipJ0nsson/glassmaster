-- CreateEnum
CREATE TYPE "KundTyp" AS ENUM ('PRIVAT', 'FORETAG');

-- CreateEnum
CREATE TYPE "AnvandareRoll" AS ENUM ('ADMIN', 'ARBETSLEDARE', 'TEKNIKER');

-- CreateEnum
CREATE TYPE "ArbetsorderStatus" AS ENUM ('OFFERT', 'BEKRAFTAD', 'PAGAENDE', 'SLUTFORD', 'FAKTURERAD', 'AVBRUTEN');

-- CreateEnum
CREATE TYPE "MotesTyp" AS ENUM ('ARBETSORDER', 'MOTE', 'SEMESTER', 'ANNAT');

-- CreateTable
CREATE TABLE "Kund" (
    "id" SERIAL NOT NULL,
    "kundTyp" "KundTyp" NOT NULL,
    "telefonnummer" TEXT NOT NULL,
    "epost" TEXT,
    "adress" TEXT NOT NULL,
    "kommentarer" TEXT,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Privatperson" (
    "id" SERIAL NOT NULL,
    "kundId" INTEGER NOT NULL,
    "fornamn" TEXT NOT NULL,
    "efternamn" TEXT NOT NULL,
    "personnummer" TEXT,

    CONSTRAINT "Privatperson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foretag" (
    "id" SERIAL NOT NULL,
    "kundId" INTEGER NOT NULL,
    "foretagsnamn" TEXT NOT NULL,
    "organisationsnummer" TEXT,
    "kontaktpersonFornamn" TEXT,
    "kontaktpersonEfternamn" TEXT,
    "fakturaadress" TEXT,
    "referensMärkning" TEXT,

    CONSTRAINT "Foretag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anvandare" (
    "id" SERIAL NOT NULL,
    "fornamn" TEXT NOT NULL,
    "efternamn" TEXT NOT NULL,
    "telefonnummer" TEXT,
    "epost" TEXT NOT NULL,
    "roll" "AnvandareRoll" NOT NULL DEFAULT 'TEKNIKER',
    "anvandarnamn" TEXT NOT NULL,
    "losenord" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anvandare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prislista" (
    "id" SERIAL NOT NULL,
    "namn" TEXT NOT NULL,
    "prisExklMoms" DOUBLE PRECISION NOT NULL,
    "momssats" DOUBLE PRECISION NOT NULL,
    "prisInklMoms" DOUBLE PRECISION NOT NULL,
    "kategori" TEXT,
    "artikelnummer" TEXT,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prislista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arbetsorder" (
    "id" SERIAL NOT NULL,
    "kundId" INTEGER NOT NULL,
    "ROT" BOOLEAN NOT NULL DEFAULT false,
    "ROTprocentsats" DOUBLE PRECISION,
    "arbetstid" DOUBLE PRECISION,
    "material" TEXT,
    "ansvarigTeknikerId" INTEGER,
    "skapadAvId" INTEGER NOT NULL,
    "uppdateradAvId" INTEGER NOT NULL,
    "status" "ArbetsorderStatus" NOT NULL DEFAULT 'OFFERT',
    "totalPrisExklMoms" DOUBLE PRECISION,
    "totalPrisInklMoms" DOUBLE PRECISION,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arbetsorder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orderrad" (
    "id" SERIAL NOT NULL,
    "arbetsorderId" INTEGER NOT NULL,
    "prislistaId" INTEGER NOT NULL,
    "antal" INTEGER NOT NULL DEFAULT 1,
    "rabattProcent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "radPrisExklMoms" DOUBLE PRECISION NOT NULL,
    "radPrisInklMoms" DOUBLE PRECISION NOT NULL,
    "kommentar" TEXT,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orderrad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kalender" (
    "id" SERIAL NOT NULL,
    "arbetsorderId" INTEGER,
    "kundId" INTEGER,
    "ansvarigId" INTEGER NOT NULL,
    "datumTid" TIMESTAMP(3) NOT NULL,
    "motestyp" "MotesTyp" NOT NULL DEFAULT 'ARBETSORDER',
    "titel" TEXT,
    "beskrivning" TEXT,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uppdateradDatum" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kalender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bild" (
    "id" SERIAL NOT NULL,
    "arbetsorderId" INTEGER NOT NULL,
    "filnamn" TEXT NOT NULL,
    "filsokvag" TEXT NOT NULL,
    "skapadDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Privatperson_kundId_key" ON "Privatperson"("kundId");

-- CreateIndex
CREATE UNIQUE INDEX "Foretag_kundId_key" ON "Foretag"("kundId");

-- CreateIndex
CREATE UNIQUE INDEX "Anvandare_epost_key" ON "Anvandare"("epost");

-- CreateIndex
CREATE UNIQUE INDEX "Anvandare_anvandarnamn_key" ON "Anvandare"("anvandarnamn");

-- CreateIndex
CREATE UNIQUE INDEX "Prislista_artikelnummer_key" ON "Prislista"("artikelnummer");

-- AddForeignKey
ALTER TABLE "Privatperson" ADD CONSTRAINT "Privatperson_kundId_fkey" FOREIGN KEY ("kundId") REFERENCES "Kund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foretag" ADD CONSTRAINT "Foretag_kundId_fkey" FOREIGN KEY ("kundId") REFERENCES "Kund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arbetsorder" ADD CONSTRAINT "Arbetsorder_kundId_fkey" FOREIGN KEY ("kundId") REFERENCES "Kund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arbetsorder" ADD CONSTRAINT "Arbetsorder_ansvarigTeknikerId_fkey" FOREIGN KEY ("ansvarigTeknikerId") REFERENCES "Anvandare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arbetsorder" ADD CONSTRAINT "Arbetsorder_skapadAvId_fkey" FOREIGN KEY ("skapadAvId") REFERENCES "Anvandare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arbetsorder" ADD CONSTRAINT "Arbetsorder_uppdateradAvId_fkey" FOREIGN KEY ("uppdateradAvId") REFERENCES "Anvandare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orderrad" ADD CONSTRAINT "Orderrad_arbetsorderId_fkey" FOREIGN KEY ("arbetsorderId") REFERENCES "Arbetsorder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orderrad" ADD CONSTRAINT "Orderrad_prislistaId_fkey" FOREIGN KEY ("prislistaId") REFERENCES "Prislista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kalender" ADD CONSTRAINT "Kalender_arbetsorderId_fkey" FOREIGN KEY ("arbetsorderId") REFERENCES "Arbetsorder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kalender" ADD CONSTRAINT "Kalender_kundId_fkey" FOREIGN KEY ("kundId") REFERENCES "Kund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kalender" ADD CONSTRAINT "Kalender_ansvarigId_fkey" FOREIGN KEY ("ansvarigId") REFERENCES "Anvandare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bild" ADD CONSTRAINT "Bild_arbetsorderId_fkey" FOREIGN KEY ("arbetsorderId") REFERENCES "Arbetsorder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
