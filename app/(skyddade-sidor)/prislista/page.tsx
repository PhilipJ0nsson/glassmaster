'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PrisDialog from "./komponenter/pris-dialog";
import PrisLista from "./komponenter/pris-lista";

export type PrissattningTyp = 'ST' | 'M' | 'M2' | 'TIM';

export interface PrislistaData {
  id: number;
  namn: string;
  prisExklMoms: number;
  momssats: number;
  prisInklMoms: number;
  kategori: string | null;
  artikelnummer: string | null;
  prissattningTyp: PrissattningTyp;
  skapadDatum: string;
  uppdateradDatum: string;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function PrislistaPage() {
  const [prisposter, setPrisposter] = useState<PrislistaData[]>([]);
  const [kategorier, setKategorier] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const fetchPrisposter = async () => {
    try {
      setLoading(true);
      let url = `/api/prislista?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (filter) {
        url += `&kategori=${encodeURIComponent(filter)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta prisposter');
      }
      
      const data = await response.json();
      setPrisposter(data.prisposter);
      setPagination(data.pagination);
      setKategorier(data.kategorier || []);
    } catch (error) {
      console.error('Fel vid hämtning av prisposter:', error);
      toast.error('Kunde inte hämta prisposter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrisposter();
  }, [pagination.page, pagination.pageSize, search, filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Sök utförs automatiskt via useEffect
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 })); // Återställ till sida 1 vid filterändring
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePrisSaved = () => {
    fetchPrisposter(); // Uppdatera listan efter att en prispost har sparats
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Prislista</h1>
          <p className="text-muted-foreground">
            Hantera priser för varor och tjänster
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Lägg till prispost
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input 
            placeholder="Sök på namn, artikelnummer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[400px]"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Sök
          </Button>
        </form>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={filter === "" ? "default" : "outline"}
            onClick={() => handleFilterChange("")}
          >
            Alla
          </Button>
          {kategorier.map((kategori) => (
            <Button 
              key={kategori}
              variant={filter === kategori ? "default" : "outline"}
              onClick={() => handleFilterChange(kategori)}
            >
              {kategori}
            </Button>
          ))}
        </div>
      </div>

      <PrisLista 
        prisposter={prisposter} 
        pagination={pagination} 
        loading={loading} 
        onPageChange={handlePageChange} 
        onRefresh={fetchPrisposter}
      />

      <PrisDialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
        onPrisSaved={handlePrisSaved} 
      />
    </div>
  );
}