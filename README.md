# 이모티콘 생성기 (OGQ Emoticon Generator)

이미지/태그/설명을 선택적으로 입력하면 네이버 OGQ마켓 규격에 맞는 24종 스티커 세트를 자동으로 생성해주는 웹입니다.
product URL: https://ogq.vercel.app/

---

## 주요 기능

- 캐릭터 참조 이미지 업로드·태그·설명 입력만으로 이모티콘 세트 생성
- 감정/인사/리액션 등 24종 기본 템플릿 및 12종의 추가 템플릿 기반 자동 생성, 슬롯별로 원하는 종류로 변경 가능
- 전체 재생성뿐 아니라 마음에 들지 않는 슬롯만 선택해서 부분 재생성 가능
- IP-Adapter 기반 캐릭터 일관성 유지 (참조 이미지의 디자인/외형 정체성 유지)
- 생성 결과를 네이버 OGQ마켓 규격에 맞도록 제공
- 개별 PNG 다운로드 및 24종 전체 ZIP 일괄 다운로드 지원
- 생성 진행 상황 실시간 표시 (작업 큐 폴링 방식)

---

## 기술 스택

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui, Radix UI
- JSZip

**Backend**
- FastAPI + uvicorn
- Stable Diffusion XL 기반 이미지 생성 파이프라인 (diffusers, transformers, compel)
- rembg(isnet-anime) 기반 배경 제거
- pyngrok을 통한 로컬 서버 개발/공유

---

## 로컬에서 실행 방법

```bash
# 프론트엔드
npm install
npm run dev      # 개발 서버 실행
```

백엔드는 별도 서버로 구동되며, 프론트엔드는 `/api/generate-set` 엔드포인트를 통해 생성 작업을 요청하고 결과를 폴링합니다.

---

## 사용된 오픈소스 모델

본 프로젝트에는 아래의 오픈소스 모델을 활용하였습니다.

- **stabilityai/stable-diffusion-xl-base-1.0**: Text-to-Image 이모티콘 형식의 이미지 생성 (https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- **madebyollin/sdxl-vae-fp16-fix**: fp16 연산 시 NaN 오류 방지 및 Latent-to-Image 복원 (https://huggingface.co/madebyollin/sdxl-vae-fp16-fix)
- **h94/IP-Adapter**: 참조 이미지의 캐릭터 디자인 및 외형 정체성 유지 (https://huggingface.co/h94/IP-Adapter)
- **LoRA**: 이모티콘 및 2D 캐릭터 화풍 적용
  - 현재 사용한 LoRA 모델:
    - cutedoodle_XL-000012 (https://civitai.com/models/132578/lah-cute-social-or-sdxl-and-sd15?modelVersionId=190859)
    - Zzul02 (https://civitai.com/models/134160/xl-zzul)
- **Salesforce/blip-image-captioning-base**: 입력된 참조 이미지의 설명 생성 (https://huggingface.co/Salesforce/blip-image-captioning-base)
- **isnet-anime**: 배경 제거(누끼) (https://huggingface.co/jellybox/isnet-anime)

---

## 오픈소스 패키지 (Open Source Packages)

### 외부 라이브러리

- `torch` (BSD):  PyTorch 딥러닝 연산 및 GPU 가속
- `diffusers` (Apache 2.0):  SDXL 및 IP-Adapter 파이프라인 제어, DPMSolver 스케줄링
- `transformers` (Apache 2.0):  BLIP 캡셔닝 모델 및 SDXL 텍스트 인코더 실행
- `compel` (MIT):  SDXL 듀얼 텍스트 인코더 프롬프트 가중치/임베딩 정밀 제어
- `rembg` (MIT):  ISNet 기반 캐릭터 배경 제거
- `FastAPI` (MIT):  비동기 이모티콘 생성 API 백엔드 서버 구축
- `uvicorn` (BSD):  ASGI 웹 서버 실행
- `pyngrok` (MIT):  로컬 서버 개발용 ngrok 연동
- `Pillow` (HPND):  이미지 처리 및 전/후처리
- `python-dotenv` (BSD):  환경 변수 관리

### 파이썬 표준 라이브러리

파이썬 버전: python 3.13.12

`os`, `gc`, `io`, `json`, `time`, `uuid`, `base64`, `logging`, `traceback`, `threading`, `contextlib`
