import React from "react";
import { useState, useCallback } from "react";
import InputPanel from "./components/InputPanel";
import GeneratedGrid from "./components/GeneratedGrid";
import { generateOGQImages } from "./lib/ogqGenerator";

function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm shadow-primary/30">
            <img 
              src="ogqIcon.png" 
              alt="아이콘" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-foreground" style={{ fontWeight: 700, fontSize: '1rem' }}>
              이모티콘 생성기
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

    try {
      await generateOGQImages(
        uploadedImage,
        (count, images) => {
          setProgress(count);
          setGeneratedImages(images);
        },
        description || undefined
      );
    } catch (err) {
      console.error("이모티콘 생성 실패:", err);
      alert(`생성 중 오류가 발생했습니다: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, title, description]);

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