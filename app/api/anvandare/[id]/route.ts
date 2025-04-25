import { prisma } from '@/lib/prisma';
import { AnvandareRoll } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/anvandare/[id] - Hämta en specifik användare
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
        { error: 'Ogiltigt användar-ID' },
        { status: 400 }
      );
    }

    // Kontrollera behörighet - endast admin och arbetsledare kan se andra användare, 
    // tekniker kan bara se sin egen information
    if (session.user.role !== AnvandareRoll.ADMIN && 
        session.user.role !== AnvandareRoll.ARBETSLEDARE && 
        parseInt(session.user.id as string) !== id) {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const anvandare = await prisma.anvandare.findUnique({
      where: { id },
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
      }
    });

    if (!anvandare) {
      return NextResponse.json(
        { error: 'Användaren hittades inte' },
        { status: 404 }
      );
    }

    return NextResponse.json(anvandare);

  } catch (error) {
    console.error('Fel vid hämtning av användare:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av användare' },
      { status: 500 }
    );
  }
}

// PUT /api/anvandare/[id] - Uppdatera en användare
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
        { error: 'Ogiltigt användar-ID' },
        { status: 400 }
      );
    }

    // Kontrollera behörighet
    // 1. Admin kan uppdatera alla
    // 2. Arbetsledare kan uppdatera tekniker, men inte admin eller andra arbetsledare
    // 3. Tekniker kan bara uppdatera sig själva och bara vissa fält
    const isAdmin = session.user.role === AnvandareRoll.ADMIN;
    const isArbesledare = session.user.role === AnvandareRoll.ARBETSLEDARE;
    const isSelf = parseInt(session.user.id as string) === id;

    // Hämta befintlig användare för behörighetskontroll
    const befintligAnvandare = await prisma.anvandare.findUnique({
      where: { id },
      select: {
        roll: true,
      }
    });

    if (!befintligAnvandare) {
      return NextResponse.json(
        { error: 'Användaren hittades inte' },
        { status: 404 }
      );
    }

    // Arbetsledare kan inte uppdatera admin eller andra arbetsledare
    if (isArbesledare && 
        (befintligAnvandare.roll === AnvandareRoll.ADMIN || 
         befintligAnvandare.roll === AnvandareRoll.ARBETSLEDARE)) {
      return NextResponse.json(
        { error: 'Behörighet saknas för att uppdatera denna användartyp' },
        { status: 403 }
      );
    }

    // Tekniker kan bara uppdatera sig själva
    if (!isAdmin && !isArbesledare && !isSelf) {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    let { 
      fornamn, 
      efternamn, 
      epost, 
      telefonnummer, 
      roll, 
      anvandarnamn, 
      losenord, 
      aktiv 
    } = body;

    // Tekniker kan bara uppdatera vissa fält för sig själva
    if (!isAdmin && !isArbesledare && isSelf) {
      // Ta bort fält som tekniker inte får uppdatera
      roll = undefined;
      aktiv = undefined;
    }

    // Kontrollera om e-post eller användarnamn redan används av någon annan
    if (epost || anvandarnamn) {
      const duplicateCheck = await prisma.anvandare.findFirst({
        where: {
          id: { not: id },
          OR: [
            epost ? { epost } : {},
            anvandarnamn ? { anvandarnamn } : {}
          ]
        }
      });

      if (duplicateCheck) {
        if (epost && duplicateCheck.epost === epost) {
          return NextResponse.json(
            { error: 'E-postadressen används redan av en annan användare' },
            { status: 400 }
          );
        } else if (anvandarnamn && duplicateCheck.anvandarnamn === anvandarnamn) {
          return NextResponse.json(
            { error: 'Användarnamnet används redan av en annan användare' },
            { status: 400 }
          );
        }
      }
    }

    // Förbered uppdateringsdata
    const updateData: any = {};
    
    if (fornamn !== undefined) updateData.fornamn = fornamn;
    if (efternamn !== undefined) updateData.efternamn = efternamn;
    if (epost !== undefined) updateData.epost = epost;
    if (telefonnummer !== undefined) updateData.telefonnummer = telefonnummer;
    if (aktiv !== undefined) updateData.aktiv = aktiv;
    if (anvandarnamn !== undefined) updateData.anvandarnamn = anvandarnamn;
    
    // Endast admin eller arbetsledare kan ändra roll
    if ((isAdmin || isArbesledare) && roll !== undefined) {
      // Arbetsledare kan bara ändra tekniker, inte göra någon till admin
      if (isArbesledare && roll === AnvandareRoll.ADMIN) {
        return NextResponse.json(
          { error: 'Arbetsledare har inte behörighet att göra någon till administratör' },
          { status: 403 }
        );
      }
      
      // Admin kan ändra roll för vem som helst
      updateData.roll = roll;
    }
    
    // Hantera lösenordsändring
    if (losenord) {
      updateData.losenord = await bcrypt.hash(losenord, 10);
    }

    // Uppdatera användaren
    const uppdateradAnvandare = await prisma.anvandare.update({
      where: { id },
      data: updateData,
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
      }
    });

    return NextResponse.json(uppdateradAnvandare);

  } catch (error) {
    console.error('Fel vid uppdatering av användare:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av användare' },
      { status: 500 }
    );
  }
}

// DELETE /api/anvandare/[id] - Inaktivera/aktivera en användare
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    // Endast administratörer kan inaktivera/aktivera användare
    if (session.user.role !== AnvandareRoll.ADMIN) {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt användar-ID' },
        { status: 400 }
      );
    }

    // Kontrollera om användaren finns
    const anvandare = await prisma.anvandare.findUnique({
      where: { id },
      select: {
        aktiv: true,
      }
    });

    if (!anvandare) {
      return NextResponse.json(
        { error: 'Användaren hittades inte' },
        { status: 404 }
      );
    }

    // Vi gör inte en hård borttagning utan togglar aktiv-flaggan
    const uppdateradAnvandare = await prisma.anvandare.update({
      where: { id },
      data: {
        aktiv: !anvandare.aktiv
      },
      select: {
        id: true,
        aktiv: true,
      }
    });

    return NextResponse.json({
      message: uppdateradAnvandare.aktiv
        ? `Användare med ID ${id} har aktiverats`
        : `Användare med ID ${id} har inaktiverats`,
      aktiv: uppdateradAnvandare.aktiv
    });

  } catch (error) {
    console.error('Fel vid inaktivering/aktivering av användare:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid inaktivering/aktivering av användare' },
      { status: 500 }
    );
  }
}