import { useState, useCallback } from "react";
import { Download, ZoomIn, X, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { VARIANTS } from "../utils/imageGenerator";

interface GeneratedGridProps {
  images: string[];
  isGenerating: boolean;
  progress: number;
  title: string;
  onGenerate?: () => void;
  isReady?: boolean;
}

export default function GeneratedGrid({ images, isGenerating, progress, title, onGenerate, isReady }: GeneratedGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const isAllSelected = selectedIds.size === images.length && images.length > 0;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(images.map((_, i) => i)));
  }, [images, isAllSelected]);

  const downloadImage = useCallback((dataUrl: string, idx: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title || 'ogq_sticker'}_${String(idx + 1).padStart(2, '0')}.png`;
    a.click();
  }, [title]);

  const downloadSelected = useCallback(() => {
    const targets = selectedIds.size > 0 ? [...selectedIds] : images.map((_, i) => i);
    targets.forEach((idx, i) => {
      setTimeout(() => downloadImage(images[idx], idx), i * 120);
    });
  }, [selectedIds, images, downloadImage]);

  const hasImages = images.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground" style={{fontWeight:600}}>미리보기</h2>
          {hasImages && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs" style={{fontWeight:700}}>
              {images.length}/24
            </span>
          )}
        </div>
        {hasImages && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs hover:bg-muted transition-colors"
              style={{fontWeight:500}}
            >
              {isAllSelected ? <CheckSquare size={13} className="text-primary" /> : <Square size={13} />}
              {isAllSelected ? '전체 해제' : '전체 선택'}
            </button>
            <button
              onClick={downloadSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs hover:brightness-105 transition-all shadow-sm shadow-primary/20"
              style={{fontWeight:600}}
            >
              <Download size={13} />
              {selectedIds.size > 0 ? `${selectedIds.size}장 다운로드` : '전체 다운로드'}
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-foreground text-sm" style={{fontWeight:500}}>
                이미지 생성 중...
              </p>
            </div>
            <span className="text-primary text-sm" style={{fontWeight:700}}>{progress}/24</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(progress / 24) * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {progress < 24 && VARIANTS[progress] ? `"${VARIANTS[progress].name}" 생성 중...` : '완료 중...'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {!hasImages && !isGenerating ? (
          <div className="p-6">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center"
                  style={{ aspectRatio: '1/1' }}
                >
                  <span className="text-muted-foreground text-xs opacity-60" style={{fontWeight:500}}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const img = images[i];
                const isSelected = selectedIds.has(i);
                const variant = VARIANTS[i];

                if (!img) {
                  return (
                    <div
                      key={i}
                      className="rounded-xl bg-muted flex items-center justify-center overflow-hidden relative"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {isGenerating && (
                        <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-150 ${
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-card'
                        : 'hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-card'
                    }`}
                    style={{ aspectRatio: '1/1' }}
                    onClick={() => toggleSelect(i)}
                  >
                    <img src={img} alt={variant?.name} className="w-full h-full object-cover" />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                        className="w-7 h-7 rounded-full bg-white/90 text-foreground flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadImage(img, i); }}
                        className="w-7 h-7 rounded-full bg-white/90 text-foreground flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      >
                        <Download size={13} />
                      </button>
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

            {hasImages && (
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  {selectedIds.size > 0
                    ? <><strong className="text-foreground">{selectedIds.size}장</strong> 선택됨</>
                    : '이미지를 클릭하여 선택하세요'
                  }
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">360 × 360px • PNG</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate button below grid */}
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled={!isReady || isGenerating}
          className={`w-full py-3.5 rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2.5 ${
            isReady && !isGenerating
              ? 'bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.99] shadow-md shadow-primary/25'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          style={{ fontWeight: 700, letterSpacing: '0.01em' }}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              24장 생성 중...
            </>
          ) : (
            <>
              <span className="text-base">✨</span>
              24장 이미지 생성하기
            </>
          )}
        </button>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="relative bg-card rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm" style={{fontWeight:600}}>
                  {String(lightboxIdx + 1).padStart(2, '0')}. {VARIANTS[lightboxIdx]?.name}
                </p>
                <p className="text-muted-foreground text-xs">360 × 360px</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadImage(images[lightboxIdx], lightboxIdx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs hover:brightness-105 transition-all"
                  style={{fontWeight:600}}
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
              <img src={images[lightboxIdx]} alt="" className="w-full rounded-xl" />
            </div>
            {/* Navigation */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setLightboxIdx(Math.max(0, lightboxIdx - 1))}
                disabled={lightboxIdx === 0}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />이전
              </button>
              <span className="text-muted-foreground text-xs">{lightboxIdx + 1} / {images.length}</span>
              <button
                onClick={() => setLightboxIdx(Math.min(images.length - 1, lightboxIdx + 1))}
                disabled={lightboxIdx >= images.length - 1}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음<ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
