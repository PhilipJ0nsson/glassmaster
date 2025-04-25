import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Image,
} from '@react-pdf/renderer';
import { KundTyp, Arbetsorder, Kund, Privatperson, Foretag, Orderrad, Prislista } from '@prisma/client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Typer för sammansatt data
export type ArbetsorderMedRelationer = Arbetsorder & {
  kund: Kund & {
    privatperson?: Privatperson | null;
    foretag?: Foretag | null;
  };
  orderrader: (Orderrad & {
    prislista: Prislista;
  })[];
};

// Använd standardtypsnitt istället för att försöka ladda externa typsnitt
// Detta gör att vi undviker "Unknown font format"-felet

// Stilar för PDF-dokumentet
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #ccc',
    paddingBottom: 10,
  },
  logo: {
    width: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 15,
  },
  companyInfo: {
    marginBottom: 10,
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  contactInfo: {
    fontSize: 8,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    padding: 5,
    backgroundColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  col50: {
    width: '50%',
  },
  col25: {
    width: '25%',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  table: {
    // Specifikation av display som 'table' är inte giltig i react-pdf
    width: '100%',
    marginBottom: 15,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    padding: 5,
    fontSize: 9,
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  tableCol40: {
    width: '40%',
  },
  tableCol15: {
    width: '15%',
  },
  tableCol10: {
    width: '10%',
  },
  tableCol20: {
    width: '20%',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  totals: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  totalLabel: {
    width: '20%',
    fontWeight: 'bold',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '20%',
    textAlign: 'right',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'solid',
    borderRadius: 5,
  },
  status: {
    padding: 5,
    marginLeft: 10,
    borderRadius: 3,
    fontSize: 10,
  },
  offerStatus: {
    backgroundColor: '#FCEABB',
  },
  confirmedStatus: {
    backgroundColor: '#D2E8FC',
  },
  inProgressStatus: {
    backgroundColor: '#E6D4FF',
  },
  completedStatus: {
    backgroundColor: '#D4FFD4',
  },
  invoicedStatus: {
    backgroundColor: '#EEEEEE',
  },
  cancelledStatus: {
    backgroundColor: '#FFCCCC',
  },
});

/**
 * Formaterar valuta (SEK)
 */
const formatCurrency = (amount: number | null) => {
  if (amount === null) return '-';
  
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formaterar datum
 */
const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return format(date, 'PP', { locale: sv });
};

/**
 * Hämtar kundens namn baserat på kundtyp
 */
const getKundNamn = (kund: Kund & { privatperson?: Privatperson | null; foretag?: Foretag | null }) => {
  if (kund.privatperson) {
    return `${kund.privatperson.fornamn} ${kund.privatperson.efternamn}`;
  } else if (kund.foretag) {
    return kund.foretag.foretagsnamn;
  }
  
  return `Kund #${kund.id}`;
};

/**
 * Hämtar text för arbetsorderstatus
 */
const getStatusText = (status: string) => {
  switch (status) {
    case 'OFFERT':
      return 'Offert';
    case 'BEKRAFTAD':
      return 'Bekräftad';
    case 'PAGAENDE':
      return 'Pågående';
    case 'SLUTFORD':
      return 'Slutförd';
    case 'FAKTURERAD':
      return 'Fakturerad';
    case 'AVBRUTEN':
      return 'Avbruten';
    default:
      return status;
  }
};

/**
 * Hämtar stilar för statuselement baserat på status
 */
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'OFFERT':
      return styles.offerStatus;
    case 'BEKRAFTAD':
      return styles.confirmedStatus;
    case 'PAGAENDE':
      return styles.inProgressStatus;
    case 'SLUTFORD':
      return styles.completedStatus;
    case 'FAKTURERAD':
      return styles.invoicedStatus;
    case 'AVBRUTEN':
      return styles.cancelledStatus;
    default:
      return {};
  }
};

/**
 * Skapar dokumentet för offert/faktura
 */
const OffertPDF = ({ arbetsorder }: { arbetsorder: ArbetsorderMedRelationer }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            {/* Logotyp kan läggas till här */}
            {/* <Image style={styles.logo} src="/logo.png" /> */}
            <Text style={styles.companyName}>GlasMästro AB</Text>
            <Text style={styles.contactInfo}>Glasvägen 1, 123 45 Glasstad</Text>
            <Text style={styles.contactInfo}>Tel: 08-123 45 67</Text>
            <Text style={styles.contactInfo}>E-post: info@glasmastro.se</Text>
            <Text style={styles.contactInfo}>Org.nr: 556123-4567</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>
              {arbetsorder.status === 'OFFERT' ? 'OFFERT' : 'ARBETSORDER'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.subtitle}>#{arbetsorder.id}</Text>
              <Text style={[styles.status, getStatusStyle(arbetsorder.status)]}>
                {getStatusText(arbetsorder.status)}
              </Text>
            </View>
            <Text>{formatDate(arbetsorder.skapadDatum)}</Text>
          </View>
        </View>
      </View>

      {/* Kunduppgifter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kunduppgifter</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.col50}>
            <Text style={styles.label}>Kund:</Text>
            <Text>{getKundNamn(arbetsorder.kund)}</Text>
            
            {arbetsorder.kund.kundTyp === KundTyp.PRIVAT && arbetsorder.kund.privatperson && (
              <>
                {arbetsorder.kund.privatperson.personnummer && (
                  <Text>Personnummer: {arbetsorder.kund.privatperson.personnummer}</Text>
                )}
              </>
            )}
            
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && arbetsorder.kund.foretag && (
              <>
                {arbetsorder.kund.foretag.organisationsnummer && (
                  <Text>Org.nr: {arbetsorder.kund.foretag.organisationsnummer}</Text>
                )}
                {arbetsorder.kund.foretag.kontaktpersonFornamn && (
                  <Text>
                    Kontaktperson: {arbetsorder.kund.foretag.kontaktpersonFornamn} {arbetsorder.kund.foretag.kontaktpersonEfternamn}
                  </Text>
                )}
                {/* referensMärkning har flyttats från Foretag till Arbetsorder */}
                {arbetsorder.referensMärkning && (
                  <Text>Referens: {arbetsorder.referensMärkning}</Text>
                )}
              </>
            )}
          </View>
          
          <View style={styles.col50}>
            <Text style={styles.label}>Kontaktuppgifter:</Text>
            <Text>Tel: {arbetsorder.kund.telefonnummer}</Text>
            {arbetsorder.kund.epost && <Text>E-post: {arbetsorder.kund.epost}</Text>}
            <Text>Adress: {arbetsorder.kund.adress}</Text>
            
            {arbetsorder.kund.kundTyp === KundTyp.FORETAG && 
             arbetsorder.kund.foretag?.fakturaadress && (
              <>
                <Text style={styles.label}>Fakturaadress:</Text>
                <Text>{arbetsorder.kund.foretag.fakturaadress}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Produkter och tjänster */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Produkter och tjänster</Text>
        
        <View style={styles.table}>
          {/* Tabellrubrik */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCol40}>Produkt/Tjänst</Text>
            <Text style={[styles.tableCol10, styles.textCenter]}>Antal</Text>
            <Text style={[styles.tableCol15, styles.textCenter]}>À-pris (exkl.)</Text>
            <Text style={[styles.tableCol10, styles.textCenter]}>Rabatt</Text>
            <Text style={[styles.tableCol15, styles.textRight]}>Summa (exkl.)</Text>
            <Text style={[styles.tableCol10, styles.textRight]}>Moms</Text>
          </View>
          
          {/* Tabellrader */}
          {arbetsorder.orderrader.map((rad) => (
            <View key={rad.id} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCol40]}>
                <Text>{rad.prislista.namn}</Text>
                {/* Visa mått/tid om relevant */}
                {rad.enhetsPrissattningTyp === 'M2' && rad.bredd && rad.hojd && (
                  <Text style={{ fontSize: 8, color: '#666' }}>
                    {(() => {
                      // Visa måtten i millimeter (multiplicera med 1000 om de är sparade i meter)
                      // Kommentar: bredd och höjd sparas nu i meter i databasen, så vi konverterar tillbaka till mm
                      const breddInDb = rad.bredd || 0;
                      const hojdInDb = rad.hojd || 0;
                      
                      // Konvertera från meter till millimeter
                      const breddMm = Math.round(breddInDb * 1000);
                      const hojdMm = Math.round(hojdInDb * 1000);
                      
                      return `${breddMm}mm × ${hojdMm}mm`;
                    })()}
                  </Text>
                )}
                {rad.enhetsPrissattningTyp === 'M' && rad.langd && (
                  <Text style={{ fontSize: 8, color: '#666' }}>
                    {(() => {
                      // Visa måtten i millimeter (multiplicera med 1000 om de är sparade i meter)
                      // Kommentar: längd sparas nu i meter i databasen, så vi konverterar tillbaka till mm
                      const langdInDb = rad.langd || 0;
                      
                      // Konvertera från meter till millimeter
                      const langdMm = Math.round(langdInDb * 1000);
                      
                      return `${langdMm}mm`;
                    })()}
                  </Text>
                )}
                {rad.enhetsPrissattningTyp === 'TIM' && rad.tid && (
                  <Text style={{ fontSize: 8, color: '#666' }}>
                    {rad.tid.toFixed(2)} timmar
                  </Text>
                )}
                {rad.kommentar && <Text style={{ fontSize: 8, color: '#666' }}>{rad.kommentar}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.tableCol10, styles.textCenter]}>{rad.antal}</Text>
              <Text style={[styles.tableCell, styles.tableCol15, styles.textCenter]}>
                {formatCurrency(rad.prislista.prisExklMoms)}
                {rad.enhetsPrissattningTyp === 'M2' && <Text style={{ fontSize: 7 }}>/m²</Text>}
                {rad.enhetsPrissattningTyp === 'M' && <Text style={{ fontSize: 7 }}>/m</Text>}
                {rad.enhetsPrissattningTyp === 'TIM' && <Text style={{ fontSize: 7 }}>/tim</Text>}
              </Text>
              <Text style={[styles.tableCell, styles.tableCol10, styles.textCenter]}>
                {rad.rabattProcent > 0 ? `${rad.rabattProcent}%` : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCol15, styles.textRight]}>
                {formatCurrency(rad.radPrisExklMoms)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCol10, styles.textRight]}>
                {rad.prislista.momssats > 1 ? Math.round(rad.prislista.momssats) : Math.round(rad.prislista.momssats * 100)}%
              </Text>
            </View>
          ))}
        </View>
        
        {/* Totalsummor */}
        <View style={styles.totals}>
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
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Totalt inkl. moms:</Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
              {formatCurrency(arbetsorder.totalPrisInklMoms)}
            </Text>
          </View>
          
          {/* ROT-avdrag om tillämpligt */}
          {arbetsorder.ROT && arbetsorder.ROTprocentsats && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ROT-avdrag ({arbetsorder.ROTprocentsats}%):</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(-((arbetsorder.totalPrisInklMoms || 0) * arbetsorder.ROTprocentsats / 100))}
              </Text>
            </View>
          )}

          {/* Att betala efter eventuellt ROT-avdrag */}
          {arbetsorder.ROT && arbetsorder.ROTprocentsats && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Att betala:</Text>
              <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
                {formatCurrency((arbetsorder.totalPrisInklMoms || 0) * (1 - arbetsorder.ROTprocentsats / 100))}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Anteckningar/Beskrivning */}
      {arbetsorder.material && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beskrivning</Text>
          <View style={styles.notes}>
            <Text>{arbetsorder.material}</Text>
          </View>
        </View>
      )}
      
      {/* Referens/Märkning */}
      {arbetsorder.referensMärkning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referens/Märkning</Text>
          <View style={styles.notes}>
            <Text>{arbetsorder.referensMärkning}</Text>
          </View>
        </View>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text>GlasMästro AB | Glasvägen 1, 123 45 Glasstad | Tel: 08-123 45 67 | info@glasmastro.se</Text>
        <Text>Org.nr: 556123-4567 | Bankgiro: 123-4567 | Godkänd för F-skatt</Text>
        <Text>Vid betalning vänligen ange offertnummer {arbetsorder.id}</Text>
        <Text style={{ marginTop: 5 }}>Offert giltig i 30 dagar från utskriftsdatum</Text>
      </View>
    </Page>
  </Document>
);

/**
 * Förbereder arbetsorder genom att avkoppla prislista för PDF-generering
 */
const prepareArbetsorderForPDF = (arbetsorder: ArbetsorderMedRelationer): ArbetsorderMedRelationer => {
  // Skapa en djup kopia för att undvika förändring av originalet
  const preparedOrder = {
    ...arbetsorder,
    orderrader: arbetsorder.orderrader.map(rad => {
      // Skapa en isolerad kopia av prislista med data från orderraden
      const isolatedPrislista = {
        ...rad.prislista,
        prisExklMoms: rad.enhetsPrisExklMoms || rad.prislista.prisExklMoms,
        momssats: rad.enhetsMomssats || rad.prislista.momssats
      };
      
      // Konvertera mått från millimeter till meter för beräkningar
      let bredd = rad.bredd;
      let hojd = rad.hojd;
      let langd = rad.langd;
      
      // Konvertera alltid från millimeter till meter för beräkningar
      if (bredd) bredd = bredd / 1000;
      if (hojd) hojd = hojd / 1000;
      if (langd) langd = langd / 1000;
      
      return {
        ...rad,
        bredd,
        hojd,
        langd,
        prislista: isolatedPrislista
      };
    })
  };
  
  // Always recalculate totals from order rows to ensure consistency
  console.log("Recalculating totals from order rows:", { 
    originalExkl: preparedOrder.totalPrisExklMoms,
    originalInkl: preparedOrder.totalPrisInklMoms 
  });
  
  let newTotalExkl = 0;
  let newTotalInkl = 0;
  
  // Sum up the individual row prices
  preparedOrder.orderrader.forEach(rad => {
    console.log(`Row price for ${rad.prislista.namn}: exkl=${rad.radPrisExklMoms}, inkl=${rad.radPrisInklMoms}`);
    newTotalExkl += rad.radPrisExklMoms;
    newTotalInkl += rad.radPrisInklMoms;
  });
  
  preparedOrder.totalPrisExklMoms = newTotalExkl;
  preparedOrder.totalPrisInklMoms = newTotalInkl;
  
  console.log("New totals:", { 
    newExkl: preparedOrder.totalPrisExklMoms,
    newInkl: preparedOrder.totalPrisInklMoms 
  });
  
  return preparedOrder;
};

/**
 * Genererar PDF för en arbetsorder
 */
export const generatePDF = async (arbetsorder: ArbetsorderMedRelationer): Promise<Blob> => {
  // Förbered data genom att isolera prislistans värden
  const preparedData = prepareArbetsorderForPDF(arbetsorder);
  
  // Logga detaljer om orderrader för debugging
  console.log("PDF GENERATION - Order details:", {
    id: arbetsorder.id,
    status: arbetsorder.status,
    totalRader: arbetsorder.orderrader.length,
  });
  
  arbetsorder.orderrader.forEach((rad, index) => {
    console.log(`PDF GENERATION - Orderrad #${index + 1}:`, {
      produkt: rad.prislista.namn,
      antal: rad.antal,
      prissattningTyp: rad.enhetsPrissattningTyp || rad.prislista.prissattningTyp,
      bredd: rad.bredd,
      hojd: rad.hojd,
      langd: rad.langd,
      tid: rad.tid,
      enhetsPris: rad.enhetsPrisExklMoms || rad.prislista.prisExklMoms,
      radPris: rad.radPrisExklMoms,
    });
  });
  
  return await pdf(<OffertPDF arbetsorder={preparedData} />).toBlob();
};