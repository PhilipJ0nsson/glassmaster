import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/kalender/[id] - Hämta en specifik kalenderhändelse
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt händelse-ID' },
        { status: 400 }
      );
    }

    const kalenderHandelse = await prisma.kalender.findUnique({
      where: { id },
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

    if (!kalenderHandelse) {
      return NextResponse.json(
        { error: 'Kalenderhändelsen hittades inte' },
        { status: 404 }
      );
    }

    return NextResponse.json(kalenderHandelse);

  } catch (error) {
    console.error('Fel vid hämtning av kalenderhändelse:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av kalenderhändelse' },
      { status: 500 }
    );
  }
}

// PUT /api/kalender/[id] - Uppdatera en kalenderhändelse
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt händelse-ID' },
        { status: 400 }
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
      medarbetareIds = [] as Array<string | number>
    } = body;

    // Kontrollera att händelsen finns
    const befintligHandelse = await prisma.kalender.findUnique({
      where: { id }
    });

    if (!befintligHandelse) {
      return NextResponse.json(
        { error: 'Kalenderhändelsen hittades inte' },
        { status: 404 }
      );
    }

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
    
    // Uppdatera händelsen i en transaktion
    const uppdateradHandelse = await prisma.$transaction(async (tx) => {
      // Ta bort befintliga medarbetare-kopplingar
      await tx.kalenderMedarbetare.deleteMany({
        where: { kalenderId: id }
      });
      
      // Lägg till nya medarbetare-kopplingar
      if (medarbetareData.length > 0) {
        await tx.kalenderMedarbetare.createMany({
          data: medarbetareData.map((m: { anvandareId: number }) => ({
            ...m,
            kalenderId: id
          }))
        });
      }
      
      // Uppdatera händelsen
      return await tx.kalender.update({
        where: { id },
        data: {
          titel,
          beskrivning,
          datumTid: new Date(datumTid),
          slutDatumTid: new Date(slutDatumTid),
          motestyp,
          ansvarigId,
          kundId: finalKundId,
          arbetsorderId,
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
    });

    return NextResponse.json(uppdateradHandelse);

  } catch (error) {
    console.error('Fel vid uppdatering av kalenderhändelse:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av kalenderhändelse' },
      { status: 500 }
    );
  }
}

// DELETE /api/kalender/[id] - Ta bort en kalenderhändelse
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt händelse-ID' },
        { status: 400 }
      );
    }

    // Kontrollera att händelsen finns
    const handelse = await prisma.kalender.findUnique({
      where: { id }
    });

    if (!handelse) {
      return NextResponse.json(
        { error: 'Kalenderhändelsen hittades inte' },
        { status: 404 }
      );
    }

    // Ta bort händelsen
    await prisma.kalender.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Kalenderhändelsen har tagits bort' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fel vid borttagning av kalenderhändelse:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av kalenderhändelse' },
      { status: 500 }
    );
  }
}