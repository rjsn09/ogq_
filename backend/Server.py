import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

import gc
import io
import json
import time
import uuid
import csv
import base64
import logging
import traceback
import threading
import torch
import uvicorn
import numpy as np
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ogq")

torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.backends.cudnn.benchmark = True

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pyngrok import ngrok
from contextlib import asynccontextmanager
from PIL import Image

from diffusers import AutoPipelineForText2Image, DPMSolverMultistepScheduler, AutoencoderKL
from huggingface_hub import hf_hub_download
import onnxruntime as rt
from compel import Compel, ReturnedEmbeddingsType
from rembg import remove, new_session


class EmojiGenerator:
    def __init__(self, model_id="stabilityai/stable-diffusion-xl-base-1.0", lora_model="Zzul02.safetensors"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16

        print(f"{self.device.upper()} 사용")

        fixed_vae = AutoencoderKL.from_pretrained(
            "madebyollin/sdxl-vae-fp16-fix",
            torch_dtype=self.torch_dtype
        )

        self.pipe = AutoPipelineForText2Image.from_pretrained(
            model_id,
            vae=fixed_vae,
            torch_dtype=self.torch_dtype,
            variant="fp16",
            use_safetensors=True
        )

        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.pipe.scheduler.config,
            algorithm_type="sde-dpmsolver++",
            use_karras_sigmas=True
        )

        self.pipe.load_ip_adapter(
            "h94/IP-Adapter",
            subfolder="sdxl_models",
            weight_name="ip-adapter_sdxl.bin",
            torch_dtype=self.torch_dtype
        )

        self._base_ip_scale = {
            "up": {"block_0": [0.0, 1.0, 0.0]},  # up_blocks.0 (스타일 추출)
        }
        self.pipe.set_ip_adapter_scale(self._base_ip_scale)

        self.pipe.load_lora_weights(
            "lora_models",
            weight_name=lora_model,
            adapter_name="emoji_style"
        )

        self.pipe.set_adapters(["emoji_style"], adapter_weights=[0.75])

        self.pipe.enable_model_cpu_offload()
        self.pipe.vae.enable_slicing()
        self.pipe.vae.enable_tiling()

        trigger = ""
        match (lora_model):
            case "ZZul02.safetensors":
                trigger = "chibi"
            case "cutedoodle_XL-000012.safetensors":
                trigger = "cute doodle"

        self.base_positive = (
            trigger + ", "
            "(masterpiece, best quality, highly expressive emoji style, vector art, die-cut sticker, "
            "chibi, 2-head proportion, exaggerated facial expressions, "
            "thick black outlines, simple flat colors, cel shading:1.3), "
            "clean pure white background, clear silhouette, perfect composition"
        )

        self.base_negative = (
            "western comic, realistic proportions, detailed anime, 3d, realistic, "
            "complex shading, gradients, messy lines, cluttered background, "
            "background objects, text issues, bad anatomy, missing limbs"
        )

        self.rembg_session = new_session("isnet-anime", providers=["CPUExecutionProvider"])

        model_repo = "SmilingWolf/wd-v1-4-moat-tagger-v2"
        
        model_path = hf_hub_download(model_repo, "model.onnx")
        csv_path = hf_hub_download(model_repo, "selected_tags.csv")
        
        self.tagger_session = rt.InferenceSession(
            model_path, 
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )
        
        self.tags = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                self.tags.append(row[1])

        self.compel = Compel(
            tokenizer=[self.pipe.tokenizer, self.pipe.tokenizer_2],
            text_encoder=[self.pipe.text_encoder, self.pipe.text_encoder_2],
            returned_embeddings_type=ReturnedEmbeddingsType.PENULTIMATE_HIDDEN_STATES_NON_NORMALIZED,
            requires_pooled=[False, True]
        )

    def _set_ip_scale(self, ip_scale: float=0.6):
        scale = [w * ip_scale for w in self._base_ip_scale['up']['block_0']]
        self.pipe.set_ip_adapter_scale({"up": {"block_0": scale}})

    def caption_image(self, image: Image.Image, threshold: float = 0.35) -> str:
        """참조 이미지로 캡션 생성 (WD14 Tagger)."""
        
        image = image.convert("RGBA")
        new_image = Image.new("RGBA", image.size, "WHITE")
        new_image.paste(image, mask=image)
        image = new_image.convert("RGB")
        
        image = image.resize((448, 448), Image.Resampling.LANCZOS)
        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0) 
        
        input_name = self.tagger_session.get_inputs()[0].name
        probs = self.tagger_session.run(None, {input_name: image_array})[0][0]
        
        result_tags = []
        for i, p in enumerate(probs):
            if i >= 4 and p > threshold:
                result_tags.append(self.tags[i])
                
        final_caption = ", ".join(result_tags)
        return final_caption

    def generate_image(
        self,
        description: str,
        ref_image: Image.Image = None,
        ip_scale: float = 0.6,
        num_inference_steps: int = 8,
    ) -> Image.Image:
        """PIL.Image를 바로 반환"""
        final_prompt = f"{description}, {self.base_positive}"

        prompt_embeds, pooled_prompt_embeds = self.compel(final_prompt)
        negative_prompt_embeds, negative_pooled_prompt_embeds = self.compel(self.base_negative)

        if ref_image is not None:
            input_image = ref_image.convert("RGB").resize((224, 224))
            current_scale = ip_scale
        else:
            input_image = Image.new("RGB", (224, 224), (0, 0, 0))
            current_scale = 0.0

        self._set_ip_scale(current_scale)

        with torch.inference_mode():
            generated_img = self.pipe(
                prompt_embeds=prompt_embeds,
                pooled_prompt_embeds=pooled_prompt_embeds,
                negative_prompt_embeds=negative_prompt_embeds,
                negative_pooled_prompt_embeds=negative_pooled_prompt_embeds,
                ip_adapter_image=input_image,
                num_inference_steps=num_inference_steps,
                guidance_scale=7.0,
            ).images[0]

        torch.cuda.empty_cache()
        gc.collect()

        transparent_img = remove(generated_img, session=self.rembg_session)

        return transparent_img


# 기본 24종 (감정 과장 및 시각 효과 강화)
VARIANT_PROMPTS = [
    ("기본",      "neutral face, soft gentle smile, relaxed standing pose, looking at viewer"),
    ("활짝 웃음", "wide open mouth smile, sparkling bright eyes, cheerful energetic pose, floating text 'HAHAHA', joyful atmosphere"),
    ("수줍음",    "shy blushing red cheeks, looking away bashfully, index fingers touching together, nervous sweet smile"),
    ("졸려요",    "half-closed sleepy eyes, big wide yawn, droopy tired posture, floating Zzz sleep bubbles"),
    ("화났어요",  "puffed angry cheeks, prominent red cross popping vein symbol on head, steam blowing from ears, clenched fists"),
    ("슬퍼요",    "big glossy teary eyes, crying, drooping shoulders, small dark raincloud hovering above head, gloomy aura"),
    ("깜짝!",     "jaw-dropped shocked face, wide unblinking eyes, jumping back in surprise, exclamation marks in background"),
    ("사랑해요",  "making a large heart shape with both arms above head, blushing heart-shaped eyes, floating pink hearts"),
    ("생각중",    "hand resting on chin, head tilted, looking up slightly, large thought bubble with a question mark"),
    ("굿!",       "giant thumbs up close to the camera, confident proud smile, sparkling white teeth"),
    ("OK!",       "making OK hand sign with fingers, confident playful wink, floating text 'OK'"),
    ("파이팅!",   "raised fist pumping high into the air, determined shouting face, burning passionate background effects"),
    ("하하하",    "laughing out loud joyfully, eyes closed tight happily, hand holding belly, joyful tears, text 'HAHAHA'"),
    ("당황",      "flustered deeply blushing cheeks, multiple large sweat drops on forehead, awkward frozen smile, trembling slightly"),
    ("신남!",     "jumping high with joy, arms raised, flying colorful confetti and sparkling stars, ecstatic wide grin"),
    ("힘들어요",  "slouched exhausted posture, dark heavy circles under eyes, sighing cloud coming from mouth, deflated body"),
    ("배고파",    "drooling slightly from mouth, eyes fixed hungrily forward, holding stomach, growling empty tummy effects"),
    ("냠냠",      "eating happily, cheeks puffed full of food, cute crumbs on face, satisfied delicious smile"),
    ("잘게요",    "lying down curled up, eyes closed peacefully, hugging a soft pillow, floating Zzz bubbles"),
    ("안녕!",     "waving one hand high enthusiastically, bright friendly welcoming smile, looking directly at viewer"),
    ("감사해요",  "bowing slightly forward, hands clasped together in gratitude, warm gentle grateful smile"),
    ("미안해요",  "bowing deeply in apology, single giant sweat drop, worried apologetic eyebrows, puppy-dog eyes"),
    ("응원해요",  "holding a small colorful megaphone, enthusiastic cheering pose, sparkling energetic eyes"),
    ("최고야!",   "sparkling star-shaped eyes, double thumbs up, triumphant proud pose, golden glowing background"),
]

# 추가 12종
EXTRA_VARIANT_PROMPTS = [
    ("박수쳐요",  "clapping both hands enthusiastically, delighted applauding pose, motion blur on hands, beaming smile"),
    ("안아줘요",  "arms wide open reaching out for a hug, warm affectionate smile, inviting posture"),
    ("토닥토닥",  "gently patting forward with one hand, comforting caring expression, soft warm lighting"),
    ("메롱",      "sticking tongue out playfully, one eye winking, cheeky teasing pose, hand pulling down lower eyelid lightly"),
    ("엉엉",      "bawling loudly, exaggerated cartoonish streams of tears flowing, scrunched up crying face, hitting the floor"),
    ("두근두근",  "both hands clasped tightly over chest, deep blushing, floating pulsating heart bubbles, excited anticipating eyes"),
    ("헐...",     "frozen stunned expression, wide blank dot eyes, complete disbelief, losing color/turning grayscale slightly"),
    ("땀뻘뻘",    "nervous strained smile, extreme sweating with multiple large sweat drops, tense rigid pose, shaking"),
    ("축하해요",  "popping a party popper, throwing confetti, joyful celebrating pose, wearing a party hat"),
    ("반가워요",  "leaning forward waving both hands rapidly, delighted welcoming grin, bright aura"),
    ("시무룩",    "slouched sitting on the ground, pouting lips, downturned mouth, gloomy deflated pose, dark shadow on face"),
    ("으쓱",      "shrugging shoulders high, palms facing up, smug closed-eye smile, 'I don't know' casual pose"),
]

VARIANT_PROMPT_MAP: dict[str, str] = {name: desc for name, desc in VARIANT_PROMPTS + EXTRA_VARIANT_PROMPTS}
DEFAULT_ORDER: list[str] = [name for name, _ in VARIANT_PROMPTS]

generator: "EmojiGenerator | None" = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global generator

    generator = EmojiGenerator(lora_model="Zzul02.safetensors")

    PORT = 8000
    try:
        ngrok_authtoken = os.environ.get("NGROK_AUTHTOKEN", "")
        if ngrok_authtoken:
            ngrok.set_auth_token(ngrok_authtoken)
        else:
            print("[경고] NGROK_AUTHTOKEN 환경변수가 없습니다. pyngrok이 다른/누락된 토큰을 쓰고 있을 수 있습니다.")

        public_url = ngrok.connect(
            # PORT, domain="romeo-bannerless-calmingly.ngrok-free.dev"
            PORT, domain = "boney-unvented-awry.ngrok-free.dev"
        ).public_url
        print("[serverUrl]", public_url)
    except Exception as e:
        print(f"ngrok 연결 실패: {e}")

    cleanup_stop = threading.Event()

    def _cleanup_loop():
        while not cleanup_stop.is_set():
            _cleanup_stale_jobs()
            cleanup_stop.wait(JOB_CLEANUP_INTERVAL_SECONDS)

    cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
    cleanup_thread.start()

    yield

    cleanup_stop.set()
    print("\nngrok 종료")
    ngrok.kill()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s", request.method, request.url)
    logger.error(traceback.format_exc())
    return JSONResponse(status_code=500, content={"error": f"서버 내부 오류: {exc}"})


def pil_to_dataurl(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

JOB_DONE_TTL_SECONDS = 10 * 60
JOB_MAX_LIFETIME_SECONDS = 60 * 60
JOB_CLEANUP_INTERVAL_SECONDS = 60


def _cleanup_stale_jobs():
    now = time.time()
    with jobs_lock:
        stale_ids = []
        for jid, job in jobs.items():
            created_at = job.get("created_at", now)
            finished_at = job.get("finished_at")
            if job.get("status") in ("done", "error") and finished_at is not None:
                if now - finished_at > JOB_DONE_TTL_SECONDS:
                    stale_ids.append(jid)
                    continue
            if now - created_at > JOB_MAX_LIFETIME_SECONDS:
                stale_ids.append(jid)
        for jid in stale_ids:
            del jobs[jid]
        if stale_ids:
            logger.info("정리된 작업 %d개: %s", len(stale_ids), stale_ids)


def run_job(
    job_id: str,
    ref_img: Image.Image,
    character_base: str,
    ip_scale: float,
    num_inference_steps: int,
    targets: list[tuple[int, str]],
):
    """targets: [(슬롯번호(1-based), 이모티콘 이름), ...] — 이 목록에 있는 슬롯만 생성.

    백그라운드 스레드에서 도는 함수라 여기서 예외를 안 잡으면 조용히 죽어서
    job이 "running" 상태로 영원히 멈춰버린다. 그래서 함수 전체를 한 번 더 감싸서
    무슨 일이 있어도 콘솔에 트레이스백을 찍고 job 상태를 error로 남긴다.
    """
    try:
        _run_job_inner(job_id, ref_img, character_base, ip_scale, num_inference_steps, targets)
    except Exception as e:  # noqa: BLE001
        logger.error("run_job(%s) 최상위 예외", job_id)
        logger.error(traceback.format_exc())
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = f"예상치 못한 오류: {e}"
                jobs[job_id]["finished_at"] = time.time()


def _run_job_inner(
    job_id: str,
    ref_img: Image.Image,
    character_base: str,
    ip_scale: float,
    num_inference_steps: int,
    targets: list[tuple[int, str]],
):
    """targets: [(슬롯번호(1-based), 이모티콘 이름), ...] — 이 목록에 있는 슬롯만 생성"""
    try:
        auto_caption = generator.caption_image(ref_img)
        user_text = character_base.strip()
        merged_character_base = f"{auto_caption}, {user_text}" if user_text else auto_caption

        with jobs_lock:
            jobs[job_id]["auto_caption"] = auto_caption

    except Exception as e:
        logger.error("run_job(%s) 캡션 분석 중 오류", job_id)
        logger.error(traceback.format_exc())
        with jobs_lock:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = f"캡션 분석 중 오류 발생: {str(e)}"
            jobs[job_id]["finished_at"] = time.time()
        return

    done = 0
    for idx, name_kr in targets:
        desc = VARIANT_PROMPT_MAP.get(name_kr, name_kr)
        full_desc = f"{desc}, ({merged_character_base}:1.3)" if merged_character_base else desc

        try:
            out_img = generator.generate_image(
                description=full_desc,
                ref_image=ref_img,
                ip_scale=ip_scale,
                num_inference_steps=num_inference_steps,
            )
            done += 1
            with jobs_lock:
                jobs[job_id]["images"].append(
                    {"index": idx, "name": name_kr, "image": pil_to_dataurl(out_img)}
                )
                jobs[job_id]["completed"] = done
        except torch.cuda.OutOfMemoryError as e:
            logger.error("run_job(%s) 슬롯 %s(%s) 생성 중 CUDA OOM", job_id, idx, name_kr)
            logger.error(traceback.format_exc())
            torch.cuda.empty_cache()
            gc.collect()
            with jobs_lock:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = f"GPU 메모리 부족으로 {idx}번({name_kr}) 생성 실패."
                jobs[job_id]["finished_at"] = time.time()
            return
        except Exception as e:  # noqa: BLE001
            logger.error("run_job(%s) 슬롯 %s(%s) 생성 중 오류", job_id, idx, name_kr)
            logger.error(traceback.format_exc())
            with jobs_lock:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = f"{idx}번({name_kr}) 생성 중 오류: {e}"
                jobs[job_id]["finished_at"] = time.time()
            return

    with jobs_lock:
        jobs[job_id]["status"] = "done"
        jobs[job_id]["finished_at"] = time.time()


@app.post("/api/generate-set")
async def create_job(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    character_base: str = Form(""),
    ip_scale: float = Form(0.6),
    num_inference_steps: int = Form(16),
    indices: str = Form(""),
    variant_names: str = Form(""),
):
    """작업을 큐에 등록하고 job_id 반환.

    indices: JSON 배열 문자열, 예 "[3,7,12]" — 이 슬롯 번호(1-based)만 생성.
             비어있으면(하위 호환) 기존처럼 24장 전체를 기본 순서로 생성.
    variant_names: JSON 객체 문자열, 예 '{"3":"박수쳐요","7":"메롱"}' — 슬롯별로 만들
             이모티콘 이름. 지정 안 된 슬롯은 기본 24종 순서의 이름을 사용.

    참고: 참조 이미지는 이 최초 요청에서만 업로드된다. 이후 상태를 조회하는
    GET /api/generate-set/{job_id} 요청에는 이미지가 전혀 포함되지 않는다.
    """
    _cleanup_stale_jobs()

    ref_bytes = await image.read()
    ref_img = Image.open(io.BytesIO(ref_bytes)).convert("RGB")

    try:
        idx_list = json.loads(indices) if indices else []
        if not isinstance(idx_list, list):
            idx_list = []
    except (json.JSONDecodeError, TypeError):
        idx_list = []

    try:
        name_map_raw = json.loads(variant_names) if variant_names else {}
        if not isinstance(name_map_raw, dict):
            name_map_raw = {}
    except (json.JSONDecodeError, TypeError):
        name_map_raw = {}
    name_map = {int(k): v for k, v in name_map_raw.items()}

    if not idx_list:
        targets = [(i, name) for i, name in enumerate(DEFAULT_ORDER, start=1)]
    else:
        targets = []
        for i in idx_list:
            i = int(i)
            name = name_map.get(i) or (DEFAULT_ORDER[i - 1] if 1 <= i <= len(DEFAULT_ORDER) else f"이모티콘 {i}")
            targets.append((i, name))

    job_id = str(uuid.uuid4())

    with jobs_lock:
        jobs[job_id] = {
            "status": "running",
            "completed": 0,
            "total": len(targets),
            "images": [],
            "auto_caption": "",
            "created_at": time.time(),
            "finished_at": None,
        }

    background_tasks.add_task(
        run_job, job_id, ref_img, character_base, ip_scale, num_inference_steps, targets
    )

    return {"job_id": job_id}


@app.get("/api/generate-set/{job_id}")
def get_job(job_id: str, since: int = 0):
    """since: 클라이언트가 지금까지 받은 이미지 개수.
    이 값 이후로 새로 완성된 이미지만 반환해서, 매 폴링마다 이미
    받은 이미지를 base64로 중복 전송하지 않도록 한다.

    이 엔드포인트는 job_id와 since(정수)만 받고, 이미지는 전혀 받지 않는다 —
    참조 이미지는 /api/generate-set POST에서 딱 한 번만 업로드된다.
    """
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            return JSONResponse(status_code=404, content={"error": "job not found"})

        all_images = job["images"]
        new_images = all_images[since:] if 0 <= since < len(all_images) else []

        return {
            "status": job["status"],
            "completed": job["completed"],
            "total": job["total"],
            "images": new_images,
            "error": job.get("error"),
        }


@app.get("/api/health")
def health():
    with jobs_lock:
        job_count = len(jobs)
    return {"status": "ok", "device": generator.device if generator else "loading", "active_jobs": job_count}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)