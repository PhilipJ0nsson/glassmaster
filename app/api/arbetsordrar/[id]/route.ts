// File: app/api/arbetsordrar/[id]/route.ts
// Fullständigt innehåll med modifierad PUT och befintlig GET/DELETE

import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus, PrissattningTyp, Prisma } from '@prisma/client'; // Importera Prisma
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs'; // För att kunna ta bort bilder från filsystemet
import path from 'path'; // För att hantera filsökvägar

type RouteParams = {
  params: {
    id: string;
  };
}

// GET /api/arbetsordrar/[id] - Hämta en specifik arbetsorder
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const idString = params.id; 
    const id = parseInt(idString); 
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt arbetsorder-ID' },
        { status: 400 }
      );
    }

    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id },
      include: {
        kund: {
          include: {
            privatperson: true,
            foretag: true,
          },
        },
        ansvarigTekniker: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
            telefonnummer: true,
            epost: true,
            roll: true,
          },
        },
        orderrader: {
          include: {
            prislista: true,
          },
        },
        bilder: true,
        skapadAv: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
        uppdateradAv: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
        kalender: { // Inkludera kalenderhändelser kopplade till arbetsordern
          include: {
            ansvarig: true,
            medarbetare: { include: { anvandare: true }}
          },
        },
      },
    });

    if (!arbetsorder) {
      return NextResponse.json(
        { error: 'Arbetsordern hittades inte' },
        { status: 404 }
      );
    }

    // Bearbeta orderrader för att använda enhetspris om det finns
    const processedArbetsorder = {
      ...arbetsorder,
      orderrader: arbetsorder.orderrader.map(rad => {
        // Om enhetspris finns sparat på orderraden, använd det istället för aktuellt prislistepris
        if (rad.enhetsPrisExklMoms !== null && rad.enhetsPrisExklMoms !== undefined) {
          return {
            ...rad,
            prislista: { // Skriv över prislistans priser med de sparade enhetspriserna
              ...rad.prislista,
              prisExklMoms: rad.enhetsPrisExklMoms,
              momssats: rad.enhetsMomssats ?? rad.prislista.momssats, // Använd sparat om det finns
              // prisInklMoms kan behöva räknas om här om det ska reflektera enhetspris + enhetsmoms
              // För enkelhetens skull, låt klienten räkna om prisInklMoms om det är kritiskt att det matchar enhetspris.
              // Alternativt, spara enhetsPrisInklMoms också på orderraden.
            }
          };
        }
        return rad;
      })
    };
    
    return NextResponse.json(processedArbetsorder);

  } catch (error) {
    console.error('Fel vid hämtning av arbetsorder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av arbetsorder' },
      { status: 500 }
    );
  }
}

// PUT /api/arbetsordrar/[id] - Uppdatera en arbetsorder
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.id) { 
      return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string); 
    const arbetsorderIdToUpdate = parseInt(params.id);
    
    if (isNaN(arbetsorderIdToUpdate)) {
      return NextResponse.json({ error: 'Ogiltigt arbetsorder-ID' }, { status: 400 });
    }

    const body = await req.json();
    
    const befintligArbetsorder = await prisma.arbetsorder.findUnique({
      where: { id: arbetsorderIdToUpdate },
      include: { orderrader: true }, 
    });

    if (!befintligArbetsorder) {
      return NextResponse.json({ error: 'Arbetsordern hittades inte' }, { status: 404 });
    }

    const updateData: Prisma.ArbetsorderUpdateInput = {
        uppdateradAv: { connect: { id: userId } } 
    };

    if (body.kundId !== undefined) {
      const kundIdInt = parseInt(body.kundId);
      if (isNaN(kundIdInt)) return NextResponse.json({ error: 'Ogiltigt kund-ID format' }, { status: 400 });
      const kund = await prisma.kund.findUnique({ where: { id: kundIdInt }});
      if (!kund) return NextResponse.json({ error: 'Kunden hittades inte' }, { status: 400 });
      updateData.kund = { connect: { id: kundIdInt } };
    }

    if (body.ROT !== undefined) updateData.ROT = body.ROT;
    if (body.ROTprocentsats !== undefined) {
        updateData.ROTprocentsats = (body.ROT && body.ROTprocentsats !== null && body.ROTprocentsats !== "") 
                                    ? parseFloat(body.ROTprocentsats) 
                                    : null;
    }
    if (body.material !== undefined) updateData.material = body.material;
    if (body.referensMärkning !== undefined) updateData.referensMärkning = body.referensMärkning;
    if (body.status !== undefined) updateData.status = body.status as ArbetsorderStatus;
    
    if (body.ansvarigTeknikerId !== undefined) {
        if (body.ansvarigTeknikerId === null || body.ansvarigTeknikerId === "none" || body.ansvarigTeknikerId === "") {
            updateData.ansvarigTekniker = { disconnect: true }; 
        } else {
            const parsedTeknikerId = parseInt(body.ansvarigTeknikerId);
            if (isNaN(parsedTeknikerId)) return NextResponse.json({ error: 'Ogiltigt tekniker-ID format' }, { status: 400 });
            const tekniker = await prisma.anvandare.findUnique({ where: { id: parsedTeknikerId } });
            if (!tekniker) return NextResponse.json({ error: `Tekniker med ID ${parsedTeknikerId} hittades inte` }, { status: 400 });
            updateData.ansvarigTekniker = { connect: { id: parsedTeknikerId } };
        }
    }

    if (body.orderrader && Array.isArray(body.orderrader)) {
        let totalPrisExklMoms = 0;
        let totalPrisInklMoms = 0;
        
        const createOperations: Prisma.OrderradCreateWithoutArbetsorderInput[] = [];
        const updateOperations: Prisma.OrderradUpdateWithWhereUniqueWithoutArbetsorderInput[] = [];
        
        const befintligaRadIdnClient = new Set(body.orderrader.map((r: any) => r.id).filter(Boolean));
        const raderAttTaBortDb = befintligArbetsorder.orderrader
            .filter(dbRad => !befintligaRadIdnClient.has(dbRad.id))
            .map(dbRad => ({ id: dbRad.id }));

        for (const rad of body.orderrader) {
            const antalNum = parseInt(rad.antal);
            const rabattProcentNum = parseFloat(rad.rabattProcent || "0");
            const breddNum = rad.bredd ? parseFloat(rad.bredd) : null;
            const hojdNum = rad.hojd ? parseFloat(rad.hojd) : null;
            const langdNum = rad.langd ? parseFloat(rad.langd) : null;
            const tidNum = rad.tid ? parseFloat(rad.tid) : null;

            if (isNaN(antalNum) || antalNum <= 0) { 
                console.warn(`Ogiltigt antal för orderrad, hoppar över: ${JSON.stringify(rad)}`);
                continue; 
            }

            const prislistaIdInt = parseInt(rad.prislistaId);
            if (isNaN(prislistaIdInt)) {
                console.warn(`Ogiltigt prislistaId, hoppar över: ${JSON.stringify(rad)}`);
                continue;
            }
            
            const prispost = await prisma.prislista.findUnique({ where: { id: prislistaIdInt }});
            if (!prispost) {
                console.warn(`Prispost med ID ${prislistaIdInt} hittades inte, hoppar över rad.`);
                continue;
            }

            let mangd = 1;
            if (prispost.prissattningTyp === PrissattningTyp.M2 && breddNum && hojdNum) mangd = (breddNum / 1000) * (hojdNum / 1000);
            else if (prispost.prissattningTyp === PrissattningTyp.M && langdNum) mangd = langdNum / 1000;
            else if (prispost.prissattningTyp === PrissattningTyp.TIM && tidNum) mangd = tidNum;
            
            const radExklMoms = prispost.prisExklMoms * mangd * antalNum * (1 - rabattProcentNum / 100);
            const radInklMoms = prispost.prisInklMoms * mangd * antalNum * (1 - rabattProcentNum / 100);
            
            totalPrisExklMoms += radExklMoms;
            totalPrisInklMoms += radInklMoms;

            const orderradDataForDb = {
                prislista: { connect: { id: prislistaIdInt } }, // Korrekt sätt att koppla
                antal: antalNum, bredd: breddNum, hojd: hojdNum, langd: langdNum, tid: tidNum,
                rabattProcent: rabattProcentNum, enhetsPrisExklMoms: prispost.prisExklMoms, enhetsMomssats: prispost.momssats,
                enhetsPrissattningTyp: prispost.prissattningTyp, radPrisExklMoms: radExklMoms, radPrisInklMoms: radInklMoms,
                kommentar: rad.kommentar || null,
            };

            if (rad.id) { 
                updateOperations.push({
                    where: { id: rad.id },
                    data: orderradDataForDb,
                });
            } else { 
                createOperations.push(orderradDataForDb);
            }
        }
        
        updateData.orderrader = {
            ...(createOperations.length > 0 && { create: createOperations }),
            ...(updateOperations.length > 0 && { update: updateOperations }),
            ...(raderAttTaBortDb.length > 0 && { deleteMany: raderAttTaBortDb }),
        };
        updateData.totalPrisExklMoms = totalPrisExklMoms;
        updateData.totalPrisInklMoms = totalPrisInklMoms;
    }


    const uppdateradArbetsorder = await prisma.arbetsorder.update({
        where: { id: arbetsorderIdToUpdate },
        data: updateData,
        include: { 
          kund: { include: { privatperson: true, foretag: true }},
          ansvarigTekniker: true,
          orderrader: { include: { prislista: true }},
          bilder: true,
          skapadAv: { select: { id: true, fornamn: true, efternamn: true }},
          uppdateradAv: { select: { id: true, fornamn: true, efternamn: true }},
        },
    });

    return NextResponse.json(uppdateradArbetsorder);

  } catch (error) {
    console.error('Fel vid uppdatering av arbetsorder:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: 'Databasfel vid uppdatering.', details: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof Error && error.name === 'PrismaClientValidationError') { // Korrekt namn för felet
        return NextResponse.json( { error: 'Valideringsfel från Prisma vid uppdatering.', details: error.message }, { status: 400 });
    }
    return NextResponse.json( { error: 'Ett serverfel uppstod vid uppdatering av arbetsorder', details: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/arbetsordrar/[id] - Ta bort en arbetsorder
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
    }

    const idString = params.id;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Ogiltigt arbetsorder-ID' }, { status: 400 });
    }

    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id },
      include: { kalender: true, bilder: true, orderrader: true }, // Inkludera orderrader
    });

    if (!arbetsorder) {
      return NextResponse.json({ error: 'Arbetsordern hittades inte' }, { status: 404 });
    }

    // Undvik att ta bort om fakturerad (kan vara en policy)
    if (arbetsorder.status === ArbetsorderStatus.FAKTURERAD) {
      return NextResponse.json({ error: 'Kan inte ta bort en fakturerad arbetsorder' }, { status: 400 });
    }

    // Transaktion för att säkerställa atomicitet
    await prisma.$transaction(async (tx) => {
      // 1. Ta bort kopplade kalenderhändelser
      if (arbetsorder.kalender.length > 0) {
        await tx.kalender.deleteMany({ where: { arbetsorderId: id }});
      }

      // 2. Ta bort kopplade bilder (både från DB och filsystem)
      if (arbetsorder.bilder.length > 0) {
        for (const bild of arbetsorder.bilder) {
            try {
                const filePath = path.join(process.cwd(), 'public', bild.filsokvag.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileError) {
                console.error(`Kunde inte ta bort fil ${bild.filsokvag}:`, fileError);
                // Fortsätt även om filborttagning misslyckas, men logga felet.
            }
        }
        await tx.bild.deleteMany({ where: { arbetsorderId: id }});
      }

      // 3. Ta bort kopplade orderrader
      if (arbetsorder.orderrader.length > 0) {
        await tx.orderrad.deleteMany({ where: { arbetsorderId: id }});
      }
      
      // 4. Ta bort själva arbetsordern
      await tx.arbetsorder.delete({ where: { id }});
    });

    return NextResponse.json({ message: 'Arbetsordern har tagits bort' }, { status: 200 });

  } catch (error) {
    console.error('Fel vid borttagning av arbetsorder:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Specifikt för foreign key constraints om något blockerar
        if (error.code === 'P2003') {
             return NextResponse.json({ error: 'Kunde inte ta bort arbetsordern på grund av kvarvarande beroenden i databasen.'}, { status: 409 });
        }
    }
    return NextResponse.json({ error: 'Ett fel uppstod vid borttagning av arbetsorder', details: (error as Error).message }, { status: 500 });
  }
}