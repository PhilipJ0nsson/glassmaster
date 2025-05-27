// /app/(skyddade-sidor)/arbetsordrar/ny/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import ArbetsorderFormular, { KundForFormular } from "../komponenter/arbetsorder-formular"; // Importera KundForFormular
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react"; // Importera useEffect och useState

export default function NyArbetsorderPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const kundIdFromParams = searchParams.get('kundId'); 
  const [initialKund, setInitialKund] = useState<KundForFormular | undefined>(undefined);
  const [loadingKund, setLoadingKund] = useState(false);

  useEffect(() => {
    const fetchKundData = async (id: string) => {
      setLoadingKund(true);
      try {
        const response = await fetch(`/api/kunder/${id}`);
        if (!response.ok) {
          throw new Error("Kunde inte hämta kundinformation");
        }
        const kundData = await response.json();
        setInitialKund(kundData);
      } catch (error) {
        toast.error("Kunde inte ladda förvald kund.");
        console.error(error);
        setInitialKund(undefined); // Rensa om det blir fel
      } finally {
        setLoadingKund(false);
      }
    };

    if (kundIdFromParams) {
      fetchKundData(kundIdFromParams);
    }
  }, [kundIdFromParams]);

  const handleSave = async (data: any) => {
    // ... (befintlig save-logik)
    try {
      const response = await fetch('/api/arbetsordrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // data innehåller redan kundId från formuläret
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      const arbetsorder = await response.json();
      toast.success('Arbetsorder skapad');
      router.push(`/arbetsordrar/${arbetsorder.id}`); 
    } catch (error: any) {
      toast.error('Kunde inte skapa arbetsorder: ' + error.message);
      console.error('Fel vid skapande av arbetsorder:', error);
    }
  };
  
  if (kundIdFromParams && loadingKund) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <p>Laddar kundinformation...</p>
      </div>
    );
  }

  if (kundIdFromParams && !initialKund && !loadingKund) {
     // Hantera fall där kundId finns men kund inte kunde laddas
     return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <p className="text-red-600">Kunde inte ladda information för den valda kunden (ID: {kundIdFromParams}).</p>
            <Button onClick={() => router.back()} className="mt-4">Gå tillbaka</Button>
        </div>
     )
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Skapa ny arbetsorder</h1>
          <p className="text-muted-foreground">
            {initialKund 
              ? `för ${initialKund.privatperson ? `${initialKund.privatperson.fornamn} ${initialKund.privatperson.efternamn}` : initialKund.foretag?.foretagsnamn}`
              : "Lägg till information om arbetsuppdraget"}
          </p>
        </div>
      </div>
      
      <ArbetsorderFormular 
        onSave={handleSave} 
        initialData={initialKund ? { kund: initialKund } : { kundId: ""}} // Skicka kundobjektet om det finns
        isEditing={false}
      />
    </div>
  );
}