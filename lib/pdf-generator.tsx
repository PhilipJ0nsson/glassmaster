// File: lib/pdf-generator.tsx
// Mode: Modifying
// Change: Refactoring PDF generation to support multiple document types (Offert, Arbetsorder, Faktura).
// Reasoning: To meet the new requirements for distinct PDF outputs.
// --- start diff ---
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { KundTyp, Arbetsorder, Kund, Privatperson, Foretag, Orderrad, Prislista, PrissattningTyp, ArbetsorderStatus } from '@prisma/client';
import { format as formatDateFn, addDays } from 'date-fns'; // Byt namn för att undvika konflikt med vår formatDate
import { sv } from 'date-fns/locale';
import { calculateRotDetails, RotCalculationResult, MinimalOrderradForROT } from '@/lib/arbetsorder-utils';

// Typer för sammansatt data (behålls)
export type ArbetsorderMedRelationer = Arbetsorder & {
  kund: Kund & {
    privatperson?: Privatperson | null;
    foretag?: Foretag | null;
  };
  orderrader: (Orderrad & {
    prislista: Prislista;
  })[];
  bilder: Array<{ id: number; filnamn: string; filsokvag: string }>; // Lade till bilder här
};

export type DocumentType = 'OFFERT' | 'ARBETSORDER' | 'FAKTURA';

// Uppdaterade stilar för ett renare utseende
const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 65, // Mer utrymme för fotnot
    paddingHorizontal: 35,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4, // Ökad radavstånd för bättre läsbarhet
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Justera alignment
    marginBottom: 30, // Mer marginal
    paddingBottom: 15,
    borderBottomWidth: 1, // Enkel linje under header
    borderBottomColor: '#eaeaea',
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 14, // Något större
    marginBottom: 3,
  },
  contactInfo: {
    fontSize: 9,
    color: '#555', // Mörkare grå
    marginBottom: 1,
  },
  documentTitleSection: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24, // Större titel
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333', // Mörkare färg för titel
  },
  subtitle: { // Används för ordernummer etc.
    fontSize: 11,
    color: '#555',
    marginBottom: 5,
  },
  // status: { // Stil för status-taggen - TAS BORT FRÅN PDF-HUVUD
  //   paddingVertical: 3,
  //   paddingHorizontal: 8,
  //   borderRadius: 4,
  //   fontSize: 9,
  //   fontWeight: 'bold', 
  //   marginBottom: 8,
  // },
  // // Statusfärger (behålls, men kan justeras om man vill ha subtilare färger) - TAS BORT
  // offerStatus: { backgroundColor: '#FFF3CD', color: '#856404' },
  // confirmedStatus: { backgroundColor: '#D1E7FD', color: '#0C5460' },
  // inProgressStatus: { backgroundColor: '#E2D9F3', color: '#495057' },
  // completedStatus: { backgroundColor: '#D4EDDA', color: '#155724' },
  // invoicedStatus: { backgroundColor: '#E9ECEF', color: '#383D41' },
  // cancelledStatus: { backgroundColor: '#F8D7DA', color: '#721C24' },
  
  dateText: {
    fontSize: 10,
    color: '#555',
    marginBottom: 3,
  },
  additionalDateText: { // For due date on invoice
    fontSize: 10,
    color: '#555',
  },

  section: {
    marginBottom: 25, // Mer utrymme mellan sektioner
  },
  sectionTitle: {
    fontSize: 14, // Större sektionsrubriker
    fontWeight: 'bold',
    marginBottom: 10, // Mer marginal under rubrik
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Subtil linje under sektionsrubrik
    color: '#333',
  },
  kundInfoGrid: { // För kundinfo
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kundInfoColumn: {
    width: '48%', // Två kolumner
  },
  label: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#444', // Något mörkare label
    marginBottom: 2,
  },
  value: { // Stil för värden under labels
    fontSize: 10,
    marginBottom: 6,
    color: '#333',
  },

  // Tabellstilar - mer minimalistiska
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, // Endast horisontella linjer mellan rader
    borderBottomColor: '#eaeaea',
    paddingVertical: 6, // Mer padding i rader
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5, // Tjockare linje för header
    borderBottomColor: '#cccccc', // Mörkare linje för header
    paddingBottom: 8, // Mer padding för header
    marginBottom: 4, // Liten marginal efter header
  },
  tableHeaderText: { // Textstil för tabellrubriker
    fontSize: 9,
    fontWeight: 'bold',
    color: '#444',
  },
  tableCell: {
    paddingVertical: 4, // Justera padding för celler
    paddingHorizontal: 5, // Behåll horisontell padding
    fontSize: 9,
  },
  // Kolumnbredder (behålls, men kan behöva justeras per dokumenttyp)
  tableColDesc: { width: '38%' }, // Produkt/Tjänst
  tableColQty: { width: '8%', textAlign: 'center' },  // Antal
  tableColPrice: { width: '15%', textAlign: 'right' }, // À-pris
  tableColDiscount: { width: '10%', textAlign: 'center' }, // Rabatt
  tableColSum: { width: '15%', textAlign: 'right' },   // Summa (exkl.)
  tableColVat: { width: '14%', textAlign: 'right' },    // Moms (%)

  // Kolumnbredder för Arbetsorder (utan priser)
  tableColDescArbetsorder: { width: '70%' },
  tableColQtyArbetsorder: { width: '15%', textAlign: 'center' },
  tableColDetailsArbetsorder: { width: '15%', textAlign: 'left' }, // För mått/tid om det behövs en egen kolumn

  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },

  totalsSection: { // Egen sektion för totaler
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1.5, // Tydligare linje ovanför totaler
    borderTopColor: '#cccccc',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4, // Lite mer marginal mellan totalrader
    paddingHorizontal: 5, // Justera för att linjera med tabellceller
  },
  totalLabel: {
    width: 'auto', // Låt label ta den plats den behöver
    fontWeight: 'bold',
    textAlign: 'right',
    paddingRight: 15, // Mer utrymme mellan label och värde
    fontSize: 10,
  },
  totalValue: {
    width: '25%', // Ge värdet en fast bredd för alignment
    textAlign: 'right',
    fontSize: 10,
  },
  grandTotalLabel: { // För "Att betala"
    fontWeight: 'bold',
    fontSize: 11, // Något större
  },
  grandTotalValue: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  rotText: { // För extra ROT-information
    fontSize: 8, 
    color: '#666', 
    width: '100%', 
    textAlign: 'right', 
    paddingRight: 5,
    marginTop: 2,
  },

  notesSection: { // För anteckningar
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9f9f9', // Mycket ljus bakgrund
    borderRadius: 4,
    fontSize: 9,
    color: '#444',
  },
  imagesSection: { // För bilder på arbetsorder
    marginTop: 20,
  },
  imageListItem: {
    fontSize: 9,
    marginBottom: 3,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 25, // Något högre upp
    left: 35,
    right: 35,
    fontSize: 8,
    textAlign: 'center',
    color: '#777', // Ljusare grå
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingTop: 8,
  },
});

// Hjälpfunktioner (behålls)
const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatDateFn(date, 'PPP', { locale: sv }); // Använd alias för date-fns format
};

const getKundNamn = (kund: Kund & { privatperson?: Privatperson | null; foretag?: Foretag | null }) => {
  if (kund.privatperson) {
    return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  } else if (kund.foretag) {
    return kund.foretag.foretagsnamn;
  }
  return `Kund #${kund.id}`;
};

// getStatusText och getStatusStyle tas bort då status inte längre visas i PDF-huvudet
// const getStatusText = (status: ArbetsorderStatus) => { ... };
// const getStatusStyle = (status: ArbetsorderStatus) => { ... };


const ArbetsorderDocumentPDF = ({ arbetsorder, documentType }: { arbetsorder: ArbetsorderMedRelationer, documentType: DocumentType }) => {
  const mappedOrderraderForRot: MinimalOrderradForROT[] = arbetsorder.orderrader.map(rad => ({
    radPrisInklMoms: rad.radPrisInklMoms,
    radPrisExklMoms: rad.radPrisExklMoms,
    enhetsPrissattningTyp: rad.enhetsPrissattningTyp,
    prislista: {
      prissattningTyp: rad.prislista.prissattningTyp,
    },
  }));

  const rotDetails = calculateRotDetails({
    orderrader: mappedOrderraderForRot,
    totalPrisInklMoms: arbetsorder.totalPrisInklMoms,
    ROT: arbetsorder.ROT,
    ROTprocentsats: arbetsorder.ROTprocentsats,
  });

  const pdfTitle = documentType; // Enkelt, blir 'OFFERT', 'ARBETSORDER', 'FAKTURA'
  const orderNumberLabel = documentType === 'FAKTURA' ? 'Fakturanummer' : 
                           documentType === 'OFFERT' ? 'Offertnummer' : 'Arbetsordernummer';
  const invoiceDate = documentType === 'FAKTURA' ? new Date() : null;
  const dueDate = documentType === 'FAKTURA' && invoiceDate ? addDays(invoiceDate, 30) : null;


  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>GlasMästro AB</Text>
          <Text style={styles.contactInfo}>Glasvägen 1, 123 45 Glasstad</Text>
          <Text style={styles.contactInfo}>Tel: 08-123 45 67 | E-post: info@glasmastro.se</Text>
          <Text style={styles.contactInfo}>Org.nr: 556123-4567</Text>
        </View>
        <View style={styles.documentTitleSection}>
          <Text style={styles.title}>{pdfTitle}</Text>
          <Text style={styles.subtitle}>{orderNumberLabel}: {arbetsorder.id}</Text>
          {/* Status-tagg borttagen */}
          <Text style={styles.dateText}>
            {documentType === 'FAKTURA' && invoiceDate ? `Fakturadatum: ${formatDate(invoiceDate)}` : `Datum: ${formatDate(arbetsorder.skapadDatum)}`}
          </Text>
          {documentType === 'FAKTURA' && dueDate && (
            <Text style={styles.additionalDateText}>Förfallodatum: {formatDate(dueDate)}</Text>
          )}
        </View>
      </View>

      {/* Kunduppgifter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kundinformation</Text>
        <View style={styles.kundInfoGrid}>
          <View style={styles.kundInfoColumn}>
            <Text style={styles.label}>Kund:</Text>
            <Text style={styles.value}>{getKundNamn(arbetsorder.kund)}</Text>
            
            {arbetsorder.kund.kundTyp === KundTyp.PRIVAT && arbetsorder.kund.privatperson?.personnummer && (
              <>
                <Text style={styles.label}>Personnummer:</Text>
                <Text style={styles.value}>{arbetsorder.kund.privatperson.personnummer}</Text>
              </>
            )}
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && arbetsorder.kund.foretag?.organisationsnummer && (
              <>
                <Text style={styles.label}>Organisationsnummer:</Text>
                <Text style={styles.value}>{arbetsorder.kund.foretag.organisationsnummer}</Text>
              </>
            )}
             {arbetsorder.referensMärkning && (
               <>
                <Text style={styles.label}>Er referens:</Text>
                <Text style={styles.value}>{arbetsorder.referensMärkning}</Text>
               </>
            )}
          </View>
          
          <View style={styles.kundInfoColumn}>
            <Text style={styles.label}>Adress:</Text>
            <Text style={styles.value}>{arbetsorder.kund.adress}</Text>
            <Text style={styles.label}>Telefon:</Text>
            <Text style={styles.value}>{arbetsorder.kund.telefonnummer}</Text>
            {arbetsorder.kund.epost && (
              <>
                <Text style={styles.label}>E-post:</Text>
                <Text style={styles.value}>{arbetsorder.kund.epost}</Text>
              </>
            )}
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && arbetsorder.kund.foretag?.kontaktpersonFornamn && (
                 <>
                    <Text style={styles.label}>Kontaktperson:</Text>
                    <Text style={styles.value}>
                        {arbetsorder.kund.foretag.kontaktpersonFornamn} {arbetsorder.kund.foretag.kontaktpersonEfternamn}
                    </Text>
                 </>
            )}
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && 
             arbetsorder.kund.foretag?.fakturaadress && 
             arbetsorder.kund.foretag.fakturaadress !== arbetsorder.kund.adress && (
              <>
                <Text style={styles.label}>Fakturaadress:</Text>
                <Text style={styles.value}>{arbetsorder.kund.foretag.fakturaadress}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Produkter och tjänster */}
      {(documentType === 'OFFERT' || documentType === 'FAKTURA') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifikation</Text>
          <View style={styles.table}>
            {/* Tabellrubrik */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableColDesc]}>Produkt/Tjänst</Text>
              <Text style={[styles.tableHeaderText, styles.tableColQty]}>Antal</Text>
              <Text style={[styles.tableHeaderText, styles.tableColPrice]}>À-pris</Text>
              <Text style={[styles.tableHeaderText, styles.tableColDiscount]}>Rabatt</Text>
              <Text style={[styles.tableHeaderText, styles.tableColSum]}>Summa</Text>
              <Text style={[styles.tableHeaderText, styles.tableColVat]}>Moms</Text>
            </View>
            
            {/* Tabellrader */}
            {arbetsorder.orderrader.map((rad) => {
              const enhetsPrisExklMoms = rad.enhetsPrisExklMoms ?? rad.prislista.prisExklMoms;
              const momssats = rad.enhetsMomssats ?? rad.prislista.momssats;
              const prissattningTyp = rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp;

              return (
              <View key={rad.id} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.tableColDesc]}>
                  <Text>{rad.prislista.namn}</Text>
                  <Text style={{ fontSize: 8, color: '#666', marginTop: 1 }}>
                      {prissattningTyp === PrissattningTyp.M2 && rad.bredd && rad.hojd && `${Math.round(rad.bredd)}mm × ${Math.round(rad.hojd)}mm`}
                      {prissattningTyp === PrissattningTyp.M && rad.langd && `${Math.round(rad.langd)}mm`}
                      {prissattningTyp === PrissattningTyp.TIM && rad.tid && `${rad.tid.toFixed(2)} tim`}
                      {rad.kommentar && (rad.bredd || rad.hojd || rad.langd || rad.tid ? ` | ${rad.kommentar}` : rad.kommentar)}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.tableColQty]}>{rad.antal}</Text>
                <View style={[styles.tableCell, styles.tableColPrice]}>
                  <Text>{formatCurrency(enhetsPrisExklMoms)}</Text>
                  {prissattningTyp === PrissattningTyp.M2 && <Text style={{ fontSize: 7, color: '#666' }}>/m²</Text>}
                  {prissattningTyp === PrissattningTyp.M && <Text style={{ fontSize: 7, color: '#666' }}>/m</Text>}
                  {prissattningTyp === PrissattningTyp.TIM && <Text style={{ fontSize: 7, color: '#666' }}>/tim</Text>}
                </View>
                <Text style={[styles.tableCell, styles.tableColDiscount]}>
                  {rad.rabattProcent > 0 ? `${rad.rabattProcent}%` : '-'}
                </Text>
                <Text style={[styles.tableCell, styles.tableColSum]}>
                  {formatCurrency(rad.radPrisExklMoms)}
                </Text>
                <Text style={[styles.tableCell, styles.tableColVat]}>
                  {momssats > 1 ? Math.round(momssats) : Math.round(momssats * 100)}%
                </Text>
              </View>
            )})}
          </View>
          
          {/* Totalsummor */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Summa exkl. moms:</Text>
              <Text style={styles.totalValue}>{formatCurrency(arbetsorder.totalPrisExklMoms)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Moms:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency((arbetsorder.totalPrisInklMoms || 0) - (arbetsorder.totalPrisExklMoms || 0))}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, {fontWeight: "bold" /* Inom style-objektet för PDF */}]}>Totalt inkl. moms:</Text>
              <Text style={[styles.totalValue, {fontWeight: "bold"}]}>
                {formatCurrency(arbetsorder.totalPrisInklMoms)}
              </Text>
            </View>
            
            {arbetsorder.ROT && arbetsorder.ROTprocentsats && rotDetails.rotAvdragBelopp > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ROT-avdrag ({arbetsorder.ROTprocentsats}%):</Text>
                <Text style={styles.totalValue}>{formatCurrency(-rotDetails.rotAvdragBelopp)}</Text>
              </View>
            )}
             {arbetsorder.ROT && arbetsorder.ROTprocentsats && rotDetails.rotAvdragBelopp > 0 && (
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text style={[styles.totalLabel, styles.grandTotalLabel]}>Att betala:</Text>
                <Text style={[styles.totalValue, styles.grandTotalValue]}>
                  {formatCurrency(rotDetails.summaAttBetala)}
                </Text>
              </View>
            )}
             {arbetsorder.ROT && !rotDetails.arbetsraderFinns && (
              <View>
                  <Text style={styles.rotText}>
                      (ROT-avdrag ej tillämpat då ingen arbetskostnad (TIM) specificerats)
                  </Text>
              </View>
            )}
            {rotDetails.arbetsraderFinns && arbetsorder.ROT && rotDetails.rotAvdragBelopp > 0 && (
               <View>
                  <Text style={[styles.rotText, { marginTop: 0}]}>
                      ROT-avdraget baseras på arbetskostnad inkl. moms: {formatCurrency(rotDetails.totalArbetskostnadInklMoms)}.
                  </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Specifikation för Arbetsorder (utan priser) */}
      {documentType === 'ARBETSORDER' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifikation</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableColDescArbetsorder]}>Produkt/Tjänst</Text>
              <Text style={[styles.tableHeaderText, styles.tableColQtyArbetsorder]}>Antal</Text>
              <Text style={[styles.tableHeaderText, styles.tableColDetailsArbetsorder]}>Detaljer</Text>
            </View>
            {arbetsorder.orderrader.map((rad) => {
              const prissattningTyp = rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp;
              let details = "";
              if (prissattningTyp === PrissattningTyp.M2 && rad.bredd && rad.hojd) details = `${Math.round(rad.bredd)}mm × ${Math.round(rad.hojd)}mm`;
              else if (prissattningTyp === PrissattningTyp.M && rad.langd) details = `${Math.round(rad.langd)}mm`;
              else if (prissattningTyp === PrissattningTyp.TIM && rad.tid) details = `${rad.tid.toFixed(2)} tim`;
              
              return (
                <View key={rad.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableColDescArbetsorder]}>
                    <Text>{rad.prislista.namn}</Text>
                    {rad.kommentar && <Text style={{ fontSize: 8, color: '#666', marginTop: 1 }}>{rad.kommentar}</Text>}
                  </View>
                  <Text style={[styles.tableCell, styles.tableColQtyArbetsorder]}>{rad.antal}</Text>
                  <Text style={[styles.tableCell, styles.tableColDetailsArbetsorder]}>{details || '-'}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
      
      {/* Anteckningar/Beskrivning */}
      {arbetsorder.material && (documentType === 'OFFERT' || documentType === 'ARBETSORDER' || documentType === 'FAKTURA') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{documentType === 'FAKTURA' ? 'Meddelande' : 'Anteckningar & Villkor'}</Text>
          <Text style={styles.notesSection}>{arbetsorder.material}</Text>
        </View>
      )}

      {/* Bilder (endast för ARBETSORDER) */}
      {documentType === 'ARBETSORDER' && arbetsorder.bilder && arbetsorder.bilder.length > 0 && (
        <View style={styles.imagesSection}>
            <Text style={styles.sectionTitle}>Bifogade Bilder</Text>
            {arbetsorder.bilder.map(bild => (
                <Text key={bild.id} style={styles.imageListItem}>- {bild.filnamn}</Text>
            ))}
        </View>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text>GlasMästro AB | Glasvägen 1, 123 45 Glasstad | Tel: 08-123 45 67 | info@glasmastro.se</Text>
        <Text>Org.nr: 556123-4567 | Godkänd för F-skatt</Text>
        {documentType === 'OFFERT' && (
           <Text style={{ marginTop: 5 }}>Offert giltig i 30 dagar från utskriftsdatum. Betalningsvillkor: 15 dagar netto.</Text>
        )}
        {documentType === 'FAKTURA' && (
           <Text style={{ marginTop: 5 }}>Betalningsvillkor: 30 dagar netto. Bankgiro: 123-4567.</Text>
        )}
         <Text>Vid betalning, vänligen ange {orderNumberLabel.toLowerCase()}: {arbetsorder.id}</Text>
      </View>
    </Page>
  </Document>
)};

// prepareArbetsorderForPDF (behålls som den är, eller förenkla om totalsummor alltid är från databasen)
const prepareArbetsorderForPDF = (arbetsorder: ArbetsorderMedRelationer): ArbetsorderMedRelationer => {
  const preparedOrder = {
    ...arbetsorder,
    orderrader: arbetsorder.orderrader.map(rad => {
      const isolatedPrislista = {
        ...rad.prislista,
        prisExklMoms: rad.enhetsPrisExklMoms ?? rad.prislista.prisExklMoms,
        momssats: rad.enhetsMomssats ?? rad.prislista.momssats,
        prissattningTyp: rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp,
      };
      
      return {
        ...rad,
        bredd: rad.bredd, 
        hojd: rad.hojd,
        langd: rad.langd,
        prislista: isolatedPrislista,
      };
    })
  };
  
  // Säkerställ att totalsummor är baserade på radpriserna som faktiskt används i PDF:en
  let newTotalExkl = 0;
  let newTotalInkl = 0;
  
  preparedOrder.orderrader.forEach(rad => {
    newTotalExkl += rad.radPrisExklMoms;
    newTotalInkl += rad.radPrisInklMoms;
  });
  
  preparedOrder.totalPrisExklMoms = newTotalExkl;
  preparedOrder.totalPrisInklMoms = newTotalInkl;
  
  return preparedOrder;
};

// generatePDF (uppdaterad för att ta emot documentType)
export const generatePDF = async (arbetsorder: ArbetsorderMedRelationer, documentType: DocumentType): Promise<Blob> => {
  const preparedData = prepareArbetsorderForPDF(arbetsorder);
  return await pdf(<ArbetsorderDocumentPDF arbetsorder={preparedData} documentType={documentType} />).toBlob();
};
// --- end diff ---