// app/api/generate-set/[jobId]/route.ts
//
// 프론트가 이 라우트를 2초 간격 정도로 폴링해서 진행 상황과 완성된 이미지를 받아간다.
// 마찬가지로 실제 계산은 안 하고 GPU 서버 상태를 그대로 중계만 한다.

export const maxDuration = 15;

// const GPU_SERVER_URL = process.env.EMOJI_GPU_SERVER_URL;
const GPU_SERVER_URL = "http://0.0.0.0:8000";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  if (!GPU_SERVER_URL) {
    return Response.json(
      { error: 'EMOJI_GPU_SERVER_URL 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  let gpuRes: Response;
  try {
    gpuRes = await fetch(`${GPU_SERVER_URL}/api/jobs/${params.jobId}`, {
      cache: 'no-store',
    });
  } catch (err) {
    return Response.json(
      { error: `GPU 서버에 연결할 수 없습니다: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (gpuRes.status === 404) {
    return Response.json({ error: 'job을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!gpuRes.ok) {
    const text = await gpuRes.text();
    return Response.json({ error: `GPU 서버 오류: ${text}` }, { status: 502 });
  }

  const data = await gpuRes.json();
  return Response.json(data);
}