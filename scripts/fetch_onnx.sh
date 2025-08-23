#!/usr/bin/env bash
set -euo pipefail
mkdir -p public/models/ko-sroberta

# ONNX URL (필요시 변경 가능)
URL="${KO_SROBERTA_ONNX:-https://huggingface.co/jhgan/ko-sroberta-multitask/resolve/main/onnx/model_qint8_avx512_vnni.onnx?download=true}"

echo "[fetch_onnx] Downloading: $URL"
curl -L "$URL" -o public/models/ko-sroberta/model_qint8_avx512_vnni.onnx
ls -lh public/models/ko-sroberta/*.onnx || true
