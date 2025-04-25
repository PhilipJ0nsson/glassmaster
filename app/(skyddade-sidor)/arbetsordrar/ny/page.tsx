'use client';

import { Button } from "@/components/ui/button";
import ArbetsorderFormular from "../komponenter/arbetsorder-formular";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NyArbetsorderPage() {
  const router = useRouter();
  
  const handleSave = async (data: any) => {
    try {
      const response = await fetch('/api/arbetsordrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/arbetsordrar">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Skapa ny arbetsorder</h1>
          <p className="text-muted-foreground">
            Lägg till information om arbetsuppdraget
          </p>
        </div>
      </div>
      
      <ArbetsorderFormular onSave={handleSave} />
    </div>
  );
}