import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_URL = process.env.SERVER_URL || "https://romeo-bannerless-calmingly.ngrok-free.dev";

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SERVER_URL) {
    res.status(500).json({
      error: 'SERVER_URL 변수가 설정되지 않았습니다.',
    });
    return;
  }

  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    res.status(400).json({ error: 'multipart/form-data 요청이 필요합니다.' });
    return;
  }

  const rawBody = await readRawBody(req);

  let gpuRes: Response;
  try {
    gpuRes = await fetch(`${SERVER_URL}/api/generate-set`, {
      method: 'POST',
      headers: { 
        'content-type': contentType,
        'ngrok-skip-browser-warning': '69420',  // ngrok 헤더
      },
      body: rawBody,
    });
  } catch (err) {
    res.status(502).json({
      error: `서버에 연결할 수 없습니다: ${(err as Error).message}`,
    });
    return;
  }

  const text = await gpuRes.text();
  res.status(gpuRes.status);
  res.setHeader('content-type', gpuRes.headers.get('content-type') ?? 'application/json');
  res.send(text);
}