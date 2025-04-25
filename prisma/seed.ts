import { PrismaClient, AnvandareRoll } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Skapa testanvändare om de inte redan finns
  const adminExist = await prisma.anvandare.findUnique({
    where: { anvandarnamn: 'admin' },
  });

  if (!adminExist) {
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Skapa admin
    await prisma.anvandare.create({
      data: {
        fornamn: 'Admin',
        efternamn: 'Användare',
        telefonnummer: '070-123 45 67',
        epost: 'admin@glasmaster.se',
        roll: AnvandareRoll.ADMIN,
        anvandarnamn: 'admin',
        losenord: hashedPassword,
        aktiv: true,
      },
    });
    
    // Skapa arbetsledare
    await prisma.anvandare.create({
      data: {
        fornamn: 'Arbets',
        efternamn: 'Ledare',
        telefonnummer: '070-234 56 78',
        epost: 'arbetsledare@glasmaster.se',
        roll: AnvandareRoll.ARBETSLEDARE,
        anvandarnamn: 'arbetsledare',
        losenord: hashedPassword,
        aktiv: true,
      },
    });
    
    // Skapa tekniker
    await prisma.anvandare.create({
      data: {
        fornamn: 'Test',
        efternamn: 'Tekniker',
        telefonnummer: '070-345 67 89',
        epost: 'tekniker@glasmaster.se',
        roll: AnvandareRoll.TEKNIKER,
        anvandarnamn: 'tekniker',
        losenord: hashedPassword,
        aktiv: true,
      },
    });
    
    console.log('Testanvändare har skapats med lösenord: password');
  } else {
    console.log('Testanvändare finns redan');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });