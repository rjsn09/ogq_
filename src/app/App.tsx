import { useState, useCallback } from "react";
import InputPanel from "./components/InputPanel";
import GeneratedGrid from "./components/GeneratedGrid";
import { VARIANTS } from "./utils/imageGenerator";

function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <span className="text-primary-foreground text-sm">✨</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-foreground" style={{ fontWeight: 700, fontSize: '1rem' }}>
              OGQ 이미지 생성기
            </span>
            <span className="text-muted-foreground text-xs hidden sm:inline">
              네이버 OGQ 마켓 · 24장 자동 생성
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs" style={{ fontWeight: 600 }}>
            Beta
          </span>
          <a
            href="https://ogqmarket.naver.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
            style={{ fontWeight: 500 }}
          >
            OGQ 마켓 바로가기 →
          </a>
        </div>
      </div>
    </header>
  );
}

function StepBadge({ step, label, done }: { step: number; label: string; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${
        done
          ? 'bg-secondary border-primary/30 text-secondary-foreground'
          : 'bg-card border-border text-muted-foreground'
      }`}
      style={{ fontWeight: 500 }}
    >
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
        style={{ fontWeight: 700, fontSize: '10px' }}
      >
        {done ? '✓' : step}
      </span>
      {label}
    </div>
  );
}

async function generateVariantCanvas(
  imageDataUrl: string,
  variant: typeof VARIANTS[0]
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      // Background
      ctx.fillStyle = variant.bgColor;
      ctx.fillRect(0, 0, 360, 360);

      // Image sizing
      const padding = 52;
      const labelH = 36;
      const maxW = 360 - padding * 2;
      const maxH = 360 - padding * 2 - labelH;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;

      // Draw image with transform
      ctx.save();
      ctx.translate(180, (360 - labelH) / 2);
      ctx.rotate((variant.rotate * Math.PI) / 180);
      if (variant.flipH) ctx.scale(-1, 1);
      if (variant.filter) ctx.filter = variant.filter;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.filter = 'none';
      ctx.restore();

      // Color overlay
      if (variant.overlayAlpha > 0 && variant.overlayColor) {
        ctx.save();
        ctx.globalAlpha = variant.overlayAlpha;
        ctx.fillStyle = variant.overlayColor;
        ctx.fillRect(0, 0, 360, 360);
        ctx.restore();
      }

      // Label pill
      ctx.font = '600 13px "Noto Sans KR", sans-serif';
      const textW = ctx.measureText(variant.name).width;
      const pillW = textW + 44;
      const pillH = 26;
      const pillX = (360 - pillW) / 2;
      const pillY = 360 - pillH - 10;
      const pr = pillH / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(pillX + pr, pillY);
      ctx.lineTo(pillX + pillW - pr, pillY);
      ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, pr);
      ctx.lineTo(pillX + pillW, pillY + pr);
      ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - pr, pillY + pillH, pr);
      ctx.lineTo(pillX + pr, pillY + pillH);
      ctx.arcTo(pillX, pillY + pillH, pillX, pillY, pr);
      ctx.lineTo(pillX, pillY + pr);
      ctx.arcTo(pillX, pillY, pillX + pr, pillY, pr);
      ctx.closePath();
      ctx.fill();

      // Emoji
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(variant.emoji, pillX + 10, pillY + pillH / 2);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(variant.name, pillX + 22 + textW / 2 + 6, pillY + pillH / 2);
      ctx.restore();

      // Number badge
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 28, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(variant.id.toString().padStart(2, '0'), 24, 20);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
}

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("캐릭터");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !title.trim()) return;
    setIsGenerating(true);
    setGeneratedImages([]);
    setProgress(0);

    const results: string[] = [];
    try {
      for (let i = 0; i < VARIANTS.length; i++) {
        const dataUrl = await generateVariantCanvas(uploadedImage, VARIANTS[i]);
        results.push(dataUrl);
        setGeneratedImages([...results]);
        setProgress(i + 1);
        await new Promise(r => setTimeout(r, 50));
      }
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, title]);

  const isReady = !!uploadedImage && !!title.trim();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Step indicators */}
      <div className="max-w-[1400px] mx-auto px-6 pt-5">
        <div className="flex items-center gap-2 flex-wrap">
          <StepBadge step={1} label="이미지 업로드" done={!!uploadedImage} />
          <span className="text-border text-sm mx-0.5">→</span>
          <StepBadge step={2} label="정보 입력" done={!!title.trim()} />
          <span className="text-border text-sm mx-0.5">→</span>
          <StepBadge step={3} label="24장 생성" done={generatedImages.length === 24} />
          <span className="text-border text-sm mx-0.5">→</span>
          <StepBadge step={4} label="다운로드" done={false} />
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-5">
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: '420px 1fr' }}
        >
          <InputPanel
            uploadedImage={uploadedImage}
            setUploadedImage={(v) => {
              setUploadedImage(v);
              if (!v) { setGeneratedImages([]); setProgress(0); }
            }}
            title={title}
            setTitle={setTitle}
            tags={tags}
            setTags={setTags}
            description={description}
            setDescription={setDescription}
            category={category}
            setCategory={setCategory}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            isReady={isReady}
          />

          <GeneratedGrid
            images={generatedImages}
            isGenerating={isGenerating}
            progress={progress}
            title={title}
            onGenerate={handleGenerate}
            isReady={isReady}
          />
        </div>
      </main>
    </div>
  );
}
