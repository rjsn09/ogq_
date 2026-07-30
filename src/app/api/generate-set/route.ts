// app/api/generate-set/route.ts
//
// Vercel 서버리스 함수는 GPU도 없고 실행시간도 짧게 제한돼 있어서(Hobby 기본 10~60초),
// SDXL 24장 생성(수 분 소요)을 이 함수 안에서 직접 돌릴 수 없다.
//
// 그래서 이 라우트는 "실제 생성"은 하지 않고, 계속 켜져 있는 GPU 서버(emoji_server.py)에
// 업로드된 이미지를 그대로 전달해서 작업만 등록시키고, job_id를 즉시 응답한다.
//
// 환경변수 설정 (Vercel 프로젝트 Settings -> Environment Variables):
//   EMOJI_GPU_SERVER_URL = https://<GPU 서버 주소>:8000
//   (RunPod / Lambda Labs / 자체 GPU 서버 등, emoji_server.py가 uvicorn으로 떠 있는 주소)

export const maxDuration = 30; // 여기서는 job 등록만 하므로 짧아도 충분

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