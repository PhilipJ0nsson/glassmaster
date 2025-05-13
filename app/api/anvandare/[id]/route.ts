// File: /Users/nav/Projects/glassmaestro/glassmaster/app/api/anvandare/[id]/route.ts
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
        !isSelf && // Låt arbetsledare uppdatera sig själva
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
    if (anvandarnamn !== undefined) updateData.anvandarnamn = anvandarnamn;

    // Admin eller arbetsledare som uppdaterar sig själv eller tekniker kan ändra aktiv-status
    if ((isAdmin || (isArbesledare && !isSelf && befintligAnvandare.roll === AnvandareRoll.TEKNIKER) || isSelf) && aktiv !== undefined) {
         // Tillåt endast admin att ändra aktiv-status
         if(isAdmin && aktiv !== undefined) {
           updateData.aktiv = aktiv;
         }
    }

    // Endast admin eller arbetsledare kan ändra roll (och arbetsledare kan inte göra någon till admin)
    if ((isAdmin || (isArbesledare && befintligAnvandare.roll === AnvandareRoll.TEKNIKER)) && roll !== undefined) {
      if (isArbesledare && roll === AnvandareRoll.ADMIN) {
        return NextResponse.json(
          { error: 'Arbetsledare har inte behörighet att göra någon till administratör' },
          { status: 403 }
        );
      }
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

// DELETE /api/anvandare/[id] - Inaktivera/aktivera eller radera en användare
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    // Endast administratörer kan utföra dessa åtgärder
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

    // Hämta query parameter för att avgöra åtgärd
    const { searchParams } = req.nextUrl;
    const permanent = searchParams.get('permanent') === 'true';

    // Hitta användaren som ska hanteras
    const anvandare = await prisma.anvandare.findUnique({
      where: { id },
    });

    if (!anvandare) {
      return NextResponse.json(
        { error: 'Användaren hittades inte' },
        { status: 404 }
      );
    }

    // Förhindra admin från att radera/inaktivera sig själv
    if (id === parseInt(session.user.id as string)) {
        return NextResponse.json(
            { error: 'Du kan inte radera eller inaktivera ditt eget konto.' },
            { status: 400 }
        );
    }

    if (permanent) {
      // --- Permanent Radering ---

      // 1. Kontrollera beroenden som förhindrar radering (RESTRICT)
      const blockingOrders = await prisma.arbetsorder.count({
          where: {
              OR: [
                  { skapadAvId: id },
                  { uppdateradAvId: id }
              ]
          }
      });
      const blockingCalendar = await prisma.kalender.count({
          where: { ansvarigId: id }
      });

      if (blockingOrders > 0 || blockingCalendar > 0) {
          let errorMessages = [];
          if (blockingOrders > 0) errorMessages.push("arbetsordrar (som skapare/uppdaterare)");
          if (blockingCalendar > 0) errorMessages.push("kalenderhändelser (som ansvarig)");

          return NextResponse.json(
              { error: `Kan inte radera användaren eftersom den är kopplad till ${errorMessages.join(' och ')}.` },
              { status: 400 }
          );
      }

      // 2. Hantera beroenden som tillåter radering (SET NULL, CASCADE)
      // Prisma hanterar detta automatiskt baserat på schemat:
      // - Arbetsorder.ansvarigTeknikerId -> SET NULL
      // - KalenderMedarbetare -> CASCADE

      // 3. Utför radering
      // Använd en transaktion för att säkerställa att allt går igenom eller inget
      await prisma.$transaction(async (tx) => {
        // Ta bort kopplingar i KalenderMedarbetare (Prisma gör detta via CASCADE, men kan vara explicit om man vill)
        // await tx.kalenderMedarbetare.deleteMany({ where: { anvandareId: id } });

        // Uppdatera Arbetsorder.ansvarigTeknikerId till null (Prisma gör detta via SET NULL)
        // await tx.arbetsorder.updateMany({ where: { ansvarigTeknikerId: id }, data: { ansvarigTeknikerId: null } });

        // Slutligen, radera användaren
        await tx.anvandare.delete({ where: { id } });
      });


      return NextResponse.json(
          { message: `Användare med ID ${id} har raderats permanent.` },
          { status: 200 }
      );

    } else {
      // --- Växla Aktiv Status (befintlig logik) ---
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
    }

  } catch (error) {
    console.error('Fel vid hantering av användare (DELETE):', error);
    // Ge mer specifik feedback vid Prisma-fel (t.ex. Foreign Key constraint)
    if ((error as any).code === 'P2003' || (error as any).code === 'P2014') { // Prisma foreign key constraint codes
        return NextResponse.json(
            { error: 'Kunde inte slutföra åtgärden på grund av beroenden i databasen. Kontrollera att användaren inte är kopplad till kritiska poster.' },
            { status: 400 }
        );
    }
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hantering av användare' },
      { status: 500 }
    );
  }
}