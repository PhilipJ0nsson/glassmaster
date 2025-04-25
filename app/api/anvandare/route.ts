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

    // Hämta query-parametrar
    const { searchParams } = new URL(req.url);
    const includeInaktiva = searchParams.get('includeInaktiva') === 'true';
    const search = searchParams.get('search') || '';

    // Kontrollera behörighet - endast administratörer och arbetsledare ska kunna se alla användare
    if (session.user.role !== AnvandareRoll.ADMIN && session.user.role !== AnvandareRoll.ARBETSLEDARE) {
      // För tekniker, returnera bara deras egen information
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

    // Bygg filterkriterier
    const filter: any = {};
    
    // Inkludera inaktiva användare endast om includeInaktiva är true
    if (!includeInaktiva) {
      filter.aktiv = true;
    }

    // Lägg till sökning om det finns
    if (search) {
      filter.OR = [
        { fornamn: { contains: search, mode: 'insensitive' } },
        { efternamn: { contains: search, mode: 'insensitive' } },
        { epost: { contains: search, mode: 'insensitive' } },
        { anvandarnamn: { contains: search, mode: 'insensitive' } },
      ];
    }

    // För admin och arbetsledare, hämta alla användare baserat på filter
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
      orderBy: {
        fornamn: 'asc',
      }
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

    // Kontrollera behörighet - endast administratörer får skapa nya användare
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

    // Validera nödvändiga fält
    if (!fornamn || !efternamn || !epost || !anvandarnamn || !losenord) {
      return NextResponse.json(
        { error: 'Alla obligatoriska fält måste fyllas i' },
        { status: 400 }
      );
    }

    // Kontrollera om e-post eller användarnamn redan används
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

    // Kryptera lösenord
    const hashedPassword = await bcrypt.hash(losenord, 10);

    // Skapa ny användare
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