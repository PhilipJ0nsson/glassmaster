# Specifikation för Glasmästarapp

## Datamodeller

### Kunder
#### Gemensamma fält för alla kunder
- Kundtyp (Privat/Företag)
- Telefonnummer
- E-post
- Adress
- Kommentarer/Anteckningar

#### Privatperson
- Förnamn
- Efternamn
- Personnummer

#### Företag
- Företagsnamn
- Organisationsnummer
- Kontaktperson (Förnamn, Efternamn)
- Fakturaadress (om annan än besöksadress)
- Referens/Märkning

### Anställda/Användare
- Förnamn
- Efternamn
- Telefonnummer
- E-post
- Roll/Behörighetsnivå (Admin, Arbetsledare, Tekniker)
- Användarnamn
- Lösenord (krypterat)
- Aktiv/Inaktiv status

### Prislista
- Namn
- Pris (exkl. moms)
- Momssats
- Pris (inkl. moms)
- Kategori/Typ
- Artikelnummer

### Arbetsorder
- Kund Id (kopplad till kundmodell)
- ROT (ja/nej, procentsats)
- Arbetstid
- Material
- Anställd Id (kopplad till anställdmodell)
- Bifogade Bilder
- Status (Offert, Bekräftad, Pågående, Slutförd, Fakturerad, Avbruten)
- Skapad av (användare)
- Skapad datum
- Senast uppdaterad av (användare)
- Senast uppdaterad datum
- Momsberäkning (totalt belopp med och utan moms)

### Kalender
- Arbetsorder Id
- Kund Id
- Anställd Id
- Datum/tid
- Mötestyp

## Funktionalitet

### Användarhantering och Behörigheter
- Administratörer: Full åtkomst till alla funktioner
- Arbetsledare: Hantera arbetsordrar, kunder, kalender och rapporter
- Tekniker: Se och uppdatera egna arbetsordrar, se sitt schema

### Kalenderfunktioner
- Lägga till arbetsordrar i kalendern
- Tilldela anställda till arbetsordrar
- Lägga till andra händelser (möten, semester, etc.)
- Filtrera visning efter anställd

### Arbetsorderfunktioner
- Skapa nya arbetsordrar
- Fylla i alla fält
- Lägga till bilder
- Visa information om vem som skapade ordern och när
- Redigera befintliga arbetsordrar
- Ta bort arbetsordrar

### Prislistefunktioner
- Lägga till nya varor/tjänster med pris
- Redigera befintliga priser
- Ta bort varor/tjänster

### Kundfunktioner
- Lägga till nya kunder
- Redigera kunduppgifter
- Ta bort kunder

### Priskalkylator
- Automatisk prisberäkning baserat på material och arbetstid
- Möjlighet att skapa prisberäkning direkt från arbetsorder
- Generera PDF-offert för att skicka till kund via e-post

### Rapporter och Statistik
- Intäktsrapporter (per dag, vecka, månad, år)
- Arbetsordrars statusfördelning
- Arbetsbelastning per tekniker
- Populära produkter/tjänster
- ROT-avdragsrapporter
- Kundstatistik (återkommande kunder, nya kunder)
- Ekonomiska rapporter (moms, omsättning)
- Exportmöjligheter (Excel, PDF)

## Användargränssnitt

Appen ska ha ett intuitivt gränssnitt med följande huvudsektioner:
1. Kalendervy (huvudvy)
2. Arbetsorderhantering
   - Statusbaserad vy (färgkodning)
   - Sökfunktion
   - Filtreringsfunktioner
3. Kundregister
4. Prislisthantering
5. Offertgenerator
6. Rapporter och Statistik
7. Användarhantering (Admin)

## Teknisk Stack

### Backend
- **PostgreSQL** - Relationsdatabas för att lagra alla data
  - Robust och pålitlig för komplexa datamodeller
  - Stöd för avancerade queries och relationer
  - Bra prestanda även med växande datamängder

- **Prisma ORM** - För databashantering
  - Typade datamodeller som matchar appens specifikationer
  - Förenklar relationshantering mellan entiteter
  - Automatisk migrationshantering
  - Effektiva och typade database queries

### Frontend
- **Next.js** - React-ramverk
  - Serverside rendering för bättre prestanda
  - API-routes för backend-endpoints
  - Filbaserad routing för enkel navigering
  - Inbyggt stöd för optimering

- **React** - UI-bibliotek
  - Komponentbaserad arkitektur
  - Effektiv renderingshantering
  - Stort ekosystem av användbara paket

- **shadcn/ui** - Komponentbibliotek
  - Färdiga, anpassningsbara UI-komponenter
  - Tillgänglighet inbyggt
  - Komponenter för tabeller, formulär, kalendrar, etc.
  - Behåller flexibilitet med styling

### Ytterligare paket
- **react-hook-form** - För formulärhantering
- **react-calendar** eller **@fullcalendar/react** - För kalenderfunktionalitet
- **react-pdf** - För PDF-generering av offerter
- **NextAuth.js** - För autentisering och behörighetshantering






erDiagram
    KUND {
        int id PK
        string kundtyp "Privat/Företag"
        string telefonnummer
        string epost
        string adress
        string kommentarer
    }
    
    PRIVATPERSON {
        int id PK
        int kundId FK
        string förnamn
        string efternamn
        string personnummer
    }
    
    FÖRETAG {
        int id PK
        int kundId FK
        string företagsnamn
        string organisationsnummer
        string kontaktpersonFörnamn
        string kontaktpersonEfternamn
        string fakturaadress
        string referensMärkning
    }
    
    ANSTÄLLD {
        int id PK
        string förnamn
        string efternamn
        string telefonnummer
        string epost
        string roll "Admin/Arbetsledare/Tekniker"
        string användarnamn
        string lösenord
        boolean aktiv
    }
    
    PRISLISTA {
        int id PK
        string namn
        float prisExklMoms
        float momssats
        float prisInklMoms
        string kategori
        string artikelnummer
    }
    
    ARBETSORDER {
        int id PK
        int kundId FK
        boolean ROT
        float ROTprocentsats
        float arbetstid
        string material
        int anställdId FK
        string status
        int skapadAvId FK
        date skapadDatum
        int uppdateradAvId FK
        date uppdateradDatum
        float totalPrisExklMoms
        float totalPrisInklMoms
    }
    
    ORDERRAD {
        int id PK
        int arbetsorderId FK
        int prislistaId FK
        int antal
        float rabattProcent
        float radPrisExklMoms
        float radPrisInklMoms
        string kommentar
    }
    
    KALENDER {
        int id PK
        int arbetsorderId FK
        int kundId FK
        int anställdId FK
        datetime datumTid
        string mötestyp
    }
    
    BILD {
        int id PK
        int arbetsorderId FK
        string filnamn
        string filsökväg
    }
    
    KUND ||--o{ PRIVATPERSON : är
    KUND ||--o{ FÖRETAG : är
    KUND ||--o{ ARBETSORDER : har
    ARBETSORDER ||--o{ BILD : innehåller
    ARBETSORDER }o--|| ANSTÄLLD : tilldelas
    ARBETSORDER ||--o{ KALENDER : schemaläggs
    ARBETSORDER }o--|| ANSTÄLLD : skapasAv
    ARBETSORDER }o--|| ANSTÄLLD : uppdaterasAv
    KALENDER }o--|| ANSTÄLLD : involverar
    KALENDER }o--|| KUND : gäller
    ARBETSORDER ||--o{ ORDERRAD : innehåller
    ORDERRAD }o--|| PRISLISTA : använder


    # Claude Code Implementeringsplan för Glasmästarapp

Detta dokument innehåller steg-för-steg instruktioner för att implementera glasmästarappen med hjälp av Claude Code. Varje steg är utformat för att vara tydligt och genomförbart för Claude Code.

## Steg 1: Projektinitiering

```
Skapa ett nytt Next.js-projekt med TypeScript, installera de grundläggande paketen och konfigurera basmiljön.
```

Detaljer för Claude Code:
- Skapa ett nytt Next.js-projekt med TypeScript-stöd
- Använd app-routern istället för pages
- Installera nödvändiga beroenden:
  - Prisma
  - react-hook-form
  - NextAuth.js
  - @fullcalendar/react
  - react-pdf
  - tailwindcss (för shadcn/ui)
  - zod (för validering)
- Konfigurera TailwindCSS
- Skapa grundläggande mappstruktur för projektet

## Steg 2: Databasmodellering

```
Skapa Prisma-schemat för databasen baserat på ER-diagrammet och specificerade datamodeller.
```

Detaljer för Claude Code:
- Konfigurera Prisma med PostgreSQL som databas
- Definiera alla modeller enligt ER-diagrammet:
  - Kund (bas)
  - Privatperson (utökning av Kund)
  - Företag (utökning av Kund)
  - Anställd
  - Prislista
  - Arbetsorder
  - Orderrad
  - Kalender
  - Bild
- Skapa relationer mellan modellerna
- Implementera enums för status och roller
- Generera initial migration

## Steg 3: Autentisering och behörigheter

```
Implementera autentiserings- och behörighetssystem med NextAuth.js för att hantera inloggning och åtkomstkontroll.
```

Detaljer för Claude Code:
- Konfigurera NextAuth.js med credentials provider
- Skapa inloggningssidan
- Implementera behörighetssystem baserat på användarroller:
  - Admin
  - Arbetsledare
  - Tekniker
- Skapa middleware för att skydda routes baserat på behörigheter
- Implementera sessionshantering

## Steg 4: Grundläggande UI-komponenter

```
Implementera shadcn/ui komponenterna och skapa layouten för applikationen.
```

Detaljer för Claude Code:
- Installera och konfigurera shadcn/ui
- Skapa grundläggande layoutkomponenter:
  - Header
  - Sidebar/Navigation
  - Footer
- Implementera huvudlayout med responsiv design
- Skapa UI-komponenter för återanvändning:
  - Tabeller
  - Formulär
  - Dialoger
  - Kort
  - Knappar
  - Flikar
- Implementera theme och styling

exampel: pnpm dlx shadcn@latest add button


## Steg 5: API-routes för grundläggande entiteter

```
Skapa backend API-endpoints för att hantera CRUD-operationer för alla grundläggande entiteter.
```

Detaljer för Claude Code:
- Implementera API-routes för:
  - Kunder (inkludera hantering av både privatpersoner och företag)
  - Anställda
  - Prislista
- Se till att varje entitet har fullständiga CRUD-operationer:
  - Create
  - Read (enskild och lista/filtrering)
  - Update
  - Delete
- Implementera felhantering och validering med Zod
- Lägg till behörighetskontroller för API-endpoints

## Steg 6: Kundhantering

```
Implementera frontend för kundhantering med formulär och listor.
```

Detaljer för Claude Code:
- Skapa kundlistvyn med filtrering och sökning
- Implementera detaljvy för kund
- Skapa formulär för att lägga till ny kund:
  - Välj kundtyp (privat/företag)
  - Dynamiska fält baserat på kundtyp
  - Validering
- Implementera redigering och borttagning av kunder
- Lägg till tabellvy med sortering

## Steg 7: Prislistehantering

```
Implementera frontend för att hantera prislistor och artiklar.
```

Detaljer för Claude Code:
- Skapa vy för att lista alla priser/artiklar
- Implementera filtrering efter kategori
- Skapa formulär för att lägga till nya prislisteposter:
  - Automatisk beräkning av pris inkl. moms baserat på exkl. pris och momssats
- Implementera redigerings- och borttagningsfunktionalitet
- Lägg till import/export-funktionalitet för prislistor

## Steg 8: Arbetsordersystemet

```
Implementera både backend och frontend för arbetsordersystemet.
```

Detaljer för Claude Code:
- Skapa API-routes för arbetsordrar:
  - CRUD-operationer för arbetsordrar
  - Hantera orderrader kopplat till prislista
  - Bilduppladdning och lagring
- Implementera status-flöde för arbetsordrar
- Skapa frontend-vyer:
  - Lista över arbetsordrar med statusfiltrering
  - Detaljvy för arbetsorder
  - Formulär för att skapa/redigera arbetsorder
  - Vy för att lägga till orderrader från prislistan
  - Beräkning av totalsummor
  - ROT-avdragshantering

## Steg 9: Kalenderfunktionalitet

```
Implementera kalendervy och schemaläggning av arbetsordrar.
```

Detaljer för Claude Code:
- Konfigurera FullCalendar-komponenten
- Skapa API-routes för kalenderhantering
- Implementera vyer för olika tidsperspektiv (dag, vecka, månad)
- Skapa funktionalitet för att:
  - Skapa kalenderhändelser
  - Koppla arbetsordrar till kalendern
  - Tilldela arbetsordrar till anställda
  - Visa och filtrera kalenderhändelser per anställd
  - Drag-and-drop funktionalitet för att ändra schemaläggning

## Steg 10: Offertgenerator och PDF-export

```
Implementera funktionalitet för att generera offerter och exportera dem som PDF.
```

Detaljer för Claude Code:
- Skapa mall för offerter
- Implementera logik för att generera offerter baserat på arbetsorderdata
- Använda react-pdf för att skapa PDF-filer
- Implementera knapp för att skicka offerter via e-post
- Skapa funktionalitet för att konvertera status från "Offert" till "Bekräftad"

## Steg 11: Rapporter och statistik

```
Implementera rapportgenerering och statistikvyer.
```

Detaljer för Claude Code:
- Skapa API-routes för att hämta aggregerad data för rapporter
- Implementera följande rapporter:
  - Intäktsrapporter (per tidsenhet)
  - Statusfördelning för arbetsordrar
  - Arbetsbelastning per tekniker
  - Populära produkter/tjänster
  - ROT-avdragsrapporter
  - Kundstatistik
- Skapa grafiska representationer med diagram
- Implementera exportfunktionalitet till Excel och PDF

## Steg 12: Användarhantering (admin)

```
Implementera admin-panelen för att hantera användare.
```

Detaljer för Claude Code:
- Skapa admin-gränssnitt för användarhantering:
  - Lista över användare
  - Skapa nya användare
  - Redigera användare
  - Aktivera/inaktivera användare
  - Ändra roller och behörigheter
- Implementera lösenordshantering med säker kryptering
- Lägg till loggning av användaraktiviteter

## Steg 13: Filhantering och bilduppladdning

```
Implementera funktionalitet för att hantera bilder kopplade till arbetsordrar.
```

Detaljer för Claude Code:
- Skapa API-routes för filuppladdning och -hantering
- Implementera bilduppladdningskomponent med förhandsgranskning
- Lagra bilder med referens till arbetsordrar
- Skapa bildgallerikomponent för att visa bilder kopplat till en arbetsorder
- Implementera borttagning och ersättning av bilder

## Steg 14: Testning och felhantering

```
Implementera testning och robust felhantering genom applikationen.
```

Detaljer för Claude Code:
- Lägg till felhanteringskomponenter
- Implementera try/catch-block där det behövs
- Skapa konsekvent felrapporteringsmekanism
- Lägg till grundläggande enhetstester för kritiska funktioner
- Implementera laddningsindikatorer för asynkrona operationer

## Steg 15: Optimering och finslipning

```
Optimera applikationen för prestanda och användarupplevelse.
```

Detaljer för Claude Code:
- Implementera optimeringar för laddningstider
- Lägg till caching där det är lämpligt
- Optimera databas-queries
- Förbättra responsiviteten för mobilanvändning
- Lägg till notifikationer och feedback-meddelanden
- Implementera dark mode/light mode
- Säkerställ att tillgänglighet (a11y) är implementerad korrekt

## Tips för ANVÄNDARE att arbeta med Claude Code

1. Presentera ett steg i taget för Claude Code
2. Var specifik med exakt vad du vill att Claude Code ska implementera
3. Ge feedback på det genererade koden och be om förbättringar vid behov
4. När du ber Claude Code implementera API-rutter, specificera exakt vilken funktionalitet de ska ha
5. Bryt ner komplexa komponenter i mindre delar
6. Använd specifika exempel för att förtydliga dina instruktioner

## Exempel på en bra instruktion till Claude Code

```
Implementera API-rutter för kundhantering med följande funktionalitet:
1. GET /api/customers - Hämta alla kunder med paginering och filtrering
2. GET /api/customers/:id - Hämta en enskild kund med all relaterad information
3. POST /api/customers - Skapa en ny kund (hantera både privatperson och företag)
4. PUT /api/customers/:id - Uppdatera en befintlig kund
5. DELETE /api/customers/:id - Ta bort en kund

Använd Prisma för databasoperationer och implementera Zod för validering.
```