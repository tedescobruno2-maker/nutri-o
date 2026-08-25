import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf/registerFonts";
import { itemDisplayLabel, itemQuantityLabel, itemKcalLabel, itemIsPending } from "@/lib/planDisplay";
import { MEAL_BLOCK_TYPE_LABELS } from "@/lib/utils";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

// IMPORTANTE: ao contrário do React Native, o flexDirection padrão do @react-pdf/renderer é
// "row", não "column" — todo <View> que deve empilhar filhos verticalmente precisa dizer isso
// explicitamente, senão o conteúdo sobrepõe (foi um bug real, pego testando com um plano real).
const styles = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, paddingTop: 90, paddingBottom: 60, paddingHorizontal: 36, color: "#1a1a1a", flexDirection: "column" },
  header: { position: "absolute", top: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: "1pt solid #ccc", paddingBottom: 8 },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerLogo: { height: 24, objectFit: "contain", marginBottom: 2 },
  headerName: { fontSize: 12, fontWeight: "bold" },
  headerProfession: { fontSize: 9, color: "#555" },
  headerCrn: { fontSize: 9, color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTop: "1pt solid #ccc", paddingTop: 6, flexDirection: "column" },
  // Página X de Y fica na SUA PRÓPRIA linha, nunca ao lado do contato — o contato pode ser longo
  // (endereço + telefone + e-mail + instagram) e colidiria com o número de página na mesma linha.
  footerPageNumber: { fontSize: 8, color: "#555", textAlign: "right", marginBottom: 1 },
  footerContact: { fontSize: 8, color: "#555" },
  footerCitation: { fontSize: 7, color: "#888", marginTop: 2, textAlign: "center" },
  identBlock: { marginBottom: 14, flexDirection: "column" },
  identRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 2 },
  identLabel: { fontSize: 10 },
  planTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  identGenerated: { fontSize: 8, color: "#888" },
  block: { marginBottom: 12, flexDirection: "column" },
  blockTitle: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 4, backgroundColor: "#f2f2f2", padding: 4 },
  option: { flexDirection: "column", marginBottom: 2 },
  optionSeparator: { textAlign: "center", fontSize: 9, color: "#888", marginVertical: 2 },
  optionLabel: { fontSize: 10, fontWeight: "bold", marginBottom: 2 },
  recipeTitle: { fontSize: 11, fontWeight: "bold" },
  optionItemRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2, gap: 6 },
  itemPhoto: { width: 24, height: 24, borderRadius: 3, objectFit: "cover" },
  // itemText: só dentro de optionItemRow (flexDirection row) — o flex:1 faz o texto ocupar o
  // espaço horizontal restante ao lado da foto/kcal. freeTextLine é para linhas soltas numa
  // coluna (nunca leva flex:1, senão os irmãos disputam o espaço vertical e sobrepõem).
  itemText: { fontSize: 11, flex: 1 },
  freeTextLine: { fontSize: 11 },
  itemKcal: { fontSize: 9, color: "#666" },
  itemPending: { fontSize: 8, color: "#b45309" },
  bullet: { fontSize: 11, marginRight: 4 },
  listItemRow: { flexDirection: "row", marginBottom: 3 },
  guidance: { fontSize: 10, marginBottom: 3, lineHeight: 1.3 },
});

export type PdfMeal = {
  id: string;
  name: string;
  displayTitle: string | null;
  blockType: string;
  separator: string;
  visible: boolean;
  options: Array<{
    id: string;
    label: string;
    isStructured: boolean;
    freeText: string;
    items: MealOptionItemLike[];
  }>;
};

export type MealPlanDocumentProps = {
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
    footerText: string | null;
  };
  client: { name: string; age: number | null };
  weight: number | null;
  consultationDate: Date | null;
  objective: string | null;
  initialGuidanceText: string | null;
  generalGuidelines: string | null;
  meals: PdfMeal[];
  withPhotos: boolean;
  generatedAt: Date;
};

function formatDatePt(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("pt-BR");
}

export function MealPlanDocument({ professional, client, weight, consultationDate, objective, initialGuidanceText, generalGuidelines, meals, withPhotos, generatedAt }: MealPlanDocumentProps) {
  const crnLine = professional.crnRegion ? `CRN ${professional.crnRegion} ${professional.crn}` : `CRN ${professional.crn}`;
  const visibleMeals = meals.filter((m) => m.visible);
  // footerText não entra aqui de propósito: no cadastro dela hoje ele só repete
  // endereço/telefone/e-mail, que já aparecem nesta linha — mostrar os dois duplicava a informação.
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
            {/* Nome + profissão sempre aparecem, com ou sem logo — carimbo obrigatório em todo
                registro (Res. CFN 594/2017, Art. 8º, II). Um logo não pode substituir o nome. */}
            <Text style={styles.headerName}>{professional.nutritionistName}</Text>
            <Text style={styles.headerProfession}>{professional.profession ?? "Nutricionista"}</Text>
          </View>
          <Text style={styles.headerCrn}>{crnLine}</Text>
        </View>

        <View style={styles.identBlock}>
          <View style={styles.identRow}>
            <Text style={styles.planTitle}>Plano Alimentar</Text>
            <Text style={styles.identGenerated}>Gerado em {formatDatePt(generatedAt)}</Text>
          </View>
          <View style={styles.identRow}>
            <Text style={styles.identLabel}>Paciente: {client.name}</Text>
            {client.age != null && <Text style={styles.identLabel}>Idade: {client.age} anos</Text>}
          </View>
          <View style={styles.identRow}>
            <Text style={styles.identLabel}>Peso no dia da consulta: {weight != null ? `${weight} kg` : "não informado"}</Text>
            {consultationDate && <Text style={styles.identLabel}>Data: {formatDatePt(consultationDate)}</Text>}
          </View>
          {objective && <Text style={styles.identLabel}>Objetivo: {objective}</Text>}
        </View>

        {initialGuidanceText && (
          <View style={{ flexDirection: "column", marginBottom: 8 }}>
            {initialGuidanceText.split("\n").filter(Boolean).map((line, i) => (
              <Text key={i} style={styles.guidance}>{line}</Text>
            ))}
          </View>
        )}

        {visibleMeals.map((meal) => {
          // blockType=LIVRE é o default de migração para refeições antigas (pré-Fase 4) — nesse
          // caso o nome original digitado (meal.name) é mais informativo que o rótulo genérico.
          const title = meal.displayTitle || (meal.blockType !== "LIVRE" ? MEAL_BLOCK_TYPE_LABELS[meal.blockType] : null) || meal.name;
          return (
          <View key={meal.id} style={styles.block} wrap={false}>
            <Text style={styles.blockTitle}>{title.toUpperCase()}</Text>

            {meal.separator === "LISTA"
              ? meal.options.map((option) =>
                  option.isStructured ? (
                    option.items.map((item, itemIndex) => (
                      <View key={`${option.id}-${itemIndex}`} style={styles.listItemRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.itemText}>{itemDisplayLabel(item)}</Text>
                      </View>
                    ))
                  ) : (
                    <View key={option.id} style={styles.listItemRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.itemText}>{option.freeText}</Text>
                    </View>
                  )
                )
              : meal.options.map((option, optionIndex) => (
                  <View key={option.id} style={styles.option}>
                    {optionIndex > 0 && <Text style={styles.optionSeparator}>— OU —</Text>}
                    {meal.options.length > 1 && <Text style={styles.optionLabel}>{option.label}</Text>}
                    {option.isStructured ? (
                      option.items.map((item, itemIndex) => {
                        const photoUrl = item.food?.imageUrl || item.recipe?.imageUrl;
                        return (
                        <View key={itemIndex} style={styles.optionItemRow}>
                          {withPhotos && photoUrl && (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <Image src={photoUrl} style={styles.itemPhoto} />
                          )}
                          <Text style={styles.itemText}>
                            {itemQuantityLabel(item) ? `${itemQuantityLabel(item)} de ` : ""}
                            {itemDisplayLabel(item)}
                            {itemIsPending(item) && <Text style={styles.itemPending}> (pendente)</Text>}
                          </Text>
                          {itemKcalLabel(item) && <Text style={styles.itemKcal}>{itemKcalLabel(item)}</Text>}
                        </View>
                        );
                      })
                    ) : (
                      <>
                        {/* Opção legada (isStructured=false) com receita vinculada: mantém o
                            freeText como o texto autoritativo (5.5.3), mas resgata nome + foto da
                            receita — é exatamente o que sumiu ao migrar do card único antigo. */}
                        {(() => {
                          const linkedRecipe = option.items.find((i) => i.recipe)?.recipe;
                          if (!linkedRecipe) return null;
                          return (
                            <View style={styles.optionItemRow}>
                              {withPhotos && linkedRecipe.imageUrl && (
                                // eslint-disable-next-line jsx-a11y/alt-text
                                <Image src={linkedRecipe.imageUrl} style={styles.itemPhoto} />
                              )}
                              <Text style={styles.recipeTitle}>{linkedRecipe.name}</Text>
                            </View>
                          );
                        })()}
                        {/* <Text> não quebra em \n sozinho — cada linha vira seu próprio <Text>,
                            senão o texto sobrepõe (bug real, pego testando com um plano real). */}
                        {option.freeText.split("\n").filter(Boolean).map((line, i) => (
                          <Text key={i} style={styles.freeTextLine}>{line}</Text>
                        ))}
                      </>
                    )}
                  </View>
                ))}
          </View>
          );
        })}

        {generalGuidelines && (
          <View style={styles.block} wrap={false}>
            <Text style={styles.blockTitle}>ORIENTAÇÕES GERAIS</Text>
            {generalGuidelines.split("\n").filter(Boolean).map((line, i) => (
              <View key={i} style={styles.listItemRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.itemText}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerPageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          <Text style={styles.footerContact}>{footerContactLine}</Text>
          <Text style={styles.footerCitation}>Composição: NEPA/UNICAMP. TACO, 4ª ed. rev. e ampl. Campinas, 2011.</Text>
        </View>
      </Page>
    </Document>
  );
}
