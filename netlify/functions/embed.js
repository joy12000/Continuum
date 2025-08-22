async embed(text: string): Promise<EmbedVec> {
  if (!this.ready) await this.init();
  if (!this.session || !this.tokenizer) throw new Error('Pipeline not ready');

  // ✅ 배치 토크나이즈: [text]로 넘겨서 [1, seq] 보장
  const enc = await this.tokenizer([text], {
    return_tensors: 'np',
    padding: true,
    truncation: true,
  });

  // 입력 텐서 꺼내기
  const idsData  = enc.input_ids.data as any;
  const maskData = enc.attention_mask.data as any;

  // ✅ 혹시 모를 1D를 위해 안전 리셰이프
  const idsShape  = (enc.input_ids.shape as number[]).length === 1
    ? [1, enc.input_ids.shape as unknown as number]
    : (enc.input_ids.shape as number[]);
  const maskShape = (enc.attention_mask.shape as number[]).length === 1
    ? [1, enc.attention_mask.shape as unknown as number]
    : (enc.attention_mask.shape as number[]);

  // onnxruntime-web은 int64 입력 지원 → BigInt64로 만들어 전달
  const ids64  = BigInt64Array.from(Array.from(idsData,  (x: number) => BigInt(x)));
  const mask64 = BigInt64Array.from(Array.from(maskData, (x: number) => BigInt(x)));

  const inputs: Record<string, ort.Tensor> = {
    input_ids:      new ort.Tensor('int64', ids64,  idsShape),
    attention_mask: new ort.Tensor('int64', mask64, maskShape),
  };

  if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
    const size = idsShape[0] * idsShape[1];
    inputs.token_type_ids = new ort.Tensor('int64', new BigInt64Array(size), idsShape);
  }

  const outMap = await this.session.run(inputs);
  const firstKey = Object.keys(outMap)[0];
  const out = outMap[firstKey];
  const data = out.data as Float32Array;

  if (out.dims.length === 2) {
    return Array.from(data); // [1, hidden]
  } else if (out.dims.length === 3) {
    // [1, seq, hidden] → mean pooling
    const [, seq, hidden] = out.dims;
    const mask = mask64;
    const acc = new Float32Array(hidden);
    let denom = 0;
    for (let t = 0; t < seq; t++) {
      if (mask[t] === 0n) continue;
      denom++;
      const base = t * hidden;
      for (let h = 0; h < hidden; h++) acc[h] += data[base + h];
    }
    const d = Math.max(1, denom);
    for (let h = 0; h < hidden; h++) acc[h] /= d;
    return Array.from(acc);
  }
  return Array.from(data);
}
