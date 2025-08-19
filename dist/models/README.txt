
# /public/models (로컬 임베딩 ONNX)

이 폴더에 아래 두 파일을 넣으면 앱이 **onnxruntime-web** 경로로 자동 전환됩니다.
- `encoder.onnx` : 문장 임베딩용 ONNX 모델(예: MiniLM, MPNet 등 Sentence Transformers 계열)
- `tokenizer.json` : 같은 모델의 토크나이저(JSON)

## 주의
- 최대 시퀀스 길이: 128 토큰(코드에서 고정). 필요 시 늘릴 수 있지만 메모리/속도 비용 증가.
- 입력 텐서 타입은 **int64** 또는 **int32**를 자동 감지하여 사용합니다.
- 파일은 PWA 서비스워커가 **CacheFirst**로 캐시하므로, 한 번 로드하면 오프라인에서도 사용됩니다.

## 파일 배치
```
public/
  models/
    encoder.onnx
    tokenizer.json
```
