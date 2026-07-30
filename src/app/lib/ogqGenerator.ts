
export const VARIANT_NAMES: string[] = [
  '기본', '활짝 웃음', '수줍음', '졸려요', '화났어요', '슬퍼요', '깜짝!', '사랑해요',
  '생각중', '굿!', 'OK!', '파이팅!', '하하하', '당황', '신남!', '힘들어요',
  '배고파', '냠냠', '잘게요', '안녕!', '감사해요', '미안해요', '응원해요', '최고야!',
];

interface JobStatus {
  status: 'running' | 'done' | 'error';
  completed: number;
  total: number;
  images: { index: number; name: string; image: string }[];
  error?: string;
}

const POLL_INTERVAL_MS = 2000;

/**
 *
 * @param imageDataUrl   참조 이미지
 * @param onProgress     완성된 개수(1~24)가 늘어날 때마다 호출
 * @param characterBase  캐릭터 특징 프롬프트
 */
export async function generateOGQImages(
  imageDataUrl: string,
  onProgress?: (count: number, images: string[]) => void,
  characterBase?: string
): Promise<string[]> {
  const refBlob = await (await fetch(imageDataUrl)).blob();

  const formData = new FormData();
  formData.append('image', refBlob, 'ref.png');
  if (characterBase) {
    formData.append('character_base', characterBase);
  }

  const startRes = await fetch('/api/generate-set', {
    method: 'POST',
    body: formData,
  });

  if (!startRes.ok) {
    const body = await startRes.json().catch(() => ({}));
    throw new Error(body.error ?? `작업 시작 실패 (${startRes.status})`);
  }

  const { job_id } = (await startRes.json()) as { job_id: string };

  const results: string[] = new Array(VARIANT_NAMES.length).fill('');

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}