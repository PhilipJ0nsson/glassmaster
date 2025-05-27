// /app/(skyddade-sidor)/arbetsordrar/komponenter/arbetsorder-lista.tsx
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
import { ArbetsorderStatus } from "@prisma/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArbetsorderData } from "../page";

interface ArbetsorderListaProps {
  arbetsordrar: ArbetsorderData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  loading: boolean;
  onPageChange: (page: number) => void;
  // onRefresh prop är borttagen härifrån
  getStatusColor: (status: ArbetsorderStatus) => string;
  onArbetsorderRowClick: (arbetsorder: ArbetsorderData) => void;
}

export default function ArbetsorderLista({
  arbetsordrar,
  pagination,
  loading,
  onPageChange,
  // onRefresh, // onRefresh parameter är borttagen
  getStatusColor,
  onArbetsorderRowClick,
}: ArbetsorderListaProps) {
  const router = useRouter(); 

  const getKundNamn = (arbetsorder: ArbetsorderData) => {
    const { kund } = arbetsorder;
    if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    if (kund.foretag) return kund.foretag.foretagsnamn;
    return `Kund #${kund.id}`;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', { locale: sv });
  };

  const getStatusText = (status: ArbetsorderStatus) => {
    const map = { 
        [ArbetsorderStatus.OFFERT]: 'Offert', 
        [ArbetsorderStatus.AKTIV]: 'Aktiv', 
        [ArbetsorderStatus.SLUTFORD]: 'Slutförd', 
        [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad', 
        [ArbetsorderStatus.AVBRUTEN]: 'Avbruten' 
    };
    return map[status as keyof typeof map] || status.toString();
  };

  return (
    <> 
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr</TableHead>
              <TableHead>Kund</TableHead>
              <TableHead>Märkning</TableHead>
              <TableHead>Tekniker</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Summa</TableHead>
              <TableHead>Skapad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Laddar arbetsordrar...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : arbetsordrar.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  Inga arbetsordrar hittades.
                </TableCell>
              </TableRow>
            ) : (
              arbetsordrar.map((arbetsorder) => (
                <TableRow 
                  key={arbetsorder.id}
                  onClick={() => onArbetsorderRowClick(arbetsorder)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">#{arbetsorder.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{getKundNamn(arbetsorder)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{arbetsorder.referensMärkning || '-'}</TableCell>
                  <TableCell>
                    {arbetsorder.ansvarigTekniker 
                      ? `${arbetsorder.ansvarigTekniker.fornamn} ${arbetsorder.ansvarigTekniker.efternamn}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusColor(arbetsorder.status)}`}>
                      {getStatusText(arbetsorder.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(arbetsorder.totalPrisInklMoms)}
                  </TableCell>
                  <TableCell>
                    {formatDate(arbetsorder.skapadDatum)}
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
            Visar {arbetsordrar.length} av {pagination.total} arbetsordrar
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
    </>
  );
}