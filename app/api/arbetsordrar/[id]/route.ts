import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus, PrissattningTyp } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

    const id = parseInt(await params.id);
    
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
        kalender: {
          include: {
            ansvarig: true,
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

    // Förhandsbearbeta orderrader för att säkerställa att prisliste-data är historiskt korrekt
    const processedArbetsorder = {
      ...arbetsorder,
      orderrader: arbetsorder.orderrader.map(rad => {
        // Skapa en isolerad kopia av prislista med data från orderraden om det finns
        if (rad.enhetsPrisExklMoms !== null && rad.enhetsPrisExklMoms !== undefined) {
          return {
            ...rad,
            prislista: {
              ...rad.prislista,
              prisExklMoms: rad.enhetsPrisExklMoms,
              momssats: rad.enhetsMomssats || rad.prislista.momssats
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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id as string);
    const id = parseInt(await params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt arbetsorder-ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      kundId, 
      ROT, 
      ROTprocentsats,
      arbetstid,
      material,
      referensMärkning,
      ansvarigTeknikerId,
      status,
      orderrader = [],
    } = body;

    // Kontrollera att arbetsordern finns
    const befintligArbetsorder = await prisma.arbetsorder.findUnique({
      where: { id },
      include: {
        orderrader: true,
      },
    });

    if (!befintligArbetsorder) {
      return NextResponse.json(
        { error: 'Arbetsordern hittades inte' },
        { status: 404 }
      );
    }

    // Validera existens av kund om kundId har ändrats
    if (kundId && kundId !== befintligArbetsorder.kundId) {
      const kundIdInt = typeof kundId === 'string' ? parseInt(kundId) : kundId;
      
      // Validera att vi har ett giltigt ID
      if (!kundIdInt || isNaN(kundIdInt)) {
        return NextResponse.json(
          { error: 'Ogiltigt kund-ID' },
          { status: 400 }
        );
      }
      
      const kund = await prisma.kund.findUnique({
        where: { id: kundIdInt }
      });

      if (!kund) {
        return NextResponse.json(
          { error: 'Kunden hittades inte' },
          { status: 400 }
        );
      }
    }

    // Validera tekniker om ändrad
    if (ansvarigTeknikerId && ansvarigTeknikerId !== befintligArbetsorder.ansvarigTeknikerId) {
      // Konvertera ansvarigTeknikerId till nummer om det är en sträng
      const teknikerId = typeof ansvarigTeknikerId === 'string' ? parseInt(ansvarigTeknikerId) : ansvarigTeknikerId;
      
      const tekniker = await prisma.anvandare.findUnique({
        where: { id: teknikerId }
      });

      if (!tekniker) {
        return NextResponse.json(
          { error: 'Tekniker hittades inte' },
          { status: 400 }
        );
      }
    }

    // Hantera orderrader och beräkna totalsummor
    let totalPrisExklMoms = 0;
    let totalPrisInklMoms = 0;

    // Förbered uppdaterade och nya orderrader
    type OrderRadUpdate = {
      where: { id: number };
      data: {
        prislistaId: number;
        antal: number;
        bredd?: number | null;
        hojd?: number | null;
        langd?: number | null;
        tid?: number | null;
        rabattProcent: number;
        enhetsPrisExklMoms: number;
        enhetsMomssats: number;
        enhetsPrissattningTyp: PrissattningTyp;
        radPrisExklMoms: number;
        radPrisInklMoms: number;
        kommentar?: string;
      };
    };

    type NyOrderRad = {
      prislistaId: number;
      antal: number;
      bredd?: number | null;
      hojd?: number | null;
      langd?: number | null;
      tid?: number | null;
      rabattProcent: number;
      enhetsPrisExklMoms: number;
      enhetsMomssats: number;
      enhetsPrissattningTyp: PrissattningTyp;
      radPrisExklMoms: number;
      radPrisInklMoms: number;
      kommentar?: string;
    };

    const uppdateradeOrderRader: OrderRadUpdate[] = [];
    const nyaOrderRader: NyOrderRad[] = [];
    const befintligaOrderRaderIds = new Set<number>();

    for (const rad of orderrader) {
      const { id: radId, prislistaId, antal, rabattProcent, kommentar } = rad;
      
      // Validera att prisposten finns och konvertera ID till integer
      const prislistaIdInt = typeof prislistaId === 'string' ? parseInt(prislistaId) : prislistaId;
      
      if (isNaN(prislistaIdInt)) {
        return NextResponse.json(
          { error: `Ogiltigt prislistaId: ${prislistaId}` },
          { status: 400 }
        );
      }
      
      const prispost = await prisma.prislista.findUnique({
        where: { id: prislistaIdInt }
      });

      if (!prispost) {
        return NextResponse.json(
          { error: `Prispost med ID ${prislistaId} hittades inte` },
          { status: 400 }
        );
      }

      // Extrahera mått och tid från fälten i rad
      const bredd = rad.bredd ? parseFloat(String(rad.bredd)) : null;
      const hojd = rad.hojd ? parseFloat(String(rad.hojd)) : null;
      const langd = rad.langd ? parseFloat(String(rad.langd)) : null;
      const tid = rad.tid ? parseFloat(String(rad.tid)) : null;
      
      // Beräkna faktorn baserat på prissättningstyp
      console.log(`Processing orderrad with prissattningTyp: ${prispost.prissattningTyp}`);
      
      let mangd = 1;
      if (prispost.prissattningTyp === 'M2' && bredd && hojd) {
        // Konvertera millimeter till meter för bredd och höjd
        const breddMm = bredd;
        const hojdMm = hojd;
        
        // Konvertera alltid till meter (antar att värden anges i millimeter)
        const breddM = breddMm / 1000;
        const hojdM = hojdMm / 1000;
        
        mangd = breddM * hojdM;
        console.log(`M2 calculation: ${breddMm}mm × ${hojdMm}mm = ${breddM}m × ${hojdM}m = ${mangd}m²`);
      } else if (prispost.prissattningTyp === 'M' && langd) {
        // Konvertera millimeter till meter för längd
        const langdMm = langd;
        const langdM = langdMm / 1000;
        
        mangd = langdM;
        console.log(`M calculation: ${langdMm}mm = ${langdM}m`);
      } else if (prispost.prissattningTyp === 'TIM' && tid) {
        // Timpris
        mangd = tid;
        console.log(`TIM calculation: ${mangd} timmar`);
      } else {
        // Styckpris (ST) - använder bara antal
        console.log(`ST calculation: standard styckpris (mangd = 1)`);
      }
      
      // Beräkna radpriser med mangd-faktor
      const radPrisExklMoms = prispost.prisExklMoms * mangd * antal * (1 - (rabattProcent || 0) / 100);
      const radPrisInklMoms = prispost.prisInklMoms * mangd * antal * (1 - (rabattProcent || 0) / 100);
      
      console.log(`Price calculation (update): 
        Base price: ${prispost.prisExklMoms} kr
        Quantity factor: ${mangd}
        Units: ${antal}
        Discount: ${rabattProcent || 0}%
        Final row price: ${radPrisExklMoms} kr
      `);
      
      // Lägg till i totalsumman
      totalPrisExklMoms += radPrisExklMoms;
      totalPrisInklMoms += radPrisInklMoms;

      // Avgör om det är en uppdatering eller en ny rad
      if (radId) {
        befintligaOrderRaderIds.add(radId);
        uppdateradeOrderRader.push({
          where: { id: radId },
          data: {
            prislistaId: prislistaIdInt, // Use the converted integer value
            antal,
            bredd,
            hojd,
            langd,
            tid,
            rabattProcent: rabattProcent || 0,
            enhetsPrisExklMoms: prispost.prisExklMoms,
            enhetsMomssats: prispost.momssats,
            enhetsPrissattningTyp: prispost.prissattningTyp,
            radPrisExklMoms,
            radPrisInklMoms,
            kommentar,
          },
        });
      } else {
        nyaOrderRader.push({
          prislistaId: prislistaIdInt, // Use the converted integer value
          antal,
          bredd,
          hojd,
          langd,
          tid,
          rabattProcent: rabattProcent || 0,
          enhetsPrisExklMoms: prispost.prisExklMoms,
          enhetsMomssats: prispost.momssats,
          enhetsPrissattningTyp: prispost.prissattningTyp,
          radPrisExklMoms,
          radPrisInklMoms,
          kommentar,
        });
      }
    }

    // Identifiera orderrader som ska tas bort
    const raderAttTaBort = befintligArbetsorder.orderrader
      .filter(rad => !befintligaOrderRaderIds.has(rad.id))
      .map(rad => rad.id);

    // Uppdatera arbetsordern i en transaktion
    const uppdateradArbetsorder = await prisma.$transaction(async (tx) => {
      // Ta bort orderrader som inte längre behövs
      if (raderAttTaBort.length > 0) {
        await tx.orderrad.deleteMany({
          where: {
            id: {
              in: raderAttTaBort,
            },
          },
        });
      }

      // Uppdatera befintliga orderrader
      for (const updateOp of uppdateradeOrderRader) {
        const { where, data } = updateOp;
        await tx.orderrad.update({
          where,
          data
        });
      }

      // Lägg till nya orderrader
      if (nyaOrderRader.length > 0) {
        // Skapa orderrader en efter en för att undvika typningsproblem
        for (const rad of nyaOrderRader) {
          await tx.orderrad.create({
            data: {
              arbetsorderId: id,
              prislistaId: rad.prislistaId,
              antal: rad.antal,
              bredd: rad.bredd,
              hojd: rad.hojd,
              langd: rad.langd,
              tid: rad.tid,
              rabattProcent: rad.rabattProcent,
              enhetsPrisExklMoms: rad.enhetsPrisExklMoms,
              enhetsMomssats: rad.enhetsMomssats,
              enhetsPrissattningTyp: rad.enhetsPrissattningTyp,
              radPrisExklMoms: rad.radPrisExklMoms,
              radPrisInklMoms: rad.radPrisInklMoms,
              kommentar: rad.kommentar,
            }
          });
        }
      }

      // Uppdatera arbetsordern
      // Konvertera ansvarigTeknikerId till nummer om det är en sträng
      const teknikerId = ansvarigTeknikerId ? 
        (typeof ansvarigTeknikerId === 'string' ? parseInt(ansvarigTeknikerId) : ansvarigTeknikerId) 
        : befintligArbetsorder.ansvarigTeknikerId;
        
      return await tx.arbetsorder.update({
        where: { id },
        data: {
          kundId: kundId ? (typeof kundId === 'string' ? parseInt(kundId) : kundId) : befintligArbetsorder.kundId,
          ROT,
          ROTprocentsats: ROT ? ROTprocentsats : null,
          arbetstid,
          material,
          referensMärkning,
          ansvarigTeknikerId: teknikerId,
          status: status || befintligArbetsorder.status,
          uppdateradAvId: userId,
          totalPrisExklMoms,
          totalPrisInklMoms,
        },
        include: {
          kund: {
            include: {
              privatperson: true,
              foretag: true,
            },
          },
          ansvarigTekniker: true,
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
        },
      });
    });

    return NextResponse.json(uppdateradArbetsorder);

  } catch (error) {
    console.error('Fel vid uppdatering av arbetsorder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av arbetsorder' },
      { status: 500 }
    );
  }
}

// DELETE /api/arbetsordrar/[id] - Ta bort en arbetsorder
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const id = parseInt(await params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ogiltigt arbetsorder-ID' },
        { status: 400 }
      );
    }

    // Kontrollera att arbetsordern finns
    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id },
      include: {
        kalender: true,
        bilder: true,
      },
    });

    if (!arbetsorder) {
      return NextResponse.json(
        { error: 'Arbetsordern hittades inte' },
        { status: 404 }
      );
    }

    // Kontrollera om arbetsordern är i ett status som tillåter borttagning
    if (arbetsorder.status === ArbetsorderStatus.FAKTURERAD) {
      return NextResponse.json(
        { error: 'Kan inte ta bort en fakturerad arbetsorder' },
        { status: 400 }
      );
    }

    // Ta bort arbetsorder och relaterade data i en transaktion
    await prisma.$transaction(async (tx) => {
      // Ta bort kalenderhändelser
      if (arbetsorder.kalender.length > 0) {
        await tx.kalender.deleteMany({
          where: {
            arbetsorderId: id,
          },
        });
      }

      // Ta bort bilder (skulle i en riktig app också ta bort fysiska filer)
      if (arbetsorder.bilder.length > 0) {
        await tx.bild.deleteMany({
          where: {
            arbetsorderId: id,
          },
        });
      }

      // Ta bort orderrader
      await tx.orderrad.deleteMany({
        where: {
          arbetsorderId: id,
        },
      });

      // Ta bort arbetsordern
      await tx.arbetsorder.delete({
        where: { id },
      });
    });

    return NextResponse.json(
      { message: 'Arbetsordern har tagits bort' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fel vid borttagning av arbetsorder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av arbetsorder' },
      { status: 500 }
    );
  }
}