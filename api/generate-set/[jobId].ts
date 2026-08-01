import type { VercelRequest, VercelResponse } from '@vercel/node';

// const SERVER_URL = "https://romeo-bannerless-calmingly.ngrok-free.dev";  // 무료 끝남
const SERVER_URL = "boney-unvented-awry.ngrok-free.dev";
// const SERVER_URL = "http://localhost:8000"; // 로컬

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SERVER_URL) {
    res.status(500).json({
      error: 'SERVER_URL 변수가 설정되지 않았습니다.',
    });
    return;
  }

  const { jobId, since } = req.query;
  const sinceParam = typeof since === 'string' ? since : '0';

  let gpuRes: Response;
  try {
    gpuRes = await fetch(`${SERVER_URL}/api/generate-set/${jobId}?since=${encodeURIComponent(sinceParam)}`, {
      cache: 'no-store',
      headers: {
        'ngrok-skip-browser-warning': '69420',
      },
    });
  } catch (err: any) {
    console.error("Fetch Detail Error:", err?.cause || err);

    res.status(502).json({
      error: `서버에 연결할 수 없습니다: ${err.message} (원인: ${err?.cause?.code || '알 수 없음'})`,
    });
    return;
  }

  const text = await gpuRes.text();

  let contentType = gpuRes.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    console.error('Non-JSON response from backend:', gpuRes.status, text.slice(0, 500));
    res.status(gpuRes.status >= 400 ? gpuRes.status : 502).json({
      error: `백엔드 서버가 예상치 못한 응답을 반환했습니다 (status ${gpuRes.status}).`,
    });
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error('JSON parse failed:', text.slice(0, 500));
    res.status(502).json({ error: '백엔드 응답을 파싱하지 못했습니다.' });
    return;
  }

  res.status(gpuRes.status).json(data);
}