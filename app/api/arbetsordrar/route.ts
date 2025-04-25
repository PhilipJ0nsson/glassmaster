import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/arbetsordrar - Hämta alla arbetsordrar
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const tekniker = searchParams.get('tekniker');
    const kundId = searchParams.get('kundId');

    const skip = (page - 1) * pageSize;

    // Bygger filtrering
    const filter: any = {};
    
    // Filtrera på status om angivet
    if (status) {
      const statusArray = status.split(',') as ArbetsorderStatus[];
      filter.status = {
        in: statusArray
      };
    }
    
    // Filtrera på tekniker om angivet
    if (tekniker) {
      filter.ansvarigTeknikerId = parseInt(tekniker);
    }
    
    // Filtrera på kund om angivet
    if (kundId) {
      filter.kundId = parseInt(kundId);
    }

    // Hämta antal arbetsordrar som matchar filtret
    const total = await prisma.arbetsorder.count({
      where: {
        ...filter,
        ...(search && { // Apply OR search only if search term exists
          OR: [
            // Removed: { kundId: search ? parseInt(search) : undefined },
            { 
              kund: {
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
                ]
              }
            },
          ]
        })
      }
    });

    // Hämta arbetsordrar med paginering och filtrering
    const arbetsordrar = await prisma.arbetsorder.findMany({
      where: {
        ...filter,
        ...(search && { // Apply OR search only if search term exists
          OR: [
            // Removed: { kundId: search ? parseInt(search) : undefined },
            { 
              kund: {
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
                ]
              }
            },
          ]
        })
      },
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
      },
      skip,
      take: pageSize,
      orderBy: {
        skapadDatum: 'desc',
      },
    });

    // Hämta statusfördelning för statistik
    const statusCounts = await prisma.arbetsorder.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Formatera statusfördelningen
    const statusStats = Object.values(ArbetsorderStatus).reduce((acc, curr) => {
      const found = statusCounts.find(item => item.status === curr);
      acc[curr] = found ? found._count.id : 0;
      return acc;
    }, {} as Record<ArbetsorderStatus, number>);

    return NextResponse.json({
      arbetsordrar,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      statusStats,
    });

  } catch (error) {
    console.error('Fel vid hämtning av arbetsordrar:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av arbetsordrar' },
      { status: 500 }
    );
  }
}

// POST /api/arbetsordrar - Skapa en ny arbetsorder
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id as string);
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

    // Validera existens av kund
    const kundIdInt = typeof kundId === 'string' ? parseInt(kundId) : kundId;
    
    // Ytterligare validering för att säkerställa att vi har ett giltigt ID
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

    // Validera tekniker om angiven
    let ansvarigTeknikerIdInt: number | undefined = undefined;
    if (ansvarigTeknikerId) {
      ansvarigTeknikerIdInt = typeof ansvarigTeknikerId === 'string' ? parseInt(ansvarigTeknikerId) : ansvarigTeknikerId;
      const tekniker = await prisma.anvandare.findUnique({
        where: { id: ansvarigTeknikerIdInt }
      });

      if (!tekniker) {
        return NextResponse.json(
          { error: 'Tekniker hittades inte' },
          { status: 400 }
        );
      }
    }

    // Beräkna totalsummor baserat på orderrader
    let totalPrisExklMoms = 0;
    let totalPrisInklMoms = 0;

    // Validera och beräkna orderrader
    const orderraderData = await Promise.all(
      orderrader.map(async (rad: any) => {
        console.log("Orderrad data:", JSON.stringify(rad, null, 2));
        
        // Kontrollera om alla nödvändiga fält finns
        if (!rad || Object.keys(rad).length === 0) {
          console.log("Hoppar över tom orderrad");
          return null; // Vi kommer att filtrera bort null-värden senare
        }
        
        const { prislistaId, antal, rabattProcent, kommentar } = rad;
        
        // Validera prislistaId - det är obligatoriskt
        if (prislistaId === undefined || prislistaId === null || prislistaId === "") {
          console.log("prislistaId saknas eller är tomt:", prislistaId);
          return null; // Hoppa över denna rad om prislistaId saknas
        }
        
        // Konvertera till heltal med extra validering
        let prislistaIdInt: number;
        if (typeof prislistaId === 'string') {
          if (prislistaId.trim() === "") {
            console.log("prislistaId är en tom sträng");
            return null; // Hoppa över denna rad om prislistaId är en tom sträng
          }
          prislistaIdInt = parseInt(prislistaId);
          if (isNaN(prislistaIdInt)) {
            console.log(`Ogiltigt prislistaId (inte ett nummer): ${prislistaId}`);
            return null; // Hoppa över denna rad om prislistaId inte kan konverteras till ett nummer
          }
        } else if (typeof prislistaId === 'number') {
          prislistaIdInt = prislistaId;
        } else {
          console.log(`Prislistad har ogiltig typ: ${typeof prislistaId}`);
          return null; // Hoppa över denna rad
        }
        
        let antalInt: number;
        if (typeof antal === 'string') {
          antalInt = parseInt(antal);
          if (isNaN(antalInt)) {
            antalInt = 1; // Standardvärde om det är ogiltigt
          }
        } else if (typeof antal === 'number') {
          antalInt = antal;
        } else {
          antalInt = 1; // Standardvärde om det saknas
        }
        
        let rabattProcentFloat = 0;
        if (rabattProcent !== undefined && rabattProcent !== null) {
          if (typeof rabattProcent === 'string') {
            rabattProcentFloat = parseFloat(rabattProcent);
            if (isNaN(rabattProcentFloat)) {
              rabattProcentFloat = 0;
            }
          } else if (typeof rabattProcent === 'number') {
            rabattProcentFloat = rabattProcent;
          }
        }
        
        console.log(`Prisdata: ID=${prislistaIdInt}, Antal=${antalInt}, Rabatt=${rabattProcentFloat}`);
        
        // Validera att prisposten finns
        const prispost = await prisma.prislista.findUnique({
          where: { id: prislistaIdInt }
        });

        if (!prispost) {
          throw new Error(`Prispost med ID ${prislistaIdInt} hittades inte`);
        }

        // Beräkna faktorn baserat på prissättningstyp och mått/tid
        console.log(`Pre-calculation: Processing orderrad with prissattningTyp: ${prispost.prissattningTyp}`);
        
        let mangd = 1;
        if (prispost.prissattningTyp === 'M2' && rad.bredd && rad.hojd) {
          // Konvertera millimeter till meter för bredd och höjd
          const breddMm = parseFloat(rad.bredd.toString());
          const hojdMm = parseFloat(rad.hojd.toString());
          
          // Konvertera alltid till meter (antar att värden anges i millimeter)
          const bredd = breddMm / 1000;
          const hojd = hojdMm / 1000;
          
          mangd = bredd * hojd;
          console.log(`Pre-calculation M2: ${breddMm}mm × ${hojdMm}mm = ${bredd}m × ${hojd}m = ${mangd}m²`);
        } else if (prispost.prissattningTyp === 'M' && rad.langd) {
          // Konvertera millimeter till meter för längd
          const langdMm = parseFloat(rad.langd.toString());
          const langd = langdMm / 1000;
          
          mangd = langd;
          console.log(`Pre-calculation M: ${langdMm}mm = ${langd}m`);
        } else if (prispost.prissattningTyp === 'TIM' && rad.tid) {
          // Timpris
          mangd = parseFloat(rad.tid.toString());
          console.log(`Pre-calculation TIM: ${mangd} timmar`);
        } else {
          // Styckpris (ST) - använder bara antal
          console.log(`Pre-calculation ST: standard styckpris (mangd = 1)`);
        }
        
        // Beräkna radpriser med hänsyn till mått/tid
        const radPrisExklMoms = prispost.prisExklMoms * antalInt * mangd * (1 - rabattProcentFloat / 100);
        const radPrisInklMoms = prispost.prisInklMoms * antalInt * mangd * (1 - rabattProcentFloat / 100);
        
        console.log(`Pre-calculation price summary: 
          Base price: ${prispost.prisExklMoms} kr
          Quantity factor: ${mangd}
          Units: ${antalInt}
          Discount: ${rabattProcentFloat}%
          Final row price: ${radPrisExklMoms} kr (excl. VAT)
        `);
        
        // Lägg till i totalsumman
        totalPrisExklMoms += radPrisExklMoms;
        totalPrisInklMoms += radPrisInklMoms;

        // Använda redan beräknad mangd, ingen behov att beräkna igen
        console.log(`Using already calculated price with mangd: ${mangd}`);
        
        return {
          prislistaId: prislistaIdInt,
          antal: antalInt,
          bredd: rad.bredd ? parseFloat(rad.bredd.toString()) : null,
          hojd: rad.hojd ? parseFloat(rad.hojd.toString()) : null,
          langd: rad.langd ? parseFloat(rad.langd.toString()) : null,
          tid: rad.tid ? parseFloat(rad.tid.toString()) : null,
          rabattProcent: rabattProcentFloat,
          enhetsPrisExklMoms: prispost.prisExklMoms,
          enhetsMomssats: prispost.momssats,
          enhetsPrissattningTyp: prispost.prissattningTyp,
          radPrisExklMoms: radPrisExklMoms,
          radPrisInklMoms: radPrisInklMoms,
          kommentar,
        };
      })
    );

    // Filtrera bort null-värden från orderrader
    const filtreradeOrderrader = orderraderData.filter(rad => rad !== null);
    
    console.log(`Total antal orderrader: ${orderrader.length}, giltiga rader: ${filtreradeOrderrader.length}`);
    
    // Skapa arbetsorder
    const arbetsorder = await prisma.arbetsorder.create({
      data: {
        kund: {
          connect: { id: kundIdInt }
        },
        ROT,
        ROTprocentsats: ROT ? ROTprocentsats : null,
        arbetstid,
        material,
        referensMärkning,
        ansvarigTekniker: ansvarigTeknikerIdInt 
          ? { connect: { id: ansvarigTeknikerIdInt } } 
          : undefined,
        status: status || ArbetsorderStatus.OFFERT,
        skapadAv: {
          connect: { id: userId }
        },
        uppdateradAv: {
          connect: { id: userId }
        },
        totalPrisExklMoms,
        totalPrisInklMoms,
        ...(filtreradeOrderrader.length > 0 ? {
          orderrader: {
            create: filtreradeOrderrader
          }
        } : {})
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
        skapadAv: {
          select: {
            id: true,
            fornamn: true,
            efternamn: true,
          },
        },
      }
    });

    return NextResponse.json(arbetsorder, { status: 201 });

  } catch (error) {
    console.error('Fel vid skapande av arbetsorder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av arbetsorder' },
      { status: 500 }
    );
  }
}
