'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KundTyp } from "@prisma/client";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KundLista } from "./komponenter/kund-lista";
import { KundDialog } from "./komponenter/kund-dialog";

export interface KundData {
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
  skapadDatum: string;
  uppdateradDatum: string;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function KunderPage() {
  const [kunder, setKunder] = useState<KundData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<KundTyp | "ALLA">("ALLA");
  const [isOpen, setIsOpen] = useState(false);

  const fetchKunder = async () => {
    try {
      setLoading(true);
      let url = `/api/kunder?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (filter !== "ALLA") {
        url += `&typ=${filter}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta kunder');
      }
      
      const data = await response.json();
      setKunder(data.kunder);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Fel vid hämtning av kunder:', error);
      toast.error('Kunde inte hämta kunder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKunder();
  }, [pagination.page, pagination.pageSize, search, filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Sök utförs automatiskt via useEffect
  };

  const handleFilterChange = (newFilter: KundTyp | "ALLA") => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 })); // Återställ till sida 1 vid filterändring
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleKundSaved = () => {
    fetchKunder(); // Uppdatera listan efter att en kund har sparats
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Kunder</h1>
          <p className="text-muted-foreground">
            Hantera alla kunder i systemet
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Lägg till kund
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input 
            placeholder="Sök på namn, telefon, e-post..." 
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
          <Button 
            variant={filter === "ALLA" ? "default" : "outline"}
            onClick={() => handleFilterChange("ALLA")}
          >
            Alla
          </Button>
          <Button 
            variant={filter === KundTyp.PRIVAT ? "default" : "outline"}
            onClick={() => handleFilterChange(KundTyp.PRIVAT)}
          >
            Privatpersoner
          </Button>
          <Button 
            variant={filter === KundTyp.FORETAG ? "default" : "outline"}
            onClick={() => handleFilterChange(KundTyp.FORETAG)}
          >
            Företag
          </Button>
        </div>
      </div>

      <KundLista 
        kunder={kunder} 
        pagination={pagination} 
        loading={loading} 
        onPageChange={handlePageChange} 
        onRefresh={fetchKunder}
      />

      <KundDialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
        onKundSaved={handleKundSaved} 
      />
    </div>
  );
}