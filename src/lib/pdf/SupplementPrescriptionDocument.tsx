import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/registerFonts";

// Layout conforme 5.6.3 do plano mestre. Reaproveita as mesmas convenções de MealPlanDocument.tsx
// (flexDirection explícito em toda View que empilha filhos — o padrão do @react-pdf/renderer é
// "row"; \n não quebra sozinho dentro de <Text>, uma linha por elemento quando necessário).
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
  item: { flexDirection: "column", marginBottom: 10 },
  itemHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  bullet: { fontSize: 11 },
  itemName: { fontSize: 11, fontWeight: "bold", flex: 1 },
  itemPosology: { fontSize: 10, marginLeft: 14, marginTop: 2 },
  itemComposition: { fontSize: 9, color: "#555", marginLeft: 14, marginTop: 1 },
});

export type PdfPrescriptionItem = {
  id: string;
  section: "LOJA_SUPLEMENTOS" | "MANIPULADO" | "AMBOS";
  displayName: string;
  composition: string | null;
  route: string;
  posology: string;
};

export type SupplementPrescriptionDocumentProps = {
  professional: {
    nutritionistName: string;
    profession: string | null;
    crn: string;
    crnRegion: string | null;
    logoUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
  };
  client: { name: string };
  date: Date;
  version: number;
  items: PdfPrescriptionItem[];
};

function formatDatePt(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function SupplementPrescriptionDocument({ professional, client, date, version, items }: SupplementPrescriptionDocumentProps) {
  const crnLine = professional.crnRegion ? `CRN ${professional.crnRegion} ${professional.crn}` : `CRN ${professional.crn}`;
  const footerContactLine = [professional.address, professional.phone, professional.email, professional.instagram].filter(Boolean).join(" · ");

  const lojaItems = items.filter((i) => i.section !== "MANIPULADO");
  const manipuladoItems = items.filter((i) => i.section === "MANIPULADO");

  const renderItem = (item: PdfPrescriptionItem) => (
    <View key={item.id} style={styles.item} wrap={false}>
      <View style={styles.itemHeaderRow}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.itemName}>{item.displayName}</Text>
      </View>
      {item.composition && <Text style={styles.itemComposition}>Composição: {item.composition}</Text>}
      <Text style={styles.itemPosology}>Via {item.route.toLowerCase()}. {item.posology}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {professional.logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={professional.logoUrl} style={styles.headerLogo} />
            )}
            {/* Nome + profissão sempre aparecem, com ou sem logo — carimbo obrigatório em todo
                registro (Res. CFN 594/2017, Art. 8º, II). Um logo não pode substituir o nome. */}
            <Text style={styles.headerName}>{professional.nutritionistName}</Text>
            <Text style={styles.headerProfession}>{professional.profession ?? "Nutricionista"}</Text>
          </View>
          <Text style={styles.headerCrn}>{crnLine}</Text>
        </View>

        <View style={styles.identBlock}>
          <Text style={styles.docTitle}>Prescrição de suplementação{version > 1 ? ` — v${version}` : ""}</Text>
          <View style={styles.identRow}>
            <Text style={styles.identLabel}>Paciente: {client.name}</Text>
            <Text style={styles.identLabel}>Data: {formatDatePt(date)}</Text>
          </View>
        </View>

        {lojaItems.map(renderItem)}

        {manipuladoItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Para manipular:</Text>
            {manipuladoItems.map(renderItem)}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerPageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          <Text style={styles.footerContact}>{footerContactLine}</Text>
        </View>
      </Page>
    </Document>
  );
}
