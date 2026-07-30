import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_URL = "http://0.0.0.0:8000";

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

  const { jobId } = req.query;

  let gpuRes: Response;
  try {
    gpuRes = await fetch(`${SERVER_URL}/api/generate-set/${jobId}`, {
      cache: 'no-store',
    });
  } catch (err) {
    res.status(502).json({
      error: `서버에 연결할 수 없습니다: ${(err as Error).message}`,
    });
    return;
  }

  const data = await gpuRes.json();
  res.status(gpuRes.status).json(data);
}