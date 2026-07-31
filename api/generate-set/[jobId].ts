import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_URL = "https://romeo-bannerless-calmingly.ngrok-free.dev";

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

  const data = await gpuRes.json();
  res.status(gpuRes.status).json(data);
}