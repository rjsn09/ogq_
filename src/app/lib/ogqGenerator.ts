import { VARIANT_CATALOG, DEFAULT_VARIANTS } from '../utils/imageGenerator';

export const VARIANT_NAMES: string[] = DEFAULT_VARIANTS.map((v) => v.name);

interface JobStatus {
  status: 'running' | 'done' | 'error';
  completed: number;
  total: number;
  images: { index: number; name: string; image: string }[];
  error?: string;
}

const POLL_INTERVAL_MS = 2000;

/**
 * @param imageDataUrl
 * @param onProgress
 * @param characterBase
 * @param indices
 * @param variantAssignments
 *
 */
export async function generateOGQImages(
  imageDataUrl: string,
  onProgress?: (count: number, images: string[]) => void,
  characterBase?: string,
  indices?: number[],
  variantAssignments?: Record<number, string>
): Promise<string[]> {
  const refBlob = await (await fetch(imageDataUrl)).blob();

  const targetIndices = indices && indices.length > 0 ? indices : VARIANT_CATALOG.slice(0, 24).map((_, i) => i + 1);

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

  const startRes = await fetch('/api/generate-set', {
    method: 'POST',
    body: formData,
  });

  if (!startRes.ok) {
    const body = await startRes.json().catch(() => ({}));
    throw new Error(body.error ?? `작업 시작 실패 (${startRes.status})`);
  }

  const { job_id } = (await startRes.json()) as { job_id: string };

  const results: string[] = new Array(24).fill('');

  while (true) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(`/api/generate-set/${job_id}`, {
      cache: 'no-store',
    });

    if (!statusRes.ok) {
      const body = await statusRes.json().catch(() => ({}));
      throw new Error(body.error ?? `작업 상태 조회 실패 (${statusRes.status})`);
    }

    const job = (await statusRes.json()) as JobStatus;

    for (const item of job.images) {
      results[item.index - 1] = item.image;
    }
    onProgress?.(job.completed, [...results]);

    if (job.status === 'done') break;
    if (job.status === 'error') throw new Error(job.error ?? '생성 중 오류가 발생했습니다.');
  }

  return results;
}

export function regenerateOGQImages(
  imageDataUrl: string,
  slotIndices: number[],
  variantAssignments: Record<number, string>,
  onProgress?: (count: number, images: string[]) => void,
  characterBase?: string
): Promise<string[]> {
  return generateOGQImages(imageDataUrl, onProgress, characterBase, slotIndices, variantAssignments);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}