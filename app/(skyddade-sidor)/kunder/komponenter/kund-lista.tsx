// /app/(skyddade-sidor)/kunder/komponenter/kund-lista.tsx
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
import { Loader2, Phone, PlusCircle, Home } from "lucide-react"; 
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
  // onRefresh: () => void; // DENNA RAD TAS BORT FRÅN PROPS
  onKundRowClick: (kund: KundData) => void; 
}

export function KundLista({
  kunder,
  pagination,
  loading,
  onPageChange,
  // onRefresh, // DENNA PARAMETER TAS BORT
  onKundRowClick,
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
              <TableHead>Adress</TableHead>
              <TableHead className="text-right w-[160px]">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Laddar kunder...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : kunder.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  Inga kunder hittades.
                </TableCell>
              </TableRow>
            ) : (
              kunder.map((kund) => (
                <TableRow 
                  key={kund.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onKundRowClick(kund)}
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
                  <TableCell>
                    <div className="flex items-center">
                        <Home className="h-3.5 w-3.5 mr-1.5 text-gray-500 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{kund.adress}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        router.push(`/arbetsordrar/ny?kundId=${kund.id}`);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      + Arbetsorder
                    </Button>
                  </TableCell>
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