import { prisma } from '@/lib/prisma';
import { MotesTyp } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/kalender - Hämta alla kalenderhändelser
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
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const ansvarigId = searchParams.get('ansvarigId');

    // Bygg filter baserat på query params
    let filter: any = {};
    
    if (startDate && endDate) {
      filter.datumTid = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    let where = filter;
    
    // Om ansvarigId är angivet, hämta både händelser där användaren är ansvarig
    // och händelser där användaren är medarbetare
    if (ansvarigId) {
      const userId = parseInt(ansvarigId);
      
      where = {
        OR: [
          { ...filter, ansvarigId: userId },
          { 
            ...filter,
            medarbetare: {
              some: {
                anvandareId: userId
              }
            }
          }
        ]
      };
    }

    const kalenderHandelser = await prisma.kalender.findMany({
      where,
      include: {
        kund: {
          include: {
            privatperson: true,
            foretag: true,
          },
        },
        arbetsorder: {
          select: {
            id: true,
            status: true,
            kundId: true,
          },
        },
        ansvarig: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
        medarbetare: {
          include: {
            anvandare: {
              select: {
                id: true,
                fornamn: true,
                efternamn: true,
              }
            }
          }
        },
      },
      orderBy: {
        datumTid: 'asc',
      },
    });

    return NextResponse.json(kalenderHandelser);

  } catch (error) {
    console.error('Fel vid hämtning av kalenderhändelser:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av kalenderhändelser' },
      { status: 500 }
    );
  }
}

// POST /api/kalender - Skapa en ny kalenderhändelse
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
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

    // Validera existens av referenser
    if (ansvarigId) {
      const ansvarig = await prisma.anvandare.findUnique({
        where: { id: ansvarigId }
      });

      if (!ansvarig) {
        return NextResponse.json(
          { error: 'Ansvarig person hittades inte' },
          { status: 400 }
        );
      }
    }
    
    // Validera medarbetare
    if (medarbetareIds && medarbetareIds.length > 0) {
      const medarbetare = await prisma.anvandare.findMany({
        where: {
          id: {
            in: medarbetareIds.map((id: string | number) => 
              typeof id === 'string' ? parseInt(id) : id
            )
          }
        }
      });
      
      if (medarbetare.length !== medarbetareIds.length) {
        return NextResponse.json(
          { error: 'En eller flera medarbetare hittades inte' },
          { status: 400 }
        );
      }
    }

    if (kundId) {
      const kund = await prisma.kund.findUnique({
        where: { id: kundId }
      });

      if (!kund) {
        return NextResponse.json(
          { error: 'Kunden hittades inte' },
          { status: 400 }
        );
      }
    }

    if (arbetsorderId) {
      const arbetsorder = await prisma.arbetsorder.findUnique({
        where: { id: arbetsorderId }
      });

      if (!arbetsorder) {
        return NextResponse.json(
          { error: 'Arbetsordern hittades inte' },
          { status: 400 }
        );
      }
    }

    // Om arbetsorderId finns, kontrollera om vi ska hämta kund från arbetsordern
    let finalKundId = kundId;
    if (arbetsorderId && !kundId) {
      const arbetsorder = await prisma.arbetsorder.findUnique({
        where: { id: arbetsorderId },
        select: { kundId: true }
      });
      
      if (arbetsorder) {
        finalKundId = arbetsorder.kundId;
      }
    }
    
    // Konvertera medarbetare till rätt format
    const medarbetareData = medarbetareIds.map((id: string | number) => ({
      anvandareId: typeof id === 'string' ? parseInt(id) : id
    }));
    
    // Skapa händelsen
    const kalenderhändelse = await prisma.kalender.create({
      data: {
        titel,
        beskrivning,
        datumTid: new Date(datumTid),
        slutDatumTid: new Date(slutDatumTid),
        motestyp,
        ansvarig: {
          connect: { id: ansvarigId }
        },
        ...(finalKundId && {
          kund: {
            connect: { id: finalKundId }
          }
        }),
        ...(arbetsorderId && {
          arbetsorder: {
            connect: { id: arbetsorderId }
          }
        }),
        medarbetare: {
          create: medarbetareData
        }
      },
      include: {
        kund: {
          include: {
            privatperson: true,
            foretag: true,
          },
        },
        arbetsorder: true,
        ansvarig: true,
        medarbetare: {
          include: {
            anvandare: {
              select: {
                id: true,
                fornamn: true,
                efternamn: true,
              }
            }
          }
        },
      }
    });

    return NextResponse.json(kalenderhändelse, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av kalenderhändelse:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av kalenderhändelse' },
      { status: 500 }
    );
  }
}