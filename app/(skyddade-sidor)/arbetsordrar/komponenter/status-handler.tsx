// File: app/(skyddade-sidor)/arbetsordrar/komponenter/status-handler.tsx
// Mode: Re-providing the correct code with MATNING status.
// Change: Ensuring the component is correctly defined with a default export and includes all relevant statuses.
// Reasoning: To fix the "no default export" error and ensure the component is up-to-date.
// --- start diff ---
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

// Flytta ut statusOptions och getStatusLabel utanför komponenten om de inte beror på props/state
const statusOptions = [
  { value: ArbetsorderStatus.MATNING, label: 'Mätning' },
  { value: ArbetsorderStatus.OFFERT, label: 'Offert' },
  { value: ArbetsorderStatus.AKTIV, label: 'Aktiv' },         
  { value: ArbetsorderStatus.SLUTFORD, label: 'Slutförd' },   
  { value: ArbetsorderStatus.FAKTURERAD, label: 'Fakturerad' },
  { value: ArbetsorderStatus.AVBRUTEN, label: 'Avbruten' },
];

const getStatusLabel = (statusValue: ArbetsorderStatus) => {
  return statusOptions.find(option => option.value === statusValue)?.label || statusValue.toString();
};

// Flytta ut getStatusColor utanför komponenten
const getStatusColorClass = (statusValue: ArbetsorderStatus) => {
  switch (statusValue) {
    case ArbetsorderStatus.MATNING:
      return "text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-300 dark:bg-orange-800/30 dark:hover:bg-orange-700/40";
    case ArbetsorderStatus.OFFERT:
      return "text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-800/30 dark:hover:bg-yellow-700/40";
    case ArbetsorderStatus.AKTIV: 
      return "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-800/30 dark:hover:bg-blue-700/40";
    case ArbetsorderStatus.SLUTFORD: 
      return "text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-800/30 dark:hover:bg-green-700/40";
    case ArbetsorderStatus.FAKTURERAD:
      return "text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700/30 dark:hover:bg-gray-600/40";
    case ArbetsorderStatus.AVBRUTEN:
      return "text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-800/30 dark:hover:bg-red-700/40";
    default:
      return "text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700/30 dark:hover:bg-gray-600/40";
  }
};

export default function StatusHandler({ // Viktigt: export default här
  arbetsorderId,
  currentStatus,
  onStatusUpdated,
}: StatusHandlerProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: ArbetsorderStatus) => {
    if (newStatus === currentStatus) return;

    setLoading(true); // Sätt loading direkt
    try {
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel vid statusändring');
      }
      
      onStatusUpdated(newStatus);
      toast.success(`Status ändrad till ${getStatusLabel(newStatus)}`);
    } catch (error: any) {
      toast.error(`Kunde inte ändra status: ${error.message}`);
      console.error('Fel vid ändring av status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading} size="sm"> 
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
        {statusOptions.map((statusOption) => ( 
          <DropdownMenuItem
            key={statusOption.value}
            className={`flex items-center justify-between ${
              statusOption.value === currentStatus ? getStatusColorClass(statusOption.value) : ''
            }`}
            onClick={() => handleStatusChange(statusOption.value)}
            disabled={loading || statusOption.value === currentStatus} 
          >
            {statusOption.label}
            {statusOption.value === currentStatus && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
// --- end diff ---