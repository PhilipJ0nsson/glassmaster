// File: app/api/arbetsordrar/[id]/pdf/route.ts
// Mode: Modifying
// Change: Added null check for arbetsorder.kund.foretag before accessing foretagsnamn.
// Reasoning: To fix TypeScript error TS2339: Property 'foretagsnamn' does not exist on type '... | null'.
// --- start diff ---
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { generatePDF, DocumentType } from '@/lib/pdf-generator'; // Importera DocumentType
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
    const documentTypeParam = searchParams.get('type')?.toUpperCase() as DocumentType | undefined;

    if (!documentTypeParam || !['OFFERT', 'ARBETSORDER', 'FAKTURA'].includes(documentTypeParam)) {
      return NextResponse.json({ error: 'Ogiltig dokumenttyp' }, { status: 400 });
    }
    const documentType: DocumentType = documentTypeParam;


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
        bilder: true, // Säkerställ att bilder inkluderas
      },
    });

    if (!arbetsorder) {
      return NextResponse.json({ error: 'Arbetsorder hittades inte' }, { status: 404 });
    }

    // Generera PDF
    const pdfBlob = await generatePDF(arbetsorder, documentType); // Skicka med documentType

    // Skapa ett filnamn baserat på arbetsorderns ID och kund
    let kundNamn = '';
    if (arbetsorder.kund.privatperson) {
      kundNamn = `${arbetsorder.kund.privatperson.fornamn}-${arbetsorder.kund.privatperson.efternamn}`;
    } else if (arbetsorder.kund.foretag) {
      // Korrigering: Kontrollera att arbetsorder.kund.foretag inte är null
      kundNamn = arbetsorder.kund.foretag.foretagsnamn || `Foretag-${arbetsorder.kund.id}`;
    }
    
    const cleanKundNamn = kundNamn.replace(/[^a-zA-Z0-9]/g, '');
    // Anpassa filnamn baserat på dokumenttyp
    let baseFilename = '';
    if (documentType === 'OFFERT') baseFilename = 'Offert';
    else if (documentType === 'ARBETSORDER') baseFilename = 'Arbetsorder';
    else if (documentType === 'FAKTURA') baseFilename = 'Faktura';

    const filnamn = `${baseFilename}-${arbetsorder.id}-${cleanKundNamn}.pdf`;

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
// --- end diff ---