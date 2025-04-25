'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArbetsorderStatus } from "@prisma/client";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    antal: number;
    rabattProcent: number;
    radPrisExklMoms: number;
    radPrisInklMoms: number;
    kommentar: string | null;
    prislista: {
      id: number;
      namn: string;
      prisExklMoms: number;
      momssats: number;
      prisInklMoms: number;
    };
  }>;
  bilder: Array<{
    id: number;
    filnamn: string;
    filsokvag: string;
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
  const [statusStats, setStatusStats] = useState<Record<ArbetsorderStatus, number>>({} as any);
  const [kundInfo, setKundInfo] = useState<{id: number, namn: string} | null>(null);

  useEffect(() => {
    fetchAnstallda();
  }, []);

  useEffect(() => {
    fetchArbetsordrar();
  }, [pagination.page, pagination.pageSize, search, statusFilter, teknikerFilter, kundFilter]);
  
  // Hämta kundinfo om vi har ett kundId
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
      if (!response.ok) {
        throw new Error('Kunde inte hämta anställda');
      }
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
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta kundinformation');
      }
      
      const kund = await response.json();
      
      // Skapa kundnamn baserat på typ
      let kundNamn = '';
      if (kund.kundTyp === 'PRIVAT' && kund.privatperson) {
        kundNamn = `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
      } else if (kund.kundTyp === 'FORETAG' && kund.foretag) {
        kundNamn = kund.foretag.foretagsnamn;
      } else {
        kundNamn = `Kund #${kund.id}`;
      }
      
      setKundInfo({
        id: kund.id,
        namn: kundNamn
      });
    } catch (error) {
      console.error('Fel vid hämtning av kundinformation:', error);
      toast.error('Kunde inte hämta kundinformation');
      setKundInfo(null);
    }
  };
  
  const fetchArbetsordrar = async () => {
    try {
      setLoading(true);
      let url = `/api/arbetsordrar?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (statusFilter !== "ALLA") {
        url += `&status=${statusFilter}`;
      }
      
      if (teknikerFilter) {
        url += `&tekniker=${teknikerFilter}`;
      }
      
      if (kundFilter) {
        url += `&kundId=${kundFilter}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta arbetsordrar');
      }
      
      const data = await response.json();
      setArbetsordrar(data.arbetsordrar);
      setPagination(data.pagination);
      setStatusStats(data.statusStats || {});
    } catch (error) {
      console.error('Fel vid hämtning av arbetsordrar:', error);
      toast.error('Kunde inte hämta arbetsordrar');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Sök utförs automatiskt via useEffect
  };

  const handleStatusFilterChange = (newStatus: ArbetsorderStatus | "ALLA") => {
    setStatusFilter(newStatus);
    setPagination(prev => ({ ...prev, page: 1 })); // Återställ till sida 1 vid filterändring
  };

  const handleTeknikerFilterChange = (tekniker: string) => {
    setTeknikerFilter(tekniker);
    setPagination(prev => ({ ...prev, page: 1 })); // Återställ till sida 1 vid filterändring
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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
                    onClick={() => setKundFilter("")}
                  >
                    Visa alla arbetsordrar
                  </Button>
                </span>
              ) 
              : "Hantera arbetsordrar"}
          </p>
        </div>
        <Link href={kundFilter ? `/arbetsordrar/ny?kundId=${kundFilter}` : "/arbetsordrar/ny"}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ny arbetsorder
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => handleStatusFilterChange("ALLA")}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === "ALLA" ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{Object.values(statusStats).reduce((a, b) => a + b, 0) || 0}</span>
          <span className="text-sm text-gray-600">Alla</span>
        </button>
        
        <button
          onClick={() => handleStatusFilterChange(ArbetsorderStatus.OFFERT)}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === ArbetsorderStatus.OFFERT ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{statusStats[ArbetsorderStatus.OFFERT] || 0}</span>
          <span className="text-sm text-gray-600">Offert</span>
        </button>
        
        <button
          onClick={() => handleStatusFilterChange(ArbetsorderStatus.BEKRAFTAD)}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === ArbetsorderStatus.BEKRAFTAD ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{statusStats[ArbetsorderStatus.BEKRAFTAD] || 0}</span>
          <span className="text-sm text-gray-600">Bekräftad</span>
        </button>
        
        <button
          onClick={() => handleStatusFilterChange(ArbetsorderStatus.PAGAENDE)}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === ArbetsorderStatus.PAGAENDE ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{statusStats[ArbetsorderStatus.PAGAENDE] || 0}</span>
          <span className="text-sm text-gray-600">Pågående</span>
        </button>
        
        <button
          onClick={() => handleStatusFilterChange(ArbetsorderStatus.SLUTFORD)}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === ArbetsorderStatus.SLUTFORD ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{statusStats[ArbetsorderStatus.SLUTFORD] || 0}</span>
          <span className="text-sm text-gray-600">Slutförd</span>
        </button>
        
        <button
          onClick={() => handleStatusFilterChange(ArbetsorderStatus.FAKTURERAD)}
          className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
            statusFilter === ArbetsorderStatus.FAKTURERAD ? "border-primary bg-primary/10" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="text-xl font-semibold">{statusStats[ArbetsorderStatus.FAKTURERAD] || 0}</span>
          <span className="text-sm text-gray-600">Fakturerad</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input 
            placeholder="Sök på namn, kundnummer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[400px]"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Sök
          </Button>
        </form>
        
        <div className="flex gap-2">
          <select 
            className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 pr-8"
            value={teknikerFilter}
            onChange={(e) => handleTeknikerFilterChange(e.target.value)}
          >
            <option value="">Alla tekniker</option>
            {anstallda.map((anstalld) => (
              <option key={anstalld.id} value={anstalld.id}>
                {anstalld.fornamn} {anstalld.efternamn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ArbetsorderLista 
        arbetsordrar={arbetsordrar} 
        pagination={pagination} 
        loading={loading} 
        onPageChange={handlePageChange} 
        onRefresh={fetchArbetsordrar}
        getStatusColor={getStatusColor}
      />
    </div>
  );
}