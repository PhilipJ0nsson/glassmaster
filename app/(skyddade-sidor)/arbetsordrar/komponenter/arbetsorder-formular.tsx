// File: app/(skyddade-sidor)/arbetsordrar/komponenter/arbetsorder-formular.tsx
// Fullständig kod med korrigering för nästlat formulär.

'use client';

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card"; 
import {
  Form, // Importeras från react-hook-form via vår ui/form
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
import { ArbetsorderStatus, PrissattningTyp, Kund as PrismaKund, Privatperson as PrismaPrivatperson, Foretag as PrismaForetag } from "@prisma/client";
import { CirclePlus, Edit, Loader2, Save, Trash, User, Settings, Package, Briefcase, Link2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation"; 

export interface KundForFormular extends PrismaKund {
  privatperson?: PrismaPrivatperson | null;
  foretag?: PrismaForetag | null;
}

const statusMap = {
  [ArbetsorderStatus.MATNING]: "Mätning",
  [ArbetsorderStatus.OFFERT]: "Offert",
  [ArbetsorderStatus.AKTIV]: "Aktiv",
  [ArbetsorderStatus.SLUTFORD]: "Slutförd",
  [ArbetsorderStatus.FAKTURERAD]: "Fakturerad",
  [ArbetsorderStatus.AVBRUTEN]: "Avbruten",
};

const orderradSchema = z.object({
  id: z.number().optional(),
  prislistaId: z.string({ required_error: "Välj en produkt/tjänst" }).min(1, "Välj en produkt/tjänst"),
  antal: z.string().min(1, "Antal måste vara minst 1"),
  bredd: z.string().optional(),
  hojd: z.string().optional(),
  langd: z.string().optional(),
  tid: z.string().optional(),
  rabattProcent: z.string().default("0"),
  kommentar: z.string().optional(),
});
type OrderradFormValues = z.infer<typeof orderradSchema>;
const defaultOrderradValues: OrderradFormValues = { prislistaId: "", antal: "1", rabattProcent: "0", kommentar: "", bredd: "", hojd: "", langd: "", tid: "" };

const arbetsorderSchema = z.object({
  kundId: z.string(), 
  status: z.nativeEnum(ArbetsorderStatus).default(ArbetsorderStatus.MATNING),
  ROT: z.boolean().default(false),
  ROTprocentsats: z.string().optional(),
  material: z.string().optional(),
  referensMärkning: z.string().optional(),
  ansvarigTeknikerId: z.string().optional().transform((val) => (val === "none" || val === "" ? null : val)),
  orderrader: z.array(orderradSchema),
});
type ArbetsorderFormValues = z.infer<typeof arbetsorderSchema>;

export interface ProcessedArbetsorderData {
  kundId: string; 
  status: ArbetsorderStatus;
  ROT: boolean;
  ROTprocentsats: number | null;
  material?: string | null;
  referensMärkning?: string | null;
  ansvarigTeknikerId?: string | null; 
  orderrader: Array<{
    id?: number;
    prislistaId: string; 
    antal: number;
    bredd?: number | null;
    hojd?: number | null;
    langd?: number | null;
    tid?: number | null;
    rabattProcent: number;
    kommentar?: string | null;
  }>;
}

interface PrisInfo { id: number; namn: string; prisExklMoms: number; momssats: number; prisInklMoms: number; kategori: string | null; artikelnummer: string | null; prissattningTyp?: PrissattningTyp; }

interface ArbetsorderFormularProps { 
  onSave: (data: ProcessedArbetsorderData) => void; 
  initialData?: Partial<ArbetsorderFormValues> & { kund?: KundForFormular; orderrader?: any[] };
  isEditing?: boolean; 
}

export default function ArbetsorderFormular({ onSave, initialData, isEditing = false }: ArbetsorderFormularProps) {
  const router = useRouter(); 
  const [loading, setLoading] = useState(false);
  const [prisposter, setPrisposter] = useState<PrisInfo[]>([]);
  const [loadingPrisposter, setLoadingPrisposter] = useState(true);
  const [kategorier, setKategorier] = useState<string[]>([]);
  const [anstallda, setAnstallda] = useState<any[]>([]);
  const [loadingAnstallda, setLoadingAnstallda] = useState(true);
  const [totalSumma, setTotalSumma] = useState({ exklMoms: 0, inklMoms: 0 });
  const [editingOrderlineIndex, setEditingOrderlineIndex] = useState<number | null>(null);
  const [totalTimKostnadExklMoms, setTotalTimKostnadExklMoms] = useState(0);

  const kundAttVisa = initialData?.kund;

  const form = useForm<ArbetsorderFormValues>({ 
    resolver: zodResolver(arbetsorderSchema), 
    defaultValues: { 
        kundId: initialData?.kund?.id.toString() || "", 
        status: initialData?.status || ArbetsorderStatus.MATNING, 
        ROT: initialData?.ROT || false, 
        ROTprocentsats: initialData?.ROTprocentsats?.toString() || "30",
        material: initialData?.material || "", 
        referensMärkning: initialData?.referensMärkning || "",
        ansvarigTeknikerId: initialData?.ansvarigTeknikerId?.toString() || "none", 
        orderrader: initialData?.orderrader || [] 
    } 
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "orderrader" });
  const currentOrderradForm = useForm<OrderradFormValues>({ resolver: zodResolver(orderradSchema), defaultValues: defaultOrderradValues });

  useEffect(() => { 
    fetchPrisposter(); 
    fetchAnstallda(); 
  }, []);
  
  useEffect(() => {
    let newDefaultValues: Partial<ArbetsorderFormValues> = {
        status: ArbetsorderStatus.MATNING, 
        ROT: false, 
        ROTprocentsats: "30",
        material: "", 
        referensMärkning: "",
        ansvarigTeknikerId: "none", 
        orderrader: [],
    };

    if (initialData?.kund?.id) {
        newDefaultValues.kundId = initialData.kund.id.toString();
    }

    if (isEditing && initialData) {
        newDefaultValues = {
            ...newDefaultValues, // Behåll default från ovan om initialData saknar något
            kundId: initialData.kundId || newDefaultValues.kundId,
            status: initialData.status || ArbetsorderStatus.MATNING, 
            ROT: initialData.ROT || false, 
            ROTprocentsats: initialData.ROTprocentsats?.toString() || "30", 
            material: initialData.material || "", 
            referensMärkning: initialData.referensMärkning || "",
            ansvarigTeknikerId: initialData.ansvarigTeknikerId?.toString() || "none",
            orderrader: initialData.orderrader 
            ? initialData.orderrader.map((rad: any) => ({ 
                id: rad.id, 
                prislistaId: rad.prislistaId?.toString() || "", 
                antal: rad.antal?.toString() || "1", 
                bredd: rad.bredd?.toString() || "", 
                hojd: rad.hojd?.toString() || "", 
                langd: rad.langd?.toString() || "", 
                tid: rad.tid?.toString() || "", 
                rabattProcent: rad.rabattProcent?.toString() || "0", 
                kommentar: rad.kommentar || "" 
                }))
            : [],
        };
    } else if (initialData) { // För ny order med initialData (t.ex. bara kund)
        newDefaultValues = {
            ...newDefaultValues,
            kundId: initialData.kundId || newDefaultValues.kundId,
            // andra fält från initialData om de finns
        };
    }
    form.reset(newDefaultValues as ArbetsorderFormValues);
  }, [initialData, isEditing, form]);

  const fetchPrisposter = async () => { try { setLoadingPrisposter(true); const r = await fetch('/api/prislista?pageSize=10000'); if (!r.ok) throw Error('Kunde inte hämta prisposter'); const d = await r.json(); setPrisposter(d.prisposter); setKategorier(d.kategorier || []); } catch (e) { console.error(e); toast.error("Kunde inte hämta prislistan."); } finally { setLoadingPrisposter(false); } };
  const fetchAnstallda = async () => { try { setLoadingAnstallda(true); const r = await fetch('/api/anvandare'); if (!r.ok) throw Error('Kunde inte hämta anställda'); setAnstallda((await r.json()).anvandare); } catch (e) { console.error(e); toast.error("Kunde inte hämta anställda."); } finally { setLoadingAnstallda(false); } };

  const calculateRowPriceExclMoms = (rad: OrderradFormValues) => {
    const prispost = prisposter.find((p) => p.id.toString() === rad.prislistaId);
    if (!prispost) return 0;
    const antal = parseInt(String(rad.antal || '1'));
    const rabatt = parseFloat(String(rad.rabattProcent || '0')) / 100;
    let mangd = 1;
    const prissattningTyp = prispost.prissattningTyp || 'ST';
    switch (prissattningTyp) {
      case 'M2':
        const bredd = parseFloat(String(rad.bredd || '0')) / 1000;
        const hojd = parseFloat(String(rad.hojd || '0')) / 1000;
        mangd = bredd && hojd ? bredd * hojd : 1;
        break;
      case 'M':
        mangd = parseFloat(String(rad.langd || '0')) / 1000 || 1;
        break;
      case 'TIM':
        mangd = parseFloat(String(rad.tid || '0')) || 1;
        break;
    }
    return prispost.prisExklMoms * antal * mangd * (1 - rabatt);
  };

  const watchedOrderrader = form.watch("orderrader");
  
  useEffect(() => {
    const orderrader = watchedOrderrader || [];
    let summaExklMoms = 0;
    let summaInklMoms = 0;
    let timKostnadExkl = 0;
    
    orderrader.forEach((rad) => {
      const prispost = prisposter.find((p) => p.id.toString() === rad.prislistaId);
      if (prispost) {
        const antal = parseInt(String(rad.antal || '1'));
        const rabatt = parseFloat(String(rad.rabattProcent || '0')) / 100;
        let mangd = 1;
        const prissattningTyp = prispost.prissattningTyp || 'ST';
        
        let radPrisExklMoms = 0;
        let radPrisInklMoms = 0;

        switch (prissattningTyp) {
          case 'M2':
            const bredd = parseFloat(String(rad.bredd || '0')) / 1000;
            const hojd = parseFloat(String(rad.hojd || '0')) / 1000;
            mangd = bredd && hojd ? bredd * hojd : 1;
            break;
          case 'M':
            mangd = parseFloat(String(rad.langd || '0')) / 1000 || 1;
            break;
          case 'TIM':
            mangd = parseFloat(String(rad.tid || '0')) || 1;
            radPrisExklMoms = prispost.prisExklMoms * antal * mangd * (1 - rabatt); 
            timKostnadExkl += radPrisExklMoms;
            break;
          case 'ST': default: mangd = 1; break;
        }
        
        if (prissattningTyp !== 'TIM') {
            radPrisExklMoms = prispost.prisExklMoms * antal * mangd * (1 - rabatt);
        }
        radPrisInklMoms = prispost.prisInklMoms * antal * mangd * (1 - rabatt);
        
        summaExklMoms += radPrisExklMoms;
        summaInklMoms += radPrisInklMoms;
      }
    });
    setTotalSumma({ exklMoms: summaExklMoms, inklMoms: summaInklMoms });
    setTotalTimKostnadExklMoms(timKostnadExkl);

  }, [watchedOrderrader, prisposter]);

  const formatCurrency = (a: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(a);
  const formatCurrencyNoDecimals = (a: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a);

  const handleAddOrUpdateOrderrad = (data: OrderradFormValues) => { if (editingOrderlineIndex !== null) { const o = form.getValues().orderrader[editingOrderlineIndex]; update(editingOrderlineIndex, { ...o, ...data, id: o.id }); } else { append(data); } currentOrderradForm.reset(defaultOrderradValues); setEditingOrderlineIndex(null); };
  const handleEditOrderrad = (i: number) => { currentOrderradForm.reset({ ...defaultOrderradValues, ...form.getValues().orderrader[i] }); setEditingOrderlineIndex(i); };
  const handleCancelEdit = () => { currentOrderradForm.reset(defaultOrderradValues); setEditingOrderlineIndex(null); };
  const handleRemoveOrderrad = (i: number) => { remove(i); if (editingOrderlineIndex === i) handleCancelEdit(); };
  
  const onSubmit = async (data: ArbetsorderFormValues) => {
    if (!data.kundId) {
        toast.error("Ett fel uppstod: Kund-ID saknas. Gå tillbaka och försök igen.");
        console.error("Form submit attempted without kundId:", data);
        return;
    }

    setLoading(true); 
    try {
      let rotProcentsatsNum: number | null = null;
      if (data.ROT) {
        if (!data.ROTprocentsats || data.ROTprocentsats.trim() === "") {
            form.setError("ROTprocentsats", { type: "manual", message: "Procentsats måste anges för ROT." });
            setLoading(false);
            return;
        }
        rotProcentsatsNum = parseFloat(data.ROTprocentsats);
        if (isNaN(rotProcentsatsNum) || rotProcentsatsNum < 0 || rotProcentsatsNum > 100) {
            form.setError("ROTprocentsats", { type: "manual", message: "Ogiltig procentsats (0-100)." });
            setLoading(false);
            return;
        }
      }

      const processedData: ProcessedArbetsorderData = { 
        kundId: data.kundId, 
        status: data.status,
        ROT: data.ROT,
        ROTprocentsats: data.ROT ? rotProcentsatsNum : null,
        material: data.material || null,
        referensMärkning: data.referensMärkning || null,
        ansvarigTeknikerId: data.ansvarigTeknikerId === "none" || data.ansvarigTeknikerId === "" ? null : data.ansvarigTeknikerId, 
        orderrader: data.orderrader.map(r => ({ 
            id: r.id, 
            prislistaId: r.prislistaId,
            antal: parseInt(r.antal) || 1, 
            bredd: r.bredd ? parseFloat(r.bredd) : null, 
            hojd: r.hojd ? parseFloat(r.hojd) : null, 
            langd: r.langd ? parseFloat(r.langd) : null, 
            tid: r.tid ? parseFloat(r.tid) : null, 
            rabattProcent: parseFloat(r.rabattProcent || "0") || 0,
            kommentar: r.kommentar || null,
        })) 
      };
      await onSave(processedData);
    } catch (e) { 
      console.error(e); 
      toast.error("Fel vid sparande."); 
    } finally { 
      setLoading(false); 
    }
  };
  const selectedProductForEditorId = currentOrderradForm.watch("prislistaId");
  const selectedProductForEditor = prisposter.find(p => p.id.toString() === selectedProductForEditorId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="p-6 md:p-8 border rounded-xl bg-card text-card-foreground shadow-lg">
          
          <div className="mb-10">
            <h2 className="text-2xl font-semibold tracking-tight mb-6 flex items-center text-primary">
              <Briefcase className="h-7 w-7 mr-3" />
              Orderinformation
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-8 gap-y-8">
              <div className="lg:col-span-3 space-y-3">
                <h3 className="text-xl font-medium flex items-center text-gray-700 dark:text-gray-300">
                  <User className="h-5 w-5 mr-2" /> Kundinformation
                </h3>
                {kundAttVisa ? (
                    <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-800/30 text-sm text-gray-700 dark:text-gray-300 space-y-1.5 shadow-sm"> 
                        <h4 className="font-semibold text-base mb-2 text-gray-800 dark:text-gray-200">
                            {kundAttVisa.privatperson 
                                ? `${kundAttVisa.privatperson.fornamn} ${kundAttVisa.privatperson.efternamn}` 
                                : kundAttVisa.foretag?.foretagsnamn}
                            <span className="text-xs text-muted-foreground ml-2">({kundAttVisa.kundTyp === "PRIVAT" ? "Privat" : "Företag"})</span>
                        </h4>
                        <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">Adress:</strong> {kundAttVisa.adress}</div>
                        <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">Telefon:</strong> {kundAttVisa.telefonnummer}</div>
                        {kundAttVisa.epost && <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">E-post:</strong> {kundAttVisa.epost}</div>}
                        {kundAttVisa.privatperson?.personnummer && <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">Personnr:</strong> {kundAttVisa.privatperson.personnummer}</div>}
                        {kundAttVisa.foretag?.organisationsnummer && <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">Org.nr:</strong> {kundAttVisa.foretag.organisationsnummer}</div>}
                        {kundAttVisa.foretag?.fakturaadress && kundAttVisa.foretag.fakturaadress !== kundAttVisa.adress && <div><strong className="font-medium text-gray-500 dark:text-gray-400 w-[80px] inline-block">Fakt.adr:</strong> {kundAttVisa.foretag.fakturaadress}</div>}
                        
                    </div>
                ) : (
                    <div className="p-4 border rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                        {!isEditing 
                            ? "Ingen kund har valts. Gå till en kunds sida och välj 'Skapa arbetsorder'."
                            : "Kundinformation kunde inte laddas. Kontrollera att arbetsordern har en kopplad kund."
                        }
                    </div>
                )}
                 <FormField control={form.control} name="kundId" render={({ field }) => (
                    <FormItem className="hidden">
                        <FormLabel>Kund ID (dold)</FormLabel>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )}/>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-xl font-medium flex items-center text-gray-700 dark:text-gray-300">
                  <Settings className="h-5 w-5 mr-2" /> Orderinställningar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
                  <FormField control={form.control} name="status" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Status *</FormLabel><Select onValueChange={field.onChange} value={field.value||ArbetsorderStatus.MATNING}><FormControl><SelectTrigger><SelectValue placeholder="Välj status"/></SelectTrigger></FormControl><SelectContent>{Object.entries(statusMap).map(([v,l])=>(<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                  <FormField control={form.control} name="ansvarigTeknikerId" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Ansvarig</FormLabel><Select onValueChange={field.onChange} value={field.value||"none"}><FormControl><SelectTrigger><SelectValue placeholder="Välj tekniker"/></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Ingen</SelectItem>{loadingAnstallda?<div className="p-2 text-xs"><Loader2 className="h-3 w-3 animate-spin mr-1 inline"/>Laddar...</div>:anstallda.map(a=><SelectItem key={a.id} value={a.id.toString()}>{a.fornamn} {a.efternamn}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
                  
                  <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-800/40 space-y-2 md:col-span-1 h-full">
                    <FormField control={form.control} name="ROT" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel className="font-medium text-sm">ROT-avdrag</FormLabel>
                            <FormDescription className="text-xs">
                              Gäller arbetskostnad (timpriser).
                            </FormDescription>
                          </div>
                          <FormControl>
                            <label htmlFor="rot-cb" className="flex items-center cursor-pointer">
                              <div className="relative">
                                <input 
                                  id="rot-cb" 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={field.value} 
                                  onChange={field.onChange}
                                />
                                <div className={`block bg-gray-300 dark:bg-gray-600 peer-checked:bg-green-500 w-10 h-5 rounded-full transition-colors`}></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div>
                              </div>
                            </label>
                          </FormControl>
                      </FormItem>
                    )}/>
                    {form.watch("ROT") && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <FormField 
                            control={form.control} 
                            name="ROTprocentsats" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">ROT-procent (%) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    className="h-8 text-xs" 
                                    min="0" max="100" 
                                    placeholder="t.ex. 30" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                {totalTimKostnadExklMoms === 0 && (
                                    <FormDescription className="text-xs text-orange-600 dark:text-orange-400 pt-1">
                                        OBS: Inga timkostnader finns på ordern. ROT beräknas på dessa.
                                    </FormDescription>
                                )}
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                      </div>
                    )}
                  </div>
                </div>
                <FormField control={form.control} name="material" render={({ field }) => (<FormItem><FormLabel>Material/Anteckningar</FormLabel><FormControl><Input placeholder="Ev. material/anteckningar" {...field} value={field.value||''}/></FormControl><FormMessage/></FormItem>)}/>
                <FormField control={form.control} name="referensMärkning" render={({ field }) => (<FormItem><FormLabel>Referens/Märkning</FormLabel><FormControl><Input placeholder="Fakturareferens, portkod etc." {...field} value={field.value||''}/></FormControl><FormMessage/></FormItem>)}/>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200 dark:border-gray-700" />

          <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-6 flex items-center text-primary">
              <Package className="h-7 w-7 mr-3" />
              Produkter och Tjänster
            </h2>
            
            <div className="border p-4 rounded-lg mb-6 space-y-4 bg-slate-50/80 dark:bg-slate-800/50 shadow-sm">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {editingOrderlineIndex !== null ? 'Redigera rad' : 'Lägg till ny rad'}
              </h3>
              <Form {...currentOrderradForm}>
                {/* INGEN nästlad <form>-tagg här! */}
                <div className="space-y-3"> {/* Omslutande div för fält och knappar för orderraden */}
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                    <div className="flex-grow basis-full md:basis-[calc(30%-0.75rem)] min-w-[200px]"><FormField control={currentOrderradForm.control} name="prislistaId" render={({ field }) => {
                          const [es, setES] = useState(""); const [ek, setEK] = useState<string|null>(null);
                          return (<FormItem><FormLabel className="text-xs">Produkt/Tjänst *</FormLabel>
                              <div className="flex flex-wrap gap-1 mb-1">
                                <Button type="button" size="sm" variant={ek===null?"secondary":"outline"} onClick={()=>setEK(null)}>Alla</Button>
                                {kategorier.map(k=>(<Button type="button" key={k} size="sm" variant={ek===k?"secondary":"outline"} onClick={()=>setEK(k)}>{k}</Button>))}
                                {prisposter.some(p=>!p.kategori) && (<Button type="button" size="sm" variant={ek==='__NONE__'?"secondary":"outline"} onClick={()=>setEK('__NONE__')}>Övriga</Button>)}
                              </div>
                              <Select onValueChange={field.onChange} value={field.value||""}>
                                <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Välj produkt..."/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <div className="p-1"><Input type="text" placeholder="Sök..." value={es} onChange={e=>setES(e.target.value)} className="w-full h-8 text-xs"/></div>
                                  {prisposter.filter(p=>(ek===null?true:ek==='__NONE__'? !p.kategori : p.kategori===ek) && (!es?true:p.namn.toLowerCase().includes(es.toLowerCase())||(p.artikelnummer&&p.artikelnummer.toLowerCase().includes(es.toLowerCase())))).length===0 
                                    ?<div className="p-2 text-xs text-center text-gray-500">Inga produkter</div>
                                    :prisposter.filter(p=>(ek===null?true:ek==='__NONE__'? !p.kategori : p.kategori===ek) && (!es?true:p.namn.toLowerCase().includes(es.toLowerCase())||(p.artikelnummer&&p.artikelnummer.toLowerCase().includes(es.toLowerCase())))).map(p=>(
                                      <SelectItem key={p.id} value={p.id.toString()}><div className="flex justify-between w-full text-xs"><span>{p.namn}{p.artikelnummer&&<span className="text-xs ml-1 text-gray-400">({p.artikelnummer})</span>}</span><span className="text-gray-500">{formatCurrencyNoDecimals(p.prisInklMoms)}</span></div></SelectItem>))}
                                </SelectContent></Select><FormMessage className="text-xs"/></FormItem>);}}/>
                    </div>
                    <div className="min-w-[60px] flex-grow basis-[calc(8%-0.75rem)]"><FormField control={currentOrderradForm.control} name="antal" render={({ field }) => (<FormItem><FormLabel className="text-xs">Antal</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="1" step="1" {...field} value={field.value||'1'}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div>
                    <div className="min-w-[70px] flex-grow basis-[calc(8%-0.75rem)]"><FormField control={currentOrderradForm.control} name="rabattProcent" render={({ field }) => (<FormItem><FormLabel className="text-xs">Rabatt (%)</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="0" max="100" step="1" {...field} value={field.value||'0'}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div>
                    
                    {selectedProductForEditor && (()=>{ 
                        const fieldBasis = "basis-[calc(10%-0.75rem)]";
                        switch(selectedProductForEditor.prissattningTyp){
                            case 'M2': return (<><div className={`min-w-[80px] flex-grow ${fieldBasis}`}><FormField control={currentOrderradForm.control} name="bredd" render={({ field }) => (<FormItem><FormLabel className="text-xs">Bredd (mm)</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="1" {...field} value={field.value||''}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div><div className={`min-w-[80px] flex-grow ${fieldBasis}`}><FormField control={currentOrderradForm.control} name="hojd" render={({ field }) => (<FormItem><FormLabel className="text-xs">Höjd (mm)</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="1" {...field} value={field.value||''}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div></>);
                            case 'M': return (<div className={`min-w-[100px] flex-grow ${fieldBasis}`}><FormField control={currentOrderradForm.control} name="langd" render={({ field }) => (<FormItem><FormLabel className="text-xs">Längd (mm)</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="1" {...field} value={field.value||''}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div>);
                            case 'TIM': return (<div className={`min-w-[100px] flex-grow ${fieldBasis}`}><FormField control={currentOrderradForm.control} name="tid" render={({ field }) => (<FormItem><FormLabel className="text-xs">Tid (tim)</FormLabel><FormControl><Input className="h-9 text-xs" type="number" min="0.25" step="0.25" {...field} value={field.value||''}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div>);
                            default: return null;
                        }
                    })()}
                    <div className="flex-grow basis-full sm:basis-[calc(15%-0.75rem)] min-w-[150px]"><FormField control={currentOrderradForm.control} name="kommentar" render={({ field }) => (<FormItem><FormLabel className="text-xs">Kommentar</FormLabel><FormControl><Input className="h-9 text-xs" placeholder="Frivillig kommentar..." {...field} value={field.value||''}/></FormControl><FormMessage className="text-xs"/></FormItem>)}/></div>
                    <div className="flex gap-2 flex-shrink-0"> 
                        <Button type="button" size="sm" onClick={currentOrderradForm.handleSubmit(handleAddOrUpdateOrderrad)}>{editingOrderlineIndex!==null?<><Save className="h-4 w-4 mr-1.5"/>Uppdatera</>:<><CirclePlus className="h-4 w-4 mr-1.5"/>Lägg till</>}</Button>
                        {editingOrderlineIndex!==null && (<Button type="button" size="sm" variant="outline" onClick={handleCancelEdit}>Avbryt</Button>)}
                    </div>
                  </div>
                </div>
              </Form>
            </div>

            {fields.length === 0 
              ? <div className="text-center py-8 text-sm text-muted-foreground"><p>Inga orderrader tillagda.</p></div>
              : <div className="space-y-2">
                  <h4 className="text-md font-medium mb-2 text-gray-600 dark:text-gray-400">Tillagda rader:</h4>
                  {fields.map((fieldData, index) => {
                    const orderrad = form.getValues().orderrader[index]; 
                    const prispost = prisposter.find(p => p.id.toString() === orderrad.prislistaId);
                    const rowPriceExclMoms = calculateRowPriceExclMoms(orderrad);
                    
                    let radDetaljer = `Antal: ${orderrad.antal||'1'}`; 
                    if(orderrad.rabattProcent && parseFloat(orderrad.rabattProcent) !== 0) radDetaljer += `, Rabatt: ${orderrad.rabattProcent}%`;
                    if(prispost){
                      switch(prispost.prissattningTyp){
                        case 'M2': radDetaljer += `, Mått: ${orderrad.bredd||'?'}x${orderrad.hojd||'?'}mm`; break;
                        case 'M': radDetaljer += `, Längd: ${orderrad.langd||'?'}mm`; break;
                        case 'TIM': radDetaljer += `, Tid: ${orderrad.tid||'?'} tim`; break;
                      }
                    }
                    if (orderrad.kommentar) radDetaljer += ` | Kom: ${orderrad.kommentar.length > 25 ? orderrad.kommentar.substring(0, 22) + "..." : orderrad.kommentar}`;

                    return (<Card 
                                key={fieldData.id} 
                                className={`p-2.5 transition-colors shadow-sm cursor-pointer ${editingOrderlineIndex===index?'ring-2 ring-primary bg-primary/10':'hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                                onClick={()=>handleEditOrderrad(index)}
                            >
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex-grow overflow-hidden"> 
                            <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-sm truncate shrink-0"> 
                                {prispost?prispost.namn:'Okänd produkt'}
                                {prispost?.artikelnummer&&<span className="text-xs text-muted-foreground ml-1">({prispost.artikelnummer})</span>}
                                </p>
                                <p className="text-xs text-muted-foreground truncate whitespace-nowrap">{radDetaljer}</p>
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0 gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {formatCurrency(rowPriceExclMoms)}
                            </span>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e)=>{e.stopPropagation();handleRemoveOrderrad(index);}} 
                                className="text-red-500 hover:text-red-600 h-7 w-7"
                                aria-label="Ta bort rad"
                            >
                                <Trash className="h-4 w-4"/>
                            </Button>
                          </div>
                        </div>
                        </Card>);
                    })}
                </div>}

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2 text-right">
              <div className="text-md"><span className="text-muted-foreground">Summa (exkl. moms):</span> <span className="font-semibold">{formatCurrency(totalSumma.exklMoms)}</span></div>
              <div className="text-xl"><span className="text-muted-foreground">Summa (inkl. moms):</span> <span className="font-bold text-primary">{formatCurrency(totalSumma.inklMoms)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Avbryt</Button>
          <Button type="submit" disabled={loading || !kundAttVisa} className="min-w-[160px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Spara ändringar' : 'Skapa Arbetsorder'}
          </Button>
        </div>
      </form>
    </Form>
  );
}