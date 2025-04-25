import { prisma } from '@/lib/prisma';
import { KundTyp } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/kunder - Hämta alla kunder
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const typ = searchParams.get('typ') as KundTyp | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const skip = (page - 1) * pageSize;

    // Bygger filtrering
    const filter: any = {};
    
    if (typ) {
      filter.kundTyp = typ;
    }

    // Hämta antal kunder som matchar filtret
    const total = await prisma.kund.count({
      where: {
        ...filter,
        OR: [
          { 
            privatperson: {
              OR: [
                { fornamn: { contains: search, mode: 'insensitive' } },
                { efternamn: { contains: search, mode: 'insensitive' } },
              ]
            }
          },
          { 
            foretag: {
              foretagsnamn: { contains: search, mode: 'insensitive' }
            }
          },
          { telefonnummer: { contains: search } },
          { epost: { contains: search, mode: 'insensitive' } },
        ]
      }
    });

    // Hämta kunder med paginering och filtrering
    const kunder = await prisma.kund.findMany({
      where: {
        ...filter,
        OR: [
          { 
            privatperson: {
              OR: [
                { fornamn: { contains: search, mode: 'insensitive' } },
                { efternamn: { contains: search, mode: 'insensitive' } },
              ]
            }
          },
          { 
            foretag: {
              foretagsnamn: { contains: search, mode: 'insensitive' }
            }
          },
          { telefonnummer: { contains: search } },
          { epost: { contains: search, mode: 'insensitive' } },
        ]
      },
      include: {
        privatperson: true,
        foretag: true,
      },
      skip,
      take: pageSize,
      orderBy: {
        skapadDatum: 'desc'
      }
    });

    return NextResponse.json({
      kunder,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('Fel vid hämtning av kunder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av kunder' },
      { status: 500 }
    );
  }
}

// POST /api/kunder - Skapa en ny kund
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      kundTyp, 
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

    const kund = await prisma.kund.create({
      data: {
        kundTyp,
        telefonnummer,
        epost,
        adress,
        kommentarer,
        ...(kundTyp === KundTyp.PRIVAT ? {
          privatperson: {
            create: {
              fornamn,
              efternamn,
              personnummer,
            }
          }
        } : {
          foretag: {
            create: {
              foretagsnamn,
              organisationsnummer,
              kontaktpersonFornamn,
              kontaktpersonEfternamn,
              fakturaadress,
              referensMärkning,
            }
          }
        })
      },
      include: {
        privatperson: true,
        foretag: true,
      }
    });

    return NextResponse.json(kund, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av kund:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av kund' },
      { status: 500 }
    );
  }
}