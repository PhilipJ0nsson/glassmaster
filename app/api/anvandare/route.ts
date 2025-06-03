// File: app/api/anvandare/route.ts
// Mode: Modifying
// Change: Added a query parameter `forScheduling` to allow fetching all relevant users for calendar selection, regardless of the requester's role (within limits).
// Reasoning: To enable Tekniker to select other anställda when creating/editing calendar events.
// --- start diff ---
import { prisma } from '@/lib/prisma';
import { AnvandareRoll } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

// GET /api/anvandare - Hämta alla användare
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
    const includeInaktiva = searchParams.get('includeInaktiva') === 'true';
    const search = searchParams.get('search') || '';
    const forScheduling = searchParams.get('forScheduling') === 'true'; // Ny parameter

    // Om det är för schemaläggning, vill vi oftast ha alla aktiva tekniker och arbetsledare
    if (forScheduling) {
      const schedulableUsers = await prisma.anvandare.findMany({
        where: {
          aktiv: true,
          // Man kan lägga till rollfilter här om man bara vill kunna schemalägga vissa roller
          // OR: [
          //   { roll: AnvandareRoll.TEKNIKER },
          //   { roll: AnvandareRoll.ARBETSLEDARE },
          // ],
          ...(search && { // Lägg till sökning även här om det behövs
            OR: [
              { fornamn: { contains: search, mode: 'insensitive' } },
              { efternamn: { contains: search, mode: 'insensitive' } },
              { epost: { contains: search, mode: 'insensitive' } },
              { anvandarnamn: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          fornamn: true,
          efternamn: true,
          epost: true, // Kan vara bra för info
          roll: true, // Kan vara bra för info
        },
        orderBy: { fornamn: 'asc' }
      });
      return NextResponse.json({ anvandare: schedulableUsers });
    }

    // Befintlig logik för andra fall (t.ex. användarlistan i inställningar)
    if (session.user.role !== AnvandareRoll.ADMIN && session.user.role !== AnvandareRoll.ARBETSLEDARE) {
      const anvandare = await prisma.anvandare.findUnique({
        where: { id: parseInt(session.user.id as string) },
        select: {
          id: true,
          fornamn: true,
          efternamn: true,
          epost: true,
          telefonnummer: true,
          roll: true,
          aktiv: true,
          anvandarnamn: true,
        }
      });
      return NextResponse.json({ anvandare: anvandare ? [anvandare] : [] });
    }

    const filter: any = {};
    if (!includeInaktiva) {
      filter.aktiv = true;
    }
    if (search) {
      filter.OR = [
        { fornamn: { contains: search, mode: 'insensitive' } },
        { efternamn: { contains: search, mode: 'insensitive' } },
        { epost: { contains: search, mode: 'insensitive' } },
        { anvandarnamn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const anvandare = await prisma.anvandare.findMany({
      where: filter,
      select: {
        id: true,
        fornamn: true,
        efternamn: true,
        epost: true,
        telefonnummer: true,
        roll: true,
        aktiv: true,
        anvandarnamn: true,
        skapadDatum: true,
        uppdateradDatum: true,
      },
      orderBy: { fornamn: 'asc' }
    });

    return NextResponse.json({ anvandare });

  } catch (error) {
    console.error('Fel vid hämtning av användare:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av användare' },
      { status: 500 }
    );
  }
}

// POST /api/anvandare - Skapa en ny användare
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    if (session.user.role !== AnvandareRoll.ADMIN) {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      fornamn, 
      efternamn, 
      epost, 
      telefonnummer, 
      roll, 
      anvandarnamn, 
      losenord 
    } = body;

    if (!fornamn || !efternamn || !epost || !anvandarnamn || !losenord) {
      return NextResponse.json(
        { error: 'Alla obligatoriska fält måste fyllas i' },
        { status: 400 }
      );
    }

    const anvandareExists = await prisma.anvandare.findFirst({
      where: {
        OR: [
          { epost },
          { anvandarnamn }
        ]
      }
    });

    if (anvandareExists) {
      if (anvandareExists.epost === epost) {
        return NextResponse.json(
          { error: 'E-postadressen används redan' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Användarnamnet används redan' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(losenord, 10);

    const nyAnvandare = await prisma.anvandare.create({
      data: {
        fornamn,
        efternamn,
        epost,
        telefonnummer,
        roll: roll as AnvandareRoll || AnvandareRoll.TEKNIKER,
        anvandarnamn,
        losenord: hashedPassword,
        aktiv: true
      },
      select: {
        id: true,
        fornamn: true,
        efternamn: true,
        epost: true,
        telefonnummer: true,
        roll: true,
        aktiv: true,
        anvandarnamn: true,
        skapadDatum: true,
      }
    });

    return NextResponse.json(nyAnvandare, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av användare:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av användare' },
      { status: 500 }
    );
  }
}
// --- end diff ---