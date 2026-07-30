export interface ImageVariant {
  id: number;
  name: string;
  bgColor: string;
  filter: string;
  overlayColor: string;
  overlayAlpha: number;
  rotate: number;
  flipH: boolean;
  emoji: string;
}

export const VARIANTS: ImageVariant[] = [
  { id: 1,  name: '기본',      bgColor: '#FFFFFF', filter: '',                                      overlayColor: '',        overlayAlpha: 0,    rotate: 0,  flipH: false, emoji: '😊' },
  { id: 2,  name: '활짝 웃음', bgColor: '#FFFDE7', filter: 'brightness(1.1) saturate(1.3)',          overlayColor: '#FFD54F', overlayAlpha: 0.10, rotate: 0,  flipH: false, emoji: '😄' },
  { id: 3,  name: '수줍음',    bgColor: '#FCE4EC', filter: 'brightness(1.05) saturate(0.9)',         overlayColor: '#F48FB1', overlayAlpha: 0.12, rotate: -3, flipH: false, emoji: '🥺' },
  { id: 4,  name: '졸려요',    bgColor: '#EDE7F6', filter: 'brightness(0.88) saturate(0.65)',        overlayColor: '#9575CD', overlayAlpha: 0.10, rotate: 3,  flipH: false, emoji: '😴' },
  { id: 5,  name: '화났어요',  bgColor: '#FFEBEE', filter: 'saturate(1.7) brightness(1.05)',         overlayColor: '#E53935', overlayAlpha: 0.12, rotate: -2, flipH: false, emoji: '😤' },
  { id: 6,  name: '슬퍼요',    bgColor: '#E3F2FD', filter: 'saturate(0.55) brightness(0.88)',        overlayColor: '#1E88E5', overlayAlpha: 0.10, rotate: -2, flipH: false, emoji: '😢' },
  { id: 7,  name: '깜짝!',     bgColor: '#FFF8E1', filter: 'contrast(1.25) brightness(1.1)',         overlayColor: '#FFC107', overlayAlpha: 0.10, rotate: 6,  flipH: false, emoji: '😱' },
  { id: 8,  name: '사랑해요',  bgColor: '#FCE4EC', filter: 'brightness(1.1) saturate(1.2)',          overlayColor: '#E91E63', overlayAlpha: 0.12, rotate: 0,  flipH: false, emoji: '🥰' },
  { id: 9,  name: '생각중',    bgColor: '#F3E5F5', filter: 'brightness(0.93) saturate(0.75)',        overlayColor: '#9C27B0', overlayAlpha: 0.08, rotate: -4, flipH: false, emoji: '🤔' },
  { id: 10, name: '굿!',       bgColor: '#E8F5E9', filter: 'brightness(1.08) saturate(1.25)',        overlayColor: '#43A047', overlayAlpha: 0.10, rotate: 0,  flipH: false, emoji: '👍' },
  { id: 11, name: 'OK!',       bgColor: '#E0F7FA', filter: 'brightness(1.06) saturate(1.15)',        overlayColor: '#00ACC1', overlayAlpha: 0.10, rotate: 3,  flipH: false, emoji: '👌' },
  { id: 12, name: '파이팅!',   bgColor: '#FBE9E7', filter: 'saturate(1.45) brightness(1.1)',         overlayColor: '#FF7043', overlayAlpha: 0.12, rotate: -3, flipH: false, emoji: '✊' },
  { id: 13, name: '하하하',    bgColor: '#FFFDE7', filter: 'brightness(1.18) saturate(1.4)',         overlayColor: '#FFCA28', overlayAlpha: 0.12, rotate: 2,  flipH: false, emoji: '😂' },
  { id: 14, name: '당황',      bgColor: '#FCE4EC', filter: 'brightness(1.0) saturate(0.85)',         overlayColor: '#FF80AB', overlayAlpha: 0.10, rotate: 7,  flipH: false, emoji: '😳' },
  { id: 15, name: '신남!',     bgColor: '#FFF9C4', filter: 'brightness(1.22) saturate(1.9)',         overlayColor: '#FF9800', overlayAlpha: 0.10, rotate: -5, flipH: false, emoji: '🎉' },
  { id: 16, name: '힘들어요',  bgColor: '#EFEBE9', filter: 'brightness(0.83) saturate(0.45)',        overlayColor: '#795548', overlayAlpha: 0.10, rotate: 0,  flipH: false, emoji: '😩' },
  { id: 17, name: '배고파',    bgColor: '#FFF3E0', filter: 'brightness(1.05) saturate(1.1)',         overlayColor: '#FFA726', overlayAlpha: 0.10, rotate: 0,  flipH: false, emoji: '🍔' },
  { id: 18, name: '냠냠',      bgColor: '#FBE9E7', filter: 'brightness(1.08) saturate(1.2)',         overlayColor: '#FF7043', overlayAlpha: 0.10, rotate: -2, flipH: false, emoji: '😋' },
  { id: 19, name: '잘게요',    bgColor: '#E8EAF6', filter: 'brightness(0.78) saturate(0.45)',        overlayColor: '#3F51B5', overlayAlpha: 0.12, rotate: 0,  flipH: false, emoji: '😪' },
  { id: 20, name: '안녕!',     bgColor: '#E8F5E9', filter: 'brightness(1.1) saturate(1.12)',         overlayColor: '#66BB6A', overlayAlpha: 0.10, rotate: 5,  flipH: false, emoji: '👋' },
  { id: 21, name: '감사해요',  bgColor: '#FFFDE7', filter: 'brightness(1.08) sepia(0.18)',           overlayColor: '#F9A825', overlayAlpha: 0.10, rotate: 0,  flipH: false, emoji: '🙏' },
  { id: 22, name: '미안해요',  bgColor: '#F3E5F5', filter: 'brightness(0.9) saturate(0.65)',         overlayColor: '#7B1FA2', overlayAlpha: 0.10, rotate: -3, flipH: false, emoji: '😔' },
  { id: 23, name: '응원해요',  bgColor: '#E3F2FD', filter: 'brightness(1.1) saturate(1.25)',         overlayColor: '#1976D2', overlayAlpha: 0.10, rotate: 3,  flipH: false, emoji: '📣' },
  { id: 24, name: '최고야!',   bgColor: '#FFF8E1', filter: 'brightness(1.18) saturate(1.45)',        overlayColor: '#FFC107', overlayAlpha: 0.14, rotate: -2, flipH: false, emoji: '⭐' },
];

export async function generateOGQImages(
  imageDataUrl: string,
  onProgress?: (count: number) => void
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    const dataUrl = await generateVariant(imageDataUrl, VARIANTS[i]);
    results.push(dataUrl);
    onProgress?.(i + 1);
    await new Promise(r => setTimeout(r, 60));
  }
  return results;
}

async function generateVariant(imageDataUrl: string, variant: ImageVariant): Promise<string> {
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

      // Compute image size with padding
      const padding = 52;
      const labelH = 36;
      const maxW = 360 - padding * 2;
      const maxH = 360 - padding * 2 - labelH;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const cx = 180;
      const cy = (360 - labelH) / 2;

      ctx.save();
      ctx.translate(cx, cy);
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

      // Bottom label pill
      const labelText = `${variant.name}`;
      ctx.font = '600 13px "Noto Sans KR", sans-serif';
      const emojiX = 180 - ctx.measureText(labelText).width / 2 - 14;
      const pillW = ctx.measureText(labelText).width + 44;
      const pillH = 26;
      const pillX = (360 - pillW) / 2;
      const pillY = 360 - pillH - 10;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      const r = pillH / 2;
      ctx.moveTo(pillX + r, pillY);
      ctx.lineTo(pillX + pillW - r, pillY);
      ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r);
      ctx.lineTo(pillX + pillW, pillY + r);
      ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);
      ctx.lineTo(pillX + r, pillY + pillH);
      ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r);
      ctx.lineTo(pillX, pillY + r);
      ctx.arcTo(pillX, pillY, pillX + r, pillY, r);
      ctx.closePath();
      ctx.fill();

      // Emoji
      ctx.font = '14px sans-serif';
      ctx.fillText(variant.emoji, emojiX - 2, pillY + pillH / 2 + 5);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 180 + 10, pillY + pillH / 2);
      ctx.restore();

      // Number badge top-left
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 28, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(variant.id.toString().padStart(2, '0'), 24, 20);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
}
