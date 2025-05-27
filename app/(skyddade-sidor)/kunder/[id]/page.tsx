// /app/(skyddade-sidor)/kunder/[id]/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KundTyp, ArbetsorderStatus } from "@prisma/client";
import { Edit, ArrowLeft, Phone, Mail, Home, FileText as FileTextIcon, User as UserIcon, CalendarDays, Briefcase, Info, Building, ShoppingCart, UserCircle2, Landmark, PlusCircle, Loader2 } from "lucide-react"; // Eye-ikonen är borttagen
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KundDialog } from "../komponenter/kund-dialog";
import type { KundData as BasKundData } from "../page"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface KundDetaljerData extends BasKundData {
  arbetsordrar: Array<{ 
    id: number;
    status: ArbetsorderStatus;
    ansvarigTekniker: {
      fornamn: string;
      efternamn: string;
    } | null;
    skapadDatum: string;
    referensMärkning: string | null;
    totalPrisInklMoms: number | null;
  }>;
}


export default function KundDetaljPage() {
  const params = useParams();
  const router = useRouter();
  const [kund, setKund] = useState<KundDetaljerData | null>(null); 
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchKund = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kunder/${params.id}?includeArbetsordrar=true`); 
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Kunden hittades inte");
          router.push("/kunder");
          return;
        }
        throw new Error('Kunde inte hämta kund');
      }
      
      const data: KundDetaljerData = await response.json(); 
      setKund(data);
    } catch (error) {
      console.error('Fel vid hämtning av kund:', error);
      toast.error('Kunde inte hämta kund');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    return `Kund #${kund.id}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditKundSaved = () => {
    setEditDialogOpen(false);
    fetchKund(); 
  };

  const getStatusBadge = (status: ArbetsorderStatus) => {
    let colorClasses = '';
    let text = '';
    switch (status) {
      case ArbetsorderStatus.OFFERT: colorClasses = 'bg-yellow-100 text-yellow-800 border-yellow-300'; text = 'Offert'; break;
      case ArbetsorderStatus.AKTIV: colorClasses = 'bg-blue-100 text-blue-800 border-blue-300'; text = 'Aktiv'; break;
      case ArbetsorderStatus.SLUTFORD: colorClasses = 'bg-green-100 text-green-800 border-green-300'; text = 'Slutförd'; break;
      case ArbetsorderStatus.FAKTURERAD: colorClasses = 'bg-gray-200 text-gray-800 border-gray-400'; text = 'Fakturerad'; break;
      case ArbetsorderStatus.AVBRUTEN: colorClasses = 'bg-red-100 text-red-800 border-red-300'; text = 'Avbruten'; break;
      default: colorClasses = 'bg-gray-100 text-gray-800 border-gray-300'; text = status;
    }
    return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${colorClasses}`}>{text}</span>;
  };

  // Klick på arbetsorder-rad navigerar nu direkt
  const handleArbetsorderRowClick = (orderId: number) => {
    router.push(`/arbetsordrar/${orderId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Laddar kunduppgifter...</p>
      </div>
    );
  }

  if (!kund) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p>Kunden hittades inte</p>
        <Link href="/kunder">
          <Button className="mt-4">Tillbaka till kundlistan</Button>
        </Link>
      </div>
    );
  }

  const InfoItem = ({ icon, label, value, href, isLink = false, className = "" }: { icon: React.ReactNode, label: string, value?: string | null, href?: string, isLink?: boolean, className?: string }) => {
    if (!value && !isLink && !href) return null;
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <span className="text-muted-foreground mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLink && href ? (
            <a href={href} className="font-medium text-primary hover:underline break-all">
              {value || href}
            </a>
          ) : (
            <p className="font-medium break-words">{value}</p>
          )}
        </div>
      </div>
    );
  };
  

  return (
    <>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-6">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label="Tillbaka" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                        {getKundNamn()}
                    </h1>
                    <p className="text-sm text-muted-foreground uppercase">
                        {kund.kundTyp === KundTyp.PRIVAT ? 'Privatperson' : 'Företag'}
                        <span className="mx-1.5 text-gray-300">•</span>
                        Kund sedan {formatDate(kund.skapadDatum)}
                    </p>
                </div>
            </div>
        </div>

        <Card className="shadow-lg border">
            <CardContent className="pt-6 divide-y divide-gray-200 dark:divide-gray-700">
                
                <section className="pb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <UserCircle2 className="mr-2 h-5 w-5 text-primary" />
                            Kundinformation
                        </h2>
                        <Button onClick={() => setEditDialogOpen(true)} size="sm" variant="outline" className="shadow-sm hover:bg-accent"> 
                            <Edit className="mr-1.5 h-3.5 w-3.5" />
                            Redigera kund
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                        <InfoItem icon={<Phone size={16}/>} label="Telefonnummer" value={kund.telefonnummer} href={`tel:${kund.telefonnummer}`} isLink/>
                        <InfoItem icon={<Mail size={16}/>} label="E-post" value={kund.epost} href={`mailto:${kund.epost}`} isLink/>
                        <InfoItem icon={<Home size={16}/>} label="Adress" value={kund.adress} className="lg:col-span-1"/>
                        
                        {kund.kundTyp === KundTyp.PRIVAT && kund.privatperson && (
                            <>
                                <InfoItem icon={<UserIcon size={16}/>} label="Fullständigt namn" value={`${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`} />
                                {kund.privatperson.personnummer && (
                                     <InfoItem icon={<FileTextIcon size={16}/>} label="Personnummer" value={kund.privatperson.personnummer} />
                                )}
                            </>
                        )}

                        {kund.kundTyp === KundTyp.FORETAG && kund.foretag && (
                            <>
                                <InfoItem icon={<Landmark size={16}/>} label="Företagsnamn" value={kund.foretag.foretagsnamn} />
                                {kund.foretag.organisationsnummer && (
                                    <InfoItem icon={<Building size={16}/>} label="Organisationsnummer" value={kund.foretag.organisationsnummer} />
                                )}
                                {(kund.foretag.kontaktpersonFornamn || kund.foretag.kontaktpersonEfternamn) && (
                                    <InfoItem icon={<UserIcon size={16}/>} label="Kontaktperson" value={`${kund.foretag.kontaktpersonFornamn || ''} ${kund.foretag.kontaktpersonEfternamn || ''}`.trim()} />
                                )}
                                {kund.foretag.fakturaadress && kund.foretag.fakturaadress !== kund.adress && (
                                    <InfoItem icon={<FileTextIcon size={16}/>} label="Fakturaadress" value={kund.foretag.fakturaadress} className="lg:col-span-1"/>
                                )}
                            </>
                        )}
                        <InfoItem icon={<CalendarDays size={16}/>} label="Kund sedan" value={formatDate(kund.skapadDatum)} />

                        {kund.kommentarer && (
                            <InfoItem icon={<Info size={16}/>} label="Kommentarer" value={kund.kommentarer} className="md:col-span-full"/>
                        )}
                    </div>
                </section>

                <section className="pt-8">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                            <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
                            Arbetsordrar ({kund.arbetsordrar?.length || 0})
                        </h2>
                        <Link href={`/arbetsordrar/ny?kundId=${kund.id}`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                <PlusCircle className="mr-1.5 h-4 w-4" />
                                + Arbetsorder
                            </Button>
                        </Link>
                    </div>
                    {kund.arbetsordrar && kund.arbetsordrar.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Order-ID</TableHead>
                                    <TableHead>Märkning</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Tekniker</TableHead>
                                    <TableHead className="text-right">Summa</TableHead>
                                    <TableHead className="text-right">Skapad</TableHead>
                                    {/* Kolumnen "Åtgärder" (för Fullständig vy-knapp) är borttagen */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {kund.arbetsordrar.map((order) => (
                                    <TableRow 
                                        key={order.id} 
                                        className="hover:bg-muted/50 cursor-pointer" 
                                        onClick={() => handleArbetsorderRowClick(order.id)} 
                                    >
                                        <TableCell className="font-medium">#{order.id}</TableCell>
                                        <TableCell>{order.referensMärkning || '-'}</TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell>
                                        {order.ansvarigTekniker 
                                            ? `${order.ansvarigTekniker.fornamn} ${order.ansvarigTekniker.efternamn}` 
                                            : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.totalPrisInklMoms)}</TableCell>
                                        <TableCell className="text-right">{formatDate(order.skapadDatum)}</TableCell>
                                        {/* Cellen för "Fullständig vy"-knappen är borttagen */}
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                    <div className="text-center py-6 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>Inga arbetsordrar registrerade för denna kund.</p>
                    </div>
                    )}
                </section>
            </CardContent>
        </Card>
      </div>

      {kund && ( 
        <KundDialog
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onKundSaved={handleEditKundSaved}
          defaultValues={kund} 
          isEditing={true}
        />
      )}
    </>
  );
}