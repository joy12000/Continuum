# Place your model files here

This app expects the following local files to exist in `/public/models` on your deployed site:

- `/public/models/ko-sroberta-multitask_quantized.onnx`  (quantized ONNX model)
- `/public/models/bge-m3/tokenizer.json` and related tokenizer assets

After deployment, verify these URLs resolve to **binary/JSON**, not HTML:
- https://<your-site>/models/ko-sroberta-multitask_quantized.onnx
- https://<your-site>/models/bge-m3/tokenizer.json
