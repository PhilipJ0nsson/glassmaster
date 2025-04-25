import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
      artikelnummer,
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

    // Kontrollera om artikelnummer redan finns (om det har ändrats)
    if (artikelnummer && artikelnummer !== befintligPrispost.artikelnummer) {
      const befintligArtikel = await prisma.prislista.findUnique({
        where: { artikelnummer }
      });

      if (befintligArtikel) {
        return NextResponse.json(
          { error: 'Artikelnumret finns redan' },
          { status: 400 }
        );
      }
    }

    // Beräkna pris inklusive moms
    const prisInklMoms = parseFloat(prisExklMoms) * (1 + parseFloat(momssats) / 100);

    // Uppdatera prisposten
    const updatedPrispost = await prisma.prislista.update({
      where: { id },
      data: {
        namn,
        prisExklMoms: parseFloat(prisExklMoms),
        momssats: parseFloat(momssats),
        prisInklMoms,
        kategori,
        artikelnummer,
        prissattningTyp: prissattningTyp || befintligPrispost.prissattningTyp || 'ST',
      }
    });

    return NextResponse.json(updatedPrispost);

  } catch (error) {
    console.error('Fel vid uppdatering av prispost:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av prispost' },
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