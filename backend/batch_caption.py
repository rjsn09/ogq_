"""
데이터셋 폴더의 모든 이미지에 대해 WD14 태거로 캡션(.txt)을 생성.
Server.py의 caption_image()와 동일한 모델/로직을 재사용합니다.

설치: Server.py가 이미 돌아가는 환경이면 onnxruntime, huggingface_hub 등은
이미 있을 겁니다. 없으면:
    pip install onnxruntime-gpu huggingface_hub numpy pillow

사용법:
    python batch_caption.py --input dataset_clean --trigger emj_sty

동작:
- 각 이미지에서 WD14 태그를 뽑음
- 스타일 LoRA 학습에 방해되는 태그(그림체/화질 관련, 워터마크/텍스트 관련)는 제외
  → 캡션에는 "내용"(헤어색, 의상, 포즈, 표정)만 남기고, 스타일은 트리거워드로만 제어
- 트리거워드를 캡션 맨 앞에 붙여서 <같은 이름>.txt로 저장
"""

import argparse
import csv
import glob
import os

import numpy as np
import onnxruntime as rt
from PIL import Image
from huggingface_hub import hf_hub_download

# 캡션에서 제외할 태그 (그림체/화질/메타 관련 — 스타일 LoRA는 트리거워드로만 스타일 제어)
EXCLUDE_SUBSTRINGS = [
    "text", "speech bubble", "watermark", "signature", "artist name",
    "english text", "korean text", "chibi", "sticker", "emoji",
    "simple background", "white background", "lineart", "monochrome",
    "cel shading", "flat color",
]


def load_tagger():
    model_repo = "SmilingWolf/wd-v1-4-moat-tagger-v2"
    model_path = hf_hub_download(model_repo, "model.onnx")
    csv_path = hf_hub_download(model_repo, "selected_tags.csv")

    session = rt.InferenceSession(
        model_path,
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
    )

    tags = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            tags.append(row[1])

    return session, tags


def caption_image(image: Image.Image, session, tags, threshold: float = 0.35) -> str:
    image = image.convert("RGBA")
    new_image = Image.new("RGBA", image.size, "WHITE")
    new_image.paste(image, mask=image)
    image = new_image.convert("RGB")

    image = image.resize((448, 448), Image.Resampling.LANCZOS)
    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    input_name = session.get_inputs()[0].name
    probs = session.run(None, {input_name: image_array})[0][0]

    result_tags = []
    for i, p in enumerate(probs):
        if i >= 4 and p > threshold:
            tag = tags[i]
            if any(bad in tag.lower() for bad in EXCLUDE_SUBSTRINGS):
                continue
            result_tags.append(tag)

    return ", ".join(result_tags)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="이미지 폴더")
    parser.add_argument("--trigger", default="emj_sty", help="캡션 맨 앞에 붙일 트리거워드")
    parser.add_argument("--threshold", type=float, default=0.35)
    parser.add_argument("--overwrite", action="store_true", help="기존 .txt 있어도 덮어쓰기")
    args = parser.parse_args()

    print("WD14 태거 로딩 중...")
    session, tags = load_tagger()

    image_paths = sorted(
        glob.glob(os.path.join(args.input, "*.png"))
        + glob.glob(os.path.join(args.input, "*.jpg"))
        + glob.glob(os.path.join(args.input, "*.jpeg"))
    )
    print(f"총 {len(image_paths)}장 캡셔닝 시작")

    for i, path in enumerate(image_paths, 1):
        txt_path = os.path.splitext(path)[0] + ".txt"
        if os.path.exists(txt_path) and not args.overwrite:
            print(f"[{i}/{len(image_paths)}] {os.path.basename(path)}: 이미 캡션 있음, 건너뜀")
            continue

        img = Image.open(path)
        caption = caption_image(img, session, tags, args.threshold)
        full_caption = f"{args.trigger}, {caption}" if caption else args.trigger

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(full_caption)

        print(f"[{i}/{len(image_paths)}] {os.path.basename(path)}: {full_caption[:80]}...")

    print("\n완료.")


if __name__ == "__main__":
    main()