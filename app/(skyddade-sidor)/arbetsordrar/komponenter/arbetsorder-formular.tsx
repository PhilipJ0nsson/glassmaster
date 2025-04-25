'use client';

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArbetsorderStatus } from "@prisma/client";
import { CircleMinus, CirclePlus, Loader2, Save, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const statusMap = {
  [ArbetsorderStatus.OFFERT]: "Offert",
  [ArbetsorderStatus.BEKRAFTAD]: "Bekräftad",
  [ArbetsorderStatus.PAGAENDE]: "Pågående",
  [ArbetsorderStatus.SLUTFORD]: "Slutförd",
  [ArbetsorderStatus.FAKTURERAD]: "Fakturerad",
  [ArbetsorderStatus.AVBRUTEN]: "Avbruten",
};

// Formulärschema
const orderradSchema = z.object({
  id: z.number().optional(),
  prislistaId: z.string({
    required_error: "Välj en produkt/tjänst",
  }),
  antal: z.string().min(1, "Antal måste vara minst 1"),
  bredd: z.string().optional(),
  hojd: z.string().optional(),
  langd: z.string().optional(),
  tid: z.string().optional(),
  rabattProcent: z.string().default("0"),
  kommentar: z.string().optional(),
});

const arbetsorderSchema = z.object({
  kundId: z.string({
    required_error: "Välj en kund",
  }),
  status: z.nativeEnum(ArbetsorderStatus).default(ArbetsorderStatus.OFFERT),
  ROT: z.boolean().default(false),
  ROTprocentsats: z.string().optional(),
  material: z.string().optional(),
  referensMärkning: z.string().optional(),
  ansvarigTeknikerId: z.string().optional().transform((val) => (val === "none" ? null : val)),
  orderrader: z.array(orderradSchema),
});

type ArbetsorderFormValues = z.infer<typeof arbetsorderSchema>;

interface KundInfo {
  id: number;
  kundTyp: string;
  telefonnummer: string;
  epost?: string | null;
  adress: string;
  kommentarer?: string | null;
  privatperson?: {
    fornamn: string;
    efternamn: string;
    personnummer?: string | null;
  } | null;
  foretag?: {
    foretagsnamn: string;
    organisationsnummer?: string | null;
    kontaktpersonFornamn?: string | null;
    kontaktpersonEfternamn?: string | null;
    fakturaadress?: string | null;
  } | null;
  skapadDatum: string;
  uppdateradDatum: string;
}

interface PrisInfo {
  id: number;
  namn: string;
  prisExklMoms: number;
  momssats: number;
  prisInklMoms: number;
  kategori: string | null;
  artikelnummer: string | null;
  prissattningTyp?: string;
}

interface ArbetsorderFormularProps {
  onSave: (data: any) => void; // Använd any för att undvika typfel vid konvertering
  initialData?: any;
  isEditing?: boolean;
}

export default function ArbetsorderFormular({
  onSave,
  initialData,
  isEditing = false,
}: ArbetsorderFormularProps) {
  const [loading, setLoading] = useState(false);
  const [kunder, setKunder] = useState<KundInfo[]>([]);
  const [loadingKunder, setLoadingKunder] = useState(true);
  const [prisposter, setPrisposter] = useState<PrisInfo[]>([]);
  const [loadingPrisposter, setLoadingPrisposter] = useState(true);
  const [kategorier, setKategorier] = useState<string[]>([]);
  const [anstallda, setAnstallda] = useState<any[]>([]);
  const [loadingAnstallda, setLoadingAnstallda] = useState(true);
  const [totalSumma, setTotalSumma] = useState({ exklMoms: 0, inklMoms: 0 });

  // Initiera formuläret
  const form = useForm<ArbetsorderFormValues>({
    resolver: zodResolver(arbetsorderSchema),
    defaultValues: {
      kundId: "",
      status: ArbetsorderStatus.OFFERT,
      ROT: false,
      ROTprocentsats: "30",
      material: "",
      ansvarigTeknikerId: "none",
      orderrader: [],
    },
  });

  // Hantera orderrader som en array i formuläret
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderrader",
  });

  // Hämta data från servern när komponenten laddas
  useEffect(() => {
    fetchKunder();
    fetchPrisposter();
    fetchAnstallda();
  }, []);

  // Sätt formulärvärden om initialData finns
  useEffect(() => {
    if (initialData && isEditing) {
      const formData = {
        kundId: initialData.kundId.toString(),
        status: initialData.status,
        ROT: initialData.ROT,
        ROTprocentsats: initialData.ROTprocentsats?.toString() || "30",
        material: initialData.material || "",
        ansvarigTeknikerId: initialData.ansvarigTeknikerId?.toString() || "none",
        orderrader: initialData.orderrader.map((rad: any) => ({
          id: rad.id,
          prislistaId: rad.prislistaId.toString(),
          antal: rad.antal.toString(),
          bredd: rad.bredd?.toString() || "",
          hojd: rad.hojd?.toString() || "",
          langd: rad.langd?.toString() || "",
          tid: rad.tid?.toString() || "",
          rabattProcent: rad.rabattProcent.toString(),
          kommentar: rad.kommentar || "",
        })),
      };
      
      form.reset(formData);
    }
  }, [initialData, isEditing, form]);

  // Hämta kunder
  const fetchKunder = async () => {
    try {
      setLoadingKunder(true);
      const response = await fetch('/api/kunder');
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta kunder');
      }
      
      const data = await response.json();
      setKunder(data.kunder);
    } catch (error) {
      console.error('Fel vid hämtning av kunder:', error);
    } finally {
      setLoadingKunder(false);
    }
  };

  // Hämta prisposter
  const fetchPrisposter = async () => {
    try {
      setLoadingPrisposter(true);
      const response = await fetch('/api/prislista');
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta prisposter');
      }
      
      const data = await response.json();
      setPrisposter(data.prisposter);
      setKategorier(data.kategorier || []);
    } catch (error) {
      console.error('Fel vid hämtning av prisposter:', error);
    } finally {
      setLoadingPrisposter(false);
    }
  };

  // Hämta anställda
  const fetchAnstallda = async () => {
    try {
      setLoadingAnstallda(true);
      const response = await fetch('/api/anvandare');
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta anställda');
      }
      
      const data = await response.json();
      setAnstallda(data.anvandare);
    } catch (error) {
      console.error('Fel vid hämtning av anställda:', error);
    } finally {
      setLoadingAnstallda(false);
    }
  };

  // Beräkna totalsumma baserat på orderrader
  useEffect(() => {
    const orderrader = form.getValues().orderrader || [];
    let summaExklMoms = 0;
    let summaInklMoms = 0;
    
    orderrader.forEach((rad) => {
      const prispost = prisposter.find((p) => p.id.toString() === rad.prislistaId);
      
      if (prispost) {
        const antal = parseInt(String(rad.antal || '1'));
        const rabatt = parseFloat(String(rad.rabattProcent || '0')) / 100;
        
        // Beräkna priset baserat på prissättningstyp
        let mangd = 1;
        
        // Kontrollera att prissattningTyp existerar
        const prissattningTyp = prispost.prissattningTyp || 'ST';
        console.log(`Calculating price for product: ${prispost.namn}, type: ${prissattningTyp}`);
        
        switch (prissattningTyp) {
          case 'M2':
            // Kvadratmeterpris (bredd × höjd)
            let breddMm = parseFloat(String(rad.bredd || '0'));
            let hojdMm = parseFloat(String(rad.hojd || '0'));
            
            // Konvertera från millimeter till meter
            const bredd = breddMm / 1000;
            const hojd = hojdMm / 1000;
            
            // Beräkna area i kvadratmeter
            mangd = bredd && hojd ? bredd * hojd : 1;
            console.log(`M2 calculation: ${breddMm}mm × ${hojdMm}mm = ${bredd}m × ${hojd}m = ${mangd}m²`);
            break;
          
          case 'M':
            // Meterpris (längd)
            let langdMm = parseFloat(String(rad.langd || '0'));
            
            // Konvertera från millimeter till meter
            const langd = langdMm / 1000;
            
            mangd = langd || 1;
            console.log(`M calculation: ${langdMm}mm = ${langd}m`);
            break;
          
          case 'TIM':
            // Timpris (tid)
            const tid = parseFloat(String(rad.tid || '0'));
            mangd = tid || 1;
            console.log(`TIM calculation: ${mangd} timmar`);
            break;
          
          case 'ST':
          default:
            // Styckpris - använder bara antal
            mangd = 1;
            console.log(`ST calculation: standard styckpris (mangd = 1)`);
            break;
        }
        
        // Beräkna radpriser
        const radExklMoms = prispost.prisExklMoms * antal * mangd * (1 - rabatt);
        const radInklMoms = prispost.prisInklMoms * antal * mangd * (1 - rabatt);
        
        console.log(`Row price calculation: 
          Base price: ${prispost.prisExklMoms} kr
          Quantity factor: ${mangd}
          Units: ${antal}
          Discount: ${rabatt * 100}%
          Row price (excl. VAT): ${radExklMoms} kr
          Row price (incl. VAT): ${radInklMoms} kr
        `);
        
        summaExklMoms += radExklMoms;
        summaInklMoms += radInklMoms;
      }
    });
    
    console.log(`Total calculation: 
      Total (excl. VAT): ${summaExklMoms} kr
      Total (incl. VAT): ${summaInklMoms} kr
    `);
    
    setTotalSumma({
      exklMoms: summaExklMoms,
      inklMoms: summaInklMoms,
    });
  }, [form.watch("orderrader"), prisposter]);

  // Format valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Hämta kundnamn baserat på ID
  const getKundNamn = (kundId: string) => {
    const kund = kunder.find((k) => k.id.toString() === kundId);
    
    if (!kund) return '';
    
    if (kund.privatperson) {
      return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
    } else if (kund.foretag) {
      return kund.foretag.foretagsnamn;
    }
    
    return `Kund #${kund.id}`;
  };

  // Lägg till ny orderrad
  const handleAddOrderrad = () => {
    append({
      prislistaId: '',
      antal: '1',
      rabattProcent: '0',
      kommentar: '',
    });
  };

  // Spara arbetsorder
  const onSubmit = async (data: ArbetsorderFormValues) => {
    setLoading(true);
    
    try {
      // Konvertera strängar till nummer där det behövs
      const processedData = {
        ...data,
        ROTprocentsats: data.ROTprocentsats ? parseFloat(data.ROTprocentsats) : null,
        ansvarigTeknikerId: data.ansvarigTeknikerId === "none" ? null : data.ansvarigTeknikerId,
        orderrader: data.orderrader.map(rad => ({
          ...rad,
          antal: parseInt(rad.antal) || 1,
          bredd: rad.bredd ? parseFloat(rad.bredd) : null,
          hojd: rad.hojd ? parseFloat(rad.hojd) : null,
          langd: rad.langd ? parseFloat(rad.langd) : null,
          tid: rad.tid ? parseFloat(rad.tid) : null,
          rabattProcent: parseFloat(rad.rabattProcent) || 0,
        })),
      };
      
      await onSave(processedData);
    } catch (error) {
      console.error('Fel vid sparande av arbetsorder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kunduppgifter */}
          <Card>
            <CardHeader>
              <CardTitle>Kunduppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="kundId"
              render={({ field }) => {
                const [searchTerm, setSearchTerm] = useState("");
                const [kundTyp, setKundTyp] = useState<string | null>(null);
                
                // Hämta fullständig kunddata baserat på valt ID
                const selectedKund = kunder.find(k => k.id.toString() === field.value);
                
                return (
                  <FormItem>
                    <FormLabel>Kund *</FormLabel>
                    
                    {/* Kundtyp-flikar */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Button 
                        type="button"
                        size="sm"
                        variant={kundTyp === null ? "default" : "outline"}
                        onClick={() => setKundTyp(null)}
                        className="text-xs"
                      >
                        Alla
                      </Button>
                      <Button 
                        type="button"
                        size="sm"
                        variant={kundTyp === "PRIVAT" ? "default" : "outline"}
                        onClick={() => setKundTyp("PRIVAT")}
                        className="text-xs"
                      >
                        Privatpersoner
                      </Button>
                      <Button 
                        type="button"
                        size="sm"
                        variant={kundTyp === "FORETAG" ? "default" : "outline"}
                        onClick={() => setKundTyp("FORETAG")}
                        className="text-xs"
                      >
                        Företag
                      </Button>
                    </div>
                    
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || ""}
                      disabled={loadingKunder}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingKunder ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Laddar kunder...</span>
                          </div>
                        ) : (
                          <>
                            <div className="px-2 pb-2">
                              <Input
                                type="text"
                                placeholder="Sök kunder..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full"
                              />
                            </div>
                            
                            {/* Filtrera kunder baserat på sökterm och typ */}
                            {kunder
                              .filter(kund => {
                                // Filtrera baserat på kundtyp
                                if (kundTyp === "PRIVAT" && !kund.privatperson) return false;
                                if (kundTyp === "FORETAG" && !kund.foretag) return false;
                                
                                // Filtrera baserat på sökterm
                                if (!searchTerm) return true;
                                
                                const searchTermLower = searchTerm.toLowerCase();
                                
                                // Sök i privatperson
                                if (kund.privatperson) {
                                  return kund.privatperson.fornamn.toLowerCase().includes(searchTermLower) ||
                                        kund.privatperson.efternamn.toLowerCase().includes(searchTermLower);
                                }
                                
                                // Sök i företag
                                if (kund.foretag) {
                                  return kund.foretag.foretagsnamn.toLowerCase().includes(searchTermLower);
                                }
                                
                                return false;
                              })
                              .length === 0 ? (
                                <div className="p-2 text-center text-gray-500">
                                  Inga kunder hittades
                                </div>
                              ) : (
                                kunder
                                  .filter(kund => {
                                    // Filtrera baserat på kundtyp
                                    if (kundTyp === "PRIVAT" && !kund.privatperson) return false;
                                    if (kundTyp === "FORETAG" && !kund.foretag) return false;
                                    
                                    // Filtrera baserat på sökterm
                                    if (!searchTerm) return true;
                                    
                                    const searchTermLower = searchTerm.toLowerCase();
                                    
                                    // Sök i privatperson
                                    if (kund.privatperson) {
                                      return kund.privatperson.fornamn.toLowerCase().includes(searchTermLower) ||
                                            kund.privatperson.efternamn.toLowerCase().includes(searchTermLower);
                                    }
                                    
                                    // Sök i företag
                                    if (kund.foretag) {
                                      return kund.foretag.foretagsnamn.toLowerCase().includes(searchTermLower);
                                    }
                                    
                                    return false;
                                  })
                                  .map((kund) => (
                                    <SelectItem key={kund.id} value={kund.id.toString()}>
                                      {kund.privatperson
                                        ? `${kund.privatperson.fornamn} ${kund.privatperson.efternamn} (Privat)`
                                        : kund.foretag
                                        ? `${kund.foretag.foretagsnamn} (Företag)`
                                        : `Kund #${kund.id}`}
                                    </SelectItem>
                                  ))
                              )
                            }
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    
                    {/* Visa kundinformation om en kund är vald */}
                    {selectedKund && (
                      <div className="mt-4 border rounded-md p-3 bg-gray-50">
                        <div className="font-medium mb-1">
                          {selectedKund.privatperson
                            ? `${selectedKund.privatperson.fornamn} ${selectedKund.privatperson.efternamn}`
                            : selectedKund.foretag
                            ? selectedKund.foretag.foretagsnamn
                            : `Kund #${selectedKund.id}`}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                          <div className="flex items-start">
                            <span className="w-20 flex-shrink-0">Adress:</span>
                            <span>{selectedKund.adress}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="w-20 flex-shrink-0">Telefon:</span>
                            <span>{selectedKund.telefonnummer}</span>
                          </div>
                          
                          {selectedKund.epost && (
                            <div className="flex items-center">
                              <span className="w-20 flex-shrink-0">E-post:</span>
                              <span>{selectedKund.epost}</span>
                            </div>
                          )}
                          
                          {selectedKund.privatperson?.personnummer && (
                            <div className="flex items-center">
                              <span className="w-20 flex-shrink-0">Personnr:</span>
                              <span>{selectedKund.privatperson.personnummer}</span>
                            </div>
                          )}
                          
                          {selectedKund.foretag?.organisationsnummer && (
                            <div className="flex items-center">
                              <span className="w-20 flex-shrink-0">Org.nr:</span>
                              <span>{selectedKund.foretag.organisationsnummer}</span>
                            </div>
                          )}
                          
                          {/* Visa kontaktperson om det finns */}
                          {selectedKund.foretag?.kontaktpersonFornamn && (
                            <div className="flex items-center">
                              <span className="w-20 flex-shrink-0">Kontakt:</span>
                              <span>
                                {selectedKund.foretag.kontaktpersonFornamn} {selectedKund.foretag.kontaktpersonEfternamn || ''}
                              </span>
                            </div>
                          )}
                          
                          {/* Visa fakturaadress om den skiljer sig från ordinarie adress */}
                          {selectedKund.foretag?.fakturaadress && selectedKund.foretag.fakturaadress !== selectedKund.adress && (
                            <div className="flex items-start">
                              <span className="w-20 flex-shrink-0">Faktura:</span>
                              <span>{selectedKund.foretag.fakturaadress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />
              
              {form.watch("kundId") && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Redirect to customer details page
                      window.open(`/kunder/${form.getValues().kundId}`, '_blank');
                    }}
                  >
                    Visa kunduppgifter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Arbetsorderinformation */}
          <Card>
            <CardHeader>
              <CardTitle>Arbetsorderinformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || ArbetsorderStatus.OFFERT}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(statusMap).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ansvarigTeknikerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ansvarig tekniker</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj tekniker" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ingen tilldelad</SelectItem>
                          {loadingAnstallda ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Laddar...</span>
                            </div>
                          ) : (
                            anstallda.map((anstalld) => (
                              <SelectItem key={anstalld.id} value={anstalld.id.toString()}>
                                {anstalld.fornamn} {anstalld.efternamn}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ROT"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>ROT-avdrag</FormLabel>
                          <FormDescription>
                            Markera om ROT-avdrag ska användas
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("ROT") && (
                    <FormField
                      control={form.control}
                      name="ROTprocentsats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ROT-procentsats (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Procentsats"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <FormField
                  control={form.control}
                  name="material"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material/Anteckningar</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Beskrivning av material eller andra anteckningar"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="referensMärkning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referens/Märkning</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kundernas referens eller märkning för fakturering"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Ange referensperson eller märkning som ska visas på fakturan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Orderrader */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Produkter och tjänster</CardTitle>
            <Button type="button" onClick={handleAddOrderrad}>
              <CirclePlus className="h-4 w-4 mr-2" />
              Lägg till rad
            </Button>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Inga orderrader tillagda. Klicka på "Lägg till rad" för att lägga till produkter eller tjänster.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 border-b pb-4"
                  >
                    <div className="md:col-span-5">
                      <FormField
                        control={form.control}
                        name={`orderrader.${index}.prislistaId`}
                        render={({ field }) => {
                          const [searchTerm, setSearchTerm] = useState("");
                          const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
                          
                          // Filtrera produkter baserat på sökterm om den finns
                          const filteredPrisposter = searchTerm 
                            ? prisposter.filter(p => 
                                p.namn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (p.artikelnummer && p.artikelnummer.toLowerCase().includes(searchTerm.toLowerCase()))
                              )
                            : prisposter;
                          
                          // Uppdatera kategori när en produkt väljs
                          const updateSelectedValue = (value: string) => {
                            field.onChange(value);
                            // Hitta kategori för vald produkt om det finns en
                            const selectedProduct = prisposter.find(p => p.id.toString() === value);
                            if (selectedProduct) {
                              setSelectedKategori(null); // Återställ kategorivalet efter val
                            }
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Produkt/Tjänst *</FormLabel>
                              
                              {/* Kategori-flikar */}
                              <div className="flex flex-wrap gap-1 mb-2">
                                <Button 
                                  type="button"
                                  size="sm"
                                  variant={selectedKategori === null ? "default" : "outline"}
                                  onClick={() => setSelectedKategori(null)}
                                  className="text-xs"
                                >
                                  Alla
                                </Button>
                                {kategorier.map(kategori => (
                                  <Button 
                                    type="button"
                                    key={kategori} 
                                    size="sm"
                                    variant={selectedKategori === kategori ? "default" : "outline"}
                                    onClick={() => setSelectedKategori(kategori)}
                                    className="text-xs"
                                  >
                                    {kategori}
                                  </Button>
                                ))}
                                {prisposter.some(p => !p.kategori) && (
                                  <Button 
                                    type="button"
                                    size="sm"
                                    variant={selectedKategori === '__NONE__' ? "default" : "outline"}
                                    onClick={() => setSelectedKategori('__NONE__')}
                                    className="text-xs"
                                  >
                                    Övriga
                                  </Button>
                                )}
                              </div>
                              
                              <Select 
                                onValueChange={updateSelectedValue} 
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Välj produkt/tjänst" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="px-2 pb-2">
                                    <Input
                                      type="text"
                                      placeholder="Sök produkter..."
                                      value={searchTerm}
                                      onChange={e => setSearchTerm(e.target.value)}
                                      className="w-full"
                                    />
                                  </div>
                                  
                                  {/* Visa "Inga produkter hittades" om filtreringen ger tomt resultat */}
                                  {filteredPrisposter
                                    .filter(p => {
                                      if (selectedKategori === null) return true;
                                      if (selectedKategori === '__NONE__') return !p.kategori;
                                      return p.kategori === selectedKategori;
                                    }).length === 0 ? (
                                      <div className="p-2 text-center text-gray-500">
                                        Inga produkter hittades
                                      </div>
                                    ) : (
                                      filteredPrisposter
                                        .filter(p => {
                                          // Kategorifiltrering
                                          const kategoriMatch = selectedKategori === null ? true :
                                            selectedKategori === '__NONE__' ? !p.kategori :
                                            p.kategori === selectedKategori;
                                          
                                          // Sökfiltrering - kollar både namn och artikelnummer
                                          const searchMatch = !searchTerm ? true :
                                            p.namn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (p.artikelnummer && p.artikelnummer.toLowerCase().includes(searchTerm.toLowerCase()));
                                          
                                          return kategoriMatch && searchMatch;
                                        })
                                        .map(prispost => (
                                          <SelectItem
                                            key={prispost.id}
                                            value={prispost.id.toString()}
                                          >
                                            <div className="flex justify-between w-full">
                                              <span>
                                                {prispost.namn}
                                                {prispost.artikelnummer && (
                                                  <span className="text-xs ml-1 text-gray-500">
                                                    ({prispost.artikelnummer})
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-gray-600">
                                                {formatCurrency(prispost.prisInklMoms)}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    <div className="md:col-span-6 flex flex-wrap gap-2">
                      {/* Antal */}
                      <div className="w-1/12 min-w-[70px]">
                        <FormField
                          control={form.control}
                          name={`orderrader.${index}.antal`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Antal</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  {...field}
                                  value={field.value || '1'}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Rabatt */}
                      <div className="w-1/12 min-w-[80px]">
                        <FormField
                          control={form.control}
                          name={`orderrader.${index}.rabattProcent`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rabatt (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  {...field}
                                  value={field.value || '0'}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Dynamiska fält baserade på produkttyp */}
                      {(() => {
                        // Hämta vald produkt
                        const selectedProduct = prisposter.find(
                          p => p.id.toString() === form.getValues(`orderrader.${index}.prislistaId`)
                        );
                        
                        // Visa olika fält beroende på prissättningstyp
                        if (selectedProduct) {
                          switch (selectedProduct.prissattningTyp) {
                            case 'M2':
                              return (
                                <>
                                  <div className="w-1/6 min-w-[100px]">
                                    <FormField
                                      control={form.control}
                                      name={`orderrader.${index}.bredd`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Bredd (mm)</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="1"
                                              max="10000"
                                              step="1"
                                              placeholder="Bredd"
                                              {...field}
                                              value={field.value || ''}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="w-1/6 min-w-[100px]">
                                    <FormField
                                      control={form.control}
                                      name={`orderrader.${index}.hojd`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Höjd (mm)</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="1"
                                              max="10000"
                                              step="1"
                                              placeholder="Höjd"
                                              {...field}
                                              value={field.value || ''}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </>
                              );
                            case 'M':
                              return (
                                <div className="w-1/3 min-w-[120px]">
                                  <FormField
                                    control={form.control}
                                    name={`orderrader.${index}.langd`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Längd (mm)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="30000"
                                            step="1"
                                            placeholder="Längd"
                                            {...field}
                                            value={field.value || ''}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              );
                            case 'TIM':
                              return (
                                <div className="w-1/3 min-w-[120px]">
                                  <FormField
                                    control={form.control}
                                    name={`orderrader.${index}.tid`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Tid (timmar)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0.25"
                                            max="100"
                                            step="0.25"
                                            placeholder="Tid"
                                            {...field}
                                            value={field.value || ''}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              );
                            default:
                              return null;
                          }
                        }
                        
                        return null;
                      })()}

                      {/* Kommentar */}
                      <div className="flex-1 min-w-[200px]">
                        <FormField
                          control={form.control}
                          name={`orderrader.${index}.kommentar`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kommentar</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Kommentar"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-end md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-2 text-right">
              <div className="text-sm">
                <span className="text-muted-foreground">Summa (exkl. moms):</span>{' '}
                <span className="font-semibold">{formatCurrency(totalSumma.exklMoms)}</span>
              </div>
              <div className="text-lg">
                <span className="text-muted-foreground">Summa (inkl. moms):</span>{' '}
                <span className="font-bold">{formatCurrency(totalSumma.inklMoms)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Avbryt
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Spara ändringar' : 'Skapa arbetsorder'}
          </Button>
        </div>
      </form>
    </Form>
  );
}