// lib/arbetsorder-utils.ts
import { ArbetsorderMedRelationer } from '@/lib/pdf-generator'; // Återanvänd typen om den passar, eller definiera en mer specifik här
import { Orderrad, Prislista, PrissattningTyp } from '@prisma/client';

// Definiera en typ för orderrader som används i beräkningen
// Denna kan vara en delmängd av den fullständiga Orderrad-typen om inte allt behövs.
export interface MinimalOrderradForROT {
  radPrisInklMoms: number;
  radPrisExklMoms: number; // Kan vara bra att ha för information
  enhetsPrissattningTyp?: PrissattningTyp | null; // Från orderraden (historiskt)
  prislista: {
    prissattningTyp: PrissattningTyp; // Från prislistan (aktuellt)
  };
}

export interface RotCalculationResult {
  totalArbetskostnadInklMoms: number;
  totalArbetskostnadExklMoms: number;
  rotAvdragBelopp: number;
  summaAttBetala: number;
  arbetsraderFinns: boolean;
}

// Anpassa input-typen efter vad som faktiskt behövs från ArbetsorderMedRelationer
interface ArbetsorderForRotInput {
  orderrader: MinimalOrderradForROT[];
  totalPrisInklMoms: number | null;
  ROT: boolean;
  ROTprocentsats: number | null;
}

export function calculateRotDetails(arbetsorder: ArbetsorderForRotInput): RotCalculationResult {
  let totalArbetskostnadInklMoms = 0;
  let totalArbetskostnadExklMoms = 0;
  let arbetsraderFinns = false;

  arbetsorder.orderrader.forEach(rad => {
    const prissattningTyp = rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp;
    if (prissattningTyp === PrissattningTyp.TIM) {
      totalArbetskostnadInklMoms += rad.radPrisInklMoms;
      totalArbetskostnadExklMoms += rad.radPrisExklMoms;
      arbetsraderFinns = true;
    }
  });

  let rotAvdragBelopp = 0;
  if (arbetsorder.ROT && arbetsorder.ROTprocentsats && totalArbetskostnadInklMoms > 0) {
    rotAvdragBelopp = (totalArbetskostnadInklMoms * arbetsorder.ROTprocentsats) / 100;
  }

  const summaAttBetala = (arbetsorder.totalPrisInklMoms || 0) - rotAvdragBelopp;

  return {
    totalArbetskostnadInklMoms,
    totalArbetskostnadExklMoms,
    rotAvdragBelopp,
    summaAttBetala,
    arbetsraderFinns,
  };
}