'use client';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArbetsorderStatus } from "@prisma/client";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface StatusHandlerProps {
  arbetsorderId: number;
  currentStatus: ArbetsorderStatus;
  onStatusUpdated: (newStatus: ArbetsorderStatus) => void;
}

export default function StatusHandler({
  arbetsorderId,
  currentStatus,
  onStatusUpdated,
}: StatusHandlerProps) {
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: ArbetsorderStatus.OFFERT, label: 'Offert' },
    { value: ArbetsorderStatus.BEKRAFTAD, label: 'Bekräftad' },
    { value: ArbetsorderStatus.PAGAENDE, label: 'Pågående' },
    { value: ArbetsorderStatus.SLUTFORD, label: 'Slutförd' },
    { value: ArbetsorderStatus.FAKTURERAD, label: 'Fakturerad' },
    { value: ArbetsorderStatus.AVBRUTEN, label: 'Avbruten' },
  ];

  const handleStatusChange = async (newStatus: ArbetsorderStatus) => {
    if (newStatus === currentStatus) return;

    try {
      setLoading(true);
      
      // Först hämta aktuell arbetsorder för att få med alla orderrader
      const getResponse = await fetch(`/api/arbetsordrar/${arbetsorderId}`);
      
      if (!getResponse.ok) {
        const errorData = await getResponse.json();
        throw new Error(errorData.error || 'Kunde inte hämta arbetsorder');
      }
      
      const currentData = await getResponse.json();
      
      // Uppdatera status men behåll alla andra data oförändrade
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          orderrader: currentData.orderrader, // Inkludera alla befintliga orderrader
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      onStatusUpdated(newStatus);
      toast.success(`Status ändrad till ${getStatusLabel(newStatus)}`);
    } catch (error: any) {
      toast.error('Kunde inte ändra status: ' + error.message);
      console.error('Fel vid ändring av status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: ArbetsorderStatus) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const getStatusColor = (status: ArbetsorderStatus) => {
    switch (status) {
      case ArbetsorderStatus.OFFERT:
        return "text-yellow-700 bg-yellow-100 hover:bg-yellow-200";
      case ArbetsorderStatus.BEKRAFTAD:
        return "text-blue-700 bg-blue-100 hover:bg-blue-200";
      case ArbetsorderStatus.PAGAENDE:
        return "text-purple-700 bg-purple-100 hover:bg-purple-200";
      case ArbetsorderStatus.SLUTFORD:
        return "text-green-700 bg-green-100 hover:bg-green-200";
      case ArbetsorderStatus.FAKTURERAD:
        return "text-gray-700 bg-gray-100 hover:bg-gray-200";
      case ArbetsorderStatus.AVBRUTEN:
        return "text-red-700 bg-red-100 hover:bg-red-200";
      default:
        return "text-gray-700 bg-gray-100 hover:bg-gray-200";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <>
              Ändra status
              <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status.value}
            className={`flex items-center justify-between ${
              status.value === currentStatus ? getStatusColor(status.value) : ''
            }`}
            onClick={() => handleStatusChange(status.value)}
            disabled={loading}
          >
            {status.label}
            {status.value === currentStatus && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}