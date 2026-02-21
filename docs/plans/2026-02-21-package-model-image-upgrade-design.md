# Package Update, Gemini Model Upgrade & Image Generation Support

## Overview

gemini-mcp-server의 의존성 최신화, Gemini 3 모델 파라미터 호환성 정리, Nano Banana 기반 이미지 생성 MCP 도구 추가.

## Scope

### In Scope
- npm 패키지 최신 버전으로 업데이트 (zod 4.x 포함, @types/node는 24.x 내 최신)
- Gemini 3 시리즈 모델 파라미터 호환성 (thinkingLevel — 모델별 지원 범위 상이)
- 기본 텍스트 모델을 `gemini-3-flash-preview`로 변경
- `generate_image` MCP 도구 추가 (Nano Banana: `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`)
- OS별 기본 이미지 저장 경로
- 환경변수 `GEMINI_IMAGE_OUTPUT_DIR` 추가 (이미지 모델은 tool 파라미터로만 선택)

### Out of Scope
- Imagen 4 API (generateImages) 지원
- Veo (비디오 생성) 지원
- Thought Signatures 멀티턴 이미지 편집
- 테스트 프레임워크 도입 (프로젝트에 테스트 프레임워크 미설정)

## Decisions

- **zod**: 3.25.76 → 4.3.6. import `"zod"` 유지 (zod@4 패키지는 root에서 v4 export)
- **@types/node**: 24.9.1 → 24.10.13 (major 25.x 제외, 24.x 내 최신으로 제한)
- **기본 텍스트 모델**: `gemini-3-flash-preview`
- **기본 이미지 모델**: `gemini-2.5-flash-image`
- **이미지 생성 도구**: `generate_image` 단독 MCP tool
- **이미지 모델 제한**: 스키마에서 enum으로 허용 모델 한정
- **응답 형식**: 파일 경로 + base64 데이터 모두 반환

---

## Task 1: Package Version Updates + zod 4 Migration

### Package Changes
```
@google/genai:              ^1.30.0 → ^1.42.0
@modelcontextprotocol/sdk:  ^1.20.1 → ^1.26.0
dotenv:                     ^17.2.3 → ^17.3.1
zod:                        ^3.25.76 → ^4.3.6
@types/node:                ^24.9.1 → ^24.10.13
tsx:                        ^4.20.6 → ^4.21.0
```

### zod 4.x Migration
- `import { z } from "zod"` 유지 (zod@4는 root export에서 v4 API 제공)
- 현재 사용 패턴: `z.object`, `z.string`, `z.array`, `.optional()`, `.describe()` — 모두 v4 호환
- `z.infer<>` 타입 추론도 동일하게 동작
- `.toJSONSchema()` 빌트인 사용 가능하나 현재 수동 변환 없으므로 변경 불필요

### Success Criteria
- `npm install` 성공
- `npm run build` 성공
- 모든 import 정상 resolve

---

## Task 2: Gemini Model & Parameter Compatibility

### 모델 지원 테이블
| 모델 ID | thinkingLevel 지원 |
|---------|-------------------|
| `gemini-3.1-pro-preview` | minimal, low, medium, high |
| `gemini-3-pro-preview` | low, high |
| `gemini-3-flash-preview` | minimal, low, medium, high |
| `gemini-2.5-pro` | thinkingBudget only |
| `gemini-2.5-flash` | thinkingBudget only |

### Changes

#### a. `isGemini3Model()` 업데이트
```typescript
private isGemini3Model(): boolean {
  const model = this.config.model.toLowerCase();
  return /gemini[-_]?3/.test(model);
}
```
`gemini-3`, `gemini-3.1`, `gemini3` 모두 매칭.

#### b. ThinkingLevel 확장
SDK 1.42.0의 `ThinkingLevel` enum은 `LOW`, `MEDIUM`, `HIGH`, `MINIMAL` 4가지 값을 제공.
- `QueryOptions.thinkingLevel` 타입을 `ThinkingLevel`로 유지
- 기본값: `ThinkingLevel.HIGH`
- 모델별 지원하지 않는 레벨은 API가 에러 반환 (서버 레벨에서 별도 검증 불필요)

#### c. 기본 텍스트 모델 변경
`config/index.ts`에서 기본값을 `gemini-2.5-pro` → `gemini-3-flash-preview`로 변경.

#### d. media_resolution 파라미터
`QueryOptions`에 `mediaResolution` 옵션 추가.
환경변수 `GEMINI_MEDIA_RESOLUTION`으로 설정 가능.
값: `low`, `medium`, `high` (Gemini 3 전용, 2.5에서는 무시).

### Success Criteria
- `isGemini3Model()`이 `gemini-3-pro-preview`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-3-pro-image-preview`에 true 반환
- `QueryOptions.thinkingLevel` 타입이 SDK의 `ThinkingLevel` enum 수용
- 기본 모델이 `gemini-3-flash-preview`
- 빌드 성공

---

## Task 3: Nano Banana Image Generation

### Architecture

```
MCP Client
  → generate_image tool call
  → ImageGenerationHandler.handle()
  → GeminiAIService.generateImage()
  → Gemini API (responseModalities: ['TEXT', 'IMAGE'])
  → response.parts[].inlineData (base64 PNG)
  → imageSaver.save() → OS별 경로에 파일 저장
  → MCP response: { filePath, base64, mimeType }
```

### New Files
- `src/handlers/ImageGenerationHandler.ts` — MCP tool handler
- `src/utils/imageSaver.ts` — OS별 이미지 저장 유틸리티

### Modified Files
- `src/schemas/index.ts` — ImageGenerationSchema 추가
- `src/services/GeminiAIService.ts` — `generateImage()` 메서드 추가
- `src/server/GeminiAIMCPServer.ts` — tool 등록 및 handler 라우팅
- `src/types/config.ts` — `imageOutputDir` 필드 추가
- `src/config/index.ts` — `GEMINI_IMAGE_OUTPUT_DIR` 환경변수 로드 추가

### Schema (허용 모델 enum 제한)
```typescript
const ALLOWED_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
] as const;

export const ImageGenerationSchema = z.object({
  prompt: z.string().describe("Image generation prompt"),
  model: z.enum(ALLOWED_IMAGE_MODELS).optional()
    .describe("Image model (default: gemini-2.5-flash-image)"),
  aspectRatio: z.enum([
    '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
  ]).optional().describe("Aspect ratio (default: 1:1)"),
  imageSize: z.enum(['1K', '2K', '4K']).optional()
    .describe("Resolution (4K is Gemini 3 Pro Image only, default: 1K)"),
});
```

### GeminiAIService.generateImage()
```typescript
interface ImageGenerationOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
}

interface GeneratedImage {
  data: string;      // base64
  mimeType: string;  // image/png
}

async generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<{ images: GeneratedImage[]; text?: string }> {
  // model은 schema enum으로 검증된 값만 도달. 미지정 시 기본값 사용.
  const model = options.model || 'gemini-2.5-flash-image';
  const response = await this.client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: options.aspectRatio || '1:1',
        imageSize: options.imageSize,
      },
    },
  });
  return this.extractImages(response);
}
```

### OS별 기본 이미지 저장 경로
```typescript
function getDefaultImageDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':  return path.join(home, 'Pictures', 'gemini-generated');
    case 'win32':   return path.join(home, 'Pictures', 'gemini-generated');
    case 'linux':   return path.join(home, 'Pictures', 'gemini-generated');
    default:        return path.join(home, 'gemini-generated');
  }
}
```
환경변수 `GEMINI_IMAGE_OUTPUT_DIR`로 오버라이드 가능.

### MCP Tool Response Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"images\":[{\"filePath\":\"/Users/user/Pictures/gemini-generated/img-20260221-143000-001.png\",\"mimeType\":\"image/png\"}],\"text\":\"optional model text\"}"
    },
    {
      "type": "image",
      "data": "<base64>",
      "mimeType": "image/png"
    }
  ]
}
```

### Success Criteria
- `generateImage()` 메서드가 `responseModalities: ['TEXT', 'IMAGE']`로 API 호출하도록 구현
- `extractImages()` 메서드가 response parts에서 inlineData 추출하도록 구현
- `imageSaver.save()`가 디렉토리 자동 생성 및 파일 저장하도록 구현
- `getDefaultImageDir()`가 `process.platform` 기반으로 경로 반환
- `GEMINI_IMAGE_OUTPUT_DIR` 환경변수가 config에 반영
- 빌드 성공 (`tsc` 타입 체크 통과)

---

## Task 4: MCP Server Wiring

### Changes to GeminiAIMCPServer
- ListTools handler에 `generate_image` tool 추가 (name, description, inputSchema)
- CallTool handler에 `generate_image` 라우팅 추가
- ImageGenerationHandler 인스턴스 생성 및 주입

### Success Criteria
- `tools/list` 응답에 `generate_image` 포함
- `tools/call` 에서 `generate_image` 정상 라우팅
- 빌드 성공

---

## Testing Strategy

프로젝트에 테스트 프레임워크가 없으므로 기존 수동 테스트 스크립트 패턴을 따름:

### Build-time Verification (자동화)
- `npm run build` 성공 확인 (타입 체크 포함)
- `npm run test:list`로 tools/list에 `generate_image` 포함 확인

### Code-level Verification (verifier가 코드 리뷰)
- `generateImage()`가 `responseModalities: ['TEXT', 'IMAGE']` config 사용하는지 확인
- `extractImages()`가 `response.candidates[].content.parts[]`에서 `inlineData` 추출하는지 확인
- `imageSaver.save()`가 `fs.mkdirSync(dir, { recursive: true })` 사용하는지 확인
- `getDefaultImageDir()`가 `process.platform` 분기하는지 확인
- `GEMINI_IMAGE_OUTPUT_DIR` 환경변수가 `loadConfig()`에서 읽히는지 확인
- schema의 model이 enum으로 `['gemini-2.5-flash-image', 'gemini-3-pro-image-preview']`만 허용하는지 확인

---

## Task Decomposition

| ID | Subject | Blocked By | Complexity |
|----|---------|------------|------------|
| 1 | Package version updates + zod 4 migration | - | standard |
| 2 | Gemini model param compatibility + default model change | 1 | standard |
| 3 | Image generation service + handler + imageSaver | 1 | complex |
| 4 | MCP server wiring + schema registration | 2, 3 | standard |
| verify | Build & integration verification | 1, 2, 3, 4 | complex |
