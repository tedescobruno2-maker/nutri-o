import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/registerFonts";

// Mesmas convenções de MealPlanDocument.tsx/SupplementPrescriptionDocument.tsx (5.5/5.6) —
// substitui a versão em HTML/impressão do navegador (que não paginava nem repetia rodapé de
// forma confiável) por um PDF real, agora que 9.12 pede assinatura no rodapé desta também.
const styles = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, paddingTop: 90, paddingBottom: 60, paddingHorizontal: 36, color: "#1a1a1a", flexDirection: "column" },
  header: { position: "absolute", top: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: "1pt solid #ccc", paddingBottom: 8 },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerLogo: { height: 24, objectFit: "contain", marginBottom: 2 },
  headerName: { fontSize: 12, fontWeight: "bold" },
  headerProfession: { fontSize: 9, color: "#555" },
  headerCrn: { fontSize: 9, color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: "1pt solid #ccc", paddingTop: 6, flexDirection: "column" },
  footerPageNumber: { fontSize: 8, color: "#555", textAlign: "right", marginBottom: 1 },
  footerContact: { fontSize: 8, color: "#555" },
  identBlock: { marginBottom: 14, flexDirection: "column" },
  docTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, textTransform: "uppercase" },
  identRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 2 },
  identLabel: { fontSize: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase", marginTop: 10, marginBottom: 6, backgroundColor: "#f2f2f2", padding: 4 },
  listItemRow: { flexDirection: "row", marginBottom: 4, gap: 6 },
  bullet: { fontSize: 11 },
  itemText: { fontSize: 11, flex: 1 },
  itemNote: { fontSize: 9, color: "#666" },
  signatureBlock: { marginTop: 20, flexDirection: "column", alignItems: "center" },
  signatureImage: { height: 48, objectFit: "contain", marginBottom: 4 },
  signatureLine: { borderTop: "1pt solid #999", width: 220, marginBottom: 4 },
  signatureName: { fontSize: 9, fontWeight: "bold" },
  signatureCrn: { fontSize: 8, color: "#555" },
});

export type PdfExamItem = {
  id: string;
  name: string;
  notes: string | null;
  resultDate: Date | null;
};

export type ExamRequestDocumentProps = {
  professional: {
    nutritionistName: string;
    profession: string | null;
    crn: string;
    crnRegion: string | null;
    logoUrl: string | null;
    signatureUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
  };
  client: { name: string };
  generatedAt: Date;
  requested: PdfExamItem[];
  withResult: PdfExamItem[];
};

function formatDatePt(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function ExamRequestDocument({ professional, client, generatedAt, requested, withResult }: ExamRequestDocumentProps) {
  const crnLine = professional.crnRegion ? `CRN ${professional.crnRegion} ${professional.crn}` : `CRN ${professional.crn}`;
  const footerContactLine = [professional.address, professional.phone, professional.email, professional.instagram].filter(Boolean).join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {professional.logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={professional.logoUrl} style={styles.headerLogo} />
            )}
            <Text style={styles.headerName}>{professional.nutritionistName}</Text>
            <Text style={styles.headerProfession}>{professional.profession ?? "Nutricionista"}</Text>
          </View>
          <Text style={styles.headerCrn}>{crnLine}</Text>
        </View>

        <View style={styles.identBlock}>
          <Text style={styles.docTitle}>Solicitação de exames</Text>
          <View style={styles.identRow}>
            <Text style={styles.identLabel}>Paciente: {client.name}</Text>
            <Text style={styles.identLabel}>Data: {formatDatePt(generatedAt)}</Text>
          </View>
        </View>

        {requested.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Exames solicitados</Text>
            {requested.map((e) => (
              <View key={e.id} style={styles.listItemRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.itemText}>
                  {e.name}
                  {e.notes && <Text style={styles.itemNote}> — {e.notes}</Text>}
                </Text>
              </View>
            ))}
          </>
        )}

        {withResult.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Exames com resultado recebido</Text>
            {withResult.map((e) => (
              <View key={e.id} style={styles.listItemRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.itemText}>
                  {e.name}
                  <Text style={styles.itemNote}> — resultado em {e.resultDate ? formatDatePt(e.resultDate) : "—"}</Text>
                </Text>
              </View>
            ))}
          </>
        )}

        {professional.signatureUrl && (
          <View style={styles.signatureBlock} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={professional.signatureUrl} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{professional.nutritionistName}</Text>
            <Text style={styles.signatureCrn}>{crnLine}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerPageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          <Text style={styles.footerContact}>{footerContactLine}</Text>
        </View>
      </Page>
    </Document>
  );
}
