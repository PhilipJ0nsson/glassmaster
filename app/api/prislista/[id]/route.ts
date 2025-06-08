// File: app/api/prislista/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client'; // Importera Prisma för typning

// Definiera RouteParams här
interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/prislista/[id] - Hämta en specifik prispost
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt pris-ID' },
        { status: 400 }
      );
    }

    const prispost = await prisma.prislista.findUnique({
      where: { id },
    });

    if (!prispost) {
      return NextResponse.json(
        { error: 'Prisposten hittades inte' },
        { status: 404 }
      );
    }

    return NextResponse.json(prispost);

  } catch (error) {
    console.error('Fel vid hämtning av prispost:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prispost' },
      { status: 500 }
    );
  }
}

// PUT /api/prislista/[id] - Uppdatera en prispost
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt pris-ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      namn, 
      prisExklMoms, 
      momssats, 
      kategori, 
      artikelnummer, // Detta kommer som "" om det är tomt från formuläret
      prissattningTyp
    } = body;

    // Kontrollera att prisposten finns
    const befintligPrispost = await prisma.prislista.findUnique({
      where: { id }
    });

    if (!befintligPrispost) {
      return NextResponse.json(
        { error: 'Prisposten hittades inte' },
        { status: 404 }
      );
    }

    // Beräkna pris inklusive moms
    const prisInklMoms = parseFloat(prisExklMoms) * (1 + parseFloat(momssats) / 100);

    const dataToUpdate: Prisma.PrislistaUpdateInput = {
        namn,
        prisExklMoms: parseFloat(prisExklMoms),
        momssats: parseFloat(momssats),
        prisInklMoms,
        kategori: kategori || null, // Konvertera tom sträng till null
        artikelnummer: artikelnummer || null, // Konvertera tom sträng till null
        prissattningTyp: prissattningTyp || befintligPrispost.prissattningTyp || 'ST',
    };


    // Kontrollera om artikelnummer redan finns (OM det har ändrats och inte är null)
    if (dataToUpdate.artikelnummer && dataToUpdate.artikelnummer !== befintligPrispost.artikelnummer) {
      const artikelFinns = await prisma.prislista.findUnique({
        where: { artikelnummer: dataToUpdate.artikelnummer as string }, // artikelnummer är garanterat en sträng här
      });

      if (artikelFinns && artikelFinns.id !== id) { // Se till att det inte är samma post
        return NextResponse.json(
          { error: 'Artikelnumret används redan av en annan post' },
          { status: 409 } // HTTP 409 Conflict
        );
      }
    }

    // Uppdatera prisposten
    const updatedPrispost = await prisma.prislista.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json(updatedPrispost);

  } catch (error: any) { // Lägg till typ any för error för att komma åt code etc.
    console.error('Fel vid uppdatering av prispost:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') { // Unik constraint violation
             return NextResponse.json({ error: `Databasfel: Ett unikt värde kränktes. Fält: ${error.meta?.target}` }, { status: 409 });
        }
    }
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av prispost', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/prislista/[id] - Ta bort en prispost
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt pris-ID' },
        { status: 400 }
      );
    }

    // Kontrollera om prisposten finns
    const prispost = await prisma.prislista.findUnique({
      where: { id }
    });

    if (!prispost) {
      return NextResponse.json(
        { error: 'Prisposten hittades inte' },
        { status: 404 }
      );
    }

    // Kontrollera om det finns orderrader som använder denna prispost
    const orderrader = await prisma.orderrad.findFirst({
      where: { prislistaId: id }
    });

    if (orderrader) {
      return NextResponse.json(
        { 
          error: 'Kan inte ta bort prisposten eftersom den används i en eller flera arbetsordrar' 
        },
        { status: 400 }
      );
    }

    // Ta bort prisposten
    await prisma.prislista.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Prisposten har tagits bort' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fel vid borttagning av prispost:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av prispost' },
      { status: 500 }
    );
  }
}