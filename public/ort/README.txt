Copy these two files into this folder from node_modules/onnxruntime-web/dist:

  - ort-wasm-simd-threaded.mjs
  - ort-wasm-simd-threaded.wasm   (or the jsep variant your build uses)

The worker expects:
  ort.env.wasm.wasmPaths = { mjs: '/ort/ort-wasm-simd-threaded.mjs', wasm: '/ort/ort-wasm-simd-threaded.wasm' }
