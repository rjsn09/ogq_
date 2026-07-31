import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_URL = process.env.SERVER_URL || "https://romeo-bannerless-calmingly.ngrok-free.dev";

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

  let Res: Response;
  try {
    Res = await fetch(`${SERVER_URL}/api/generate-set/${jobId}`, {
      cache: 'no-store',
      headers: {
        'ngrok-skip-browser-warning': '69420',
      },
    });
  } catch (err) {
    res.status(502).json({
      error: `서버에 연결할 수 없습니다: ${(err as Error).message}`,
    });
    return;
  }

  const data = await Res.json();
  res.status(Res.status).json(data);
}