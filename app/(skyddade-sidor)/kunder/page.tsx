// /app/(skyddade-sidor)/kunder/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KundTyp } from "@prisma/client";
import { PlusCircle, Search, Users, Building, UserCheck } from "lucide-react"; 
import { useRouter } from "next/navigation"; 
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
  const [selectedKundForDialog, setSelectedKundForDialog] = useState<KundData | null>(null);
  const [isEditingDialog, setIsEditingDialog] = useState(false);

  const router = useRouter(); 

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
    setPagination(prev => ({ ...prev, page: 1 }));
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
      fetchKunder();
    }
  };

  const handleKundRowNavigation = (kund: KundData) => {
    router.push(`/kunder/${kund.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Kundregister</h1>
          <p className="text-muted-foreground">
            Hantera och se alla kunder i systemet.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <form onSubmit={handleSearch} className="flex w-full md:w-auto flex-1 gap-2">
              <Input 
                placeholder="Sök på namn, telefon, e-post, adress..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm flex-grow"
              />
              <Button type="submit" variant="secondary" className="shadow-sm">
                <Search className="h-4 w-4 mr-2" />
                Sök
              </Button>
            </form>
            
            <div className="flex gap-2 flex-wrap items-center justify-start md:justify-end w-full md:w-auto">
              <Button 
                variant={filter === "ALLA" ? "default" : "outline"}
                onClick={() => handleFilterChange("ALLA")}
                size="sm"
                className="shadow-sm data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:ring-offset-1"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Alla
              </Button>
              <Button 
                variant={filter === KundTyp.PRIVAT ? "default" : "outline"}
                onClick={() => handleFilterChange(KundTyp.PRIVAT)}
                size="sm"
                className="shadow-sm data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:ring-offset-1"
              >
                <UserCheck className="h-4 w-4 mr-1.5" />
                Privat
              </Button>
              <Button 
                variant={filter === KundTyp.FORETAG ? "default" : "outline"}
                onClick={() => handleFilterChange(KundTyp.FORETAG)}
                size="sm"
                className="shadow-sm data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:ring-offset-1"
              >
                <Building className="h-4 w-4 mr-1.5" />
                Företag
              </Button>
              <Button onClick={handleOpenNewKundDialog} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
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
            // onRefresh={fetchKunder} // DENNA RAD TAS BORT
            onKundRowClick={handleKundRowNavigation}
          />
        </CardContent>
      </Card>

      <KundDialog 
        isOpen={dialogOpen} 
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setDialogOpen(open);
        }} 
        onKundSaved={(kundId?: number) => {
          fetchKunder();
          handleDialogClose(false); 
        }}
        defaultValues={selectedKundForDialog} 
        isEditing={isEditingDialog}    
      />
    </div>
  );
}