import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { generatePDF } from '@/lib/pdf-generator';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET - Generera PDF för en arbetsorder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Kontrollera autentisering
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });
  }

  try {
    const arbetsorderId = parseInt(params.id);
    if (isNaN(arbetsorderId)) {
      return NextResponse.json({ error: 'Ogiltigt ID' }, { status: 400 });
    }
    
    // Kolla om vi ska ladda ner eller visa (inline)
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    // Hämta arbetsorder med alla relationer
    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id: arbetsorderId },
      include: {
        kund: {
          include: {
            privatperson: true,
            foretag: true,
          },
        },
        orderrader: {
          include: {
            prislista: true,
          },
        },
        skapadAv: true,
        uppdateradAv: true,
        ansvarigTekniker: true,
        bilder: true,
      },
    });

    if (!arbetsorder) {
      return NextResponse.json({ error: 'Arbetsorder hittades inte' }, { status: 404 });
    }

    // Generera PDF
    const pdfBlob = await generatePDF(arbetsorder);

    // Skapa ett filnamn baserat på arbetsorderns ID och kund
    let kundNamn = '';
    if (arbetsorder.kund.privatperson) {
      kundNamn = `${arbetsorder.kund.privatperson.fornamn}-${arbetsorder.kund.privatperson.efternamn}`;
    } else if (arbetsorder.kund.foretag) {
      kundNamn = arbetsorder.kund.foretag.foretagsnamn;
    }
    
    const cleanKundNamn = kundNamn.replace(/[^a-zA-Z0-9]/g, '');
    const filnamn = `Offert-${arbetsorder.id}-${cleanKundNamn}.pdf`;

    // Konvertera Blob till ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Skapa ett NextResponse-objekt med PDF-data
    const disposition = download 
      ? `attachment; filename="${filnamn}"` 
      : 'inline';
      
    const response = new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    });

    return response;
  } catch (error) {
    console.error('Fel vid generering av PDF:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid generering av PDF' },
      { status: 500 }
    );
  }
}