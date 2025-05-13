// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/kunder/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KundTyp } from "@prisma/client";
import { PlusCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KundLista } from "./komponenter/kund-lista";
import { KundDialog } from "./komponenter/kund-dialog";
import { Card, CardContent } from "@/components/ui/card"; 

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
  const [dialogOpen, setDialogOpen] = useState(false); 
  const [selectedKundForDialog, setSelectedKundForDialog] = useState<KundData | null>(null); // Omdöpt för tydlighet
  const [isEditingDialog, setIsEditingDialog] = useState(false); // Omdöpt för tydlighet

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
  };

  const handleFilterChange = (newFilter: KundTyp | "ALLA") => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleOpenNewKundDialog = () => {
    setSelectedKundForDialog(null); 
    setIsEditingDialog(false);
    setDialogOpen(true);
  };
  
  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedKundForDialog(null);
    setIsEditingDialog(false);
    if (refresh) {
      fetchKunder(); // Anropas från KundDialog när den sparat
    }
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
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
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
            
            <div className="flex gap-2 flex-wrap items-center">
              <Button 
                variant={filter === "ALLA" ? "default" : "outline"}
                onClick={() => handleFilterChange("ALLA")}
                size="sm"
              >
                Alla
              </Button>
              <Button 
                variant={filter === KundTyp.PRIVAT ? "default" : "outline"}
                onClick={() => handleFilterChange(KundTyp.PRIVAT)}
                size="sm"
              >
                Privat
              </Button>
              <Button 
                variant={filter === KundTyp.FORETAG ? "default" : "outline"}
                onClick={() => handleFilterChange(KundTyp.FORETAG)}
                size="sm"
              >
                Företag
              </Button>
              <Button onClick={handleOpenNewKundDialog} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Ny kund
              </Button>
            </div>
          </div>

          <KundLista 
            kunder={kunder} 
            pagination={pagination} 
            loading={loading} 
            onPageChange={handlePageChange} 
            onRefresh={fetchKunder}
            // onEdit tas bort härifrån
          />
        </CardContent>
      </Card>

      {/* Denna dialog används nu bara för att SKAPA nya kunder från denna sida */}
      {/* Redigering sker från KundDetalj-sidan */}
      <KundDialog 
        isOpen={dialogOpen && !isEditingDialog} // Öppna bara om inte isEditingDialog (vilket sätts från KundDetalj)
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setDialogOpen(open);
        }} 
        onKundSaved={() => handleDialogClose(true)}
        defaultValues={null} // Alltid null för ny kund från denna sida
        isEditing={false}    // Alltid false för ny kund från denna sida
      />
    </div>
  );
}