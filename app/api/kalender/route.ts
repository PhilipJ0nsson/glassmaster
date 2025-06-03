// File: app/api/kalender/route.ts
// Mode: Modifying
// Change: Implemented stricter filtering for "kommande aktiviteter" (`historik=false`) to only include events where `slutDatumTid` is strictly in the future.
// Reasoning: To prevent an event whose time has passed (even recently) from appearing in both "Bokade Aktiviteter" and "Obokade Jobb" on the dashboard.
// --- start diff ---
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
    } else if (currentUserRole === AnvandareRoll.TEKNIKER && !fetchHistorik) { // Tekniker ser bara sina egna kommande, om inte historik efterfrågas brett
        filterOnUserId = currentUserId;
    }
    if (filterOnUserId !== null && isNaN(filterOnUserId)) { 
        filterOnUserId = null; 
    }
    
    const today = new Date(); // Används för historik-logik
    // today.setHours(0, 0, 0, 0); // Används inte längre för dagens början i kommande

    if (fetchHistorik) { 
        orderBy = { datumTid: 'desc' };
        const historyBaseTime = new Date(); // Referenstid för "mindre än"
        historyBaseTime.setHours(0,0,0,0); // Starten på dagen för jämförelse för lt

        const historyConditions: Prisma.KalenderWhereInput = {
            OR: [
                { slutDatumTid: { lt: historyBaseTime } }, // Händelser som slutade *före* idag
                { 
                  arbetsorder: { 
                    status: { in: [
                        ArbetsorderStatus.OFFERT, 
                        ArbetsorderStatus.SLUTFORD, 
                        ArbetsorderStatus.FAKTURERAD, 
                        ArbetsorderStatus.AVBRUTEN 
                    ]} 
                  } 
                },
                { 
                    motestyp: MotesTyp.ARBETSORDER,
                    hanteradAvAdmin: true,
                    arbetsorder: {
                        status: ArbetsorderStatus.MATNING
                    }
                }
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
            const notStrictlyActionableAndHandled: Prisma.KalenderWhereInput = {
                NOT: {
                    AND: [
                        { hanteradAvAdmin: true },
                        {
                            OR: [
                                { arbetsorder: { status: { notIn: [ArbetsorderStatus.OFFERT, ArbetsorderStatus.SLUTFORD, ArbetsorderStatus.MATNING] } } },
                                { arbetsorderId: null } 
                            ]
                        }
                    ]
                }
            };
             if (whereClause.AND && Array.isArray(whereClause.AND)) {
                whereClause.AND.push(notStrictlyActionableAndHandled);
            } else if (whereClause.AND) {
                whereClause.AND = [whereClause.AND, notStrictlyActionableAndHandled];
            } else {
                 whereClause.AND = [notStrictlyActionableAndHandled];
            }
        }


    } else { // Logik för KOMMANDE händelser (Dashboard: KommandeAktiviteter, KalenderVy: standard)
        orderBy = { datumTid: 'asc' };
        const now = new Date(); // Nuvarande tidpunkt för strikt framtidsfiltrering

        const baseUpcomingConditions: Prisma.KalenderWhereInput[] = [
            { slutDatumTid: { gte: now } }, // **ÄNDRING HÄR: Endast de vars sluttid är nu eller i framtiden**
            { hanteradAvAdmin: false }, 
            { 
                OR: [ 
                    { arbetsorderId: null }, 
                    { arbetsorder: { status: { in: [ArbetsorderStatus.MATNING, ArbetsorderStatus.AKTIV] } } } 
                ]
            }
        ];
        
        if (filterOnUserId !== null) { 
             whereClause.AND = [
                { OR: [ { ansvarigId: filterOnUserId }, { medarbetare: { some: { anvandareId: filterOnUserId } } } ] },
                ...baseUpcomingConditions
            ];
        } else if (currentUserRole === AnvandareRoll.TEKNIKER) {
            // Om ingen specifik `forAnvandareId` eller `ansvarigIdQuery` är satt, och det är en tekniker,
            // visa bara deras egna kommande (fallback om `filterOnUserId` inte sattes ovan)
             whereClause.AND = [
                { OR: [ { ansvarigId: currentUserId }, { medarbetare: { some: { anvandareId: currentUserId } } } ] },
                ...baseUpcomingConditions
            ];
        }
        else { // Admin/AL ser allt kommande om inget filter är satt
            whereClause.AND = baseUpcomingConditions;
        }

        // Om KalenderVy skickar med start/end för sin visning
        if (startDateQuery && endDateQuery) {
            const dateRangeCondition: Prisma.KalenderWhereInput = {
                OR: [
                    { datumTid: { gte: new Date(startDateQuery), lte: new Date(endDateQuery) } },
                    { slutDatumTid: { gte: new Date(startDateQuery), lte: new Date(endDateQuery) } },
                    { AND: [{ datumTid: { lt: new Date(startDateQuery) } }, { slutDatumTid: { gt: new Date(endDateQuery) } }] }
                ]
            };
            if (whereClause.AND && Array.isArray(whereClause.AND)) {
                whereClause.AND.push(dateRangeCondition);
            } else if (whereClause.AND) { // Om whereClause.AND redan är ett objekt
                whereClause.AND = [whereClause.AND as Prisma.KalenderWhereInput, dateRangeCondition];
            } else { // Om whereClause.AND är tomt/odefinierat
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
      take: fetchHistorik ? 100 : undefined, 
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
      if (!finalKundId && arbetsorder.kundId) finalKundId = arbetsorder.kundId; // Sätt kundId från AO om det saknas
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
        hanteradAvAdmin: false, 
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
// --- end diff ---