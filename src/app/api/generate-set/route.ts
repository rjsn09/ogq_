
export const maxDuration = 30;

// const GPU_SERVER_URL = process.env.EMOJI_GPU_SERVER_URL;
const GPU_SERVER_URL = "http://0.0.0.0:8000";

export async function POST(req: Request) {
  if (!GPU_SERVER_URL) {
    return Response.json(
      { error: 'EMOJI_GPU_SERVER_URL 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 GPU 서버 주소를 등록하세요.' },
      { status: 500 }
    );
  }

  let incomingForm: FormData;
  try {
    incomingForm = await req.formData();
  } catch {
    return Response.json({ error: '이미지 폼데이터를 읽을 수 없습니다.' }, { status: 400 });
  }

  if (!incomingForm.get('image')) {
    return Response.json({ error: 'image 파일이 필요합니다.' }, { status: 400 });
  }

  let gpuRes: Response;
  try {
    gpuRes = await fetch(`${GPU_SERVER_URL}/api/jobs`, {
      method: 'POST',
      body: incomingForm,
    });
  } catch (err) {
    return Response.json(
      { error: `GPU 서버에 연결할 수 없습니다: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (!gpuRes.ok) {
    const text = await gpuRes.text();
    return Response.json({ error: `GPU 서버 오류: ${text}` }, { status: 502 });
  }

  const data = await gpuRes.json(); // { job_id: string }
  return Response.json(data);
}