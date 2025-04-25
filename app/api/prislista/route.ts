import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
    const kategorier = await prisma.prislista.findMany({
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
    const unikaKategorier = kategorier
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
      artikelnummer,
      prissattningTyp
    } = body;

    // Beräkna pris inklusive moms
    const prisInklMoms = parseFloat(prisExklMoms) * (1 + parseFloat(momssats) / 100);

    // Kontrollera om artikelnummer redan finns
    if (artikelnummer) {
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

    const prispost = await prisma.prislista.create({
      data: {
        namn,
        prisExklMoms: parseFloat(prisExklMoms),
        momssats: parseFloat(momssats),
        prisInklMoms,
        kategori,
        artikelnummer,
        prissattningTyp: prissattningTyp || 'ST', // Default to styckpris if not specified
      }
    });

    return NextResponse.json(prispost, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av prispost:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av prispost' },
      { status: 500 }
    );
  }
}