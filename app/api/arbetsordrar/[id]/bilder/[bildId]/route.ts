import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: {
    id: string;
    bildId: string;
  };
}

// DELETE /api/arbetsordrar/[id]/bilder/[bildId] - Ta bort en bild
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Inte autentiserad' },
        { status: 401 }
      );
    }

    const arbetsorderId = parseInt(params.id);
    const bildId = parseInt(params.bildId);
    
    if (isNaN(arbetsorderId) || isNaN(bildId)) {
      return NextResponse.json(
        { error: 'Ogiltigt ID' },
        { status: 400 }
      );
    }

    // Hämta bildinformation
    const bild = await prisma.bild.findFirst({
      where: {
        id: bildId,
        arbetsorderId,
      }
    });

    if (!bild) {
      return NextResponse.json(
        { error: 'Bilden hittades inte' },
        { status: 404 }
      );
    }

    // Ta bort filen från disk
    try {
      const filePath = path.join(process.cwd(), 'public', bild.filsokvag.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Fel vid borttagning av fil:', error);
      // Fortsätt ändå att ta bort från databasen
    }

    // Ta bort från databasen
    await prisma.bild.delete({
      where: {
        id: bildId
      }
    });

    return NextResponse.json(
      { message: 'Bilden har tagits bort' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fel vid borttagning av bild:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid borttagning av bild' },
      { status: 500 }
    );
  }
}