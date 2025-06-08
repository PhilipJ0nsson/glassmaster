// File: lib/pdf-generator.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  pdf as reactPdf
} from '@react-pdf/renderer';
import { KundTyp, Arbetsorder, Kund, Privatperson, Foretag, Orderrad, Prislista, PrissattningTyp, ArbetsorderStatus } from '@prisma/client';
import { format as formatDateFn, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { calculateRotDetails, RotCalculationResult, MinimalOrderradForROT } from '@/lib/arbetsorder-utils';

// TYPER
export type ArbetsorderMedRelationer = Arbetsorder & {
  kund: Kund & {
    privatperson?: Privatperson | null;
    foretag?: Foretag | null;
  };
  orderrader: (Orderrad & {
    prislista: Prislista;
  })[];
  bilder: Array<{ id: number; filnamn: string; filsokvag: string }>;
  ansvarigTekniker?: {
    id: number;
    fornamn: string;
    efternamn: string;
  } | null;
};

export type DocumentType = 'OFFERT' | 'ARBETSORDER' | 'FAKTURA';

// --- STILAR ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  arbetsorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  arbetsorderCompanyName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  arbetsorderTitleSection: {
     alignItems: 'flex-end',
  },
  arbetsorderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  arbetsorderSubtitle: {
    fontSize: 11,
    color: '#555',
  },
  defaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 10,
  },
  defaultCompanyName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  contactInfo: {
    fontSize: 9,
    color: '#555',
    marginBottom: 1,
  },
  defaultDocumentTitleSection: {
    alignItems: 'flex-end',
  },
  defaultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  defaultSubtitle: {
    fontSize: 11,
    color: '#555',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 10,
    color: '#555',
    marginBottom: 3,
  },
  additionalDateText: {
    fontSize: 10,
    color: '#555',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleBase: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingBottom: 3,
    color: '#333',
  },
  sectionTitleWithBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  kundInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  kundInfoColumn: {
    width: '48%',
  },
  infoBlock: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoBlockLabel: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#495057',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoBlockValue: {
    fontSize: 10,
    color: '#212529',
    whiteSpace: 'pre-wrap',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#444',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    marginBottom: 6,
    color: '#333',
  },
  table: { width: '100%', marginBottom: 20 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  tableHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#495057' },
  tableCell: { paddingVertical: 3, paddingHorizontal: 5, fontSize: 9 },
  tableColDesc: { width: '48%' }, // Justerad bredd
  tableColQty: { width: '10%', textAlign: 'center' },
  tableColPrice: { width: '20%', textAlign: 'right' }, // Justerad bredd
  tableColDiscount: { width: '12%', textAlign: 'center' },
  tableColSum: { width: '20%', textAlign: 'right' }, // Justerad bredd
  // tableColVat tas bort

  arbetsorderTable: { width: '100%', marginBottom: 15 },
  arbetsorderTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 5 },
  arbetsorderTableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d0d0d0', paddingBottom: 6, marginBottom: 3, backgroundColor: '#f7f7f7' },
  arbetsorderTableHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#333' },
  arbetsorderTableCell: { paddingVertical: 3, paddingHorizontal: 5, fontSize: 9 },
  arbetsorderColDesc: { width: '50%' },
  arbetsorderColQty: { width: '15%', textAlign: 'center' },
  arbetsorderColDetails: { width: '35%' },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  totalsSection: { marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#dee2e6' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5, paddingHorizontal: 5 },
  totalLabel: { width: 'auto', fontWeight: 'bold', textAlign: 'right', paddingRight: 15, fontSize: 10 },
  totalValue: { width: '25%', textAlign: 'right', fontSize: 10 },
  grandTotalLabel: { fontWeight: 'bold', fontSize: 11 },
  grandTotalValue: { fontWeight: 'bold', fontSize: 11 },
  rotText: { fontSize: 8, color: '#6c757d', width: '100%', textAlign: 'right', paddingRight: 5, marginTop: 3 },
  imagesSection: { marginTop: 15 },
  imageListItem: { fontSize: 9, marginBottom: 3, color: '#333' },
  defaultFooterBase: {
    position: 'absolute', 
    bottom: 30, 
    left: 35, 
    right: 35, 
    fontSize: 8, 
    textAlign: 'center', 
    color: '#6c757d', 
    paddingTop: 10 
  },
  defaultFooterWithBorder: {
    borderTopWidth: 0.5, 
    borderTopColor: '#e0e0e0',
  },
  arbetsorderFooter: { position: 'absolute', bottom: 30, left: 35, right: 35, fontSize: 8, textAlign: 'center', color: '#adb5bd' },
});

// --- HJÄLPFUNKTIONER ---
const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatDateFn(date, 'PPP', { locale: sv });
};

const getKundNamn = (kund: ArbetsorderMedRelationer['kund']) => {
  if (kund.privatperson) {
    return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  } else if (kund.foretag && kund.foretag.foretagsnamn) {
    return kund.foretag.foretagsnamn;
  } else if (kund.foretag) {
    return `Företagskund #${kund.id}`;
  }
  return `Kund #${kund.id}`;
};

// --- DOKUMENTKOMPONENT ---
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

  const isWorkOrder = documentType === 'ARBETSORDER';

  let pdfTitleText = '';
  let orderNumberLabel = '';
  switch(documentType) {
    case 'OFFERT':
      pdfTitleText = 'Offert';
      orderNumberLabel = 'Offertnummer';
      break;
    case 'ARBETSORDER':
      pdfTitleText = 'Arbetsorder';
      orderNumberLabel = 'Arbetsordernr';
      break;
    case 'FAKTURA':
      pdfTitleText = 'Faktura';
      orderNumberLabel = 'Fakturanummer';
      break;
  }
  const invoiceDate = documentType === 'FAKTURA' ? new Date() : null;
  const dueDate = documentType === 'FAKTURA' && invoiceDate ? addDays(invoiceDate, 30) : null;

  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {isWorkOrder ? (
        <View style={styles.arbetsorderHeader}>
          <Text style={styles.arbetsorderCompanyName}>GlasMästro AB</Text>
          <View style={styles.arbetsorderTitleSection}>
            <Text style={styles.arbetsorderTitle}>{pdfTitleText}</Text>
            <Text style={styles.arbetsorderSubtitle}>{orderNumberLabel}: {arbetsorder.id}</Text>
            <Text style={styles.dateText}>Datum: {formatDate(arbetsorder.skapadDatum)}</Text>
            {arbetsorder.ansvarigTekniker && (
              <Text style={[styles.dateText, {fontSize: 9, marginTop: 2}]}>Ansvarig: {arbetsorder.ansvarigTekniker.fornamn} {arbetsorder.ansvarigTekniker.efternamn}</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.defaultHeader}>
          <View>
            <Text style={styles.defaultCompanyName}>GlasMästro AB</Text>
            <Text style={styles.contactInfo}>Glasvägen 1, 123 45 Glasstad</Text>
            <Text style={styles.contactInfo}>Tel: 08-123 45 67 | E-post: info@glasmastro.se</Text>
            <Text style={styles.contactInfo}>Org.nr: 556123-4567</Text>
          </View>
          <View style={styles.defaultDocumentTitleSection}>
            <Text style={styles.defaultTitle}>{pdfTitleText}</Text>
            <Text style={styles.defaultSubtitle}>{orderNumberLabel}: {arbetsorder.id}</Text>
            <Text style={styles.dateText}>
              {documentType === 'FAKTURA' && invoiceDate ? `Fakturadatum: ${formatDate(invoiceDate)}` : `Datum: ${formatDate(arbetsorder.skapadDatum)}`}
            </Text>
            {documentType === 'FAKTURA' && dueDate && (
              <Text style={styles.additionalDateText}>Förfallodatum: {formatDate(dueDate)}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitleBase, !isWorkOrder ? styles.sectionTitleWithBorder : {}]}>Kundinformation</Text>
        <View style={styles.kundInfoGrid}>
          <View style={styles.kundInfoColumn}>
            <Text style={styles.label}>Kund:</Text>
            <Text style={styles.value}>{getKundNamn(arbetsorder.kund)}</Text>
            
            {arbetsorder.kund.kundTyp === KundTyp.PRIVAT && arbetsorder.kund.privatperson?.personnummer && !isWorkOrder && (
              <><Text style={styles.label}>Personnummer:</Text><Text style={styles.value}>{arbetsorder.kund.privatperson.personnummer}</Text></>
            )}
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && arbetsorder.kund.foretag?.organisationsnummer && !isWorkOrder && (
              <><Text style={styles.label}>Organisationsnummer:</Text><Text style={styles.value}>{arbetsorder.kund.foretag.organisationsnummer}</Text></>
            )}
             {arbetsorder.referensMärkning && !isWorkOrder && (
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
              <><Text style={styles.label}>E-post:</Text><Text style={styles.value}>{arbetsorder.kund.epost}</Text></>
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
      
      {isWorkOrder && (
        <View style={styles.section}>
          {arbetsorder.referensMärkning && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockLabel}>Referens/Märkning:</Text>
              <Text style={styles.infoBlockValue}>{arbetsorder.referensMärkning}</Text>
            </View>
          )}
          {arbetsorder.material && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockLabel}>Anteckningar:</Text>
              <Text style={styles.infoBlockValue}>{arbetsorder.material}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitleBase, !isWorkOrder ? styles.sectionTitleWithBorder : {}]}>Specifikation</Text>
        {isWorkOrder ? (
          <View style={styles.arbetsorderTable}>
            <View style={styles.arbetsorderTableHeader}>
              <Text style={[styles.arbetsorderTableHeaderText, styles.arbetsorderColDesc]}>Produkt/Tjänst</Text>
              <Text style={[styles.arbetsorderTableHeaderText, styles.arbetsorderColQty]}>Antal</Text>
              <Text style={[styles.arbetsorderTableHeaderText, styles.arbetsorderColDetails]}>Detaljer (Mått/Tid/Kommentar)</Text>
            </View>
            {arbetsorder.orderrader.map((rad) => {
              const prissattningTyp = rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp;
              let details = [];
              if (prissattningTyp === PrissattningTyp.M2 && rad.bredd && rad.hojd) details.push(`${Math.round(rad.bredd)}x${Math.round(rad.hojd)}mm`);
              else if (prissattningTyp === PrissattningTyp.M && rad.langd) details.push(`${Math.round(rad.langd)}mm`);
              else if (prissattningTyp === PrissattningTyp.TIM && rad.tid) details.push(`${rad.tid.toFixed(2)} tim`);
              if (rad.kommentar) details.push(rad.kommentar);
              
              return (
                <View key={rad.id} style={styles.arbetsorderTableRow}>
                  <View style={[styles.arbetsorderTableCell, styles.arbetsorderColDesc]}>
                    <Text>{rad.prislista.namn}</Text>
                    {rad.prislista.artikelnummer && <Text style={{fontSize: 8, color: '#666'}}>Art.nr: {rad.prislista.artikelnummer}</Text>}
                  </View>
                  <Text style={[styles.arbetsorderTableCell, styles.arbetsorderColQty]}>{rad.antal}</Text>
                  <Text style={[styles.arbetsorderTableCell, styles.arbetsorderColDetails]}>{details.join(' | ') || '-'}</Text>
                </View>
              );
            })}
          </View>
        ) : ( 
          <>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.tableColDesc]}>Produkt/Tjänst</Text>
                <Text style={[styles.tableHeaderText, styles.tableColQty]}>Antal</Text>
                <Text style={[styles.tableHeaderText, styles.tableColPrice]}>À-pris</Text>
                <Text style={[styles.tableHeaderText, styles.tableColDiscount]}>Rabatt</Text>
                <Text style={[styles.tableHeaderText, styles.tableColSum]}>Summa</Text>
                {/* Moms-kolumnen är borttagen härifrån */}
              </View>
              {arbetsorder.orderrader.map((rad) => {
                const enhetsPrisExklMoms = rad.enhetsPrisExklMoms ?? rad.prislista.prisExklMoms;
                // const momssats = rad.enhetsMomssats ?? rad.prislista.momssats; // Används inte längre i raden
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
                  {/* Cellen för moms är borttagen */}
                </View>
              )})}
            </View>
            
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
                <Text style={[styles.totalLabel, {fontWeight: "bold"}]}>Totalt inkl. moms:</Text>
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
          </>
        )}
      </View>
      
      {isWorkOrder && arbetsorder.bilder && arbetsorder.bilder.length > 0 && (
        <View style={styles.imagesSection}>
            <Text style={[styles.sectionTitleBase]}>Bifogade Bilder ({arbetsorder.bilder.length} st)</Text>
            {arbetsorder.bilder.map(bild => (
                <Text key={bild.id} style={styles.imageListItem}>- {bild.filnamn}</Text>
            ))}
        </View>
      )}
      
      {isWorkOrder ? (
        <View style={styles.arbetsorderFooter} fixed>
            <Text>Intern Arbetsorder #{arbetsorder.id} | {formatDate(new Date())}</Text>
            <Text render={({ pageNumber, totalPages }) => (
                `Sida ${pageNumber} av ${totalPages}`
            )} fixed />
        </View>
      ) : (
        <View style={[styles.defaultFooterBase, styles.defaultFooterWithBorder]} fixed>
          <Text>GlasMästro AB | Glasvägen 1, 123 45 Glasstad | Tel: 08-123 45 67 | info@glasmastro.se</Text>
          <Text>Org.nr: 556123-4567 | Godkänd för F-skatt</Text>
          {documentType === 'OFFERT' && (
             <Text style={{ marginTop: 5 }}>Offert giltig i 30 dagar. Betalningsvillkor vid order: 15 dagar netto.</Text>
          )}
          {documentType === 'FAKTURA' && (
             <Text style={{ marginTop: 5 }}>Betalningsvillkor: 30 dagar netto. Bankgiro: 123-4567.</Text>
          )}
           <Text>Vänligen ange {orderNumberLabel.toLowerCase()}: {arbetsorder.id} vid betalning.</Text>
           <Text render={({ pageNumber, totalPages }) => (
                `Sida ${pageNumber} av ${totalPages}`
            )} fixed />
        </View>
      )}
    </Page>
  </Document>
)};

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

export const generatePDF = async (arbetsorder: ArbetsorderMedRelationer, documentType: DocumentType): Promise<Blob> => {
  const preparedData = prepareArbetsorderForPDF(arbetsorder);
  return await reactPdf(<ArbetsorderDocumentPDF arbetsorder={preparedData} documentType={documentType} />).toBlob();
};