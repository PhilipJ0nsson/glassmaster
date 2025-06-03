// File: app/(skyddade-sidor)/kalender/komponenter/kalender-dialog.tsx
// Mode: Modifying
// Change: Removed explicit `ansvarigTeknikerId` from `ApiArbetsorder` interface as it's correctly inherited from Prisma's `Arbetsorder` type.
// Reasoning: To resolve TypeScript error TS2430 by ensuring type compatibility with the base Prisma type.
// --- start diff ---
// File: app/(skyddade-sidor)/kalender/komponenter/kalender-dialog.tsx
'use client';

import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; 

import { zodResolver } from "@hookform/resolvers/zod";
import { MotesTyp, Kund, Privatperson, Foretag, Arbetsorder as PrismaArbetsorder, ArbetsorderStatus, Orderrad as PrismaOrderrad, Prislista, AnvandareRoll } from "@prisma/client";
import { format, addHours } from "date-fns";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Check, Briefcase, User as UserIcon, Phone, Home, Info, ListChecks, Users, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation"; 
import { useSession } from "next-auth/react";

interface ApiKund extends Kund { privatperson?: Privatperson | null; foretag?: Foretag | null; }
interface ApiOrderrad extends PrismaOrderrad { prislista: Prislista; }
// Ta bort ansvarigTeknikerId härifrån, den ärvs från PrismaArbetsorder
interface ApiArbetsorder extends PrismaArbetsorder { 
    kund?: ApiKund | null; 
    orderrader: ApiOrderrad[]; 
    // ansvarigTeknikerId?: number | null; // BORTTAGEN RAD
}

const kalenderSchema = z.object({
  titel: z.string().optional(),
  beskrivning: z.string().optional(),
  datumTid: z.string().min(1, "Välj ett startdatum och tid"),
  slutDatumTid: z.string().min(1, "Välj ett slutdatum och tid"),
  motestyp: z.enum([MotesTyp.ARBETSORDER, MotesTyp.MOTE, MotesTyp.SEMESTER, MotesTyp.ANNAT]),
  ansvarigId: z.string().min(1, "Välj en ansvarig person"),
  kundId: z.string().optional(), 
  arbetsorderId: z.string().optional(), 
  medarbetareIds: z.array(z.string()).optional(),
});
type KalenderFormValues = z.infer<typeof kalenderSchema>;

interface KalenderPanelContentProps {
  onEventCreated: () => void; 
  onPanelClose: () => void;  
  initialDate: Date | null; 
  initialEndDate?: Date | null; 
  anstallda: Array<{ id: number; fornamn: string; efternamn: string; }>;
  eventId?: number | null;    
}

export default function KalenderPanelContent({
  onEventCreated,
  onPanelClose,
  initialDate,
  initialEndDate, 
  anstallda,
  eventId = null, 
}: KalenderPanelContentProps) {
  const { data: session } = useSession();
  const isEditing = eventId !== null;
  const searchParams = useSearchParams(); 

  const [loading, setLoading] = useState(false); 
  const [deleting, setDeleting] = useState(false); 
  const [kunder, setKunder] = useState<ApiKund[]>([]);
  const [loadingKunder, setLoadingKunder] = useState(true);
  const [sokKund, setSokKund] = useState("");
  const [allaArbetsordrar, setAllaArbetsordrar] = useState<ApiArbetsorder[]>([]);
  const [loadingArbetsordrar, setLoadingArbetsordrar] = useState(true);
  const [sokArbetsorder, setSokArbetsorder] = useState("");
  const [sokAnsvarig, setSokAnsvarig] = useState("");
  const [sokMedarbetare, setSokMedarbetare] = useState("");
  
  const [loadingInitialData, setLoadingInitialData] = useState(!isEditing); 

  const initialValuesSetRef = useRef(false);


  const form = useForm<KalenderFormValues>({
    resolver: zodResolver(kalenderSchema),
    defaultValues: { 
        titel: "",
        beskrivning: "",
        datumTid: "", 
        slutDatumTid: "", 
        motestyp: MotesTyp.MOTE,
        ansvarigId: session?.user?.id || "", 
        kundId: "ingen",
        arbetsorderId: "ingen",
        medarbetareIds: [],
    }
  });

  const fetchEvent = useCallback(async (id: number) => { 
    setLoadingInitialData(true); 
    try { 
      const r = await fetch(`/api/kalender/${id}`); 
      if (!r.ok) throw Error('Kunde inte hämta händelse'); 
      const d = await r.json(); 
      form.reset({ 
        titel: d.titel || "", 
        beskrivning: d.beskrivning || "", 
        datumTid: format(new Date(d.datumTid),"yyyy-MM-dd'T'HH:mm"), 
        slutDatumTid: format(new Date(d.slutDatumTid),"yyyy-MM-dd'T'HH:mm"), 
        motestyp: d.motestyp, 
        ansvarigId: d.ansvarigId.toString(), 
        kundId: d.kundId?.toString() || "ingen", 
        arbetsorderId: d.arbetsorderId?.toString() || "ingen", 
        medarbetareIds: d.medarbetare?.map((m:{anvandare:{id:number}})=>m.anvandare.id.toString()) || [] 
      }); 
      initialValuesSetRef.current = true;
    } catch(e){
      toast.error("Kunde inte hämta händelsedata.");
      console.error(e);
      onPanelClose(); 
    } finally {
      setLoadingInitialData(false);
    } 
  }, [form, onPanelClose]);

  useEffect(() => {
    if (isEditing || initialValuesSetRef.current) {
      return;
    }

    setLoadingInitialData(true);
    const nyHandelseForAOQueryParam = searchParams.get('nyHandelseForAO');
    const ansvarigQueryParam = searchParams.get('ansvarig');

    const determineInitialAnsvarig = async () => {
      if (ansvarigQueryParam) {
        return ansvarigQueryParam;
      }
      if (nyHandelseForAOQueryParam) {
        try {
          const response = await fetch(`/api/arbetsordrar/${nyHandelseForAOQueryParam}`);
          if (response.ok) {
            const aoData: ApiArbetsorder = await response.json();
            // aoData.ansvarigTeknikerId ärvs nu korrekt som number | null
            if (aoData.ansvarigTeknikerId !== null && aoData.ansvarigTeknikerId !== undefined) { 
              return aoData.ansvarigTeknikerId.toString();
            }
          }
        } catch (error) {
          console.error("Fel vid hämtning av AO för initial ansvarig:", error);
        }
      }
      return session?.user?.id || ""; 
    };

    determineInitialAnsvarig().then(ansvarig => {
      let defaultValuesUpdate: KalenderFormValues = {
          titel: "",
          beskrivning: "",
          motestyp: nyHandelseForAOQueryParam ? MotesTyp.ARBETSORDER : MotesTyp.MOTE,
          ansvarigId: ansvarig,
          kundId: "ingen", 
          arbetsorderId: nyHandelseForAOQueryParam || "ingen", 
          medarbetareIds: [],
          datumTid: initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          slutDatumTid: "" 
      };

      if (initialEndDate) {
          defaultValuesUpdate.slutDatumTid = format(initialEndDate, "yyyy-MM-dd'T'HH:mm");
      } else {
          let endDateObject = initialDate ? new Date(initialDate) : new Date();
          endDateObject = addHours(endDateObject, 1);
          defaultValuesUpdate.slutDatumTid = format(endDateObject, "yyyy-MM-dd'T'HH:mm");
      }
      
      if (nyHandelseForAOQueryParam && allaArbetsordrar.length > 0) {
        const ao = allaArbetsordrar.find(a => a.id.toString() === nyHandelseForAOQueryParam);
        if (ao?.kundId) {
            defaultValuesUpdate.kundId = ao.kundId.toString();
        }
      }

      form.reset(defaultValuesUpdate);
      initialValuesSetRef.current = true;
      setLoadingInitialData(false);
    });

  }, [
      isEditing, 
      initialDate, 
      initialEndDate, 
      searchParams, 
      session, 
      form,
      allaArbetsordrar 
  ]);


  useEffect(() => {
    if (isEditing && eventId && !initialValuesSetRef.current) { 
      fetchEvent(eventId);
    }
  }, [eventId, isEditing, fetchEvent]);

  useEffect(() => { 
    fetchKunder(); 
    fetchAllaArbetsordrar(); 
  }, []);

  const fetchKunder = async () => { setLoadingKunder(true); try { const r = await fetch("/api/kunder?pageSize=10000"); if(!r.ok) throw Error('Kunde inte hämta kunder'); setKunder((await r.json()).kunder||[]); } catch(e){console.error(e);} finally {setLoadingKunder(false);} };
  const fetchAllaArbetsordrar = async () => { setLoadingArbetsordrar(true); try { const r = await fetch(`/api/arbetsordrar?status=${ArbetsorderStatus.MATNING},${ArbetsorderStatus.OFFERT},${ArbetsorderStatus.AKTIV},${ArbetsorderStatus.SLUTFORD}&pageSize=10000&includeOrderrader=true&includeAnsvarig=true`); if(!r.ok) throw Error('Kunde inte hämta arbetsordrar'); setAllaArbetsordrar((await r.json()).arbetsordrar||[]); } catch(e){ console.error(e); toast.error("Kunde inte hämta arbetsordrar för kalendern."); } finally { setLoadingArbetsordrar(false); } };
  
  const getKundNamn = (kund: ApiKund | null | undefined) => { if (!kund) return ""; if (kund.privatperson) return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`; if (kund.foretag) return kund.foretag.foretagsnamn; return `Kund #${kund.id}`; };
  const getArbetsorderStatusText = (status: ArbetsorderStatus | undefined) => { if (!status) return ""; const map: Record<ArbetsorderStatus, string> = { [ArbetsorderStatus.MATNING]: 'Mätning', [ArbetsorderStatus.OFFERT]: 'Offert', [ArbetsorderStatus.AKTIV]: 'Aktiv', [ArbetsorderStatus.SLUTFORD]: 'Slutförd', [ArbetsorderStatus.FAKTURERAD]: 'Fakturerad', [ArbetsorderStatus.AVBRUTEN]: 'Avbruten' }; return map[status] || status.toString(); };
  
  const watchedMotestyp = form.watch("motestyp");
  const watchedKundId = form.watch("kundId");
  const watchedArbetsorderId = form.watch("arbetsorderId");
  const watchedAnsvarigId = form.watch("ansvarigId");
  const watchedMedarbetareIds = form.watch("medarbetareIds") || [];

  const valdKund = useMemo(() => kunder.find(k => k.id.toString() === watchedKundId), [kunder, watchedKundId]);
  const valdArbetsorder = useMemo(() => allaArbetsordrar.find(ao => ao.id.toString() === watchedArbetsorderId), [allaArbetsordrar, watchedArbetsorderId]);
  const valdAnsvarig = useMemo(() => anstallda.find(a => a.id.toString() === watchedAnsvarigId), [anstallda, watchedAnsvarigId]);
  const valdaMedarbetare = useMemo(() => anstallda.filter(a => watchedMedarbetareIds.includes(a.id.toString())), [anstallda, watchedMedarbetareIds]);

  const filtreradeKunder = useMemo(() => { if (!sokKund) return kunder; return kunder.filter(k => getKundNamn(k).toLowerCase().includes(sokKund.toLowerCase())); }, [sokKund, kunder]);
  const filtreradeArbetsordrarForKalenderVal = useMemo(() => { 
    let aoForVal = allaArbetsordrar.filter(ao => 
        ao.status === ArbetsorderStatus.MATNING || ao.status === ArbetsorderStatus.AKTIV
    ); 
    if (watchedKundId && watchedKundId !== "ingen") { 
      aoForVal = aoForVal.filter(ao => ao.kundId?.toString() === watchedKundId); 
    } 
    if (!sokArbetsorder) return aoForVal; 
    return aoForVal.filter(ao => 
      `#${ao.id} - ${getArbetsorderStatusText(ao.status)} - ${ao.referensMärkning || ao.material || "Arbetsorder"}`.toLowerCase().includes(sokArbetsorder.toLowerCase()) || 
      (ao.kund && getKundNamn(ao.kund).toLowerCase().includes(sokArbetsorder.toLowerCase()))
    ); 
  }, [watchedKundId, allaArbetsordrar, sokArbetsorder]);

  const filtreradeAnstalldaForAnsvarig = useMemo(() => { if (!sokAnsvarig) return anstallda; return anstallda.filter(a => `${a.fornamn} ${a.efternamn}`.toLowerCase().includes(sokAnsvarig.toLowerCase())); }, [sokAnsvarig, anstallda]);
  const filtreradeAnstalldaForMedarbetare = useMemo(() => { let medarbetareOptions = anstallda.filter(a => a.id.toString() !== watchedAnsvarigId); if (!sokMedarbetare) return medarbetareOptions; return medarbetareOptions.filter(a => `${a.fornamn} ${a.efternamn}`.toLowerCase().includes(sokMedarbetare.toLowerCase())); }, [sokMedarbetare, anstallda, watchedAnsvarigId]);
  
  useEffect(() => { 
    if (watchedArbetsorderId && watchedArbetsorderId !== "ingen" && allaArbetsordrar.length > 0) { 
      const ao = allaArbetsordrar.find(a => a.id.toString() === watchedArbetsorderId); 
      if (ao?.kundId && form.getValues("kundId") !== ao.kundId.toString()) {
        form.setValue("kundId", ao.kundId.toString(), {shouldValidate:true});
      }
      
      if (!isEditing && !searchParams.get('ansvarig') && ao?.ansvarigTeknikerId != null && form.getValues("ansvarigId") !== ao.ansvarigTeknikerId.toString()) {
          form.setValue("ansvarigId", ao.ansvarigTeknikerId.toString(), {shouldValidate:true});
      }
    } 
  }, [watchedArbetsorderId, allaArbetsordrar, form, isEditing, searchParams]); 
  
  useEffect(() => { 
    const aoId = form.getValues("arbetsorderId"); 
    if (watchedKundId !== "ingen" && aoId !== "ingen" && allaArbetsordrar.length > 0) { 
      const ao = allaArbetsordrar.find(a=>a.id.toString()===aoId); 
      if(ao?.kundId?.toString()!==watchedKundId) {
        form.setValue("arbetsorderId","ingen",{shouldValidate:true});
      }
    }
  }, [watchedKundId, allaArbetsordrar, form]); 

  const onSubmit = async (data: KalenderFormValues) => { 
    setLoading(true); 
    try { 
      const medarbetareIdsNum = (data.medarbetareIds || []).filter(id => id !== data.ansvarigId).map(id => parseInt(id)); 
      const payload = { 
        ...data, 
        ansvarigId: parseInt(data.ansvarigId), 
        kundId: data.kundId && data.kundId !== "ingen" ? parseInt(data.kundId) : null, 
        arbetsorderId: data.arbetsorderId && data.arbetsorderId !== "ingen" ? parseInt(data.arbetsorderId) : null, 
        medarbetareIds: medarbetareIdsNum 
      }; 
      const url = eventId ? `/api/kalender/${eventId}` : "/api/kalender"; 
      const method = eventId ? "PUT" : "POST"; 
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); 
      if (!response.ok) { 
        const errorData = await response.json(); 
        toast.error(errorData.error || "Något gick fel."); 
        throw new Error(errorData.error || "Något gick fel"); 
      } 
      toast.success(eventId ? "Händelsen uppdaterad" : "Händelsen sparad"); 
      onEventCreated(); 
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async () => { 
    if (!eventId) return; 
    setDeleting(true); 
    try { 
      const response = await fetch(`/api/kalender/${eventId}`, { method: "DELETE" }); 
      if (!response.ok) { 
        const errorData = await response.json(); 
        toast.error(errorData.error || "Kunde inte ta bort."); 
        throw new Error(errorData.error || "Kunde inte ta bort"); 
      } 
      toast.success("Händelsen borttagen"); 
      onEventCreated(); 
    } catch (e) { 
      console.error(e); 
    } finally { 
      setDeleting(false); 
    }
  };

  const showKundSelection = watchedMotestyp === MotesTyp.ARBETSORDER || watchedMotestyp === MotesTyp.MOTE;
  const showArbetsorderSelection = watchedMotestyp === MotesTyp.ARBETSORDER;
  const shouldRenderPreviewSection = showKundSelection && (!!valdKund || (!!valdArbetsorder && showArbetsorderSelection));

  const isAnsvarigFieldDisabled = useMemo(() => {
    if (!isEditing) return false; 
    
    // Få tag på originalansvarig för *denna specifika kalenderhändelse*.
    // Detta värde sätts när `fetchEvent` körs och formuläret fylls.
    const originalEventAnsvarigIdForThisEdit = form.getValues("ansvarigId"); 

    if (session?.user?.role === AnvandareRoll.ADMIN || session?.user?.role === AnvandareRoll.ARBETSLEDARE) {
      return false; 
    }
    if (session?.user?.role === AnvandareRoll.TEKNIKER) {
      return originalEventAnsvarigIdForThisEdit !== session?.user?.id;
    }
    return true; 
  }, [isEditing, session, form]);


  if (loadingInitialData && !isEditing) {
    return <div className="p-6 flex justify-center items-center min-h-[200px]"><Loader2 className="h-6 w-6 animate-spin"/> Laddar formulär...</div>;
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex-grow flex flex-col">
        <div className="space-y-3 flex-grow pb-1"> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 items-start">
                <FormField control={form.control} name="motestyp" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Typ *</FormLabel> <Select onValueChange={field.onChange} value={field.value} > <FormControl><SelectTrigger className="h-9 w-full"><SelectValue placeholder="Välj typ" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={MotesTyp.ARBETSORDER}>Arbetsorder</SelectItem> <SelectItem value={MotesTyp.MOTE}>Möte</SelectItem> <SelectItem value={MotesTyp.SEMESTER}>Semester</SelectItem> <SelectItem value={MotesTyp.ANNAT}>Annat</SelectItem> </SelectContent> </Select> <FormMessage className="text-xs"/> </FormItem> )} />
                {showKundSelection ? ( <FormField control={form.control} name="kundId" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Kund</FormLabel> <Select onValueChange={field.onChange} value={field.value || "ingen"} disabled={loadingKunder}> <FormControl><SelectTrigger className="h-9 w-full"><SelectValue placeholder="Välj kund" /></SelectTrigger></FormControl> 
                <SelectContent>
                    <div className="p-1">
                        <Input 
                            placeholder="Sök kund..." 
                            value={sokKund} 
                            onChange={e => setSokKund(e.target.value)} 
                            className="h-8 text-xs"/>
                    </div>
                    <SelectItem value="ingen">Ingen kund</SelectItem> 
                    {loadingKunder && <div className="p-2 text-xs text-center text-gray-500"><Loader2 className="inline h-3 w-3 mr-1 animate-spin"/>Laddar...</div>}
                    {!loadingKunder && filtreradeKunder.length === 0 && <div className="p-2 text-xs text-center text-gray-500">Inga träffar</div>}
                    {filtreradeKunder.map((kund) => ( <SelectItem key={kund.id} value={kund.id.toString()}>{getKundNamn(kund)}</SelectItem> ))} 
                </SelectContent> </Select> <FormMessage className="text-xs"/> </FormItem> )} /> ) : <div className="hidden md:block"></div>}
                {showArbetsorderSelection ? ( 
                    <FormField 
                        control={form.control} 
                        name="arbetsorderId" 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel className="text-xs">Arbetsorder</FormLabel> 
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || "ingen"} 
                                    disabled={loadingArbetsordrar}
                                > 
                                <FormControl><SelectTrigger className="h-9 w-full"><SelectValue placeholder="Välj arbetsorder" /></SelectTrigger></FormControl> 
                                <SelectContent> 
                                    <div className="p-1">
                                        <Input 
                                            placeholder="Sök arbetsorder..." 
                                            value={sokArbetsorder} 
                                            onChange={e => setSokArbetsorder(e.target.value)} 
                                            className="h-8 text-xs"/>
                                    </div>
                                    <SelectItem value="ingen">Ingen arbetsorder</SelectItem> 
                                    {loadingArbetsordrar && <div className="p-2 text-xs text-center text-gray-500"><Loader2 className="inline h-3 w-3 mr-1 animate-spin"/>Laddar...</div>}
                                    {!loadingArbetsordrar && filtreradeArbetsordrarForKalenderVal.length === 0 && <div className="p-2 text-xs text-center text-gray-500">Inga valbara arbetsordrar</div>}
                                    {filtreradeArbetsordrarForKalenderVal.map((ao) => ( 
                                        <SelectItem key={ao.id} value={ao.id.toString()}>#{ao.id} - {getArbetsorderStatusText(ao.status)} - {ao.referensMärkning || ao.material?.substring(0,20) || "Arbetsorder"} {ao.kund && ` (${getKundNamn(ao.kund)})`}</SelectItem> 
                                    ))} 
                                </SelectContent> 
                                </Select> 
                                <FormMessage className="text-xs"/> 
                                {(form.getValues("arbetsorderId") && form.getValues("arbetsorderId") !== "ingen" && 
                                  !filtreradeArbetsordrarForKalenderVal.find(ao => ao.id.toString() === form.getValues("arbetsorderId"))) && (
                                    <FormDescription className="text-xs text-orange-600 dark:text-orange-400 pt-1">
                                        OBS: Vald arbetsorder har en status som inte kan schemaläggas (t.ex. Offert, Slutförd). Välj en arbetsorder med status Mätning eller Aktiv.
                                    </FormDescription>
                                )}
                            </FormItem> 
                        )} 
                    /> 
                ) : <div className="hidden md:block"></div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-1">
                <FormField control={form.control} name="titel" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Titel</FormLabel> <FormControl><Input className="h-9 text-sm" placeholder="Frivillig titel" {...field} value={field.value || ""} /></FormControl> <FormMessage className="text-xs"/> </FormItem> )} />
                <FormField control={form.control} name="beskrivning" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Beskrivning</FormLabel> <FormControl><Input className="h-9 text-sm" placeholder="Frivillig beskrivning" {...field} value={field.value || ""} /></FormControl> <FormMessage className="text-xs"/> </FormItem> )} />
            </div>
                            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
                <FormField control={form.control} name="datumTid" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Starttid *</FormLabel> <FormControl><Input className="h-9 text-sm" type="datetime-local" {...field} value={field.value || ""} /></FormControl> <FormMessage className="text-xs"/> </FormItem> )} />
                <FormField control={form.control} name="slutDatumTid" render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sluttid *</FormLabel> <FormControl><Input className="h-9 text-sm" type="datetime-local" {...field} value={field.value || ""} /></FormControl> <FormMessage className="text-xs"/> </FormItem> )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-6 gap-y-3 pt-2 items-start">
                <div className="space-y-3">
                    <FormField control={form.control} name="ansvarigId" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel className="text-xs">Ansvarig *</FormLabel> 
                            <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isAnsvarigFieldDisabled} 
                            > 
                            <FormControl><SelectTrigger className="h-9 w-full"><SelectValue placeholder="Välj ansvarig" /></SelectTrigger></FormControl> 
                            <SelectContent>
                                <div className="p-1">
                                    <Input 
                                        placeholder="Sök..." 
                                        value={sokAnsvarig} 
                                        onChange={e => setSokAnsvarig(e.target.value)} 
                                        className="h-8 text-xs"/>
                                </div>
                                {anstallda.length === 0 && !sokAnsvarig ? <div className="p-2 text-xs text-center text-gray-500">Laddar/Inga anställda</div> :
                                filtreradeAnstalldaForAnsvarig.length === 0 && sokAnsvarig ? <div className="p-2 text-xs text-center text-gray-500">Inga träffar</div> :
                                filtreradeAnstalldaForAnsvarig.map((a) => ( <SelectItem key={a.id} value={a.id.toString()}>{a.fornamn} {a.efternamn}</SelectItem> ))} 
                            </SelectContent> 
                            </Select> 
                            <FormMessage className="text-xs"/> 
                        </FormItem> 
                    )}/>
                    <FormField
                        control={form.control}
                        name="medarbetareIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Övriga medarbetare</FormLabel>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
                                            <span className="truncate">
                                            {valdaMedarbetare.length > 0 ? `${valdaMedarbetare.length} valda` : "Välj medarbetare..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }} className="max-h-60 overflow-y-auto p-0">
                                        <div className="p-2 sticky top-0 bg-background z-10 border-b">
                                            <Input 
                                                placeholder="Sök medarbetare..." 
                                                value={sokMedarbetare} 
                                                onChange={e => setSokMedarbetare(e.target.value)} 
                                                className="h-8 text-xs"
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                        </div>
                                        <div className="p-1">
                                            {filtreradeAnstalldaForMedarbetare.length === 0 && ( <div className="p-2 text-xs text-center text-gray-500"> Inga träffar {sokMedarbetare ? 'för sökningen': ''} </div> )}
                                            {filtreradeAnstalldaForMedarbetare.map((a) => { 
                                                const isSelected = field.value?.includes(a.id.toString()); 
                                                return ( 
                                                    <DropdownMenuCheckboxItem key={a.id} checked={isSelected} onCheckedChange={(checked) => { const val = a.id.toString(); const curr = field.value || []; if (checked) { field.onChange([...curr, val]); } else { field.onChange(curr.filter(v => v !== val)); } }} onSelect={(e) => e.preventDefault()} className="text-xs"> 
                                                        {a.fornamn} {a.efternamn}
                                                    </DropdownMenuCheckboxItem>
                                                ); 
                                            })} 
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <FormMessage className="text-xs"/> 
                            </FormItem> 
                        )}
                    />
                </div>
                 <div className="text-xs space-y-1 md:pt-[26px]">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center mb-1">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground"/>Arbetsteam
                    </h4>
                    <div className="p-2 border border-dashed rounded-md bg-slate-50 dark:bg-slate-800/30 space-y-0.5 min-h-[5rem]">
                        {valdAnsvarig ? ( <p><strong className="text-gray-600 dark:text-gray-400">Ansvarig:</strong> {valdAnsvarig.fornamn} {valdAnsvarig.efternamn}</p> ) : ( <p className="text-muted-foreground italic">Välj ansvarig...</p> )}
                        {valdaMedarbetare.length > 0 && ( <div className="pt-0.5"> <p><strong className="text-gray-600 dark:text-gray-400">Medarbetare:</strong></p> <ul className="list-disc list-inside pl-1"> {valdaMedarbetare.map(m => <li key={m.id} className="truncate">{m.fornamn} {m.efternamn}</li>)} </ul> </div> )}
                        {valdaMedarbetare.length === 0 && !valdAnsvarig && <p className="text-muted-foreground italic text-center pt-2">Inget team valt.</p>}
                        {valdaMedarbetare.length === 0 && valdAnsvarig && <p className="text-muted-foreground italic pt-1">Inga övriga medarbetare.</p>}
                    </div>
                </div>
            </div>

            {shouldRenderPreviewSection && ( 
                <div className="pt-3 mt-3 border-t"> 
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Vald Information:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {valdKund && ( <div className="text-xs text-muted-foreground p-2 border border-dashed rounded-md bg-slate-50 dark:bg-slate-800/30 space-y-0.5"> <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><UserIcon className="w-3.5 h-3.5 inline mr-1.5"/>{getKundNamn(valdKund)}</p> <p><Phone className="w-3 h-3 inline mr-1.5"/>{valdKund.telefonnummer}</p> <p><Home className="w-3 h-3 inline mr-1.5"/>{valdKund.adress}</p> {valdKund.epost && <p className="truncate"><Info className="w-3 h-3 inline mr-1.5"/>{valdKund.epost}</p>} </div> )}
                        {(!valdKund && valdArbetsorder && showArbetsorderSelection) && <div className="hidden md:block"></div>}
                        {valdArbetsorder && showArbetsorderSelection && ( <div className={cn( "text-xs text-muted-foreground p-2 border border-dashed rounded-md bg-slate-50 dark:bg-slate-800/30 space-y-0.5", !valdKund && "md:col-span-2" )}> <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><Briefcase className="w-3.5 h-3.5 inline mr-1.5"/>Arbetsorder #{valdArbetsorder.id}</p> <p>Status: {getArbetsorderStatusText(valdArbetsorder.status)}</p> {!valdKund && valdArbetsorder.kund && <p><UserIcon className="w-3 h-3 inline mr-1.5"/>{getKundNamn(valdArbetsorder.kund)}</p>} {valdArbetsorder.referensMärkning && <p>Ref: {valdArbetsorder.referensMärkning}</p>} {valdArbetsorder.orderrader && valdArbetsorder.orderrader.length > 0 && ( <div className="pt-1 mt-1 border-t border-dashed"> <p className="font-medium text-gray-600 dark:text-gray-400 mb-0.5 flex items-center"><ListChecks className="w-3.5 h-3.5 inline mr-1.5"/>Orderrader:</p> <ul className="list-disc list-inside pl-1 space-y-0.5 max-h-20 overflow-y-auto"> {valdArbetsorder.orderrader.map((rad: ApiOrderrad) => ( <li key={rad.id} className="truncate" title={`${rad.antal}x ${rad.prislista ? rad.prislista.namn : 'Okänd produkt'} ${rad.kommentar ? `(${rad.kommentar})` : ''}`}> {rad.antal}x {rad.prislista ? rad.prislista.namn : 'Okänd produkt'}</li> ))} </ul> </div> )} </div> )}
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex justify-between mt-auto pt-4 pb-1 border-t "> 
             <div> 
                {isEditing && ( <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading || deleting}> {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {deleting ? "Tar bort..." : "Ta bort"} </Button> )} 
            </div>
            <div className="flex gap-2"> 
                <Button type="button" variant="outline" onClick={onPanelClose} disabled={loading || deleting}> Avbryt </Button> 
                <Button type="submit" disabled={loading || deleting}> {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Sparar..." : (isEditing ? "Uppdatera" : "Spara")} </Button> 
            </div>
        </div>
      </form>
    </Form>
  );
}
// --- end diff ---