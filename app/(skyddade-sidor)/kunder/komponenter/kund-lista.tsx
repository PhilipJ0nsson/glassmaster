// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/kunder/komponenter/kund-lista.tsx
'use client';

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KundTyp } from "@prisma/client";
import { Loader2, Phone } from "lucide-react"; // Ta bort Edit
// Link är inte längre nödvändig här
import { useRouter } from "next/navigation"; 
import { KundData } from "../page";

interface KundListaProps {
  kunder: KundData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  loading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  // onEdit: (kund: KundData) => void; // Ta bort onEdit prop
}

export function KundLista({
  kunder,
  pagination,
  loading,
  onPageChange,
  onRefresh,
  // onEdit, // Ta bort onEdit prop
}: KundListaProps) {
  const router = useRouter(); 

  const getKundNamn = (kund: KundData) => {
    if (kund.kundTyp === KundTyp.PRIVAT && kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.kundTyp === KundTyp.FORETAG && kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    return 'Okänd';
  };

  const getKontaktperson = (kund: KundData) => {
    if (kund.kundTyp === KundTyp.FORETAG && kund.foretag) {
      if (kund.foretag.kontaktpersonFornamn && kund.foretag.kontaktpersonEfternamn) {
        return `${kund.foretag.kontaktpersonFornamn} ${kund.foretag.kontaktpersonEfternamn}`;
      } else if (kund.foretag.kontaktpersonFornamn) {
        return kund.foretag.kontaktpersonFornamn;
      } else if (kund.foretag.kontaktpersonEfternamn) {
        return kund.foretag.kontaktpersonEfternamn;
      }
    }
    return '-';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE');
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Kontaktperson</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Skapad</TableHead>
              {/* <TableHead className="text-right">Åtgärder</TableHead> Ta bort Åtgärder-kolumnen */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10"> {/* Uppdatera colSpan */}
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Laddar kunder...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : kunder.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10"> {/* Uppdatera colSpan */}
                  Inga kunder hittades.
                </TableCell>
              </TableRow>
            ) : (
              kunder.map((kund) => (
                <TableRow 
                  key={kund.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/kunder/${kund.id}`)} 
                >
                  <TableCell className="font-medium">
                    {getKundNamn(kund)}
                  </TableCell>
                  <TableCell>
                    {kund.kundTyp === KundTyp.PRIVAT ? 'Privat' : 'Företag'}
                  </TableCell>
                  <TableCell>{getKontaktperson(kund)}</TableCell>
                  <TableCell>
                    <a 
                      href={`tel:${kund.telefonnummer}`} 
                      className="flex items-center text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      {kund.telefonnummer}
                    </a>
                  </TableCell>
                  <TableCell>
                    {kund.epost ? (
                      <a 
                        href={`mailto:${kund.epost}`} 
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()} 
                      >
                        {kund.epost}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(kund.skapadDatum)}</TableCell>
                  {/* 
                  <TableCell className="text-right">
                    Ta bort innehållet här
                  </TableCell>
                  */}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Visar {kunder.length} av {pagination.total} kunder
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              Föregående
            </Button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 1
              )
              .map((page, index, array) => {
                const showEllipsisAfter =
                  index < array.length - 1 && array[index + 1] - page > 1;

                return (
                  <div key={page} className="flex items-center">
                    <Button
                      variant={page === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(page)}
                      disabled={loading}
                    >
                      {page}
                    </Button>
                    {showEllipsisAfter && (
                      <span className="px-2">...</span>
                    )}
                  </div>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              Nästa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}