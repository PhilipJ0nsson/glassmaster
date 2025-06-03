// File: app/api/arbetsordrar/route.ts

import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus, Prisma, MotesTyp } from '@prisma/client'; 
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const teknikerIdParam = searchParams.get('tekniker');
    const kundIdParam = searchParams.get('kundId');
    const otilldeladMatning = searchParams.get('otilldeladMatning') === 'true';
    const otilldeladeAktiva = searchParams.get('otilldeladeAktiva') === 'true'; 
    const includeOrderraderParam = searchParams.get('includeOrderrader') === 'true';
    const ansvarigForObokadeIdParam = searchParams.get('ansvarigForObokadeId');
    const allAssignedButUnbookedParam = searchParams.get('allAssignedButUnbooked') === 'true';

    const skip = (page - 1) * pageSize;
    let whereInput: Prisma.ArbetsorderWhereInput = {};
    let finalArbetsordrar: any[] = [];
    let totalArbetsordrarCount = 0;

    const standardIncludes = {
        kund: { include: { privatperson: true, foretag: true } },
        ansvarigTekniker: { select: { id: true, fornamn: true, efternamn: true } },
        orderrader: includeOrderraderParam ? { include: { prislista: true } } : { select: { id: true } },
        bilder: { select: { id: true } },
        skapadAv: { select: { id: true, fornamn: true, efternamn: true } },
    };

    if (otilldeladMatning) {
      const potentiellaOtilldeladeMatningar = await prisma.arbetsorder.findMany({
          where: { 
            status: ArbetsorderStatus.MATNING,
            ansvarigTeknikerId: null 
          },
          include: { 
              ...standardIncludes,
              kalender: {
                  select: { id: true, hanteradAvAdmin: true, slutDatumTid: true } 
              }
          },
          orderBy: { skapadDatum: 'asc' },
          take: 100, 
      });

      finalArbetsordrar = potentiellaOtilldeladeMatningar.filter(ao => {
          const ärRedanHanteradEllerBokad = ao.kalender.some(k => k.hanteradAvAdmin || (!k.hanteradAvAdmin && k.slutDatumTid >= new Date()));
          return !ärRedanHanteradEllerBokad;
      }).map(ao => {
          const { kalender, ...restenAvAo } = ao; 
          return restenAvAo;
      });
      totalArbetsordrarCount = finalArbetsordrar.length;

    } else if (otilldeladeAktiva) {
        const potentiellaOtilldeladeAktiva = await prisma.arbetsorder.findMany({
            where: {
                status: ArbetsorderStatus.AKTIV,
                ansvarigTeknikerId: null
            },
            include: {
                ...standardIncludes,
                kalender: {
                    where: {
                        hanteradAvAdmin: false,
                        slutDatumTid: { gte: new Date() }
                    },
                    select: { id: true }
                }
            },
            orderBy: { skapadDatum: 'asc' },
            take: 100,
        });
        
        finalArbetsordrar = potentiellaOtilldeladeAktiva.filter(ao => ao.kalender.length === 0).map(ao => {
            const { kalender, ...restenAvAo } = ao;
            return restenAvAo;
        });
        totalArbetsordrarCount = finalArbetsordrar.length;

    } else if (ansvarigForObokadeIdParam || allAssignedButUnbookedParam) {
        let teknikerIdForFilter: number | undefined = undefined;
        if (ansvarigForObokadeIdParam) {
            const parsedId = parseInt(ansvarigForObokadeIdParam);
            if (!isNaN(parsedId)) teknikerIdForFilter = parsedId;
        }

        const aoWhereConditions: Prisma.ArbetsorderWhereInput = {
            status: { in: [ArbetsorderStatus.MATNING, ArbetsorderStatus.AKTIV] },
        };

        if (teknikerIdForFilter !== undefined) { 
            aoWhereConditions.ansvarigTeknikerId = teknikerIdForFilter;
        } else if (allAssignedButUnbookedParam) { 
            aoWhereConditions.ansvarigTeknikerId = { not: null };
        }
        
        const potentiellaAO = await prisma.arbetsorder.findMany({
            where: aoWhereConditions,
            include: {
                ...standardIncludes,
                kalender: { 
                    select: { id: true, hanteradAvAdmin: true, slutDatumTid: true } 
                }
            },
            orderBy: { skapadDatum: 'asc' },
            take: 200, 
        });
        
        for (const ao of potentiellaAO) {
            let ärObokad = true;
            if (ao.status === ArbetsorderStatus.MATNING) {
                const ärRedanHanteradEllerBokad = ao.kalender.some(k => k.hanteradAvAdmin || (!k.hanteradAvAdmin && k.slutDatumTid >= new Date()));
                if (ärRedanHanteradEllerBokad) {
                    ärObokad = false;
                }
            } else if (ao.status === ArbetsorderStatus.AKTIV) {
                const harKommandeEjHanteradBokning = ao.kalender.some(k => !k.hanteradAvAdmin && k.slutDatumTid >= new Date());
                if (harKommandeEjHanteradBokning) {
                    ärObokad = false;
                }
            }
            if (ärObokad) {
                const { kalender, ...restenAvAo } = ao;
                finalArbetsordrar.push(restenAvAo);
            }
        }
        totalArbetsordrarCount = finalArbetsordrar.length;
    } else {
        // Standardfiltrering för huvudsidan /arbetsordrar
        if (statusParam) {
          const statusArray = statusParam.split(',') as ArbetsorderStatus[];
          if (statusArray.length > 0 && statusArray.every(s => Object.values(ArbetsorderStatus).includes(s))) {
            whereInput.status = { in: statusArray };
          }
        }
        if (teknikerIdParam) {
          const parsedTeknikerId = parseInt(teknikerIdParam);
          if(!isNaN(parsedTeknikerId)) whereInput.ansvarigTeknikerId = parsedTeknikerId;
        }
        if (kundIdParam) {
          const parsedKundId = parseInt(kundIdParam);
          if (!isNaN(parsedKundId)) whereInput.kundId = parsedKundId;
        }

        if (search) { 
          const searchId = parseInt(search);
          const searchORConditions: Prisma.ArbetsorderWhereInput[] = [ 
            { kund: { privatperson: { OR: [ { fornamn: { contains: search, mode: 'insensitive' } }, { efternamn: { contains: search, mode: 'insensitive' } } ] } } },
            { kund: { foretag: { foretagsnamn: { contains: search, mode: 'insensitive' } } } },
            ...( !isNaN(searchId) ? [{ id: searchId }] : []),
            { referensMärkning: { contains: search, mode: 'insensitive' } },
            { material: { contains: search, mode: 'insensitive' } },
          ];
          
          if (Object.keys(whereInput).length > 0) {
            whereInput.AND = whereInput.AND ? [...(Array.isArray(whereInput.AND) ? whereInput.AND : [whereInput.AND]), { OR: searchORConditions }] : [{ OR: searchORConditions }];
          } else {
            whereInput.OR = searchORConditions;
          }
        }
        totalArbetsordrarCount = await prisma.arbetsorder.count({ where: whereInput });
        finalArbetsordrar = await prisma.arbetsorder.findMany({
            where: whereInput,
            include: standardIncludes,
            skip: skip,
            take: pageSize,
            orderBy: { skapadDatum: 'desc' },
        });
    }
    
    const statusCountsWhere: Prisma.ArbetsorderWhereInput = {};
    if(search && !(ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning || otilldeladeAktiva)) {
        const searchIdNum = parseInt(search);
        statusCountsWhere.OR = [
            ...( !isNaN(searchIdNum) ? [{ id: searchIdNum }] : []),
            { referensMärkning: { contains: search, mode: 'insensitive' } },
            { material: { contains: search, mode: 'insensitive' } },
            { kund: { privatperson: { OR: [ { fornamn: { contains: search, mode: 'insensitive' } }, { efternamn: { contains: search, mode: 'insensitive' } } ] } } },
            { kund: { foretag: { foretagsnamn: { contains: search, mode: 'insensitive' } } } },
        ];
         if (kundIdParam) {
            const parsedKundId = parseInt(kundIdParam);
            if(!isNaN(parsedKundId)) {
                 statusCountsWhere.AND = statusCountsWhere.AND ? 
                    [...(Array.isArray(statusCountsWhere.AND) ? statusCountsWhere.AND : [statusCountsWhere.AND]), { kundId: parsedKundId }] 
                    : [{ kundId: parsedKundId }];
            }
        }
    } else if (kundIdParam && !(ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning || otilldeladeAktiva)) {
         const parsedKundId = parseInt(kundIdParam);
         if(!isNaN(parsedKundId)) statusCountsWhere.kundId = parsedKundId;
    }

    const statusCounts = await prisma.arbetsorder.groupBy({
      by: ['status'],
      _count: { id: true },
      where: Object.keys(statusCountsWhere).length > 0 ? statusCountsWhere : undefined,
    });

    const statusStats = Object.values(ArbetsorderStatus).reduce((acc, curr) => {
      const found = statusCounts.find(item => item.status === curr);
      acc[curr] = (found && found._count && typeof found._count.id === 'number') ? found._count.id : 0;
      return acc;
    }, {} as Record<ArbetsorderStatus, number>);

    const isSpecialFilterForDashboard = !!(ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladeAktiva || otilldeladMatning);

    return NextResponse.json({
      arbetsordrar: finalArbetsordrar,
      pagination: {
        total: totalArbetsordrarCount,
        page: isSpecialFilterForDashboard ? 1 : page, 
        pageSize: isSpecialFilterForDashboard ? finalArbetsordrar.length : pageSize,
        totalPages: isSpecialFilterForDashboard ? (totalArbetsordrarCount > 0 ? 1 : 0) : Math.ceil(totalArbetsordrarCount / pageSize),
      },
      statusStats,
    });

  } catch (error) {
    console.error('Fel vid hämtning av arbetsordrar:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av arbetsordrar' },
      { status: 500 }
    );
  }
}

// POST-funktionen
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.id) { 
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id as string);
    const body = await req.json();
    
    const { 
      kundId, 
      ROT, 
      ROTprocentsats,
      arbetstid,
      material,
      referensMärkning,
      ansvarigTeknikerId, 
      status, 
      orderrader = [],
    } = body;

    const kundIdInt = typeof kundId === 'string' ? parseInt(kundId) : kundId;
    
    if (!kundIdInt || isNaN(kundIdInt)) {
      return NextResponse.json(
        { error: 'Ogiltigt kund-ID' },
        { status: 400 }
      );
    }
    
    const kund = await prisma.kund.findUnique({
      where: { id: kundIdInt }
    });

    if (!kund) {
      return NextResponse.json(
        { error: 'Kunden hittades inte' },
        { status: 400 }
      );
    }

    let ansvarigTeknikerIdForDb: number | null = null; 
    if (ansvarigTeknikerId && ansvarigTeknikerId !== "none" && ansvarigTeknikerId !== "") {
      const parsedId = parseInt(ansvarigTeknikerId);
      if (isNaN(parsedId)) {
        return NextResponse.json({error: "Ogiltigt tekniker-ID format"}, {status: 400});
      }
      const tekniker = await prisma.anvandare.findUnique({
        where: { id: parsedId } 
      });
      if (!tekniker) {
        return NextResponse.json(
          { error: `Tekniker med ID ${parsedId} hittades inte` },
          { status: 400 }
        );
      }
      ansvarigTeknikerIdForDb = parsedId; 
    }


    let totalPrisExklMoms = 0;
    let totalPrisInklMoms = 0;

    const orderraderData = await Promise.all(
      orderrader.map(async (rad: any) => {
        if (!rad || Object.keys(rad).length === 0 || !rad.prislistaId) {
          return null; 
        }
        
        const prislistaIdInt = typeof rad.prislistaId === 'string' ? parseInt(rad.prislistaId) : rad.prislistaId;
        if (isNaN(prislistaIdInt)) return null;
        
        const antalInt = parseInt(rad.antal) || 1;
        const rabattProcentFloat = parseFloat(rad.rabattProcent || "0") || 0;
        
        const prispost = await prisma.prislista.findUnique({
          where: { id: prislistaIdInt }
        });

        if (!prispost) {
          console.error(`Prispost med ID ${prislistaIdInt} hittades inte för orderrad.`);
          return null; 
        }
        
        let mangd = 1;
        if (prispost.prissattningTyp === 'M2' && rad.bredd && rad.hojd) {
          const bredd = parseFloat(rad.bredd.toString()) / 1000;
          const hojd = parseFloat(rad.hojd.toString()) / 1000;
          if (!isNaN(bredd) && !isNaN(hojd) && bredd > 0 && hojd > 0) mangd = bredd * hojd;
        } else if (prispost.prissattningTyp === 'M' && rad.langd) {
          const langd = parseFloat(rad.langd.toString()) / 1000;
          if (!isNaN(langd) && langd > 0) mangd = langd;
        } else if (prispost.prissattningTyp === 'TIM' && rad.tid) {
          const tid = parseFloat(rad.tid.toString());
          if (!isNaN(tid) && tid > 0) mangd = tid;
        }
        
        const currentRadPrisExklMoms = prispost.prisExklMoms * antalInt * mangd * (1 - rabattProcentFloat / 100);
        const currentRadPrisInklMoms = prispost.prisInklMoms * antalInt * mangd * (1 - rabattProcentFloat / 100);
        
        totalPrisExklMoms += currentRadPrisExklMoms;
        totalPrisInklMoms += currentRadPrisInklMoms;
        
        return {
          prislistaId: prislistaIdInt,
          antal: antalInt,
          bredd: rad.bredd ? parseFloat(rad.bredd.toString()) : null,
          hojd: rad.hojd ? parseFloat(rad.hojd.toString()) : null,
          langd: rad.langd ? parseFloat(rad.langd.toString()) : null,
          tid: rad.tid ? parseFloat(rad.tid.toString()) : null,
          rabattProcent: rabattProcentFloat,
          enhetsPrisExklMoms: prispost.prisExklMoms,
          enhetsMomssats: prispost.momssats,
          enhetsPrissattningTyp: prispost.prissattningTyp,
          radPrisExklMoms: currentRadPrisExklMoms,
          radPrisInklMoms: currentRadPrisInklMoms,
          kommentar: rad.kommentar || null,
        };
      })
    );

    const filtreradeOrderrader = orderraderData.filter(rad => rad !== null) as any[]; 
    
    const nyArbetsorder = await prisma.arbetsorder.create({
      data: {
        kund: { connect: { id: kundIdInt } },
        ROT: !!ROT,
        ROTprocentsats: ROT ? (ROTprocentsats ? parseFloat(ROTprocentsats) : null) : null,
        arbetstid: arbetstid ? parseFloat(arbetstid) : null,
        material,
        referensMärkning,
        ansvarigTekniker: ansvarigTeknikerIdForDb !== null 
          ? { connect: { id: ansvarigTeknikerIdForDb } } 
          : undefined, 
        status: status as ArbetsorderStatus || ArbetsorderStatus.MATNING, 
        skapadAv: { connect: { id: userId } },
        uppdateradAv: { connect: { id: userId } },
        totalPrisExklMoms,
        totalPrisInklMoms,
        ...(filtreradeOrderrader.length > 0 ? {
          orderrader: {
            create: filtreradeOrderrader
          }
        } : {})
      },
      include: {
        kund: { include: { privatperson: true, foretag: true } },
        ansvarigTekniker: true,
        orderrader: { include: { prislista: true } },
        skapadAv: { select: { id: true, fornamn: true, efternamn: true } },
      }
    });

    return NextResponse.json(nyArbetsorder, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av arbetsorder:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: `Databasfel: Ett unikt värde kränktes. Fält: ${error.meta?.target}` }, { status: 409 });
        }
    }
     if (error instanceof Error && error.name === 'ZodError') { 
        return NextResponse.json({ error: 'Valideringsfel', details: (error as any).errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av arbetsorder', details: (error as Error).message },
      { status: 500 }
    );
  }
}