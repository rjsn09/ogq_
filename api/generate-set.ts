import { VARIANT_CATALOG, DEFAULT_VARIANTS } from '../utils/imageGenerator';

export const VARIANT_NAMES: string[] = DEFAULT_VARIANTS.map((v: (typeof DEFAULT_VARIANTS)[number]) => v.name);

interface GeneratedImage {
  index: number;
  name: string;
  image: string;
}

interface JobStatus {
  status: 'running' | 'done' | 'error';
  completed: number;
  total: number;
  images: GeneratedImage[];
  error?: string;
}

const POLL_INTERVAL_MS = 2000;

// const SERVER_URL = "https://romeo-bannerless-calmingly.ngrok-free.dev";  // 무료 끝남
const SERVER_URL = "boney-unvented-awry.ngrok-free.dev";
// const SERVER_URL = "http://localhost:8000";  // 로컬

function apiUrl(path: string): string {
  return `${SERVER_URL}${path}`;
}

/**
 * @param imageDataUrl
 * @param onProgress
 * @param characterBase
 * @param indices
 * @param variantAssignments
 * @param previousImages
 */
export async function generateOGQImages(
  imageDataUrl: string,
  onProgress?: (count: number, images: string[]) => void,
  characterBase?: string,
  indices?: number[],
  variantAssignments?: Record<number, string>,
  previousImages?: (string | null | undefined)[]
): Promise<string[]> {
  const refBlob = await (await fetch(imageDataUrl)).blob();

  const targetIndices = indices && indices.length > 0 ? indices : VARIANT_CATALOG.slice(0, 24).map((_, i) => i + 1);
  const targetSet = new Set(targetIndices);

  const names: Record<number, string> = {};
  for (const idx of targetIndices) {
    names[idx] = variantAssignments?.[idx] ?? DEFAULT_VARIANTS[idx - 1]?.name ?? `이모티콘 ${idx}`;
  }

  const formData = new FormData();
  formData.append('image', refBlob, 'ref.png');
  if (characterBase) {
    formData.append('character_base', characterBase);
  }
  formData.append('indices', JSON.stringify(targetIndices));
  formData.append('variant_names', JSON.stringify(names));

  const startRes = await fetch(apiUrl('/api/generate-set'), {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!startRes.ok) {
    const body = await startRes.json().catch(() => ({}));
    throw new Error(body.error ?? `작업 시작 실패 (${startRes.status})`);
  }

  const { job_id } = (await startRes.json()) as { job_id: string };

  const results: string[] = Array.from({ length: 24 }, (_, i) => previousImages?.[i] ?? '');

  let receivedCount = 0;

  while (true) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(apiUrl(`/api/generate-set/${job_id}?since=${receivedCount}`), {
      cache: 'no-store',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!statusRes.ok) {
      const body = await statusRes.json().catch(() => ({}));
      throw new Error(body.error ?? `작업 상태 조회 실패 (${statusRes.status})`);
    }

    const job = (await statusRes.json()) as JobStatus;

    for (const item of job.images) {
      if (targetSet.has(item.index)) {
        results[item.index - 1] = item.image;
      }
    }
    receivedCount += job.images.length;

    onProgress?.(job.completed, [...results]);

    if (job.status === 'done') break;
    if (job.status === 'error') throw new Error(job.error ?? '생성 중 오류가 발생했습니다.');
  }

  return results;
}

/**
 * 선택한 슬롯만 생성하는 함수.
 */
export function regenerateOGQImages(
  imageDataUrl: string,
  slotIndices: number[],
  variantAssignments: Record<number, string>,
  previousImages: (string | null | undefined)[],
  onProgress?: (count: number, images: string[]) => void,
  characterBase?: string
): Promise<string[]> {
  return generateOGQImages(imageDataUrl, onProgress, characterBase, slotIndices, variantAssignments, previousImages);
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve: () => void) => setTimeout(resolve, ms));
}