Place these two runtime files (from node_modules/onnxruntime-web/dist) into this folder:
  - ort-wasm-simd-threaded.mjs
  - ort-wasm-simd-threaded.wasm

Worker expects:
  ort.env.wasm.wasmPaths = { mjs: '/ort/ort-wasm-simd-threaded.mjs', wasm: '/ort/ort-wasm-simd-threaded.wasm' }
