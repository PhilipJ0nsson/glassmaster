// File: app/api/arbetsordrar/[id]/status/route.ts
// Mode: New
// Change: Creating a new API endpoint specifically for updating the status of a work order.
// Reasoning: To provide a lightweight method for changing work order status, e.g., from the dashboard.
// --- start diff ---
import { prisma } from '@/lib/prisma';
import { ArbetsorderStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RouteParams {
  params: {
    id: string; // Arbetsorder ID
  };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
    }

    const arbetsorderId = parseInt(params.id);
    if (isNaN(arbetsorderId)) {
      return NextResponse.json({ error: 'Ogiltigt arbetsorder-ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(ArbetsorderStatus).includes(status as ArbetsorderStatus)) {
      return NextResponse.json({ error: 'Ogiltig status angiven' }, { status: 400 });
    }

    const befintligArbetsorder = await prisma.arbetsorder.findUnique({
      where: { id: arbetsorderId },
    });

    if (!befintligArbetsorder) {
      return NextResponse.json({ error: 'Arbetsordern hittades inte' }, { status: 404 });
    }

    // Här kan du lägga till logik för att förhindra vissa statusövergångar om det behövs
    // Exempel: Kan inte gå från FAKTURERAD tillbaka till AKTIV via denna endpoint.
    // För nu tillåter vi alla giltiga statusändringar.

    const uppdateradArbetsorder = await prisma.arbetsorder.update({
      where: { id: arbetsorderId },
      data: {
        status: status as ArbetsorderStatus,
        uppdateradAvId: parseInt(session.user.id), // Sätt vem som uppdaterade
      },
      select: { // Returnera bara det nödvändigaste
        id: true,
        status: true,
      }
    });

    return NextResponse.json(uppdateradArbetsorder);

  } catch (error) {
    console.error('Fel vid uppdatering av arbetsorderstatus:', error);
    return NextResponse.json(
      { error: 'Ett serverfel uppstod vid uppdatering av status' },
      { status: 500 }
    );
  }
}
// --- end diff ---