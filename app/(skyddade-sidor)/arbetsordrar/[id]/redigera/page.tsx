'use client';

import { Button } from "@/components/ui/button";
import ArbetsorderFormular from "../../komponenter/arbetsorder-formular";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function RedigeraArbetsorderPage() {
  const params = useParams();
  const router = useRouter();
  const [arbetsorder, setArbetsorder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArbetsorder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/arbetsordrar/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Arbetsordern hittades inte");
            router.push("/arbetsordrar");
            return;
          }
          throw new Error('Kunde inte hämta arbetsorder');
        }
        
        const data = await response.json();
        setArbetsorder(data);
      } catch (error) {
        console.error('Fel vid hämtning av arbetsorder:', error);
        toast.error('Kunde inte hämta arbetsorder');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArbetsorder();
    }
  }, [params.id, router]);

  const handleSave = async (data: any) => {
    try {
      const response = await fetch(`/api/arbetsordrar/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      toast.success('Arbetsorder uppdaterad');
      router.push(`/arbetsordrar/${params.id}`);
    } catch (error: any) {
      toast.error('Kunde inte uppdatera arbetsorder: ' + error.message);
      console.error('Fel vid uppdatering av arbetsorder:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <p>Laddar arbetsorder...</p>
      </div>
    );
  }

  if (!arbetsorder) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Arbetsordern hittades inte</p>
        <Link href="/arbetsordrar">
          <Button className="mt-4">Tillbaka till arbetsordrarna</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/arbetsordrar/${params.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Redigera arbetsorder #{arbetsorder.id}
          </h1>
          <p className="text-muted-foreground">
            Uppdatera information om arbetsuppdraget
          </p>
        </div>
      </div>
      
      <ArbetsorderFormular 
        onSave={handleSave} 
        initialData={arbetsorder}
        isEditing={true}
      />
    </div>
  );
}