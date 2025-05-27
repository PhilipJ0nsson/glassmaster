// File: app/(skyddade-sidor)/arbetsordrar/[id]/page.tsx
// Fullständig kod med AlertDialog för borttagning.

'use client';

import { Button } from "@/components/ui/button";
import { ArbetsorderStatus } from "@prisma/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowLeft, Calendar, Edit, FileText, Trash, User, Briefcase, Settings2, Tag, Wrench, Info as InfoIcon, ImageIcon, DollarSign, Loader2 } from "lucide-react"; 
import Link from "next/link"; 
import { useParams, useRouter } from "next/navigation"; 
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import BildHandler from "../komponenter/bild-handler";
import StatusHandler from "../komponenter/status-handler";
import DocumentPreviewButton from "../komponenter/document-preview-button"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateRotDetails, RotCalculationResult } from "@/lib/arbetsorder-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Vi styr med state istället
} from "@/components/ui/alert-dialog";

interface OrderradForDetalj {
  id: number;
  prislista: {
    namn: string;
    artikelnummer?: string | null;
    prissattningTyp: string; 
  };
  antal: number;
  enhetsPrisExklMoms: number | null;
  rabattProcent: number;
  radPrisExklMoms: number;
  radPrisInklMoms: number;
  kommentar: string | null;
  bredd?: number | null;
  hojd?: number | null;
  langd?: number | null;
  tid?: number | null;
  enhetsPrissattningTyp?: string | null; 
}

interface ArbetsorderFullDataForDetalj {
  id: number;
  kundId: number;
  status: ArbetsorderStatus;
  ROT: boolean;
  ROTprocentsats: number | null;
  material: string | null;
  referensMärkning: string | null;
  arbetstid: number | null;
  skapadDatum: string;
  uppdateradDatum: string;
  totalPrisExklMoms: number | null;
  totalPrisInklMoms: number | null;
  kund: {
    id: number;
    privatperson?: { fornamn: string; efternamn: string } | null;
    foretag?: { foretagsnamn: string } | null;
  };
  ansvarigTekniker?: { id: number; fornamn: string; efternamn: string } | null;
  skapadAv: { id: number; fornamn: string; efternamn: string };
  uppdateradAv: { id: number; fornamn: string; efternamn: string };
  orderrader: OrderradForDetalj[];
  bilder: Array<{ id: number; filnamn: string; filsokvag: string }>;
}


export default function ArbetsorderDetalj() {
  const params = useParams();
  const router = useRouter(); 
  const [arbetsorder, setArbetsorder] = useState<ArbetsorderFullDataForDetalj | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const rotDetails: RotCalculationResult | null = useMemo(() => {
    if (!arbetsorder) return null;
    const mappedOrderrader = arbetsorder.orderrader.map(rad => ({
      radPrisInklMoms: rad.radPrisInklMoms,
      radPrisExklMoms: rad.radPrisExklMoms,
      enhetsPrissattningTyp: rad.enhetsPrissattningTyp as any, 
      prislista: {
        prissattningTyp: rad.prislista.prissattningTyp as any, 
      },
    }));
    return calculateRotDetails({
      orderrader: mappedOrderrader,
      totalPrisInklMoms: arbetsorder.totalPrisInklMoms,
      ROT: arbetsorder.ROT,
      ROTprocentsats: arbetsorder.ROTprocentsats,
    });
  }, [arbetsorder]);

  useEffect(() => {
    const fetchArbetsorder = async () => {
      try {
        setLoading(true);
        const id = params.id as string;
        const response = await fetch(`/api/arbetsordrar/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Arbetsordern hittades inte");
            router.push("/arbetsordrar");
            return;
          }
          throw new Error('Kunde inte hämta arbetsorder');
        }
        
        const data = await response.json();
        setArbetsorder(data);
      } catch (error) {
        console.error('Fel vid hämtning av arbetsorder:', error);
        toast.error('Kunde inte hämta arbetsorder');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArbetsorder();
    }
  }, [params.id, router]);

  const confirmDelete = async () => {
    if (!arbetsorder) return;
    
    try {
      setDeleteLoading(true);
      const id = params.id as string;
      const response = await fetch(`/api/arbetsordrar/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      toast.success('Arbetsordern har tagits bort');
      setShowDeleteDialog(false); 
      router.push('/arbetsordrar');
      router.refresh();
    } catch (error: any) {
      toast.error('Kunde inte ta bort arbetsordern: ' + error.message);
      setShowDeleteDialog(false); // Stäng dialogen även vid fel
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: sv });
  };

  const getKundNamn = () => {
    if (!arbetsorder || !arbetsorder.kund) return '';
    const { kund } = arbetsorder;
    if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    if (kund.foretag) return kund.foretag.foretagsnamn;
    return `Kund #${kund.id}`;
  };

  const getStatusColorClasses = (status: ArbetsorderStatus) => {
    switch (status) {
      case ArbetsorderStatus.MATNING: return "bg-orange-100 text-orange-800 border-orange-300";
      case ArbetsorderStatus.OFFERT: return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case ArbetsorderStatus.AKTIV: return "bg-blue-100 text-blue-800 border-blue-300"; 
      case ArbetsorderStatus.SLUTFORD: return "bg-green-100 text-green-800 border-green-300";
      case ArbetsorderStatus.FAKTURERAD: return "bg-gray-200 text-gray-800 border-gray-400";
      case ArbetsorderStatus.AVBRUTEN: return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusText = (status: ArbetsorderStatus) => {
    const map: Record<ArbetsorderStatus, string> = { 
        [ArbetsorderStatus.MATNING]: 'Mätning',
        [ArbetsorderStatus.OFFERT]: 'Offert', 
        [ArbetsorderStatus.AKTIV]: 'Aktiv', 
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd', 
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad', 
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten' 
    };
    return map[status] || status.toString();
  };

  const renderOrderradDetaljerForTable = (rad: OrderradForDetalj) => {
    let detaljer = [];
    const typ = rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp;
    if (typ === 'M2' && rad.bredd && rad.hojd) detaljer.push(`Mått: ${rad.bredd}x${rad.hojd}mm`);
    if (typ === 'M' && rad.langd) detaljer.push(`Längd: ${rad.langd}mm`);
    if (typ === 'TIM' && rad.tid) detaljer.push(`Tid: ${rad.tid} tim`);
    if (rad.kommentar) detaljer.push(rad.kommentar);
    return detaljer.join(' | ');
  };


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-6 w-6 animate-spin mr-2" />Laddar arbetsorder...</div>;
  }
  if (!arbetsorder) {
    return <div className="flex flex-col items-center justify-center h-screen"><p>Arbetsordern hittades inte</p><Link href="/arbetsordrar"><Button className="mt-4">Tillbaka till arbetsordrarna</Button></Link></div>;
  }

  const isFakturaButtonDisabled = arbetsorder.status !== ArbetsorderStatus.SLUTFORD && arbetsorder.status !== ArbetsorderStatus.FAKTURERAD;

  return (
    <>
      <div className="space-y-8 p-4 md:p-6 bg-white border rounded-xl shadow-lg">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-6 border-b">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label="Tillbaka" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                            Arbetsorder #{arbetsorder.id}
                        </h1>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${getStatusColorClasses(arbetsorder.status)}`}>
                            {getStatusText(arbetsorder.status)}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Kund: <Link href={`/kunder/${arbetsorder.kundId}`} className="text-primary hover:underline">{getKundNamn()}</Link>
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <StatusHandler 
                arbetsorderId={arbetsorder.id}
                currentStatus={arbetsorder.status}
                onStatusUpdated={(newStatus: ArbetsorderStatus) => setArbetsorder(prev => prev ? {...prev, status: newStatus} : null)}
              />
              <DocumentPreviewButton arbetsorderId={arbetsorder.id} documentType="OFFERT" buttonText="Visa Offert" dialogTitle="Offert"/>
              <DocumentPreviewButton arbetsorderId={arbetsorder.id} documentType="ARBETSORDER" buttonText="Visa Arbetsorder" dialogTitle="Arbetsorder"/>
              <DocumentPreviewButton arbetsorderId={arbetsorder.id} documentType="FAKTURA" buttonText="Visa Faktura" dialogTitle="Faktura" isDisabled={isFakturaButtonDisabled}/>
              <Link href={`/arbetsordrar/${arbetsorder.id}/redigera`}>
                <Button variant="outline" size="sm"><Edit className="mr-1.5 h-3.5 w-3.5" />Redigera</Button>
              </Link>
              {arbetsorder.status !== ArbetsorderStatus.FAKTURERAD && arbetsorder.status !== ArbetsorderStatus.AVBRUTEN && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={deleteLoading}>
                  <Trash className="mr-1.5 h-3.5 w-3.5" />
                  {deleteLoading ? "Tar bort..." : "Ta bort"}
                </Button>
              )}
            </div>
        </div>

        {/* Informationsblock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><User className="mr-2 h-5 w-5 text-primary" />Kundinformation</h2>
              <div className="space-y-1.5 text-sm">
                <p><strong className="font-medium text-gray-600 w-28 inline-block">Kund:</strong> <Link href={`/kunder/${arbetsorder.kundId}`} className="text-primary hover:underline">{getKundNamn()}</Link></p>
                {arbetsorder.ansvarigTekniker && (
                  <p><strong className="font-medium text-gray-600 w-28 inline-block">Ansvarig:</strong> {arbetsorder.ansvarigTekniker.fornamn} {arbetsorder.ansvarigTekniker.efternamn}</p>
                )}
                {arbetsorder.referensMärkning && (
                  <p><strong className="font-medium text-gray-600 w-28 inline-block">Referens:</strong> {arbetsorder.referensMärkning}</p>
                )}
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><Calendar className="mr-2 h-5 w-5 text-primary" />Historik</h2>
              <div className="space-y-1.5 text-sm">
                <p><strong className="font-medium text-gray-600 w-28 inline-block">Skapad:</strong> {formatDate(arbetsorder.skapadDatum)} av {arbetsorder.skapadAv.fornamn}</p>
                <p><strong className="font-medium text-gray-600 w-28 inline-block">Uppdaterad:</strong> {formatDate(arbetsorder.uppdateradDatum)} av {arbetsorder.uppdateradAv.fornamn}</p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Orderdetaljer</h2>
              <div className="space-y-1.5 text-sm">
                {arbetsorder.material && (
                  <p><strong className="font-medium text-gray-600 w-28 inline-block">Material/Anteck.:</strong> {arbetsorder.material}</p>
                )}
                {arbetsorder.ROT && (
                  <p>
                    <strong className="font-medium text-gray-600 w-28 inline-block">ROT-avdrag:</strong> {arbetsorder.ROTprocentsats}%
                    {!rotDetails?.arbetsraderFinns && <span className="text-xs text-orange-500 ml-1">(Inga arbetskostnader)</span>}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
        
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center"><Briefcase className="mr-2.5 h-6 w-6 text-primary" />Produkter och Tjänster</h2>
          {arbetsorder.orderrader.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-md">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Inga produkter eller tjänster har lagts till.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[40%]">Produkt/Tjänst</TableHead>
                    <TableHead className="text-center">Antal</TableHead>
                    <TableHead className="text-right">À-pris (exkl.)</TableHead>
                    <TableHead className="text-center">Rabatt</TableHead>
                    <TableHead className="text-right">Summa (exkl.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arbetsorder.orderrader.map((rad: OrderradForDetalj) => (
                    <TableRow key={rad.id}>
                      <TableCell>
                        <p className="font-medium">{rad.prislista.namn}</p>
                        {rad.prislista.artikelnummer && <p className="text-xs text-muted-foreground">Art.nr: {rad.prislista.artikelnummer}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{renderOrderradDetaljerForTable(rad)}</p>
                      </TableCell>
                      <TableCell className="text-center">{rad.antal}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rad.enhetsPrisExklMoms || rad.prislista.prissattningTyp === "TIM" ? rad.radPrisExklMoms / rad.antal / (rad.tid || 1) : rad.radPrisExklMoms / rad.antal )}</TableCell>
                      <TableCell className="text-center">{rad.rabattProcent > 0 ? `${rad.rabattProcent}%` : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rad.radPrisExklMoms)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 bg-gray-50 border-t text-right space-y-1.5">
                <p className="text-sm"><span className="text-muted-foreground">Summa exkl. moms:</span> <span className="font-semibold">{formatCurrency(arbetsorder.totalPrisExklMoms)}</span></p>
                <p className="text-md"><span className="text-muted-foreground">Summa inkl. moms:</span> <span className="font-bold">{formatCurrency(arbetsorder.totalPrisInklMoms)}</span></p>
                {arbetsorder.ROT && rotDetails && rotDetails.rotAvdragBelopp > 0 && (
                  <>
                    <p className="text-sm"><span className="text-muted-foreground">Varav arbetskostnad (inkl. moms):</span> <span className="font-semibold">{formatCurrency(rotDetails.totalArbetskostnadInklMoms)}</span></p>
                    <p className="text-sm"><span className="text-muted-foreground">ROT-avdrag ({arbetsorder.ROTprocentsats}%):</span> <span className="font-semibold text-red-600">-{formatCurrency(rotDetails.rotAvdragBelopp)}</span></p>
                    <p className="text-xl font-bold text-primary"><span className="text-muted-foreground">Att betala:</span> <span>{formatCurrency(rotDetails.summaAttBetala)}</span></p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="mt-8">
          <BildHandler 
            arbetsorderId={arbetsorder.id} 
            initialBilder={arbetsorder.bilder} 
          />
        </div>
      </div>

      {/* AlertDialog för bekräftelse av borttagning */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vill du verkligen ta bort arbetsorder #{arbetsorder?.id}? Denna åtgärd kan inte ångras och raderar arbetsordern permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Radera permanent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}