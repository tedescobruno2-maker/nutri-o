"use client";

import { useState, useTransition } from "react";
import { searchPixabayImages, selectPixabayImage, uploadOwnImage, searchImageLibrary, type PixabayHit } from "@/actions/images";

type ImageAssetLike = { id: string; url: string; thumbUrl: string | null; altText: string | null };

/**
 * Widget de duas portas (5.11.1): busca no Pixabay + foto própria, sempre lado a lado — e uma
 * terceira via discreta para reaproveitar uma imagem já baixada (5.11.2). Chama `onSelect` com o
 * `ImageAsset` criado/reaproveitado; quem usa decide o que fazer com o id (gravar no formulário,
 * ligar direto via server action, etc.) — este componente nunca fala com Prisma.
 */
export function ImagePicker({
  suggestedTerm,
  altTextDefault,
  onSelect,
  onClose,
}: {
  suggestedTerm: string;
  altTextDefault: string;
  onSelect: (asset: ImageAssetLike) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"pixabay" | "upload">("pixabay");
  const [query, setQuery] = useState(suggestedTerm);
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [altText, setAltText] = useState(altTextDefault);
  const [hits, setHits] = useState<PixabayHit[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [libraryResults, setLibraryResults] = useState<ImageAssetLike[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSearch(searchLang: "pt" | "en" = lang) {
    setError(null);
    startTransition(async () => {
      const result = await searchPixabayImages(query, searchLang);
      if (!result.ok) {
        setUnavailable(true);
        setHits([]);
        return;
      }
      setUnavailable(false);
      setHits(result.hits);
    });
  }

  function handlePickHit(hit: PixabayHit) {
    setError(null);
    startTransition(async () => {
      try {
        const asset = await selectPixabayImage(hit, query, altText);
        onSelect(asset);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar a imagem.");
      }
    });
  }

  function handleUpload(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const asset = await uploadOwnImage(file, query || null, altText);
        onSelect(asset);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao enviar a imagem.");
      }
    });
  }

  function handleSearchLibrary() {
    startTransition(async () => {
      const results = await searchImageLibrary(query);
      setLibraryResults(results);
      setShowLibrary(true);
    });
  }

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Escolher foto</strong>
        <button type="button" className="btn btn-ghost btn-xs" onClick={onClose}>✕ Fechar</button>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className={`btn btn-sm ${tab === "pixabay" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("pixabay")}>
          Pixabay
        </button>
        <button type="button" className={`btn btn-sm ${tab === "upload" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("upload")}>
          Minha foto
        </button>
      </div>

      <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Descrição da imagem (acessibilidade)" className="input" />

      {tab === "pixabay" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Termo de busca" className="input" style={{ flex: 1 }} />
            <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={() => handleSearch(lang)}>
              Buscar
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              const next = lang === "pt" ? "en" : "pt";
              setLang(next);
              handleSearch(next);
            }}
          >
            {lang === "pt" ? "Buscar em inglês (acervo maior)" : "Buscar em português"}
          </button>

          {unavailable && (
            <p className="text-tertiary" style={{ fontSize: "0.8rem" }}>
              Busca do Pixabay indisponível (chave não configurada) — use a aba &quot;Minha foto&quot;.
            </p>
          )}

          {hits && hits.length === 0 && !unavailable && (
            <p className="text-tertiary" style={{ fontSize: "0.8rem" }}>Nenhum resultado para este termo.</p>
          )}

          {hits && hits.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
              {hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handlePickHit(hit)}
                  style={{ padding: 0, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden", cursor: "pointer" }}
                  title={`Foto de ${hit.user}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hit.previewURL} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="input"
          />
          <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>JPG, PNG, WEBP ou GIF, até 5MB.</p>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
        {!showLibrary ? (
          <button type="button" className="btn btn-ghost btn-xs" onClick={handleSearchLibrary} disabled={isPending}>
            Escolher da biblioteca (imagens já usadas)
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>Imagens já na biblioteca para &quot;{query}&quot;:</span>
            {libraryResults.length === 0 ? (
              <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>Nenhuma encontrada.</span>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
                {libraryResults.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset)}
                    style={{ padding: 0, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden", cursor: "pointer" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.thumbUrl ?? asset.url} alt="" style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
    </div>
  );
}
