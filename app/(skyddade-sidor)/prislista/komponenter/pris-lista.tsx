// File: /Users/nav/Projects/glassmaestro/glassmaster/app/(skyddade-sidor)/prislista/komponenter/pris-lista.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react"; // Ta bort Edit och Trash
import { PrislistaData } from "../page";
// Ta bort PrisDialog import, den hanteras i PrislistaPage nu

interface PrisListaProps {
  prisposter: PrislistaData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  loading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onEdit: (prispost: PrislistaData) => void; // Ny prop för att signalera redigering
}

export default function PrisLista({
  prisposter,
  pagination,
  loading,
  onPageChange,
  onRefresh,
  onEdit, // Ny prop
}: PrisListaProps) {
  // Ta bort editPrispost, isEditOpen, deletingId och handleDelete. De hanteras i PrisDialog / PrislistaPage

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Ta bort handlePrisSaved, det hanteras i PrislistaPage nu

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Artikelnummer</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Prissättning</TableHead>
                <TableHead className="text-right">Pris (exkl. moms)</TableHead>
                <TableHead className="text-right">Momssats</TableHead>
                <TableHead className="text-right">Pris (inkl. moms)</TableHead>
                {/* <TableHead className="text-right">Åtgärder</TableHead> Ta bort Åtgärder-kolumnen */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10"> {/* Uppdatera colSpan */}
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Laddar prisposter...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : prisposter.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10"> {/* Uppdatera colSpan */}
                    Inga prisposter hittades.
                  </TableCell>
                </TableRow>
              ) : (
                prisposter.map((prispost) => (
                  <TableRow 
                    key={prispost.id} 
                    className="hover:bg-gray-50 cursor-pointer" // Gör raden klickbar
                    onClick={() => onEdit(prispost)} // Anropa onEdit när raden klickas
                  >
                    <TableCell className="font-medium">
                      {prispost.namn}
                    </TableCell>
                    <TableCell>
                      {prispost.artikelnummer || '-'}
                    </TableCell>
                    <TableCell>
                      {prispost.kategori || '-'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        switch(prispost.prissattningTyp) {
                          case 'ST':
                            return 'Styckpris';
                          case 'M':
                            return 'Meterpris';
                          case 'M2':
                            return 'Kvadratmeterpris';
                          case 'TIM':
                            return 'Timpris';
                          default:
                            return prispost.prissattningTyp || 'Styckpris';
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prispost.prisExklMoms)}
                    </TableCell>
                    <TableCell className="text-right">
                      {prispost.momssats}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prispost.prisInklMoms)}
                    </TableCell>
                    {/* 
                    <TableCell className="text-right">
                      Ta bort åtgärdsknapparna härifrån
                    </TableCell>
                    */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginering */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Visar {prisposter.length} av {pagination.total} prisposter
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
      </Card>

      {/* Ta bort PrisDialog härifrån, den hanteras i PrislistaPage nu */}
    </>
  );
}