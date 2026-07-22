# Architecture Documentation

## Overview

The Gemini AI MCP Server implements an **intelligent agentic loop** inspired by the OpenAI Agents SDK. The architecture supports turn-based execution, automatic tool selection, parallel tool execution, and robust error handling.

**Last Updated**: 2026-07-01

## Core Architecture

### Agentic Loop Pattern

```
User Input
  ↓
┌─────────────────── Turn-Based Loop (1..10) ──────────────────┐
│                                                               │
│  RunState Management                                          │
│  ├─ Current turn tracking                                     │
│  ├─ Message history accumulation                              │
│  ├─ Tool call records                                         │
│  └─ Reasoning traces                                          │
│                                                               │
│  ┌─────────────────────────────────────┐                     │
│  │  Turn Execution                     │                     │
│  │  ─────────────────                  │                     │
│  │                                     │                     │
│  │  1. Build Prompt                    │                     │
│  │     └─ Tool definitions + History   │                     │
│  │                                     │                     │
│  │  2. Gemini Generation               │                     │
│  │     └─ ThinkingConfig (if needed)   │                     │
│  │                                     │                     │
│  │  3. Response Processing             │                     │
│  │     ├─ Extract reasoning            │                     │
│  │     ├─ Parse tool calls (MCP)       │                     │
│  │     └─ Detect final output          │                     │
│  │                                     │                     │
│  │  4. Tool Execution                  │                     │
│  │     ├─ Parallel execution           │                     │
│  │     ├─ Retry (exponential backoff)  │                     │
│  │     └─ Fallback to Gemini           │                     │
│  │                                     │                     │
│  │  5. Decision                        │                     │
│  │     ├─ Tool results? → Loop again   │                     │
│  │     ├─ Final output? → Exit         │                     │
│  │     └─ MaxTurns? → Best effort      │                     │
│  │                                     │                     │
│  └─────────────────────────────────────┘                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
  ↓
Structured Result
├─ Final output
├─ Session ID
├─ Statistics (turns, tool calls, reasoning steps)
└─ Complete message history
```

## Directory Structure

The codebase is organized by architectural layers for better maintainability. See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) for the complete directory structure and detailed organization rationale.

## Component Details

### 1. AgenticLoop (Core Orchestrator)

**Location**: `src/agentic/AgenticLoop.ts`

**Responsibilities**:
- Turn-based execution loop (1..maxTurns)
- Prompt construction with tool definitions
- Response processing and decision making
- Tool execution coordination
- Error handling and fallback logic

**Key Methods**:
```typescript
async run(
  prompt: string,
  conversationHistory: Message[],
  options: RunOptions
): Promise<RunResult>
```

**Features**:
- Automatic thinking mode detection (keywords: analyze, compare, etc.)
- Parallel tool execution with retry
- Graceful degradation (best-effort response on MaxTurns)
- Complete execution tracing

### 2. RunState (State Management)

**Location**: `src/agentic/RunState.ts`

**Responsibilities**:
- Turn counter and limits
- Message history accumulation
- Tool call tracking
- Reasoning step recording
- Integrated logging

**Design**: In-memory only (no serialization needed for chat MCP)

### 3. ResponseProcessor (Response Parsing)

**Location**: `src/agentic/ResponseProcessor.ts`

**Responsibilities**:
- Parse Gemini responses into structured items
- Extract reasoning markers `[Thinking: ...]`
- Parse tool calls (MCP format: `TOOL_CALL: / ARGUMENTS:`)
- Validate response structure

**Tool Call Format**:
```
TOOL_CALL: web_fetch
ARGUMENTS: {"url": "https://example.com", "extract": true}
```

### 4. ToolRegistry (Tool Management)

**Location**: `src/tools/ToolRegistry.ts`

**Responsibilities**:
- Register WebFetch and MCP tools
- Parallel tool execution (`Promise.all`)
- Per-tool retry logic (exponential backoff)
- Tool definition formatting for LLM prompts

**Features**:
- Up to 2 retries per tool
- Failure isolation (one tool failure doesn't block others)
- Detailed execution logging

### 5. WebFetchTool (Secure Web Fetching)

**Location**: `src/tools/WebFetchTool.ts`

**Security Features**:
- HTTPS-only enforcement
- Private IP blocking (CIDR ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
- DNS resolution validation
- 30-second timeout
- 50KB content limit

**Content Extraction**:
- Remove `<script>` and `<style>` tags
- Decode HTML entities
- Extract main paragraphs (>40 characters)
- Clean whitespace normalization

### 6. EnhancedMCPClient (MCP Integration)

**Location**: `src/mcp/EnhancedMCPClient.ts`

**Responsibilities**:
- Manage stdio and HTTP MCP server connections
- Dynamic tool discovery at startup
- Route tool calls to appropriate servers
- Connection lifecycle management

**Supported Transports**:
- **Stdio**: Subprocess communication (stdin/stdout JSON-RPC)
- **HTTP**: RESTful API (`POST /tools/list`, `POST /tools/call`)

### 7. GeminiAIService (Gemini API)

**Location**: `src/services/GeminiAIService.ts`

**Responsibilities**:
- Gemini API communication via `@google/genai` SDK
- ThinkingConfig support for reasoning mode (Gemini 2.5 and 3 series)
- Image generation via native image models
- Speech generation via Gemini TTS models
- Music generation via Lyria models
- Video generation via Veo models (async long-running operations)
- Omni video generation via Gemini Omni Flash through the Interactions API (synchronous)
- Response text, image, and audio extraction

**Key Methods**:
```typescript
async query(
  prompt: string,
  options: QueryOptions,
  multimodalParts?: MultimodalPart[]
): Promise<string>

async generateImage(
  prompt: string,
  options: ImageGenerationOptions
): Promise<{ images: GeneratedImage[]; text?: string }>

async generateSpeech(
  prompt: string,
  options: SpeechGenerationOptions
): Promise<{ audios: GeneratedAudio[]; text?: string }>

async generateMusic(
  prompt: string,
  options: MusicGenerationOptions
): Promise<{ audios: GeneratedAudio[]; text?: string }>

async generateVideo(
  prompt: string,
  options: VideoGenerationOptions
): Promise<{ operationId: string }>

async checkVideoOperation(
  operationId: string
): Promise<{ done: boolean; videos?: GeneratedVideo[]; error?: string }>

async generateOmniVideo(
  prompt: string,
  options: OmniVideoGenerationOptions
): Promise<GeneratedOmniVideo>  // Interactions API, synchronous (no operationId)
```

**QueryOptions**:
```typescript
interface QueryOptions {
  enableThinking?: boolean;
  thinkingLevel?: ThinkingLevel | string;  // Gemini 3 models: minimal | low | medium | high
  mediaResolution?: string;                // Multimodal inputs: low | medium | high
  model?: string;                 // Per-request model override
}
```

**ImageGenerationOptions**:
```typescript
interface ImageGenerationOptions {
  model?: string;        // Default: 'gemini-3-pro-image'
  aspectRatio?: string;  // e.g., '1:1', '16:9', '1:4'
  imageSize?: string;    // '0.5K' | '1K' | '2K' | '4K'
}
```

**SpeechGenerationOptions**:
```typescript
interface SpeechGenerationOptions {
  model?: string;        // Default: 'gemini-3.1-flash-tts-preview'
  voiceName?: string;    // Default: 'Kore' for single-speaker TTS
  languageCode?: string;
  speakers?: Array<{ speaker: string; voiceName: string }>; // exactly 2
}
```

**MusicGenerationOptions**:
```typescript
interface MusicGenerationOptions {
  model?: string;          // Default: 'lyria-3-clip-preview'
  outputMimeType?: string; // 'audio/mp3' | 'audio/wav'
  imagePaths?: string[];
}
```

**Gemini 3 Model Detection**:
- Models matching `/gemini[-_]?3/` pattern use `thinkingLevel` (not `thinkingBudget`)
- `ThinkingLevel.HIGH` is the default for Gemini 3 models
- Gemini 2.5 and earlier models use `thinkingBudget: -1` (auto)

**Features**:
- Dynamic generation config per query
- Model-aware thinking config (Gemini 2.5 vs Gemini 3 API differences)
- Image generation with base64 inline data extraction
- Speech/music generation with audio inline data extraction
- Video generation through async operation IDs
- Response parsing with error handling
- Vertex AI and Google AI Studio / Gemini Developer API modes via `@google/genai` SDK

**API Mode Selection**:
- `GOOGLE_GENAI_USE_VERTEXAI=true`: force Vertex AI mode
- `GOOGLE_GENAI_USE_VERTEXAI=false`: force Google AI Studio / Gemini Developer API mode
- Without an explicit mode, `GOOGLE_CLOUD_PROJECT` selects Vertex AI; otherwise `GEMINI_API_KEY` or `GOOGLE_API_KEY` selects Gemini Developer API

### 8. ImageGenerationHandler (Image Requests)

**Location**: `src/handlers/ImageGenerationHandler.ts`

**Responsibilities**:
- Validate and route image generation requests
- Coordinate with GeminiAIService to generate images
- Save generated images to local filesystem via imageSaver
- Return image data and file paths as MCP content blocks

**Key Method**:
```typescript
async handle(
  input: ImageGenerationInput
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }>
```

**Response Format**:
Returns an array of MCP content blocks:
1. `text` block: JSON with `{ images: [{ filePath, mimeType }], text }`
2. `image` block(s): base64-encoded image data with MIME type

**Configuration**: Uses `config.imageOutputDir` (defaults to `getDefaultImageDir()` from imageSaver)

### 9. VideoGenerationHandler (Video Requests)

**Location**: `src/handlers/VideoGenerationHandler.ts`

**Responsibilities**:
- Validate and route video generation requests
- Coordinate with GeminiAIService to generate videos
- Save generated videos to local filesystem via videoSaver
- Return file paths and MIME types as MCP content blocks

**Key Methods**:
```typescript
async handle(
  input: VideoGenerationInput
): Promise<{ content: Array<{ type: string; text: string }> }>

async handleCheck(
  input: CheckVideoInput
): Promise<{ content: Array<{ type: string; text: string }> }>
```

**Features**:
- Text-to-video generation from text prompts
- Image-to-video animation from local image files
- Interpolation between start and end frames
- Reference images for style/asset guidance (max 3, Veo 3.1)
- Backend-aware model ids: Vertex AI uses `veo-3.1-*-generate-001`, Google AI Studio uses `veo-3.1-*-generate-preview`
- Audio generation is configurable on Vertex AI; Google AI Studio has audio always on

**Response Format**:
`generate_video` returns a text block containing JSON: `{ operationId }`.
`check_video` returns `{ status: 'running' }`, `{ status: 'failed', error }`, or `{ status: 'completed', videos: [{ filePath, mimeType }] }`.

**Configuration**: Uses `config.videoOutputDir` (defaults to `getDefaultVideoDir()` from videoSaver)

### 10. OmniVideoHandler (Omni Video Requests)

**Location**: `src/handlers/OmniVideoHandler.ts`

**Responsibilities**:
- Validate and route `generate_omni_video` requests (model `gemini-omni-flash-preview`)
- Coordinate with GeminiAIService via the Interactions API (`client.interactions.create`)
- Save the finished video to local filesystem via videoSaver
- Surface the `interactionId` so callers can chain conversational edits

**Key Method**:
```typescript
async handle(
  input: OmniVideoGenerationInput
): Promise<{ content: Array<{ type: string; text: string }> }>
```

**Features**:
- Non-Veo video model; **synchronous** — returns the finished video in one call (no `operationId`/`check_video` polling), unlike the Veo `generate_video`/`check_video` long-running-operation pipeline
- Oneshot path: text/image/reference-to-video (`imagePaths` max 7)
- Interactive editing path: `previousInteractionId` chains up to 3 sequential edits without re-uploading source media
- Constraints: 720p only, 16:9/9:16, duration 3-10s, audio auto-generated
- Runs on the Google AI Studio (Gemini API) backend

**Response Format**:
`generate_omni_video` returns a text block containing JSON: `{ status: 'completed', interactionId, video: { filePath, mimeType }, text?, hint }`.

**Configuration**: Uses `config.videoOutputDir` (defaults to `getDefaultVideoDir()` from videoSaver) — the same output directory as `generate_video`

### 11. SpeechGenerationHandler (Speech Requests)

**Location**: `src/handlers/SpeechGenerationHandler.ts`

**Responsibilities**:
- Validate and route Gemini TTS requests
- Coordinate with GeminiAIService to generate speech
- Wrap PCM output in a WAV container
- Save generated speech to local filesystem via audioSaver
- Return file paths and MCP audio content blocks

**Configuration**: Uses `config.speechOutputDir` (defaults to `getDefaultSpeechDir()` from audioSaver)

### 12. MusicGenerationHandler (Music Requests)

**Location**: `src/handlers/MusicGenerationHandler.ts`

**Responsibilities**:
- Validate and route Lyria music requests
- Coordinate with GeminiAIService to generate music
- Save generated music to local filesystem via audioSaver
- Return file paths, MCP audio content blocks, and Lyria text parts

**Configuration**: Uses `config.musicOutputDir` (defaults to `getDefaultMusicDir()` from audioSaver)

### 13. ReferenceSearchHandler (Grounded Reference Search)

**Location**: `src/handlers/ReferenceSearchHandler.ts`

**Responsibilities**:
- Validate and route `reference_search` requests
- Coordinate with GeminiAIService (`referenceSearch`) to compose an answer via Google Search grounding
- Serialize the answer, citations, supports, search queries, and Search Suggestions markup into a JSON `text` block

**Key Method**:
```typescript
async handle(
  input: ReferenceSearchInput
): Promise<{ content: Array<{ type: string; text: string }> }>
```

**Features**:
- No file output — returns synthesized text plus organized citations (links) and claim→source supports in one call
- Search-scope tuning is backend-asymmetric per the `@google/genai` GoogleSearch tool: `excludeDomains`/`blockingConfidence` are Vertex AI only, `timeRange` and `urls` (URL context) are Google AI Studio only; `includeImages` works on both
- Grounding metadata is extracted from `response.candidates[0].groundingMetadata`; support segment byte offsets are sliced from the answer when the API omits resolved text

**Response Format**:
`reference_search` returns a text block containing JSON: `{ answer, citations, supports, searchQueries, searchSuggestionsHtml? }`.

**Configuration**: No output directory — the answer is returned inline.

### 14. Logger (File-based Logging)

**Location**: `src/utils/Logger.ts`

**Responsibilities**:
- Log execution traces to files
- Separate reasoning log for analysis
- Session-based log organization
- Automatic log directory creation

**Log Files**:
- `logs/general.log`: All logs (info, error, tool calls)
- `logs/reasoning.log`: Thinking traces only

### 15. Generated File Utilities

**Locations**: `src/utils/generatedFileSaver.ts`, `src/utils/imageSaver.ts`, `src/utils/videoSaver.ts`, `src/utils/audioSaver.ts`

**Responsibilities**:
- Determine platform-appropriate default output directories
- Save media data to disk
- Generate timestamped, indexed filenames
- Map MIME types to file extensions
- Wrap Gemini TTS PCM output in WAV containers

**imageSaver Exported Functions**:
```typescript
// Returns ~/Pictures/gemini-generated on macOS, Windows, Linux
// Falls back to ~/gemini-generated on other platforms
function getDefaultImageDir(): string

// Decodes base64 data and writes to outputDir/filename
function saveImage(base64Data: string, outputDir: string, filename: string): string

// Returns e.g. "img-20260221143000-001.png" or "img-20260221143000-001.jpg"
function generateImageFilename(index: number, mimeType: string): string
```

**videoSaver Exported Functions**:
```typescript
// Returns ~/Movies/gemini-generated on macOS, ~/Videos/gemini-generated on Windows/Linux
function getDefaultVideoDir(): string

// Writes buffer data to outputDir/filename
function saveVideo(data: Buffer, outputDir: string, filename: string): string

// Returns e.g. "vid-20260304120000-001.mp4"
function generateVideoFilename(index: number): string
```

**audioSaver Exported Functions**:
```typescript
// Returns ~/Music/gemini-generated/speech on macOS, Windows, Linux
function getDefaultSpeechDir(): string

// Returns ~/Music/gemini-generated/music on macOS, Windows, Linux
function getDefaultMusicDir(): string

// Writes buffer data to outputDir/filename
function saveAudio(data: Buffer, outputDir: string, filename: string): string

// Returns e.g. "speech-20260428143000-001.wav"
function generateSpeechFilename(index: number, mimeType: string): string

// Returns e.g. "music-20260428143000-001.mp3"
function generateMusicFilename(index: number, mimeType: string): string

// Wraps raw PCM in a WAV header
function pcmToWav(pcmData: Buffer, options?: WavOptions): Buffer
```

**Filename Formats**:
- Images: `img-{YYYYMMDDHHmmss}-{NNN}.{ext}` (jpg for image/jpeg, png otherwise)
- Videos: `vid-{YYYYMMDDHHmmss}-{NNN}.mp4`
- Speech: `speech-{YYYYMMDDHHmmss}-{NNN}.wav`
- Music: `music-{YYYYMMDDHHmmss}-{NNN}.{ext}`

## Data Flow

### Query Execution Flow

```
1. MCP Client → GeminiAIMCPServer
   ↓
2. QueryHandler.handle()
   ↓
3. Load conversation history (ConversationManager)
   ↓
4. AgenticLoop.run()
   ├─ Turn 1:
   │  ├─ Build prompt with tool definitions
   │  ├─ Gemini generation (thinkingConfig)
   │  ├─ Parse response (ResponseProcessor)
   │  ├─ Tool calls detected?
   │  │  ├─ ToolRegistry.executeTools() [parallel]
   │  │  ├─ Add results to state
   │  │  └─ Continue to Turn 2
   │  └─ Final output? → Exit
   │
   ├─ Turn 2..N: (same process)
   │
   └─ Return RunResult
   ↓
5. Update conversation history
   ↓
6. Format response with stats
   ↓
7. Return to MCP client
```

### Image Generation Flow

```
1. MCP Client → GeminiAIMCPServer (generate_image tool call)
   ↓
2. ImageGenerationSchema.parse(input) → validated ImageGenerationInput
   ↓
3. ImageGenerationHandler.handle(input)
   ├─ GeminiAIService.generateImage(prompt, { model, aspectRatio, imageSize })
   │  ├─ Calls Vertex AI with responseModalities: ['TEXT', 'IMAGE']
   │  └─ extractImages() → { images: GeneratedImage[], text? }
   │
   ├─ For each image:
   │  ├─ generateImageFilename(index, mimeType) → "img-{timestamp}-{NNN}.png"
   │  └─ saveImage(base64Data, imageOutputDir, filename) → saved file path
   │
   └─ Build MCP content blocks:
      ├─ text block: JSON { images: [{ filePath, mimeType }], text }
      └─ image block(s): { type: 'image', data: base64, mimeType }
   ↓
4. Return content array to MCP client
```

### Video Generation Flow

```
1. MCP Client → GeminiAIMCPServer (generate_video tool call)
   ↓
2. VideoGenerationSchema.parse(input) → validated VideoGenerationInput
   ↓
3. VideoGenerationHandler.handle(input)
   ├─ GeminiAIService.generateVideo(prompt, { model, imagePath, lastFramePath, referenceImagePaths, videoPath, ... })
   │  ├─ Read source files and encode as base64 (imagePath, lastFramePath, referenceImagePaths, videoPath)
   │  ├─ Calls client.models.generateVideos() → async operation
   │  └─ Caches operation object by operationId
   │
   └─ Build MCP content block:
      └─ text block: JSON { operationId }
   ↓
4. Return content array to MCP client
   ↓
5. MCP Client → GeminiAIMCPServer (check_video tool call)
   ↓
6. VideoGenerationHandler.handleCheck(input)
   ├─ GeminiAIService.checkVideoOperation(operationId)
   │  ├─ Calls client.operations.getVideosOperation()
   │  ├─ Returns running/failed when operation is not complete
   │  └─ Extracts completed video bytes or downloads URI result
   │
   ├─ For each completed video:
   │  ├─ generateVideoFilename(index) → "vid-{timestamp}-{NNN}.mp4"
   │  └─ saveVideo(data, videoOutputDir, filename) → saved file path
   │
   └─ text block: JSON { status: "completed", videos: [{ filePath, mimeType }] }
```

### Omni Video Generation Flow

```
1. MCP Client → GeminiAIMCPServer (generate_omni_video tool call)
   ↓
2. OmniVideoGenerationSchema.parse(input) → validated OmniVideoGenerationInput
   ↓
3. OmniVideoHandler.handle(input)
   ├─ GeminiAIService.generateOmniVideo(prompt, { model, aspectRatio, imagePaths, previousInteractionId, backend })
   │  ├─ Calls client.interactions.create() → returns the finished video synchronously
   │  ├─ Oneshot: text or text + inline reference images (imagePaths max 7)
   │  ├─ Interactive edit: previousInteractionId reuses the prior video (no re-upload)
   │  └─ Returns { interactionId, video: { data, mimeType }, text? }
   │
   ├─ generateVideoFilename(1) → "vid-{timestamp}-001.mp4"
   ├─ saveVideo(data, videoOutputDir, filename) → saved file path
   │
   └─ text block: JSON { status: "completed", interactionId, video: { filePath, mimeType }, text?, hint }
```

Unlike the Veo pipeline, there is no `operationId` and no `check_video` follow-up call — the video is available immediately.

### Speech Generation Flow

```
1. MCP Client → GeminiAIMCPServer (generate_speech tool call)
   ↓
2. SpeechGenerationSchema.parse(input) → validated SpeechGenerationInput
   ↓
3. SpeechGenerationHandler.handle(input)
   ├─ GeminiAIService.generateSpeech(prompt, { model, voiceName, languageCode, speakers })
   │  ├─ Calls client.models.generateContent() with responseModalities: ['AUDIO']
   │  └─ extractAudioParts() → { audios: GeneratedAudio[], text? }
   │
   ├─ For each audio:
   │  ├─ pcmToWav(rawPcm) when the source is not already WAV
   │  ├─ generateSpeechFilename(index, 'audio/wav')
   │  └─ saveAudio(data, speechOutputDir, filename) → saved file path
   │
   └─ Build MCP content blocks:
      ├─ text block: JSON { speech: [{ filePath, mimeType, sourceMimeType }], text? }
      └─ audio block(s): { type: 'audio', data: base64, mimeType: 'audio/wav' }
```

### Music Generation Flow

```
1. MCP Client → GeminiAIMCPServer (generate_music tool call)
   ↓
2. MusicGenerationSchema.parse(input) → validated MusicGenerationInput
   ↓
3. MusicGenerationHandler.handle(input)
   ├─ GeminiAIService.generateMusic(prompt, { model, outputMimeType, imagePaths })
   │  ├─ Calls client.models.generateContent() with responseModalities: ['AUDIO', 'TEXT']
   │  └─ extractAudioParts() → { audios: GeneratedAudio[], text? }
   │
   ├─ For each audio:
   │  ├─ generateMusicFilename(index, mimeType)
   │  └─ saveAudio(data, musicOutputDir, filename) → saved file path
   │
   └─ Build MCP content blocks:
      ├─ text block: JSON { music: [{ filePath, mimeType }], text? }
      └─ audio block(s): { type: 'audio', data: base64, mimeType }
```

### Tool Execution Flow

```
AgenticLoop detects tool calls
  ↓
ToolRegistry.executeTools() [parallel]
  ├─ Tool 1: WebFetchTool
  │  ├─ Attempt 1: HTTPS check → DNS validation → Fetch
  │  ├─ Success? → Return result
  │  └─ Failure? → Retry (backoff 1s)
  │
  ├─ Tool 2: MCP Tool (filesystem)
  │  ├─ EnhancedMCPClient.callTool()
  │  ├─ Route to StdioMCPConnection
  │  └─ JSON-RPC over stdin/stdout
  │
  └─ Collect all results
     ↓
All failed? → Fallback prompt to Gemini
Any succeeded? → Continue loop with results
```

## Schemas

All tool inputs are validated via Zod schemas defined in `src/schemas/index.ts`.

### QuerySchema

Validates the `query` tool input:

```typescript
z.object({
  prompt: z.string(),
  sessionId: z.string().optional(),
  model: z.string().optional(),  // e.g., 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'
  thinkingLevel: z.enum(['minimal','low','medium','high']).optional(),
  mediaResolution: z.enum(['low','medium','high']).optional(),
  parts: z.array(MultimodalPartSchema).optional(),
})
```

### ImageGenerationSchema

Validates the `generate_image` tool input:

```typescript
z.object({
  prompt: z.string(),
  model: z.enum(['gemini-3-pro-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image']).optional(),
  aspectRatio: z.enum(['1:1','1:4','1:8','2:3','3:2','3:4','4:1','4:3','4:5','5:4','8:1','9:16','16:9','21:9']).optional(),
  imageSize: z.enum(['0.5K', '1K', '2K', '4K']).optional(),
  imagePaths: z.array(z.string()).max(14).optional(),
  systemInstruction: z.string().optional(),
  thinkingLevel: z.enum(['minimal','high']).optional(),
  mediaResolution: z.enum(['low','medium','high']).optional(),
})
```

**Validation Refines**:
- `aspectRatio` 1:4, 1:8, 4:1, and 8:1 require `model: 'gemini-3.1-flash-image'`
- `imageSize: '0.5K'` requires `model: 'gemini-3.1-flash-image'`
- `imageSize` is not supported by `gemini-2.5-flash-image` (fixed 1K output)
- `gemini-3.1-flash-lite-image` supports `imageSize: '1K'` only (standard ratios; no `thinkingLevel`)
- `thinkingLevel` is only supported by `gemini-3.1-flash-image`
- `gemini-2.5-flash-image` accepts at most 3 reference images (other models: 14)

### VideoGenerationSchema

Validates the `generate_video` tool input:

```typescript
z.object({
  prompt: z.string(),
  backend: z.enum(['vertex', 'ai-studio']).optional(),
  model: z.enum([
    'veo-3.1-fast-generate-001', 'veo-3.1-generate-001', 'veo-3.1-lite-generate-001',
    'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview', 'veo-3.1-lite-generate-preview'
  ]).optional(), // enum is narrowed to the active backend unless both backends are configured
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
  durationSeconds: z.enum(['4', '6', '8']).optional(),
  resolution: z.enum(['720p', '1080p', '4k']).optional(),
  generateAudio: z.boolean().optional(),  // Vertex AI only; Google AI Studio has audio always on
  enhancePrompt: z.boolean().optional(),
  personGeneration: z.enum(['allow_all', 'allow_adult', 'dont_allow']).optional(),
  negativePrompt: z.string().optional(),
  seed: z.number().optional(),            // Vertex AI only
  numberOfVideos: z.number().optional(),  // max 4 on Vertex AI, fixed to 1 on Google AI Studio
  imagePath: z.string().optional(),         // image-to-video
  lastFramePath: z.string().optional(),     // interpolation (requires imagePath)
  referenceImagePaths: z.array(z.string()).optional(),  // max 3, Veo 3.1 only
  videoPath: z.string().optional(),         // Veo video extension
  compressionQuality: z.enum(['optimized', 'lossless']).optional(), // Vertex AI only
  resizeMode: z.enum(['crop', 'pad']).optional(),                   // Vertex AI only, requires imagePath
})
```

**Validation Refines**:
- `model` must match the selected backend (`-001` ids for Vertex AI, `-preview` ids for Google AI Studio)
- 1080p/4k resolution requires durationSeconds to be '8'
- `lastFramePath` requires `imagePath` (interpolation mode constraint)
- Maximum 3 reference images allowed
- `videoPath` cannot be combined with image or reference-image source modes
- `videoPath` requires 720p and returns one extended video
- Veo 3.1 Lite rejects `4k` and `referenceImagePaths`
- `generateAudio`, `seed`, `compressionQuality`, and `resizeMode` are Vertex-only controls

### OmniVideoGenerationSchema

Validates the `generate_omni_video` tool input. `gemini-omni-flash-preview` is a non-Veo video model driven through the Interactions API, so this schema is separate from `VideoGenerationSchema`:

```typescript
z.object({
  prompt: z.string(),
  model: z.enum(['gemini-omni-flash-preview']).optional(),
  backend: z.enum(['vertex', 'ai-studio']).optional(),     // defaults to ai-studio (Vertex not supported yet)
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
  imagePaths: z.array(z.string()).max(7).optional(),      // image/reference-to-video
  previousInteractionId: z.string().optional(),           // interactive editing (chain up to 3)
})
```

**Notes**:
- Output is 720p only; audio is auto-generated. Clips run a few seconds — Omni Flash exposes no structured `duration` or `system_instruction` (both unsupported by the model), so steer timing/tone within `prompt`
- Oneshot vs interactive editing: omit `previousInteractionId` for a new generation; set it to a prior call's `interactionId` to edit that video without re-uploading source media
- Runs on the Google AI Studio (Gemini API) backend only, and defaults to it regardless of the server's default backend (Vertex AI availability is deferred until it rolls out)

### SpeechGenerationSchema

Validates the `generate_speech` tool input. The schema is backend-aware: `buildSpeechGenerationSchema(useVertexAI, availableBackends)` (mirroring `buildVideoGenerationSchema`) selects the model enum for the active backend. `SpeechGenerationSchema` is kept as the Vertex default export.

```typescript
z.object({
  prompt: z.string(),
  // Vertex AI GA ids: gemini-2.5-flash-tts, gemini-2.5-pro-tts
  // Google AI Studio preview ids: gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts
  // gemini-3.1-flash-tts-preview works on both backends
  model: z.enum([/* backend-specific TTS ids */]).optional(),
  backend: z.enum(['vertex', 'ai-studio']).optional(),
  voiceName: z.string().optional(),
  languageCode: z.string().optional(),
  speakers: z.array(z.object({
    speaker: z.string(),
    voiceName: z.string(),
  })).length(2).optional(),
})
```

**Validation Refines**:
- `model` must match the selected backend's TTS ids (Vertex AI: `gemini-2.5-flash-tts`/`gemini-2.5-pro-tts`; Google AI Studio: `gemini-2.5-flash-preview-tts`/`gemini-2.5-pro-preview-tts`; `gemini-3.1-flash-tts-preview` works on both)
- `voiceName` cannot be used with `speakers`; set a voice per speaker instead

### MusicGenerationSchema

Validates the `generate_music` tool input:

```typescript
z.object({
  prompt: z.string(),
  model: z.enum(['lyria-3-clip-preview', 'lyria-3-pro-preview']).optional(),
  outputMimeType: z.enum(['audio/mp3', 'audio/wav']).optional(),
  imagePaths: z.array(z.string()).max(10).optional(),
  lyrics: z.string().optional(),
  instrumental: z.boolean().optional(),
  vocalStyle: z.string().optional(),
  durationSeconds: z.number().optional(),
  bpm: z.number().optional(),
  intensity: z.enum(['low','medium','high']).optional(),
})
```

**Validation Refines**:
- `outputMimeType: 'audio/wav'` requires `model: 'lyria-3-pro-preview'`
- `durationSeconds` requires `model: 'lyria-3-pro-preview'`
- `instrumental` cannot be combined with `lyrics` or `vocalStyle`

### SearchSchema / FetchSchema

Validate `search` and `fetch` tool inputs (simple string wrappers).

## Design Principles

### 1. Turn-Based Execution
- **OpenAI Pattern**: Multi-turn loop with state management
- **Protection**: MaxTurns prevents infinite loops
- **Benefit**: Handles complex multi-step tasks

### 2. Automatic Tool Selection
- **LLM-Driven**: Gemini decides when to use tools
- **Not Rule-Based**: No keyword matching (removed PromptAnalyzer)
- **Benefit**: More flexible and intelligent

### 3. Parallel Execution
- **OpenAI Pattern**: `Promise.all` for concurrent tools
- **Benefit**: Faster when multiple tools needed
- **Isolation**: One failure doesn't block others

### 4. Retry with Fallback
- **Retry**: Up to 2 attempts per tool (exponential backoff)
- **Fallback**: If all tools fail, use Gemini knowledge
- **Benefit**: Robust against transient failures

### 5. Structured Logging
- **File-based**: Persistent execution traces
- **Separation**: General vs reasoning logs
- **Benefit**: Debugging and analysis

### 6. MCP Standard Compliance
- **Tool Format**: MCP standard parameter schemas
- **Protocol**: JSON-RPC for stdio, REST for HTTP
- **Benefit**: Interoperability with MCP ecosystem

### 7. System Prompt Override
- **Customizable Personas**: Configure AI assistant behavior via environment variable
- **Safe Design**: Only system prompt is overridable; tool instructions remain protected
- **Backward Compatible**: Optional feature - defaults to standard prompt
- **Benefit**: Domain-specific configurations (financial analyst, code reviewer, etc.)

## System Prompt Override Architecture

### Prompt Assembly Flow

```
Configuration (GEMINI_SYSTEM_PROMPT env var)
  ↓
GeminiAIMCPServer constructor
  ↓ (passes config.systemPrompt)
ToolRegistry constructor
  ↓
getToolDefinitionsText() - Assembles complete prompt:
  ├─ getSystemPromptSection()
  │  ├─ Custom: Uses GEMINI_SYSTEM_PROMPT value
  │  └─ Default: "You are a helpful AI assistant..."
  │
  ├─ getToolDefinitionsSection()
  │  └─ Auto-generated list of available tools
  │     (WebFetch + MCP tools)
  │
  └─ getToolInstructionsSection()
     └─ Standard tool call format (protected)
        TOOL_CALL: <name>
        ARGUMENTS: <json>
  ↓
Complete prompt used in AgenticLoop
```

### Design Boundaries

**Overridable**:
- System prompt (persona, role, behavior guidelines)

**Protected (Not Overridable)**:
- Tool definitions (auto-generated from registered tools)
- Tool call format (`TOOL_CALL: / ARGUMENTS:`)
- Tool execution logic
- Security validations (HTTPS-only, IP blocking)

### Multi-Persona Setup

Different MCP client instances can configure different personas:

```
Claude Desktop Config
├─ gemini-code: SYSTEM_PROMPT="Code reviewer..."
├─ gemini-finance: SYSTEM_PROMPT="Financial analyst..."
└─ gemini-research: SYSTEM_PROMPT="Research assistant..."

Each runs as separate process with independent:
- System prompt
- Tool registry
- Conversation state
- Log files
```

## Security

### WebFetch Security Layers

1. **Protocol**: HTTPS only
2. **DNS**: Resolve hostname and check IP
3. **IP Filtering**: Block private CIDR ranges
4. **Timeout**: 30 seconds max
5. **Size Limit**: 50KB content max

### Session Security

- Cryptographically secure IDs (`crypto.randomBytes`)
- Automatic expiration
- Memory-bounded history

### Input Validation

- Zod schema validation for all inputs
- Type-safe after validation
- No SQL injection, XSS, or code injection risks

## Performance

### Optimizations

1. **Parallel Tool Execution**: Multiple tools run concurrently
2. **Static Tool Discovery**: Tools discovered once at startup
3. **In-Memory State**: No serialization overhead
4. **Streaming**: Response streaming support (future)

### Resource Management

- Session cleanup (periodic, every 60s)
- Bounded conversation history (configurable)
- Log rotation (optional, `Logger.cleanOldLogs()`)

## Migration Notes

### From Previous Architecture

**Removed**:
- `agents/PromptAnalyzer.ts` → LLM now decides autonomously
- `agents/ReasoningAgent.ts` → Gemini thinkingConfig
- `agents/DelegationAgent.ts` → EnhancedMCPClient
- `managers/MCPClientManager.ts` → EnhancedMCPClient (full implementation)

**Added**:
- `agentic/` folder (AgenticLoop, RunState, ResponseProcessor, Tool)
- `mcp/` folder (EnhancedMCPClient, Stdio/HTTP connections)
- `tools/` folder (WebFetchTool, ToolRegistry)
- `errors/` folder (SecurityError, ModelBehaviorError)
- `utils/` folder (Logger, generated file savers, security validators)
- `handlers/` folder (QueryHandler, SearchHandler, FetchHandler, generation handlers)
- Gemini 3 model support (`gemini-3.6-flash` default, `thinkingLevel` API)
- File-output generation tools (`generate_image`, `generate_video`, `check_video`, `generate_omni_video`, `generate_speech`, `generate_music`)

**Benefits**:
- Keyword-based → LLM-driven decisions
- Fixed reasoning steps → Dynamic multi-turn
- Framework code → Full MCP client implementation
- No tool support → Parallel execution with retry

## Extension Points

### Adding a New Tool

1. Implement `BaseTool` interface:
```typescript
import { BaseTool, ToolResult, RunContext } from '../agentic/Tool.js';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'Tool description for LLM';
  parameters = { /* JSON Schema */ };

  async execute(args: any, context: RunContext): Promise<ToolResult> {
    // Implementation
  }
}
```

2. Register in `ToolRegistry`:
```typescript
const myTool = new MyTool();
toolRegistry.tools.set(myTool.name, myTool);
```

### Adding External MCP Server

Update `GEMINI_MCP_SERVERS` environment variable:
```json
[
  {
    "name": "my-server",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@my-org/mcp-server"]
  }
]
```

Tools are automatically discovered and registered at startup.

### Custom Logging

Extend `Logger` class or add custom processors:
```typescript
class Logger {
  // Add custom log methods
  customEvent(event: string, data: any): void {
    this.writeLog('custom', event, data);
  }
}
```

## Testing Strategy

### Unit Testing

Test each component in isolation:

```typescript
// Example: Test ResponseProcessor
const processor = new ResponseProcessor();
const response = "TOOL_CALL: web_fetch\nARGUMENTS: {...}";
const parsed = processor.process(response);
expect(parsed.toolCalls.length).toBe(1);
```

### Integration Testing

Test agentic loop end-to-end:

```typescript
const loop = new AgenticLoop(geminiAI, toolRegistry);
const result = await loop.run("Fetch https://example.com", [], {});
expect(result.finalOutput).toContain("content");
```

### Mock Strategy

- Mock `GeminiAIService` for predictable responses
- Mock `EnhancedMCPClient` for tool testing
- Use in-memory `Logger` for test isolation

## Benefits of This Architecture

### Robustness
- MaxTurns protection against infinite loops
- Retry logic for transient failures
- Fallback to Gemini knowledge
- Best-effort responses instead of errors

### Observability
- Complete execution traces in logs
- Reasoning process recorded separately
- Tool call statistics
- Turn-by-turn debugging

### Extensibility
- Easy to add new tools (implement `BaseTool`)
- External MCP servers via config
- Custom logging extensions
- No code changes needed for new MCP tools

### Performance
- Parallel tool execution
- Static tool discovery (startup only)
- In-memory state (no serialization)

### Maintainability
- Clear separation of concerns
- Single responsibility per module
- Type-safe with TypeScript
- Comprehensive error types

### Standards Compliance
- MCP protocol for tool definitions
- OpenAI Agents SDK patterns
- JSON Schema for parameters

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Execution | Single-shot | Turn-based loop (1..10) |
| Tool Support | Framework only | Full stdio + HTTP MCP |
| Decision Making | Keyword-based | LLM autonomous |
| Reasoning | Fixed 3 steps | Dynamic (Gemini thinkingConfig) |
| Tool Execution | Sequential | Parallel with retry |
| Error Handling | Throw errors | Retry → Fallback |
| Logging | Console only | File-based (general + reasoning) |
| Code Lines | ~1500 | ~3800 (more features) |
| Architecture | Monolithic tendencies | Clean separation |

## Future Enhancements

### Potential Improvements

1. **Streaming**: Real-time response streaming
2. **Caching**: Response caching for identical queries
3. **Metrics**: Prometheus/OpenTelemetry integration
4. **Advanced Reasoning**: Multi-model reasoning (Gemini + GPT)
5. **Plugin System**: Dynamic tool registration
6. **Testing**: Comprehensive test suite
7. **Guardrails**: Input/output validation agents

## Conclusion

This architecture implements production-grade agentic capabilities:
- ✅ Robust turn-based execution
- ✅ Automatic tool orchestration
- ✅ Standards-compliant (MCP)
- ✅ Secure by design
- ✅ Observable and debuggable
- ✅ Extensible without modification

The system is ready for real-world deployment while maintaining clean code organization and following industry best practices.
