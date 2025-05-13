// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/prislista/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react"; 
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PrisDialog from "./komponenter/pris-dialog";
import PrisLista from "./komponenter/pris-lista";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Importera Card komponenter

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPrispost, setSelectedPrispost] = useState<PrislistaData | null>(null);


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
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 })); 
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedPrispost(null);
    if (refresh) {
      fetchPrisposter();
    }
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
      </div>

      <Card> {/* Omslutande Card börjar här */}
        <CardContent className="space-y-4 pt-6"> {/* Lägg till pt-6 för padding inuti CardContent */}
          {/* Gruppera sök, filter och "Lägg till" knapp */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
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
            
            <div className="flex gap-2 flex-wrap items-center"> 
              <Button 
                variant={filter === "" ? "default" : "outline"}
                onClick={() => handleFilterChange("")}
                size="sm" 
              >
                Alla
              </Button>
              {kategorier.map((kategori) => (
                <Button 
                  key={kategori}
                  variant={filter === kategori ? "default" : "outline"}
                  onClick={() => handleFilterChange(kategori)}
                  size="sm" 
                >
                  {kategori}
                </Button>
              ))}
              <Button 
                onClick={() => {
                  setSelectedPrispost(null);
                  setDialogOpen(true);
                }}
                size="sm" 
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ny prispost
              </Button>
            </div>
          </div>

          <PrisLista 
            prisposter={prisposter} 
            pagination={pagination} 
            loading={loading} 
            onPageChange={handlePageChange} 
            onRefresh={fetchPrisposter}
            onEdit={(prispost) => { 
              setSelectedPrispost(prispost);
              setDialogOpen(true);
            }}
          />
        </CardContent>
      </Card> {/* Omslutande Card slutar här */}


      <PrisDialog 
        isOpen={dialogOpen} 
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setDialogOpen(open);
        }} 
        onPrisSaved={() => handleDialogClose(true)}
        defaultValues={selectedPrispost || undefined}
        isEditing={!!selectedPrispost} 
      />
    </div>
  );
}