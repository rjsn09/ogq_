import { useState, useCallback, useMemo } from "react";
import { Download, ZoomIn, X, CheckSquare, Square, ChevronLeft, ChevronRight, RotateCw, Check } from "lucide-react";
import { VARIANT_CATALOG, Variant } from "../utils/imageGenerator";

interface GeneratedGridProps {
  images: (string | null)[];
  slotVariants: Variant[];
  onVariantChange: (slotIndex: number, variantId: string) => void;
  isGenerating: boolean;
  progress: number;
  generatingIndices?: Set<number>;
  title: string;
  onGenerate?: (indices?: number[]) => void;
  isReady?: boolean;
}

export default function GeneratedGrid({
  images,
  slotVariants,
  onVariantChange,
  isGenerating,
  progress,
  generatingIndices,
  title,
  onGenerate,
  isReady,
}: GeneratedGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const filledCount = useMemo(() => images.filter(Boolean).length, [images]);
  const isAllSelected = selectedIds.size === 24 && 24 > 0;
  const selectedFilledCount = useMemo(
    () => [...selectedIds].filter((i) => !!images[i]).length,
    [selectedIds, images]
  );

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(Array.from({ length: 24 }, (_, i) => i)));
  }, [isAllSelected]);

  const downloadImage = useCallback(
    (dataUrl: string, idx: number) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title || "ogq_sticker"}_${String(idx + 1).padStart(2, "0")}.png`;
      a.click();
    },
    [title]
  );

  const downloadSelected = useCallback(() => {
    const targets =
      selectedFilledCount > 0
        ? [...selectedIds].filter((i) => !!images[i])
        : images.map((img, i) => (img ? i : -1)).filter((i) => i >= 0);
    targets.forEach((idx, i) => {
      setTimeout(() => downloadImage(images[idx] as string, idx), i * 120);
    });
  }, [selectedIds, selectedFilledCount, images, downloadImage]);

  const handleGenerateClick = useCallback(() => {
    if (!onGenerate) return;
    if (selectedIds.size > 0) {
      onGenerate([...selectedIds].sort((a, b) => a - b));
      setSelectedIds(new Set());
    } else {
      onGenerate(undefined);
    }
  }, [onGenerate, selectedIds]);

  const hasImages = filledCount > 0;

  // 하단 생성 버튼 라벨/활성 여부 계산
  const generateLabel = useMemo(() => {
    if (isGenerating) return `생성 중...`;
    if (selectedIds.size > 0) {
      const willRegenerate = selectedFilledCount === selectedIds.size;
      const willCreate = selectedFilledCount === 0;
      if (willRegenerate) return `선택 ${selectedIds.size}장 재생성하기`;
      if (willCreate) return `선택 ${selectedIds.size}장 생성하기`;
      return `선택 ${selectedIds.size}장 생성/재생성하기`;
    }
    return hasImages ? "빈 칸 전체 생성하기" : "24장 이미지 생성하기";
  }, [isGenerating, selectedIds, selectedFilledCount, hasImages]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground" style={{ fontWeight: 600 }}>
            미리보기
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs" style={{ fontWeight: 700 }}>
            {filledCount}/24
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs hover:bg-muted transition-colors"
            style={{ fontWeight: 500 }}
          >
            {isAllSelected ? <CheckSquare size={13} className="text-primary" /> : <Square size={13} />}
            {isAllSelected ? "전체 해제" : "전체 선택"}
          </button>
          {hasImages && (
            <button
              onClick={downloadSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs hover:brightness-105 transition-all shadow-sm shadow-primary/20"
              style={{ fontWeight: 600 }}
            >
              <Download size={13} />
              {selectedFilledCount > 0 ? `${selectedFilledCount}장 다운로드` : "전체 다운로드"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-foreground text-sm" style={{ fontWeight: 500 }}>
                이미지 생성 중...
              </p>
            </div>
            <span className="text-primary text-sm" style={{ fontWeight: 700 }}>
              {progress}/24
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(progress / 24) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const img = images[i];
              const isSelected = selectedIds.has(i);
              const isSlotGenerating = isGenerating && (generatingIndices ? generatingIndices.has(i) : !img);
              const variant = slotVariants[i] ?? VARIANT_CATALOG[i];

              if (!img) {
                return (
                  <div
                    key={i}
                    className={`relative rounded-xl bg-muted border-2 flex flex-col items-center justify-center gap-1.5 p-1.5 transition-colors ${
                      isSelected ? "border-primary" : "border-dashed border-border"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {isSlotGenerating ? (
                      <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={() => toggleSelect(i)}
                          className="absolute top-1 left-1 w-4 h-4 rounded flex items-center justify-center border border-border bg-card hover:border-primary transition-colors"
                        >
                          {isSelected && <Check size={11} className="text-primary" />}
                        </button>
                        <span className="text-muted-foreground text-[10px] opacity-60" style={{ fontWeight: 500 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <select
                          value={variant.id}
                          onChange={(e) => onVariantChange(i, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-[90%] max-w-[84px] text-[10px] bg-card border border-border rounded-md px-1 py-0.5 text-foreground truncate"
                        >
                          {VARIANT_CATALOG.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-150 ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                      : "hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-card"
                  }`}
                  style={{ aspectRatio: "1/1" }}
                  onClick={() => toggleSelect(i)}
                >
                  <img src={img} alt={variant?.name} className="w-full h-full object-cover" />

                  {isSlotGenerating && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIdx(i);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 text-foreground flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(img, i);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 text-foreground flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                      <Download size={13} />
                    </button>
                    {onGenerate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerate([i]);
                        }}
                        title="이 칸만 재생성"
                        className="w-7 h-7 rounded-full bg-white/90 text-foreground flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      >
                        <RotateCw size={13} />
                      </button>
                    )}
                  </div>

                  {/* Variant label / selector (bottom) */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/55 px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={variant.id}
                      onChange={(e) => onVariantChange(i, e.target.value)}
                      className="w-full text-[10px] bg-transparent text-white border-none outline-none truncate"
                      style={{ fontWeight: 600 }}
                    >
                      {VARIANT_CATALOG.map((v) => (
                        <option key={v.id} value={v.id} className="text-foreground">
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {selectedIds.size > 0 ? (
                <>
                  <strong className="text-foreground">{selectedIds.size}장</strong> 선택됨
                  {selectedFilledCount > 0 && selectedFilledCount < selectedIds.size && " (일부는 재생성, 일부는 신규 생성)"}
                </>
              ) : (
                "칸을 클릭해 선택하거나, 드롭다운에서 만들 이모티콘을 고르세요"
              )}
            </p>
            <span className="text-muted-foreground text-xs">360 × 360px • PNG</span>
          </div>
        </div>
      </div>

      {/* Generate button below grid */}
      {onGenerate && (
        <button
          onClick={handleGenerateClick}
          disabled={!isReady || isGenerating}
          className={`w-full py-3.5 rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2.5 ${
            isReady && !isGenerating
              ? "bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.99] shadow-md shadow-primary/25"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          style={{ fontWeight: 700, letterSpacing: "0.01em" }}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            generateLabel
          )}
        </button>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setLightboxIdx(null)}>
          <div className="relative bg-card rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm" style={{ fontWeight: 600 }}>
                  {String(lightboxIdx + 1).padStart(2, "0")}. {slotVariants[lightboxIdx]?.name}
                </p>
                <p className="text-muted-foreground text-xs">360 × 360px</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadImage(images[lightboxIdx] as string, lightboxIdx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs hover:brightness-105 transition-all"
                  style={{ fontWeight: 600 }}
                >
                  <Download size={12} />
                  다운로드
                </button>
                <button onClick={() => setLightboxIdx(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#f0f0f0]">
              <img src={images[lightboxIdx] as string} alt="" className="w-full rounded-xl" />
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setLightboxIdx(Math.max(0, (lightboxIdx as number) - 1))}
                disabled={lightboxIdx === 0}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                이전
              </button>
              <span className="text-muted-foreground text-xs">
                {(lightboxIdx as number) + 1} / 24
              </span>
              <button
                onClick={() => setLightboxIdx(Math.min(23, (lightboxIdx as number) + 1))}
                disabled={lightboxIdx >= 23}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}