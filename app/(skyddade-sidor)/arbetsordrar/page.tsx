// File: app/(skyddade-sidor)/arbetsordrar/page.tsx
// Mode: Modifying
// Change: Added 'MATNING' to the initial state of 'statusStats'.
// Reasoning: To align the state with the updated 'ArbetsorderStatus' enum and resolve TypeScript error.
// --- start diff ---
// /app/(skyddade-sidor)/arbetsordrar/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArbetsorderStatus } from "@prisma/client";
import { Search } from "lucide-react"; 
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ArbetsorderLista from "./komponenter/arbetsorder-lista";

export interface ArbetsorderData {
  id: number;
  kundId: number;
  ROT: boolean;
  ROTprocentsats: number | null;
  arbetstid: number | null;
  material: string | null;
  referensMärkning: string | null;
  ansvarigTeknikerId: number | null;
  status: ArbetsorderStatus;
  skapadAvId: number;
  skapadDatum: string;
  uppdateradAvId: number;
  uppdateradDatum: string;
  totalPrisExklMoms: number | null;
  totalPrisInklMoms: number | null;
  kund: {
    id: number;
    kundTyp: string;
    privatperson?: {
      fornamn: string;
      efternamn: string;
    } | null;
    foretag?: {
      foretagsnamn: string;
    } | null;
  };
  ansvarigTekniker?: {
    id: number;
    fornamn: string;
    efternamn: string;
  } | null;
  orderrader: Array<{ 
    id: number;
  }>; 
  bilder: Array<{ 
    id: number;
  }>;
  skapadAv: {
    id: number;
    fornamn: string;
    efternamn: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ArbetsordrarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kundIdParam = searchParams.get('kundId');
  
  const [arbetsordrar, setArbetsordrar] = useState<ArbetsorderData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArbetsorderStatus | "ALLA">("ALLA");
  const [teknikerFilter, setTeknikerFilter] = useState<string>("");
  const [kundFilter, setKundFilter] = useState<string>(kundIdParam || "");
  const [anstallda, setAnstallda] = useState<any[]>([]);
  const [statusStats, setStatusStats] = useState<Record<ArbetsorderStatus, number | undefined>>({
    MATNING: undefined, // Lade till MATNING här
    OFFERT: undefined, 
    AKTIV: undefined, 
    SLUTFORD: undefined, 
    FAKTURERAD: undefined, 
    AVBRUTEN: undefined 
  });
  const [kundInfo, setKundInfo] = useState<{id: number, namn: string} | null>(null);

  useEffect(() => {
    fetchAnstallda();
  }, []);

  const fetchArbetsordrar = async () => {
    try {
      setLoading(true);
      let url = `/api/arbetsordrar?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== "ALLA") url += `&status=${statusFilter}`;
      if (teknikerFilter) url += `&tekniker=${teknikerFilter}`;
      if (kundFilter) url += `&kundId=${kundFilter}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Kunde inte hämta arbetsordrar');
      
      const data = await response.json();
      setArbetsordrar(data.arbetsordrar);
      setPagination(data.pagination);
      // Säkerställ att statusStats från API:et också hanterar MATNING eller har en fallback
      const apiStatusStats = data.statusStats || {};
      const completeStatusStats = Object.fromEntries(
        Object.values(ArbetsorderStatus).map(statusValue => [
          statusValue,
          apiStatusStats[statusValue] || 0 // Default till 0 om statusen saknas från API:et
        ])
      ) as Record<ArbetsorderStatus, number | undefined>;
      setStatusStats(completeStatusStats);
    } catch (error) {
      console.error('Fel vid hämtning av arbetsordrar:', error);
      toast.error('Kunde inte hämta arbetsordrar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArbetsordrar();
  }, [pagination.page, pagination.pageSize, search, statusFilter, teknikerFilter, kundFilter]);
  
  useEffect(() => {
    if (kundFilter) {
      fetchKundInfo(kundFilter);
    } else {
      setKundInfo(null);
    }
  }, [kundFilter]);

  const fetchAnstallda = async () => {
    try {
      const response = await fetch('/api/anvandare');
      if (!response.ok) throw new Error('Kunde inte hämta anställda');
      const data = await response.json();
      setAnstallda(data.anvandare);
    } catch (error) {
      console.error('Fel vid hämtning av anställda:', error);
      toast.error('Kunde inte hämta anställda');
    }
  };

  const fetchKundInfo = async (kundId: string) => {
    try {
      const response = await fetch(`/api/kunder/${kundId}`);
      if (!response.ok) throw new Error('Kunde inte hämta kundinformation');
      const kund = await response.json();
      let kundNamn = '';
      if (kund.kundTyp === 'PRIVAT' && kund.privatperson) kundNamn = `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
      else if (kund.kundTyp === 'FORETAG' && kund.foretag) kundNamn = kund.foretag.foretagsnamn;
      else kundNamn = `Kund #${kund.id}`;
      setKundInfo({ id: kund.id, namn: kundNamn });
    } catch (error) {
      console.error('Fel vid hämtning av kundinformation:', error);
      setKundInfo(null);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (newStatus: ArbetsorderStatus | "ALLA") => {
    setStatusFilter(newStatus);
    setPagination(prev => ({ ...prev, page: 1 })); 
  };

  const handleTeknikerFilterChange = (tekniker: string) => {
    setTeknikerFilter(tekniker);
    setPagination(prev => ({ ...prev, page: 1 })); 
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleArbetsorderRowClick = (arbetsorder: ArbetsorderData) => {
    router.push(`/arbetsordrar/${arbetsorder.id}`);
  };
  
  const getStatusColor = (status: ArbetsorderStatus) => {
    switch (status) {
      case ArbetsorderStatus.MATNING: return "bg-orange-100 text-orange-800 border-orange-200"; // Färg för MATNING
      case ArbetsorderStatus.OFFERT: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case ArbetsorderStatus.AKTIV: return "bg-blue-100 text-blue-800 border-blue-200"; 
      case ArbetsorderStatus.SLUTFORD: return "bg-green-100 text-green-800 border-green-200";
      case ArbetsorderStatus.FAKTURERAD: return "bg-gray-100 text-gray-800 border-gray-200";
      case ArbetsorderStatus.AVBRUTEN: return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  
  // Uppdatera statusknapparna för att inkludera MATNING
  const statusButtonDefinitions = [
    { value: "ALLA" as const, label: "Alla" },
    { value: ArbetsorderStatus.MATNING, label: "Mätning" },
    { value: ArbetsorderStatus.OFFERT, label: "Offert" },
    { value: ArbetsorderStatus.AKTIV, label: "Aktiv" },
    { value: ArbetsorderStatus.SLUTFORD, label: "Slutförd" },
    { value: ArbetsorderStatus.FAKTURERAD, label: "Fakturerad" },
    { value: ArbetsorderStatus.AVBRUTEN, label: "Avbruten" },
  ];

  const totalArbetsordrar = Object.values(statusStats).reduce((sum, count) => (sum || 0) + (count || 0), 0);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {kundInfo 
              ? `Arbetsordrar för ${kundInfo.namn}` 
              : "Arbetsordrar"}
          </h1>
          <p className="text-muted-foreground">
            {kundInfo 
              ? (
                <span className="flex items-center gap-2">
                  Visar arbetsordrar för kund #{kundInfo.id}
                  <Button 
                    variant="link" 
                    className="h-auto p-0" 
                    onClick={() => {
                        setKundFilter("");
                    }}
                  >
                    (Visa alla arbetsordrar)
                  </Button>
                </span>
              ) 
              : "Hantera och se alla arbetsordrar"}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <form onSubmit={handleSearch} className="flex flex-grow sm:flex-grow-0 sm:w-auto gap-2 items-center">
              <Input 
                placeholder="Sök order/kund..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 min-w-[200px] sm:max-w-xs"
              />
              <Button type="submit" variant="secondary" size="sm" className="shadow-sm h-9">
                <Search className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sök</span>
              </Button>
            </form>

            <div className="w-full sm:w-auto">
              <select 
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 py-2 px-3 h-9 text-sm"
                value={teknikerFilter}
                onChange={(e) => handleTeknikerFilterChange(e.target.value)}
              >
                <option value="">Alla tekniker</option>
                {anstallda.map((anstalld) => (
                  <option key={anstalld.id} value={anstalld.id.toString()}>
                    {anstalld.fornamn} {anstalld.efternamn}
                  </option>
                ))}
              </select>
            </div>
            
            {statusButtonDefinitions.map((statusDef) => {
                const count = statusDef.value === "ALLA" 
                                ? totalArbetsordrar 
                                : statusStats[statusDef.value as ArbetsorderStatus] || 0;
                return (
                    <Button
                        key={statusDef.value}
                        variant={statusFilter === statusDef.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusFilterChange(statusDef.value)}
                        className="shadow-sm data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:ring-offset-1 h-9"
                    >
                        {statusDef.label}
                        <span className="ml-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full px-1.5 py-0.5 text-xs font-mono">
                            {count}
                        </span>
                    </Button>
                );
            })}
          </div>

          <ArbetsorderLista 
            arbetsordrar={arbetsordrar} 
            pagination={pagination} 
            loading={loading} 
            onPageChange={handlePageChange} 
            getStatusColor={getStatusColor} // Skicka med getStatusColor
            onArbetsorderRowClick={handleArbetsorderRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}
// --- end diff ---