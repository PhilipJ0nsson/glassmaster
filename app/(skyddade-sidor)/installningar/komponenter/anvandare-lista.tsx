'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnvandareRoll } from "@prisma/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Edit, Loader2, Plus, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AnvandareDialog from "./anvandare-dialog";

interface AnvandareData {
  id: number;
  fornamn: string;
  efternamn: string;
  epost: string;
  telefonnummer: string | null;
  roll: AnvandareRoll;
  aktiv: boolean;
  anvandarnamn: string;
  skapadDatum: string;
  uppdateradDatum: string;
}

export default function AnvandareLista() {
  const [anvandare, setAnvandare] = useState<AnvandareData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInaktiva, setShowInaktiva] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnvandare, setSelectedAnvandare] = useState<AnvandareData | null>(null);

  useEffect(() => {
    fetchAnvandare();
  }, [search, showInaktiva]);

  const fetchAnvandare = async () => {
    try {
      setLoading(true);
      let url = `/api/anvandare?includeInaktiva=${showInaktiva}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta användare');
      }
      
      const data = await response.json();
      setAnvandare(data.anvandare);
    } catch (error) {
      console.error('Fel vid hämtning av användare:', error);
      toast.error('Kunde inte hämta användare');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Sök utförs automatiskt via useEffect
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/anvandare/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Kunde inte ändra status för användaren');
      }
      
      const data = await response.json();
      toast.success(data.message);
      fetchAnvandare();
    } catch (error) {
      console.error('Fel vid ändring av användarstatus:', error);
      toast.error('Kunde inte ändra status för användaren');
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedAnvandare(null);
    
    if (refresh) {
      fetchAnvandare();
    }
  };

  const getRollText = (roll: AnvandareRoll) => {
    switch (roll) {
      case AnvandareRoll.ADMIN:
        return 'Administratör';
      case AnvandareRoll.ARBETSLEDARE:
        return 'Arbetsledare';
      case AnvandareRoll.TEKNIKER:
        return 'Tekniker';
      default:
        return roll;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', { locale: sv });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input 
            placeholder="Sök på namn, e-post..." 
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
            variant="outline" 
            onClick={() => setShowInaktiva(!showInaktiva)}
          >
            {showInaktiva ? 'Dölj inaktiva' : 'Visa inaktiva'}
          </Button>
          
          <Button 
            onClick={() => {
              setSelectedAnvandare(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ny användare
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Användarnamn</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Skapad</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Laddar användare...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : anvandare.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  Inga användare hittades.
                </TableCell>
              </TableRow>
            ) : (
              anvandare.map((anv) => (
                <TableRow key={anv.id} className={!anv.aktiv ? 'bg-gray-50' : ''}>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className={!anv.aktiv ? 'text-gray-500' : ''}>
                        {anv.fornamn} {anv.efternamn}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{anv.epost}</TableCell>
                  <TableCell>{anv.anvandarnamn}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs 
                      ${anv.roll === AnvandareRoll.ADMIN 
                        ? 'bg-purple-100 text-purple-800' 
                        : anv.roll === AnvandareRoll.ARBETSLEDARE 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'}`}>
                      {getRollText(anv.roll)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs 
                      ${anv.aktiv 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'}`}>
                      {anv.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(anv.skapadDatum)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAnvandare(anv);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant={anv.aktiv ? "outline" : "default"}
                        onClick={() => handleToggleStatus(anv.id, anv.aktiv)}
                      >
                        {anv.aktiv ? 'Inaktivera' : 'Aktivera'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AnvandareDialog 
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          setDialogOpen(open);
        }}
        anvandare={selectedAnvandare}
        onClose={handleDialogClose}
      />
    </div>
  );
}