'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PrislistaData } from "../page";

const prisSchema = z.object({
  namn: z.string().min(1, "Namn måste anges"),
  prisExklMoms: z
    .string()
    .min(1, "Pris måste anges")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Pris måste vara ett positivt nummer",
    }),
  momssats: z
    .string()
    .min(1, "Momssats måste anges")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Momssats måste vara ett positivt nummer",
    }),
  prissattningTyp: z.enum(['ST', 'M', 'M2', 'TIM']).default('ST'),
  kategori: z.string().optional(),
  artikelnummer: z.string().optional(),
});

type PrisFormValues = z.infer<typeof prisSchema>;

interface PrisDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPrisSaved: () => void;
  defaultValues?: PrislistaData;
  isEditing?: boolean;
}

export default function PrisDialog({
  isOpen,
  onOpenChange,
  onPrisSaved,
  defaultValues,
  isEditing = false,
}: PrisDialogProps) {
  const [loading, setLoading] = useState(false);
  const [prisInklMoms, setPrisInklMoms] = useState<string>("");

  // Standardvärden för formuläret
  const initialValues: PrisFormValues = {
    namn: "",
    prisExklMoms: "",
    momssats: "25", // Standard momssats
    prissattningTyp: "ST", // Standard är styckpris
    kategori: "",
    artikelnummer: "",
  };

  const form = useForm<PrisFormValues>({
    resolver: zodResolver(prisSchema),
    defaultValues: initialValues,
  });

  // Uppdatera formulärdata om defaultValues ändras
  useEffect(() => {
    if (defaultValues && isOpen) {
      form.reset({
        namn: defaultValues.namn,
        prisExklMoms: defaultValues.prisExklMoms.toString(),
        momssats: defaultValues.momssats.toString(),
        prissattningTyp: defaultValues.prissattningTyp || "ST",
        kategori: defaultValues.kategori || "",
        artikelnummer: defaultValues.artikelnummer || "",
      });
    } else if (!isEditing && isOpen) {
      form.reset(initialValues);
    }
  }, [defaultValues, isOpen, form, isEditing]);

  // Beräkna pris inkl. moms när formulärvärden ändras
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        (name === "prisExklMoms" || name === "momssats" || name === undefined) &&
        value.prisExklMoms &&
        value.momssats
      ) {
        const prisExkl = parseFloat(value.prisExklMoms as string);
        const momssats = parseFloat(value.momssats as string);

        if (!isNaN(prisExkl) && !isNaN(momssats)) {
          const prisInkl = prisExkl * (1 + momssats / 100);
          setPrisInklMoms(prisInkl.toFixed(2));
        } else {
          setPrisInklMoms("");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: PrisFormValues) => {
    try {
      setLoading(true);
      
      const payload = {
        ...data,
        prisExklMoms: data.prisExklMoms,
        momssats: data.momssats,
      };

      const url = isEditing && defaultValues 
        ? `/api/prislista/${defaultValues.id}` 
        : '/api/prislista';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Något gick fel");
      }

      toast.success(
        isEditing 
          ? "Prisposten har uppdaterats" 
          : "Ny prispost har sparats"
      );
      
      if (!isEditing) {
        form.reset(initialValues);
      }
      
      onPrisSaved();
    } catch (error: any) {
      console.error("Fel vid sparande av prispost:", error);
      toast.error(error.message || "Kunde inte spara prisposten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Redigera prispost" : "Lägg till ny prispost"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Namn */}
            <FormField
              control={form.control}
              name="namn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn på vara/tjänst *</FormLabel>
                  <FormControl>
                    <Input placeholder="T.ex. Glasruta 60x80" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pris exkl. moms */}
            <FormField
              control={form.control}
              name="prisExklMoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pris (exkl. moms) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Momssats */}
            <FormField
              control={form.control}
              name="momssats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Momssats (%) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prissättningstyp */}
            <FormField
              control={form.control}
              name="prissattningTyp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prissättningstyp *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj prissättningstyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ST">
                        <div className="flex flex-col">
                          <span>Styckpris</span>
                          <span className="text-xs text-gray-500">
                            Fast pris per styck
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="M">
                        <div className="flex flex-col">
                          <span>Meterpris</span>
                          <span className="text-xs text-gray-500">
                            Pris per löpmeter (mäts i mm)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="M2">
                        <div className="flex flex-col">
                          <span>Kvadratmeterpris</span>
                          <span className="text-xs text-gray-500">
                            Pris per kvadratmeter (bredd × höjd i mm)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="TIM">
                        <div className="flex flex-col">
                          <span>Timpris</span>
                          <span className="text-xs text-gray-500">
                            Pris per timme
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Välj hur produkten ska prissättas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visa beräknat pris inkl. moms */}
            <div>
              <FormLabel>Pris (inkl. moms)</FormLabel>
              <Input
                type="text"
                value={prisInklMoms ? `${prisInklMoms} kr` : ""}
                readOnly
                disabled
              />
            </div>

            {/* Kategori med dropdown och möjlighet att lägga till ny */}
            <FormField
              control={form.control}
              name="kategori"
              render={({ field }) => {
                const [isCustomCategory, setIsCustomCategory] = useState(false);
                const [availableKategorier, setAvailableKategorier] = useState<string[]>([]);
                const [loading, setLoading] = useState(false);
                
                // Hämta kategorier när komponenten laddas
                useEffect(() => {
                  const fetchKategorier = async () => {
                    setLoading(true);
                    try {
                      const response = await fetch('/api/prislista?pageSize=100');
                      const data = await response.json();
                      setAvailableKategorier(data.kategorier || []);
                      
                      // Om field.value inte är tom och inte finns i kategorierna så aktivera custom
                      if (field.value && !data.kategorier.includes(field.value)) {
                        setIsCustomCategory(true);
                      }
                    } catch (error) {
                      console.error('Fel vid hämtning av kategorier:', error);
                    } finally {
                      setLoading(false);
                    }
                  };
                  
                  fetchKategorier();
                }, []);
                
                return (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    {!isCustomCategory ? (
                      <>
                        <div className="flex space-x-2">
                          <Select 
                            onValueChange={(value) => {
                              if (value === '__NEW__') {
                                setIsCustomCategory(true);
                                field.onChange('');
                              } else if (value === '__NONE__') {
                                field.onChange('');
                              } else {
                                field.onChange(value);
                              }
                            }}
                            value={field.value || '__NONE__'}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj kategori" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loading ? (
                                <div className="p-2 text-center">Laddar kategorier...</div>
                              ) : (
                                <>
                                  <SelectItem value="__NONE__">Ingen kategori</SelectItem>
                                  {availableKategorier.map((kategori) => (
                                    <SelectItem key={kategori} value={kategori}>
                                      {kategori}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__NEW__">+ Lägg till ny kategori</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="Ange ny kategori"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCustomCategory(false);
                            field.onChange('');
                          }}
                        >
                          Avbryt
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Artikelnummer */}
            <FormField
              control={form.control}
              name="artikelnummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artikelnummer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="T.ex. GR-6080"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Sparar..."
                  : isEditing
                  ? "Spara ändringar"
                  : "Spara prispost"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}