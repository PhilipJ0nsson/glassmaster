// File: app/api/kalender/[id]/hantera/route.ts
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AnvandareRoll } from '@prisma/client';

interface RouteParams {
  params: {
    id: string; // Kalenderhändelse ID
  };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || 
        (session.user.role !== AnvandareRoll.ADMIN && session.user.role !== AnvandareRoll.ARBETSLEDARE)) {
      return NextResponse.json({ error: 'Behörighet saknas' }, { status: 403 });
    }

    const kalenderId = parseInt(params.id);
    if (isNaN(kalenderId)) {
      return NextResponse.json({ error: 'Ogiltigt kalenderhändelse-ID' }, { status: 400 });
    }

    const kalenderHandelse = await prisma.kalender.findUnique({
      where: { id: kalenderId },
    });

    if (!kalenderHandelse) {
      return NextResponse.json({ error: 'Kalenderhändelsen hittades inte' }, { status: 404 });
    }

    // Vi sätter bara till true. Om man vill kunna "ångra" hantering behövs mer logik.
    const uppdateradHandelse = await prisma.kalender.update({
      where: { id: kalenderId },
      data: {
        hanteradAvAdmin: true,
      },
      select: {
        id: true,
        hanteradAvAdmin: true,
      }
    });

    return NextResponse.json(uppdateradHandelse);

  } catch (error) {
    console.error('Fel vid markering av kalenderhändelse som hanterad:', error);
    return NextResponse.json(
      { error: 'Ett serverfel uppstod vid hantering av kalenderhändelse' },
      { status: 500 }
    );
  }
}