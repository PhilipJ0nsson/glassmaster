// File: app/api/prislista/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client'; // Importera Prisma för typning

// GET /api/prislista - Hämta alla prisposter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const kategori = searchParams.get('kategori') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const skip = (page - 1) * pageSize;

    // Bygger filtrering
    const filter: any = {};
    
    if (kategori) {
      filter.kategori = kategori;
    }

    // Hämta antal prisposter som matchar filtret
    const total = await prisma.prislista.count({
      where: {
        ...filter,
        OR: [
          { namn: { contains: search, mode: 'insensitive' } },
          { artikelnummer: { contains: search } },
          { kategori: { contains: search, mode: 'insensitive' } },
        ]
      }
    });

    // Hämta prisposter med paginering och filtrering
    const prisposter = await prisma.prislista.findMany({
      where: {
        ...filter,
        OR: [
          { namn: { contains: search, mode: 'insensitive' } },
          { artikelnummer: { contains: search } },
          { kategori: { contains: search, mode: 'insensitive' } },
        ]
      },
      skip,
      take: pageSize,
      orderBy: {
        kategori: 'asc'
      }
    });

    // Hämta alla unika kategorier för filtrering
    const kategorierDb = await prisma.prislista.findMany({ // Byt namn för att undvika skuggning
      select: {
        kategori: true,
      },
      distinct: ['kategori'],
      where: {
        kategori: {
          not: null,
        }
      },
    });

    // Extrahera unika kategoristrängar
    const unikaKategorier = kategorierDb
      .map(k => k.kategori)
      .filter(Boolean) as string[];

    return NextResponse.json({
      prisposter,
      kategorier: unikaKategorier,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('Fel vid hämtning av prisposter:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prisposter' },
      { status: 500 }
    );
  }
}

// POST /api/prislista - Skapa en ny prispost
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      namn, 
      prisExklMoms, 
      momssats,
      kategori,
      artikelnummer, // Detta kommer som "" om det är tomt från formuläret
      prissattningTyp
    } = body;

    // Beräkna pris inklusive moms
    const prisInklMoms = parseFloat(prisExklMoms) * (1 + parseFloat(momssats) / 100);

    const dataToCreate: Prisma.PrislistaCreateInput = {
      namn,
      prisExklMoms: parseFloat(prisExklMoms),
      momssats: parseFloat(momssats),
      prisInklMoms,
      kategori: kategori || null, // Konvertera tom sträng till null
      artikelnummer: artikelnummer || null, // Konvertera tom sträng till null
      prissattningTyp: prissattningTyp || 'ST',
    };


    // Kontrollera om artikelnummer redan finns (OM det faktiskt är satt, dvs inte null)
    if (dataToCreate.artikelnummer) { // Denna kontroll körs nu bara om artikelnummer är en icke-tom sträng
      const befintligArtikel = await prisma.prislista.findUnique({
        where: { artikelnummer: dataToCreate.artikelnummer }, // artikelnummer är garanterat en sträng här
      });

      if (befintligArtikel) {
        return NextResponse.json(
          { error: 'Artikelnumret finns redan' },
          { status: 400 }
        );
      }
    }

    const prispost = await prisma.prislista.create({
      data: dataToCreate
    });

    return NextResponse.json(prispost, { status: 201 });

  } catch (error: any) { // Lägg till typ any för error för att komma åt code etc.
    console.error('Fel vid skapande av prispost:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unik constraint violation
        // Detta block bör nu inte nås för tomma artikelnummer om ovanstående logik är korrekt,
        // men det är bra att ha kvar för andra unika fält eller oväntade fall.
        return NextResponse.json({ error: `Databasfel: Ett unikt värde kränktes. Fält: ${error.meta?.target}` }, { status: 409 });
      }
    }
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av prispost', details: error.message },
      { status: 500 }
    );
  }
}