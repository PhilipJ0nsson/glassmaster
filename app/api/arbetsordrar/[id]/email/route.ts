import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * POST - Skicka offert/arbetsorder via e-post
 * 
 * Denna funktion är förberedd för framtida implementering av e-postfunktionalitet.
 * Just nu returnerar den bara ett meddelande om att funktionen inte är implementerad ännu.
 */
export async function POST(
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

    // Hämta e-postdetaljer från request body
    const { to, subject, message } = await request.json();
    
    if (!to) {
      return NextResponse.json({ error: 'E-postadress saknas' }, { status: 400 });
    }

    // Hämta arbetsorder för att verifiera att den existerar
    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id: arbetsorderId },
      include: {
        kund: true,
      },
    });

    if (!arbetsorder) {
      return NextResponse.json({ error: 'Arbetsorder hittades inte' }, { status: 404 });
    }

    // Här skulle e-postlogik implementeras
    // Exempel:
    // await sendEmail({
    //   to,
    //   subject,
    //   message,
    //   attachmentUrl: `/api/arbetsordrar/${arbetsorderId}/offert`,
    // });

    // Tills vidare, returnera ett meddelande om att funktionen inte är implementerad
    return NextResponse.json(
      { 
        success: false, 
        message: 'E-postfunktionalitet är inte implementerad ännu' 
      }, 
      { status: 501 }
    );
  } catch (error) {
    console.error('Fel vid skickande av e-post:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skickande av e-post' },
      { status: 500 }
    );
  }
}