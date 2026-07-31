import { useRef, useState, useCallback, DragEvent, KeyboardEvent } from "react";
import { Upload, X, Tag, Info, ChevronDown } from "lucide-react";
import { VARIANTS } from "../utils/imageGenerator";

interface InputPanelProps {
  uploadedImage: string | null;
  setUploadedImage: (v: string | null) => void;
  title: string;
  setTitle: (v: string) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isReady: boolean;
}

const CATEGORIES = ['캐릭터', '동물', '음식', '일상', '감정', '사랑', '여행', '스포츠', '직장', '기타'];

export default function InputPanel({
  uploadedImage,
  setUploadedImage,
  title,
  setTitle,
  tags,
  setTags,
  description,
  setDescription,
  category,
  setCategory,
  onGenerate,
  isGenerating,
  isReady,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const resizeImage = useCallback((file: File, maxDimension = 1024, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        URL.revokeObjectURL(objectUrl);

        if (!ctx) {
          reject(new Error("캔버스를 생성할 수 없습니다."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지를 불러올 수 없습니다."));
      };

      img.src = objectUrl;
    });
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("파일 용량은 최대 10MB까지 업로드할 수 있습니다.");
      return;
    }

    setImageError(null);
    setIsProcessingImage(true);
    try {
      const resizedDataUrl = await resizeImage(file);
      setUploadedImage(resizedDataUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingImage(false);
    }
  }, [resizeImage, setUploadedImage]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim().replace(/,/g, "");
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }, [tags, setTags]);

  const removeTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags, setTags]);

  const handleTagKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }, [tagInput, tags, addTag, setTags]);

  return (
    <div className="flex flex-col gap-5">
      {/* Upload Zone */}
      <section className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0" style={{fontWeight:700}}>1</span>
            기준 이미지 업로드
          </h2>
          {uploadedImage && (
            <button
              onClick={() => { setUploadedImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-muted"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-4">
          {isProcessingImage ? (
            <div
              className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3"
              style={{ aspectRatio: '16/9', minHeight: 160 }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground animate-pulse">
                <Upload size={22} />
              </div>
              <p className="text-muted-foreground text-sm">이미지 최적화 중...</p>
            </div>
          ) : uploadedImage ? (
            <div className="relative rounded-xl overflow-hidden bg-muted" style={{aspectRatio:'1/1'}}>
              <img src={uploadedImage} alt="업로드된 이미지" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
              style={{ aspectRatio: '16/9', minHeight: 160 }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Upload size={22} />
              </div>
              <div className="text-center">
                <p className="text-foreground" style={{fontWeight:500}}>이미지를 드래그하거나 클릭하여 업로드</p>
                <p className="text-muted-foreground text-sm mt-0.5">PNG, JPG, WebP • 최대 10MB</p>
              </div>
            </div>
          )}
          {imageError && (
            <p className="text-destructive text-xs mt-2">{imageError}</p>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0" style={{fontWeight:700}}>2</span>
            기본 정보 입력
          </h2>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm flex items-center gap-1" style={{fontWeight:500}}>
              상품명
              <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="예) 귀여운 토끼 이모티콘"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
            <p className="text-muted-foreground text-xs text-right">{title.length}/40</p>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm" style={{fontWeight:500}}>카테고리</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 pr-9 rounded-xl border border-border bg-input-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm flex items-center gap-1.5" style={{fontWeight:500}}>
              <Tag size={13} />
              태그 <span className="text-muted-foreground" style={{fontWeight:400}}>({tags.length}/10)</span>
            </label>
            <div
              className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-border bg-input-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all flex flex-wrap gap-1.5 cursor-text"
              onClick={() => document.getElementById('tag-input')?.focus()}
            >
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full text-xs" style={{fontWeight:500}}>
                  #{tag}
                  <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-destructive transition-colors ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {tags.length < 10 && (
                <input
                  id="tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length === 0 ? "태그 입력 후 Enter (예: 귀여운, 토끼)" : ""}
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
                />
              )}
            </div>
            <p className="text-muted-foreground text-xs">Enter 또는 쉼표(,)로 태그 추가</p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm" style={{fontWeight:500}}>상품 설명</label>
            <textarea
              placeholder="이모티콘 컨셉, 캐릭터 특징, 사용 상황 등을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
            />
            <p className="text-muted-foreground text-xs text-right">{description.length}/500</p>
          </div>
        </div>
      </section>

      {/* OGQ Format Info */}
      <section className="bg-accent rounded-2xl border border-primary/20 p-4">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm" style={{fontWeight:600}}>OGQ 마켓 이모티콘 규격</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                ['이미지 수', '24장'],
                ['크기', '360 × 360px'],
                ['파일 형식', 'PNG (투명 배경)'],
                ['최대 용량', '1MB / 장'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{k}</span>
                  <span className="text-foreground text-xs" style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 pt-2 border-t border-primary/15">
              <p className="text-muted-foreground text-xs">총 <strong className="text-foreground">{VARIANTS.length}가지</strong> 표정/감정으로 자동 생성됩니다</p>
            </div>
          </div>
        </div>
      </section>
      
      {!isReady && !isGenerating && (
        <p className="text-muted-foreground text-xs text-center -mt-3">
          이미지와 상품명을 입력하면 생성 버튼이 활성화됩니다
        </p>
      )}
    </div>
  );
}