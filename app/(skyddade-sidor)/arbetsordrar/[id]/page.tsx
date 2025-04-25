'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArbetsorderStatus } from "@prisma/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowLeft, Calendar, Edit, FileText, Trash, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import BildHandler from "../komponenter/bild-handler";
import StatusHandler from "../komponenter/status-handler";
import OffertPreview from "../komponenter/offert-preview";

export default function ArbetsorderDetalj() {
  const params = useParams();
  const router = useRouter();
  const [arbetsorder, setArbetsorder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchArbetsorder = async () => {
      try {
        setLoading(true);
        // Extract the ID as a string before using it in the fetch call
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

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort denna arbetsorder?')) {
      return;
    }
    
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
      router.push('/arbetsordrar');
    } catch (error: any) {
      toast.error('Kunde inte ta bort arbetsordern: ' + error.message);
      console.error('Fel vid borttagning av arbetsorder:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', { locale: sv });
  };

  const getKundNamn = () => {
    if (!arbetsorder || !arbetsorder.kund) return '';
    
    const { kund } = arbetsorder;
    
    if (kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    
    return `Kund #${kund.id}`;
  };

  const getStatusColor = (status: ArbetsorderStatus) => {
    switch (status) {
      case ArbetsorderStatus.OFFERT:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case ArbetsorderStatus.BEKRAFTAD:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case ArbetsorderStatus.PAGAENDE:
        return "bg-purple-100 text-purple-800 border-purple-200";
      case ArbetsorderStatus.SLUTFORD:
        return "bg-green-100 text-green-800 border-green-200";
      case ArbetsorderStatus.FAKTURERAD:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case ArbetsorderStatus.AVBRUTEN:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: ArbetsorderStatus) => {
    switch (status) {
      case ArbetsorderStatus.OFFERT:
        return 'Offert';
      case ArbetsorderStatus.BEKRAFTAD:
        return 'Bekräftad';
      case ArbetsorderStatus.PAGAENDE:
        return 'Pågående';
      case ArbetsorderStatus.SLUTFORD:
        return 'Slutförd';
      case ArbetsorderStatus.FAKTURERAD:
        return 'Fakturerad';
      case ArbetsorderStatus.AVBRUTEN:
        return 'Avbruten';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Laddar arbetsorder...</p>
      </div>
    );
  }

  if (!arbetsorder) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Arbetsordern hittades inte</p>
        <Link href="/arbetsordrar">
          <Button className="mt-4">Tillbaka till arbetsordrarna</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/arbetsordrar">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                Arbetsorder #{arbetsorder.id}
              </h1>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs ${getStatusColor(arbetsorder.status)}`}>
                {getStatusText(arbetsorder.status)}
              </span>
            </div>
            <p className="text-muted-foreground">{getKundNamn()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <StatusHandler 
            arbetsorderId={arbetsorder.id}
            currentStatus={arbetsorder.status}
            onStatusUpdated={(newStatus) => {
              setArbetsorder({
                ...arbetsorder,
                status: newStatus,
              });
            }}
          />
          <OffertPreview
            arbetsorderId={arbetsorder.id}
            status={arbetsorder.status}
          />
          <Button 
            variant="outline" 
            className="text-blue-600 hover:bg-blue-50"
            onClick={() => {
              window.open(`/api/arbetsordrar/${arbetsorder.id}/offert`, '_blank');
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Ladda ner {arbetsorder.status === ArbetsorderStatus.OFFERT ? 'Offert' : 'PDF'}
          </Button>
          <Link href={`/arbetsordrar/${arbetsorder.id}/redigera`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Redigera
            </Button>
          </Link>
          {arbetsorder.status !== ArbetsorderStatus.FAKTURERAD && (
            <Button 
              variant="outline" 
              className="text-red-500 hover:bg-red-50"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              <Trash className="mr-2 h-4 w-4" />
              Ta bort
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kunduppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-2">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Kund</p>
                <Link href={`/kunder/${arbetsorder.kundId}`} className="text-blue-600 hover:underline">
                  {getKundNamn()}
                </Link>
              </div>
            </div>
            
            {arbetsorder.ansvarigTekniker && (
              <div className="flex items-start space-x-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Ansvarig tekniker</p>
                  <p>{arbetsorder.ansvarigTekniker.fornamn} {arbetsorder.ansvarigTekniker.efternamn}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Skapad</p>
                <p>{formatDate(arbetsorder.skapadDatum)} av {arbetsorder.skapadAv.fornamn} {arbetsorder.skapadAv.efternamn}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Senast uppdaterad</p>
                <p>{formatDate(arbetsorder.uppdateradDatum)} av {arbetsorder.uppdateradAv.fornamn} {arbetsorder.uppdateradAv.efternamn}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arbetsorderinformation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {arbetsorder.arbetstid && (
              <div>
                <p className="font-medium">Arbetstid</p>
                <p>{arbetsorder.arbetstid} timmar</p>
              </div>
            )}
            
            {arbetsorder.ROT && (
              <div>
                <p className="font-medium">ROT-avdrag</p>
                <p>{arbetsorder.ROTprocentsats}%</p>
              </div>
            )}
            
            {arbetsorder.material && (
              <div>
                <p className="font-medium">Material/Anteckningar</p>
                <p>{arbetsorder.material}</p>
              </div>
            )}
            
            {arbetsorder.referensMärkning && (
              <div>
                <p className="font-medium">Referens/Märkning</p>
                <p>{arbetsorder.referensMärkning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produkter och tjänster</CardTitle>
        </CardHeader>
        <CardContent>
          {arbetsorder.orderrader.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>Inga produkter eller tjänster har lagts till.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Produkt/Tjänst</th>
                    <th className="text-center p-2 border-b">Antal</th>
                    <th className="text-center p-2 border-b">À-pris (exkl. moms)</th>
                    <th className="text-center p-2 border-b">Rabatt</th>
                    <th className="text-right p-2 border-b">Summa (exkl. moms)</th>
                    <th className="text-right p-2 border-b">Summa (inkl. moms)</th>
                  </tr>
                </thead>
                <tbody>
                  {arbetsorder.orderrader.map((rad: any) => (
                    <tr key={rad.id} className="border-b">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{rad.prislista.namn}</p>
                          {rad.kommentar && (
                            <p className="text-sm text-muted-foreground">{rad.kommentar}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-center p-2">{rad.antal}</td>
                      <td className="text-center p-2">{formatCurrency(rad.enhetsPrisExklMoms || rad.prislista.prisExklMoms)}</td>
                      <td className="text-center p-2">{rad.rabattProcent > 0 ? `${rad.rabattProcent}%` : '-'}</td>
                      <td className="text-right p-2">{formatCurrency(rad.radPrisExklMoms)}</td>
                      <td className="text-right p-2">{formatCurrency(rad.radPrisInklMoms)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Totalt:</td>
                    <td className="p-2 text-right">{formatCurrency(arbetsorder.totalPrisExklMoms)}</td>
                    <td className="p-2 text-right">{formatCurrency(arbetsorder.totalPrisInklMoms)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BildHandler 
        arbetsorderId={arbetsorder.id} 
        initialBilder={arbetsorder.bilder} 
      />
    </div>
  );
}