// File: app/api/kalender/route.ts
// Fullständig GET-funktion med ytterligare åtstramning för Admin/AL "Alla Aktiviteter".

import { prisma } from '@/lib/prisma';
import { MotesTyp, ArbetsorderStatus, Prisma, AnvandareRoll } from '@prisma/client'; 
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.id) { 
      return NextResponse.json( { error: 'Inte autentiserad eller användar-ID saknas' }, { status: 401 });
    }
    const currentUserRole = session.user.role;
    const currentUserId = parseInt(session.user.id as string);

    const { searchParams } = new URL(req.url);
    const startDateQuery = searchParams.get('start'); 
    const endDateQuery = searchParams.get('end');   
    const ansvarigIdQuery = searchParams.get('ansvarigId'); 
    const forAnvandareId = searchParams.get('forAnvandareId'); 
    const fetchHistorik = searchParams.get('historik') === 'true';
    const visaHanterade = searchParams.get('visaHanterade') === 'true'; 

    let whereClause: Prisma.KalenderWhereInput = {}; 
    let orderBy: Prisma.KalenderOrderByWithRelationInput | Prisma.KalenderOrderByWithRelationInput[] = { datumTid: 'asc' };

    let filterOnUserId: number | null = null;
    if (forAnvandareId) {
        filterOnUserId = parseInt(forAnvandareId);
    } else if (ansvarigIdQuery) {
        filterOnUserId = parseInt(ansvarigIdQuery);
    } else if (currentUserRole === AnvandareRoll.TEKNIKER) {
        filterOnUserId = currentUserId;
    }
    if (filterOnUserId !== null && isNaN(filterOnUserId)) { 
        filterOnUserId = null; 
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fetchHistorik) { 
        orderBy = { datumTid: 'desc' };
        const historyConditions: Prisma.KalenderWhereInput = {
            OR: [
                { slutDatumTid: { lt: today } },
                { arbetsorder: { status: { in: [ArbetsorderStatus.OFFERT, ArbetsorderStatus.SLUTFORD, ArbetsorderStatus.FAKTURERAD, ArbetsorderStatus.AVBRUTEN] } } }
            ]
        };
        
        if (filterOnUserId !== null) { 
            whereClause.AND = [
                { OR: [ { ansvarigId: filterOnUserId }, { medarbetare: { some: { anvandareId: filterOnUserId } } } ] },
                historyConditions
            ];
        } else { 
            whereClause = historyConditions;
        }

        if (!visaHanterade && (currentUserRole === AnvandareRoll.ADMIN || currentUserRole === AnvandareRoll.ARBETSLEDARE)) {
            const hanteradFilter = { hanteradAvAdmin: false };
            whereClause.AND = whereClause.AND ? 
                              (Array.isArray(whereClause.AND) ? [...whereClause.AND, hanteradFilter] : [whereClause.AND, hanteradFilter]) : 
                              [hanteradFilter];
        }
    } else { // Logik för KOMMANDE händelser
        orderBy = { datumTid: 'asc' };
        
        // Grundvillkor som ALLTID ska gälla för kommande händelser
        const baseUpcomingConditions: Prisma.KalenderWhereInput[] = [
            { slutDatumTid: { gte: today } },
            { hanteradAvAdmin: false },
            { 
                OR: [ 
                    { arbetsorderId: null },
                    { arbetsorder: { status: { in: [ArbetsorderStatus.MATNING, ArbetsorderStatus.AKTIV] } } } 
                ]
            }
        ];
        
        if (filterOnUserId !== null) { // Om vi filtrerar på en specifik användare
             whereClause.AND = [
                { OR: [ { ansvarigId: filterOnUserId }, { medarbetare: { some: { anvandareId: filterOnUserId } } } ] },
                ...baseUpcomingConditions // Sprid ut de grundläggande villkoren här
            ];
        } else { // Ingen specifik användare (Admin/AL ser ALLA kommande, fortfarande med strikt statusfilter)
            whereClause.AND = baseUpcomingConditions;
        }

        // Lägg till datumintervall om det är huvudkalendern (inte specifik dashboard-hämtning) och datum är specificerade
        if (startDateQuery && endDateQuery) {
            const dateRangeCondition: Prisma.KalenderWhereInput = {
                OR: [
                    { datumTid: { gte: new Date(startDateQuery), lte: new Date(endDateQuery) } },
                    { slutDatumTid: { gte: new Date(startDateQuery), lte: new Date(endDateQuery) } },
                    { AND: [{ datumTid: { lt: new Date(startDateQuery) } }, { slutDatumTid: { gt: new Date(endDateQuery) } }] }
                ]
            };
            // Säkerställ att AND-arrayen är korrekt hanterad
            if (whereClause.AND && Array.isArray(whereClause.AND)) {
                whereClause.AND.push(dateRangeCondition);
            } else if (whereClause.AND) { // Om whereClause.AND är ett objekt, gör om det till en array
                whereClause.AND = [whereClause.AND, dateRangeCondition];
            } else { // Om whereClause.AND är odefinierat
                whereClause.AND = [dateRangeCondition];
            }
        }
    }
    
    const kalenderHandelser = await prisma.kalender.findMany({
      where: whereClause,
      include: {
        kund: { include: { privatperson: true, foretag: true } },
        arbetsorder: { select: { id: true, status: true, kundId: true, referensMärkning: true, material: true, ansvarigTeknikerId: true }}, 
        ansvarig: { select: { id: true, fornamn: true, efternamn: true } },
        medarbetare: { include: { anvandare: { select: { id: true, fornamn: true, efternamn: true } } } },
      },
      orderBy, 
      take: fetchHistorik ? 50 : undefined, 
    });

    return NextResponse.json(kalenderHandelser);

  } catch (error) {
    console.error('Fel vid hämtning av kalenderhändelser:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av kalenderhändelser', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST-funktionen förblir densamma
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      titel, 
      beskrivning, 
      datumTid, 
      slutDatumTid,
      motestyp, 
      ansvarigId, 
      kundId, 
      arbetsorderId,
      medarbetareIds = [] 
    } = body;

    if (!ansvarigId) {
        return NextResponse.json({ error: 'Ansvarig person måste anges' }, { status: 400 });
    }
    if (!datumTid || !slutDatumTid) {
        return NextResponse.json({ error: 'Start- och sluttid måste anges' }, { status: 400 });
    }


    const ansvarig = await prisma.anvandare.findUnique({
      where: { id: parseInt(ansvarigId) }
    });
    if (!ansvarig) {
      return NextResponse.json( { error: 'Ansvarig person hittades inte' }, { status: 400 });
    }
    
    if (medarbetareIds && medarbetareIds.length > 0) {
      const medarbetareCount = await prisma.anvandare.count({
        where: { id: { in: medarbetareIds.map((id: string | number) => parseInt(id.toString())) } }
      });
      if (medarbetareCount !== medarbetareIds.length) {
        return NextResponse.json({ error: 'En eller flera medarbetare hittades inte' }, { status: 400 });
      }
    }

    let finalKundId = kundId ? parseInt(kundId) : null;
    if (kundId && (isNaN(finalKundId as number) || kundId === "ingen")) finalKundId = null;

    if (finalKundId) {
      const kund = await prisma.kund.findUnique({ where: { id: finalKundId }});
      if (!kund) return NextResponse.json({ error: 'Kunden hittades inte' }, { status: 400 });
    }

    let finalArbetsorderId = arbetsorderId ? parseInt(arbetsorderId) : null;
    if (arbetsorderId && (isNaN(finalArbetsorderId as number) || arbetsorderId === "ingen")) finalArbetsorderId = null;

    if (finalArbetsorderId) {
      const arbetsorder = await prisma.arbetsorder.findUnique({ where: { id: finalArbetsorderId }});
      if (!arbetsorder) return NextResponse.json({ error: 'Arbetsordern hittades inte' }, { status: 400 });
      if (!finalKundId && arbetsorder.kundId) finalKundId = arbetsorder.kundId;
    }
    
    const medarbetareData = medarbetareIds.map((id: string | number) => ({
      anvandareId: parseInt(id.toString())
    }));
    
    const kalenderhändelse = await prisma.kalender.create({
      data: {
        titel,
        beskrivning,
        datumTid: new Date(datumTid),
        slutDatumTid: new Date(slutDatumTid),
        motestyp,
        ansvarig: { connect: { id: parseInt(ansvarigId) } },
        ...(finalKundId && { kund: { connect: { id: finalKundId } } }),
        ...(finalArbetsorderId && { arbetsorder: { connect: { id: finalArbetsorderId } } }),
        ...(medarbetareData.length > 0 && { medarbetare: { create: medarbetareData } }),
      },
      include: {
        kund: { include: { privatperson: true, foretag: true } },
        arbetsorder: { select: { id: true, status: true, kundId: true, referensMärkning: true, material: true, ansvarigTeknikerId: true }},
        ansvarig: { select: { id: true, fornamn: true, efternamn: true } },
        medarbetare: { include: { anvandare: { select: { id: true, fornamn: true, efternamn: true } } } },
      }
    });

    return NextResponse.json(kalenderhändelse, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av kalenderhändelse:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return NextResponse.json({ error: 'Databasfel vid skapande av kalenderhändelse', code: error.code, meta: error.meta }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av kalenderhändelse', details: (error as Error).message },
      { status: 500 }
    );
  }
}