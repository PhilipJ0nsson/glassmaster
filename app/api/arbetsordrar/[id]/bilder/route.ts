import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/arbetsordrar/[id]/bilder - Ladda upp en bild till en arbetsorder
export async function POST(req: NextRequest, { params }: RouteParams) {
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
        { error: 'Ogiltigt arbetsorder-ID' },
        { status: 400 }
      );
    }

    // Kontrollera att arbetsordern finns
    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id }
    });

    if (!arbetsorder) {
      return NextResponse.json(
        { error: 'Arbetsordern hittades inte' },
        { status: 404 }
      );
    }

    // Hantera filuppladdning
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Ingen fil skickades' },
        { status: 400 }
      );
    }

    // Generera unikt filnamn
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    // Definiera sökväg för att spara filen
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, uniqueFilename);
    const publicPath = `/uploads/${uniqueFilename}`;
    
    // Konvertera filen till arrayBuffer och skriv till disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Skapa uploads-katalogen om den inte finns
    try {
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error('Fel vid skrivning av fil:', error);
      return NextResponse.json(
        { error: 'Kunde inte spara filen' },
        { status: 500 }
      );
    }

    // Spara bildreferens i databasen
    const bild = await prisma.bild.create({
      data: {
        arbetsorder: {
          connect: { id }
        },
        filnamn: file.name,
        filsokvag: publicPath,
      }
    });

    return NextResponse.json(bild, { status: 201 });

  } catch (error) {
    console.error('Fel vid uppladdning av bild:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppladdning av bild' },
      { status: 500 }
    );
  }
}

// GET /api/arbetsordrar/[id]/bilder - Hämta alla bilder för en arbetsorder
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
        { error: 'Ogiltigt arbetsorder-ID' },
        { status: 400 }
      );
    }

    // Kontrollera att arbetsordern finns
    const arbetsorder = await prisma.arbetsorder.findUnique({
      where: { id }
    });

    if (!arbetsorder) {
      return NextResponse.json(
        { error: 'Arbetsordern hittades inte' },
        { status: 404 }
      );
    }

    // Hämta alla bilder för arbetsordern
    const bilder = await prisma.bild.findMany({
      where: {
        arbetsorderId: id
      },
      orderBy: {
        skapadDatum: 'desc'
      }
    });

    return NextResponse.json({ bilder });

  } catch (error) {
    console.error('Fel vid hämtning av bilder:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av bilder' },
      { status: 500 }
    );
  }
}