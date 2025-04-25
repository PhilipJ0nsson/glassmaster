'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KundTyp } from "@prisma/client";
import { Edit, ArrowLeft, Phone, Mail, Home, FileText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface KundDetalj {
  id: number;
  kundTyp: KundTyp;
  telefonnummer: string;
  epost: string | null;
  adress: string;
  kommentarer: string | null;
  privatperson: {
    fornamn: string;
    efternamn: string;
    personnummer: string | null;
  } | null;
  foretag: {
    foretagsnamn: string;
    organisationsnummer: string | null;
    kontaktpersonFornamn: string | null;
    kontaktpersonEfternamn: string | null;
    fakturaadress: string | null;
    referensMärkning: string | null;
  } | null;
  arbetsordrar: any[];
  skapadDatum: string;
  uppdateradDatum: string;
}

export default function KundDetalj() {
  const params = useParams();
  const router = useRouter();
  const [kund, setKund] = useState<KundDetalj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKund = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/kunder/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Kunden hittades inte");
            router.push("/kunder");
            return;
          }
          throw new Error('Kunde inte hämta kund');
        }
        
        const data = await response.json();
        setKund(data);
      } catch (error) {
        console.error('Fel vid hämtning av kund:', error);
        toast.error('Kunde inte hämta kund');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchKund();
    }
  }, [params.id, router]);

  const getKundNamn = () => {
    if (!kund) return '';
    
    if (kund.kundTyp === KundTyp.PRIVAT && kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.kundTyp === KundTyp.FORETAG && kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    return 'Okänd';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Laddar kunduppgifter...</p>
      </div>
    );
  }

  if (!kund) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Kunden hittades inte</p>
        <Link href="/kunder">
          <Button className="mt-4">Tillbaka till kundlistan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/kunder">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">{getKundNamn()}</h1>
            <p className="text-muted-foreground">
              {kund.kundTyp === KundTyp.PRIVAT ? 'Privatperson' : 'Företag'}
            </p>
          </div>
        </div>
        <Link href={`/kunder/${kund.id}/redigera`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Redigera
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kontaktuppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-2">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Telefon</p>
                <a href={`tel:${kund.telefonnummer}`} className="text-blue-600 hover:underline">
                  {kund.telefonnummer}
                </a>
              </div>
            </div>
            
            {kund.epost && (
              <div className="flex items-start space-x-2">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">E-post</p>
                  <a href={`mailto:${kund.epost}`} className="text-blue-600 hover:underline">
                    {kund.epost}
                  </a>
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Adress</p>
                <p>{kund.adress}</p>
              </div>
            </div>
            
            {kund.kommentarer && (
              <div className="flex items-start space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Kommentarer</p>
                  <p>{kund.kommentarer}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {kund.kundTyp === KundTyp.PRIVAT && kund.privatperson && (
          <Card>
            <CardHeader>
              <CardTitle>Personuppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Namn</p>
                <p>{kund.privatperson.fornamn} {kund.privatperson.efternamn}</p>
              </div>
              
              {kund.privatperson.personnummer && (
                <div>
                  <p className="font-medium">Personnummer</p>
                  <p>{kund.privatperson.personnummer}</p>
                </div>
              )}
              
              <div>
                <p className="font-medium">Kunduppgifter skapade</p>
                <p>{formatDate(kund.skapadDatum)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {kund.kundTyp === KundTyp.FORETAG && kund.foretag && (
          <Card>
            <CardHeader>
              <CardTitle>Företagsuppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Företagsnamn</p>
                <p>{kund.foretag.foretagsnamn}</p>
              </div>
              
              {kund.foretag.organisationsnummer && (
                <div>
                  <p className="font-medium">Organisationsnummer</p>
                  <p>{kund.foretag.organisationsnummer}</p>
                </div>
              )}
              
              {(kund.foretag.kontaktpersonFornamn || kund.foretag.kontaktpersonEfternamn) && (
                <div>
                  <p className="font-medium">Kontaktperson</p>
                  <p>
                    {kund.foretag.kontaktpersonFornamn} {kund.foretag.kontaktpersonEfternamn}
                  </p>
                </div>
              )}
              
              {kund.foretag.fakturaadress && (
                <div>
                  <p className="font-medium">Fakturaadress</p>
                  <p>{kund.foretag.fakturaadress}</p>
                </div>
              )}
              
              {kund.foretag.referensMärkning && (
                <div>
                  <p className="font-medium">Referens/Märkning</p>
                  <p>{kund.foretag.referensMärkning}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senaste arbetsordrar</CardTitle>
        </CardHeader>
        <CardContent>
          {kund.arbetsordrar && kund.arbetsordrar.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left p-2 border-b">Order-ID</th>
                      <th className="text-left p-2 border-b">Status</th>
                      <th className="text-left p-2 border-b">Tekniker</th>
                      <th className="text-left p-2 border-b">Skapad</th>
                      <th className="text-center p-2 border-b">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kund.arbetsordrar.map((order: any) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">#{order.id}</td>
                        <td className="p-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs 
                            ${order.status === 'OFFERT' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : order.status === 'BEKRAFTAD' 
                              ? 'bg-blue-100 text-blue-800' 
                              : order.status === 'PAGAENDE' 
                              ? 'bg-purple-100 text-purple-800'
                              : order.status === 'SLUTFORD'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'FAKTURERAD'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {order.status === 'OFFERT' ? 'Offert' : 
                             order.status === 'BEKRAFTAD' ? 'Bekräftad' : 
                             order.status === 'PAGAENDE' ? 'Pågående' : 
                             order.status === 'SLUTFORD' ? 'Slutförd' : 
                             order.status === 'FAKTURERAD' ? 'Fakturerad' : 'Avbruten'}
                          </span>
                        </td>
                        <td className="p-2">
                          {order.ansvarigTekniker 
                            ? `${order.ansvarigTekniker.fornamn} ${order.ansvarigTekniker.efternamn}` 
                            : '-'}
                        </td>
                        <td className="p-2">{formatDate(order.skapadDatum)}</td>
                        <td className="p-2 text-center">
                          <Link href={`/arbetsordrar/${order.id}`}>
                            <Button size="sm" variant="outline">Visa</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <Link href={`/arbetsordrar?kundId=${kund.id}`}>
                  <Button variant="outline">Visa alla arbetsordrar</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">Inga arbetsordrar för denna kund.</p>
              <Link href={`/arbetsordrar/ny?kundId=${kund.id}`}>
                <Button>Skapa arbetsorder</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}