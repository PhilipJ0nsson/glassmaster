'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Loader2, Plus, Trash, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Bild {
  id: number;
  filnamn: string;
  filsokvag: string;
}

interface BildHandlerProps {
  arbetsorderId: number;
  initialBilder: Bild[];
}

export default function BildHandler({
  arbetsorderId,
  initialBilder = [],
}: BildHandlerProps) {
  const [bilder, setBilder] = useState<Bild[]>(initialBilder);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Kontrollera filtyp
    if (!file.type.startsWith('image/')) {
      toast.error('Endast bildfiler tillåts');
      return;
    }
    
    // Kontrollera filstorlek (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Filen är för stor (max 5MB)');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}/bilder`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      const nyBild = await response.json();
      setBilder((prev) => [...prev, nyBild]);
      toast.success('Bilden har laddats upp');
      
      // Rensa inputfältet
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      toast.error('Kunde inte ladda upp bilden: ' + error.message);
      console.error('Fel vid uppladdning av bild:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBild = async (bildId: number) => {
    if (!confirm('Är du säker på att du vill ta bort denna bild?')) {
      return;
    }

    try {
      setDeletingId(bildId);
      
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}/bilder/${bildId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Något gick fel');
      }
      
      setBilder((prev) => prev.filter((bild) => bild.id !== bildId));
      toast.success('Bilden har tagits bort');
    } catch (error: any) {
      toast.error('Kunde inte ta bort bilden: ' + error.message);
      console.error('Fel vid borttagning av bild:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bilder</CardTitle>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Laddar upp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp bild
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bilder.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Inga bilder har laddats upp.</p>
            <p className="text-sm">Klicka på "Ladda upp bild" för att lägga till bilder.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {bilder.map((bild) => (
              <div key={bild.id} className="relative border rounded-md overflow-hidden group">
                <div className="relative aspect-square">
                  <Image
                    src={bild.filsokvag}
                    alt={bild.filnamn}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-2 text-sm truncate">
                  {bild.filnamn}
                </div>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBild(bild.id)}
                    disabled={deletingId === bild.id}
                  >
                    {deletingId === bild.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                    <span className="ml-2">Ta bort</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}