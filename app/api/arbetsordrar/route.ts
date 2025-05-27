// File: app/api/arbetsordrar/route.ts
// Justering i GET-funktionen

import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus, Prisma } from '@prisma/client'; 
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const teknikerIdParam = searchParams.get('tekniker');
    const kundIdParam = searchParams.get('kundId');
    const otilldeladMatning = searchParams.get('otilldeladMatning') === 'true';
    const includeOrderraderParam = searchParams.get('includeOrderrader') === 'true';
    const ansvarigForObokadeIdParam = searchParams.get('ansvarigForObokadeId');
    const allAssignedButUnbookedParam = searchParams.get('allAssignedButUnbooked') === 'true';


    const skip = (page - 1) * pageSize;
    let whereInput: Prisma.ArbetsorderWhereInput = {};

    if (ansvarigForObokadeIdParam) {
        const teknikerId = parseInt(ansvarigForObokadeIdParam);
        if (!isNaN(teknikerId)) {
            whereInput.ansvarigTeknikerId = teknikerId;
            // Tekniker ska bara se sina MATNING och AKTIV som obokade
            whereInput.status = { in: [ArbetsorderStatus.MATNING, ArbetsorderStatus.AKTIV] };
        }
    } else if (allAssignedButUnbookedParam) {
        whereInput.ansvarigTeknikerId = { not: null };
        // Admin/AL ska också bara se MATNING och AKTIV som "jobb att boka"
        whereInput.status = { in: [ArbetsorderStatus.MATNING, ArbetsorderStatus.AKTIV] };
    } else if (otilldeladMatning) {
      whereInput = { 
        status: ArbetsorderStatus.MATNING,
        ansvarigTeknikerId: null 
      };
      if (kundIdParam) whereInput.kundId = parseInt(kundIdParam);
    } else {
        if (statusParam) {
          const statusArray = statusParam.split(',') as ArbetsorderStatus[];
          if (statusArray.length > 0) {
            whereInput.status = { in: statusArray };
          }
        }
        if (teknikerIdParam) {
          whereInput.ansvarigTeknikerId = parseInt(teknikerIdParam);
        }
        if (kundIdParam) {
          whereInput.kundId = parseInt(kundIdParam);
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
    }
    
    const total = await prisma.arbetsorder.count({ where: whereInput });

    const arbetsordrar = await prisma.arbetsorder.findMany({
      where: whereInput,
      include: {
        kund: {
          include: {
            privatperson: true,
            foretag: true,
          },
        },
        ansvarigTekniker: { 
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
        orderrader: includeOrderraderParam ? { 
          include: {
            prislista: true, 
          },
        } : { 
          select: { id: true } 
        },
        bilder: { 
          select: { id: true },
        },
        skapadAv: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
      },
      skip: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? 0 : skip,
      take: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? 100 : pageSize, 
      orderBy: {
        skapadDatum: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? 'asc' : 'desc', 
      },
    });
    
    const statusCountsWhere: Prisma.ArbetsorderWhereInput = {};
    if(search && !(ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning)) {
        const searchIdNum = parseInt(search);
        statusCountsWhere.OR = [
            ...( !isNaN(searchIdNum) ? [{ id: searchIdNum }] : []),
            { referensMärkning: { contains: search, mode: 'insensitive' } },
            { material: { contains: search, mode: 'insensitive' } },
        ];
    }

    const statusCounts = await prisma.arbetsorder.groupBy({
      by: ['status'],
      _count: { 
        id: true
      },
      where: Object.keys(statusCountsWhere).length > 0 ? statusCountsWhere : undefined,
    });

    const statusStats = Object.values(ArbetsorderStatus).reduce((acc, curr) => {
      const found = statusCounts.find(item => item.status === curr);
      acc[curr] = (found && found._count && typeof found._count.id === 'number') ? found._count.id : 0;
      return acc;
    }, {} as Record<ArbetsorderStatus, number>);

    return NextResponse.json({
      arbetsordrar,
      pagination: {
        total,
        page: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? 1 : page, 
        pageSize: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? arbetsordrar.length : pageSize,
        totalPages: (ansvarigForObokadeIdParam || allAssignedButUnbookedParam || otilldeladMatning) ? 1 : Math.ceil(total / pageSize),
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

// POST /api/arbetsordrar - Skapa en ny arbetsorder
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