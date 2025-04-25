import { prisma } from '@/lib/prisma';
import { KundTyp } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/kunder/[id] - Hämta en specifik kund
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt kund-ID' },
        { status: 400 }
      );
    }

    const kund = await prisma.kund.findUnique({
      where: { id },
      include: {
        privatperson: true,
        foretag: true,
        arbetsordrar: {
          take: 5,
          orderBy: { skapadDatum: 'desc' },
          include: {
            ansvarigTekniker: {
              select: {
                fornamn: true,
                efternamn: true,
              },
            },
          },
        },
      },
    });

    if (!kund) {
      return NextResponse.json(
        { error: 'Kunden hittades inte' },
        { status: 404 }
      );
    }

    return NextResponse.json(kund);

  } catch (error) {
    console.error('Fel vid hämtning av kund:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av kund' },
      { status: 500 }
    );
  }
}

// PUT /api/kunder/[id] - Uppdatera en kund
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt kund-ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      telefonnummer, 
      epost, 
      adress, 
      kommentarer,
      fornamn,  // för privatperson
      efternamn, // för privatperson
      personnummer, // för privatperson
      foretagsnamn, // för företag
      organisationsnummer, // för företag
      kontaktpersonFornamn, // för företag
      kontaktpersonEfternamn, // för företag
      fakturaadress, // för företag
      referensMärkning // för företag
    } = body;

    // Hämta befintlig kund för att få kundTyp
    const befintligKund = await prisma.kund.findUnique({
      where: { id },
      include: {
        privatperson: true,
        foretag: true,
      },
    });

    if (!befintligKund) {
      return NextResponse.json(
        { error: 'Kunden hittades inte' },
        { status: 404 }
      );
    }

    // Uppdatera kunden i en transaktion
    const updatedKund = await prisma.$transaction(async (tx) => {
      // Uppdatera baskundinformation
      const updatedBasKund = await tx.kund.update({
        where: { id },
        data: {
          telefonnummer,
          epost,
          adress,
          kommentarer,
        },
      });

      // Uppdatera privatperson eller företag baserat på kundtyp
      if (befintligKund.kundTyp === KundTyp.PRIVAT && befintligKund.privatperson) {
        await tx.privatperson.update({
          where: { kundId: id },
          data: {
            fornamn,
            efternamn,
            personnummer,
          },
        });
      } else if (befintligKund.kundTyp === KundTyp.FORETAG && befintligKund.foretag) {
        await tx.foretag.update({
          where: { kundId: id },
          data: {
            foretagsnamn,
            organisationsnummer,
            kontaktpersonFornamn,
            kontaktpersonEfternamn,
            fakturaadress,
            // Tar bort referensMärkning eftersom det inte finns i Foretag-modellen
          },
        });
      }

      // Hämta uppdaterad kund med alla relationer
      return await tx.kund.findUnique({
        where: { id },
        include: {
          privatperson: true,
          foretag: true,
        },
      });
    });

    return NextResponse.json(updatedKund);

  } catch (error) {
    console.error('Fel vid uppdatering av kund:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av kund' },
      { status: 500 }
    );
  }
}

// DELETE /api/kunder/[id] - Ta bort en kund
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt kund-ID' },
        { status: 400 }
      );
    }

    // Kontrollera om kunden har några arbetsordrar
    const arbetsordrarCount = await prisma.arbetsorder.count({
      where: { kundId: id },
    });

    if (arbetsordrarCount > 0) {
      return NextResponse.json(
        { 
          error: 'Kunden kan inte raderas eftersom den har arbetsordrar',
          arbetsordrarCount
        },
        { status: 400 }
      );
    }

    // Ta bort kunden (detta kommer automatiskt ta bort privatperson/företag via cascade delete)
    await prisma.kund.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Kunden har tagits bort' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fel vid borttagning av kund:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av kund' },
      { status: 500 }
    );
  }
}