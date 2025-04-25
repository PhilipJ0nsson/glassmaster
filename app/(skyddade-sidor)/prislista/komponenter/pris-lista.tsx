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
import { Edit, Loader2, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PrislistaData } from "../page";
import PrisDialog from "./pris-dialog";

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
}

export default function PrisLista({
  prisposter,
  pagination,
  loading,
  onPageChange,
  onRefresh,
}: PrisListaProps) {
  const [editPrispost, setEditPrispost] = useState<PrislistaData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Är du säker på att du vill ta bort denna prispost?')) {
      try {
        setDeletingId(id);
        const response = await fetch(`/api/prislista/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Något gick fel');
        }

        toast.success('Prisposten har tagits bort');
        onRefresh(); // Uppdatera listan
      } catch (error: any) {
        console.error('Fel vid borttagning av prispost:', error);
        toast.error(error.message || 'Kunde inte ta bort prisposten');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleEdit = (prispost: PrislistaData) => {
    setEditPrispost(prispost);
    setIsEditOpen(true);
  };

  const handlePrisSaved = () => {
    onRefresh(); // Uppdatera listan
    setIsEditOpen(false);
    setEditPrispost(null);
  };

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
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Laddar prisposter...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : prisposter.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    Inga prisposter hittades.
                  </TableCell>
                </TableRow>
              ) : (
                prisposter.map((prispost) => (
                  <TableRow key={prispost.id}>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleEdit(prispost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleDelete(prispost.id)}
                          disabled={deletingId === prispost.id}
                        >
                          {deletingId === prispost.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
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
                  // Lägg till ellipsis mellan icke-intilliggande sidor
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

      {/* Redigeringsdialog */}
      {editPrispost && (
        <PrisDialog 
          isOpen={isEditOpen} 
          onOpenChange={setIsEditOpen} 
          onPrisSaved={handlePrisSaved}
          defaultValues={editPrispost}
          isEditing
        />
      )}
    </>
  );
}