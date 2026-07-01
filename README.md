# gemini-mcp-server

An intelligent MCP (Model Context Protocol) server that enables AI assistants to query Google AI (Gemini models) via **Vertex AI or Google AI Studio** with **agentic capabilities** - automatic tool selection, multi-turn reasoning, MCP-to-MCP delegation, and **multimodal input support**.

## Purpose

This server provides:
- **Agentic Loop**: Turn-based execution with automatic tool selection and reasoning
- **Query Gemini**: Access Gemini models via Vertex AI or Google AI Studio
- **Multimodal Support**: Send images, audio, video, and code files alongside text prompts
- **Image Generation**: Generate images using Gemini image models (gemini-3-pro-image, gemini-3.1-flash-image, gemini-3.1-flash-lite-image, gemini-2.5-flash-image)
- **Speech & Music Generation**: Generate TTS audio with Gemini TTS and music with Lyria
- **Tool Execution**: Built-in WebFetch + integration with external MCP servers
- **Multi-turn Conversations**: Maintain context across queries with session management
- **Reasoning Traces**: File-based logging of AI thinking processes
- **Gemini 3 Support**: Full support for Gemini 3 models including thinkingLevel parameter

## Key Features

### 🎭 System Prompt Customization
Customize the AI assistant's behavior and persona:
- **Domain-Specific Roles**: Configure as financial analyst, code reviewer, research assistant, etc.
- **Environment-Based**: Set via `GEMINI_SYSTEM_PROMPT` environment variable
- **Multi-Persona Support**: Run multiple servers with different personas
- **100% Backward Compatible**: Optional feature - works normally without customization
- See [PROMPT_CUSTOMIZATION.md](PROMPT_CUSTOMIZATION.md) for detailed guide and [examples/custom-prompts.md](examples/custom-prompts.md) for templates

### 🎨 Multimodal Input Support
Send images, audio, video, and code files to Gemini:
- **Images**: JPEG, PNG, WebP, HEIC, HEIF
- **Videos**: MP4, MOV, AVI, WebM, and more
- **Audio**: MP3, WAV, AAC, FLAC, and more
- **Documents/Code**: PDF, text files, code files (Python, JavaScript, etc.)
- Support for both base64-encoded inline data and Cloud Storage URIs
- See [MULTIMODAL.md](MULTIMODAL.md) for detailed documentation

### 🤖 Intelligent Agentic Loop
Inspired by OpenAI Agents SDK, the server operates as an autonomous agent:
- **Turn-based execution** (up to 10 turns per query)
- **Automatic tool selection** based on LLM decisions
- **Parallel tool execution** with retry logic
- **Smart fallback** to Gemini knowledge when tools fail

### 🔮 Gemini 3 Model Support
Full support for Gemini 3 generation models:
- **gemini-3.5-flash**: Default model — fast and capable
- **gemini-3.1-pro-preview**: High-capability reasoning model
- **gemini-3.1-flash-lite**: Cost-efficient multimodal model for high-volume workloads
- **gemini-3.1-pro-preview-customtools**: Agentic endpoint optimized for custom tools
- **thinkingLevel**: Per-query thinking budget control for Gemini 3 models
- **GEMINI_MEDIA_RESOLUTION**: Control media quality for multimodal inputs

### 🛠️ Built-in Tools
- **WebFetch**: Secure HTTPS-only web content fetching with private IP blocking
- **MCP Integration**: Dynamic discovery and execution of external MCP server tools

### 🖼️ Image Generation
Generate images directly from text prompts using Gemini image models:
- **gemini-3-pro-image**: Professional asset production with 4K resolution support (default)
- **gemini-3.1-flash-image**: High-efficiency generation with 0.5K-4K resolution and reference images
- **gemini-3.1-flash-lite-image** (Nano Banana 2 Lite): Fast, low-cost GA tier — 1K output only, standard aspect ratios, up to 14 reference images, image editing (recommended replacement for gemini-2.5-flash-image)
- **gemini-2.5-flash-image**: Fast 1K image generation and editing (legacy, retiring 2026-10-02; prefer gemini-3.1-flash-lite-image)
- Configurable aspect ratios: 1:1, 16:9, 9:16, 4:3, and more
- Images automatically saved to configurable output directory

### 🎧 Audio Generation
Generate file-based audio outputs:
- **generate_speech**: Gemini TTS single-speaker or two-speaker speech, saved as WAV
- **generate_music**: Lyria 3 music generation, saved as MP3; Gemini API/AI Studio mode can request WAV for `lyria-3-pro-preview`
- Speech defaults to `~/Music/gemini-generated/speech`; music defaults to `~/Music/gemini-generated/music`
- Generation failures return structured MCP error content with `status`, `tool`, `errorType`, `message`, and validation `issues` when available
- See [GENERATION.md](GENERATION.md), [AUDIO_GENERATION.md](AUDIO_GENERATION.md), [examples/audio-generation.md](examples/audio-generation.md), and [examples/video-generation.md](examples/video-generation.md)

### 🔎 AI-Assisted Reference Search
- **reference_search**: Answer a question from live web sources using Gemini's Google Search grounding, returning a synthesized answer plus organized citations (links) and claim→source supports in one call
- Search-scope tuning is backend-specific: Vertex AI supports `excludeDomains` and `blockingConfidence`; Google AI Studio supports `timeRange`; both support `includeImages` and grounding on explicit `urls`

### 🔐 Security First

**Multi-Layer Defense**:
- **SSRF Protection**: HTTPS-only URL fetching, private IP blocking (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x), cloud metadata endpoint blocking (AWS, GCP, Azure)
- **Prompt Injection Guardrails**: External content tagging, trust boundaries, system prompt hardening
- **File Security**: MIME type validation, executable file rejection, path traversal prevention, directory whitelist
- **Redirect Validation**: Manual redirect handling with security checks, maximum 5 redirects, cross-domain blocking
- **Content Boundaries**: 50KB size limits, external content wrapping with security tags

**Comprehensive Testing**: 69 security-focused tests covering SSRF, path traversal, MIME validation, and prompt injection.

See [SECURITY.md](SECURITY.md) for detailed security documentation and best practices.

### 📝 Observability
- File-based logging (`logs/general.log`, `logs/reasoning.log`)
- Configurable log directory or disable logging for npx/containerized environments
- Detailed execution traces for debugging
- Turn and tool usage statistics

## Prerequisites

- Node.js 18 or higher
- Google Cloud Platform account with Vertex AI enabled, or a Google AI Studio API key
- Google Cloud credentials configured for Vertex AI mode

## Quick Start

### Installation

#### Option 1: npx (Recommended)
```bash
npx -y github:mnthe/gemini-mcp-server
```

#### Option 2: From Source
```bash
git clone https://github.com/mnthe/gemini-mcp-server.git
cd gemini-mcp-server
npm install
npm run build
```

### Authentication

The server supports both Vertex AI and Google AI Studio / Gemini Developer API mode.

**Vertex AI mode:**

**Application Default Credentials (Recommended):**
```bash
gcloud auth application-default login
```

**Or use Service Account:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Google AI Studio mode:**
```bash
export GEMINI_API_KEY="your-ai-studio-api-key"
export GOOGLE_GENAI_USE_VERTEXAI="false"
```

### Configuration

**Required Environment Variables:**
```bash
# Vertex AI mode
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"

# Or Google AI Studio mode
export GEMINI_API_KEY="your-ai-studio-api-key"
export GOOGLE_GENAI_USE_VERTEXAI="false"
```

**Optional Model Settings:**
```bash
export GEMINI_MODEL="gemini-3.5-flash"  # Default model
export GEMINI_TEMPERATURE="1.0"
export GEMINI_MAX_TOKENS="8192"
export GEMINI_TOP_P="0.95"
export GEMINI_TOP_K="40"
```

**Optional Agentic Features:**
```bash
# System prompt customization
export GEMINI_SYSTEM_PROMPT="You are a specialized financial analyst AI assistant. You have access to the following tools:"

# Multi-turn conversations
export GEMINI_ENABLE_CONVERSATIONS="true"
export GEMINI_SESSION_TIMEOUT="3600"
export GEMINI_MAX_HISTORY="10"

# Logging configuration
# Default: Console logging to stderr (recommended for npx/MCP usage)
export GEMINI_LOG_TO_STDERR="true"         # Default: true (console logging)

# For file-based logging instead:
export GEMINI_LOG_TO_STDERR="false"        # Disable console, use file logging
export GEMINI_LOG_DIR="./logs"             # Log directory (default: ./logs)

# To disable logging completely:
export GEMINI_DISABLE_LOGGING="true"

# File URI support (for CLI environments only)
export GEMINI_ALLOW_FILE_URIS="true"       # Set to 'true' to allow file:// URIs (CLI tools only, NOT for desktop apps)

# Media resolution for Gemini 3 models (videoMetadata and image quality)
export GEMINI_MEDIA_RESOLUTION="medium"    # Options: low, medium, high (default: not set)

# Image generation output directory
export GEMINI_IMAGE_OUTPUT_DIR="/path/to/images"  # Default: ~/Pictures/gemini-generated
export GEMINI_VIDEO_OUTPUT_DIR="/path/to/videos"  # Default: ~/Movies/gemini-generated on macOS, ~/Videos/gemini-generated on Windows/Linux
export GEMINI_SPEECH_OUTPUT_DIR="/path/to/speech" # Default: ~/Music/gemini-generated/speech
export GEMINI_MUSIC_OUTPUT_DIR="/path/to/music"   # Default: ~/Music/gemini-generated/music

# External MCP servers (for tool delegation)
export GEMINI_MCP_SERVERS='[
  {
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "./data"]
  },
  {
    "name": "web-search",
    "transport": "http",
    "url": "http://localhost:3000/mcp"
  }
]'
```

### MCP Client Integration

Add to your MCP client configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_MODEL": "gemini-3.5-flash",
        "GEMINI_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

**Claude Code** (`.claude.json` in project root):
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_MODEL": "gemini-3.5-flash"
      }
    }
  }
}
```

**Other MCP Clients** (Generic stdio):
```bash
# Command to run
npx -y github:mnthe/gemini-mcp-server

# Or direct execution
node /path/to/gemini-mcp-server/build/index.js
```

#### Multi-Persona Setup

You can run multiple Gemini servers with different personas for specialized tasks:

```json
{
  "mcpServers": {
    "gemini-code": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_SYSTEM_PROMPT": "You are a code review specialist. Focus on code quality, security, and best practices. You have access to the following tools:"
      }
    },
    "gemini-research": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_SYSTEM_PROMPT": "You are an academic research assistant. Cite sources and provide comprehensive analysis. You have access to the following tools:"
      }
    }
  }
}
```

See [PROMPT_CUSTOMIZATION.md](PROMPT_CUSTOMIZATION.md) for comprehensive guide and [examples/custom-prompts.md](examples/custom-prompts.md) for ready-to-use templates.

## Available Tools

The server exposes ten MCP tools: `query`, `search`, `fetch`, `generate_image`, `generate_speech`, `generate_music`, `generate_video`, `check_video`, `generate_omni_video`, and `reference_search`.

### query

Main agentic entrypoint that handles multi-turn execution with automatic tool selection and **multimodal input support**.

**Parameters:**
- `prompt` (string, required): The text prompt to send
- `sessionId` (string, optional): Conversation session ID
- `model` (string, optional): Model override (e.g., `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview-customtools`)
- `thinkingLevel` (string, optional): Gemini 3 thinking level. Options: `minimal`, `low`, `medium`, `high`
- `mediaResolution` (string, optional): Global media resolution for multimodal inputs. Options: `low`, `medium`, `high`
- `parts` (array, optional): Multimodal content parts (images, audio, video, documents)

**How It Works:**
1. Analyzes the prompt and conversation history (including multimodal content)
2. Decides whether to use tools or respond directly
3. Executes tools in parallel if needed (WebFetch, MCP tools)
4. Retries failed tools with exponential backoff
5. Falls back to Gemini knowledge if tools fail
6. Continues for up to 10 turns until final answer

**Examples:**
```
# Simple text query
query: "What is the capital of France?"

# Complex query with tool usage
query: "Fetch the latest news from https://example.com/news and summarize"
→ Automatically uses WebFetch tool
→ Synthesizes content into answer

# Image analysis (multimodal)
query: "What's in this image?"
parts: [{ inlineData: { mimeType: "image/jpeg", data: "<base64>" } }]

# Multi-turn conversation
query: "What is machine learning?" (sessionId auto-created)
query: "Give me an example" (uses sessionId from previous response)
```

**Multimodal Support:**
See [MULTIMODAL.md](MULTIMODAL.md) for detailed documentation on:
- **Parts array structure and field requirements** (for agent developers)
- Supported file types (images, audio, video, documents)
- Base64 inline data vs Cloud Storage URIs
- Complete schema and validation rules
- Usage examples and code samples
- Best practices and limitations
- Common mistakes to avoid

**Response Includes:**
- Final answer
- Session ID (if conversations enabled)
- Statistics: turns used, tool calls, reasoning steps

### search

Search for information using Gemini (OpenAI MCP spec).

**Parameters:**
- `query` (string, required): Search query

**Returns:**
- `results`: Array of `{id, title, url}`

### fetch

Fetch full content of a search result (OpenAI MCP spec).

**Parameters:**
- `id` (string, required): Document ID from search results

**Returns:**
- `id`, `title`, `text`, `url`, `metadata`

### generate_image

Generate images from text prompts using Gemini image models.

**Parameters:**
- `prompt` (string, required): Image generation prompt describing what to generate
- `model` (string, optional): Image model to use. Options:
  - `gemini-3-pro-image` (default) — professional quality, supports up to 4K resolution
  - `gemini-3.1-flash-image` — high-efficiency with 0.5K-4K and reference image support
  - `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite) — fast, low-cost GA tier; 1K output only, standard aspect ratios (no `1:4`/`1:8`/`4:1`/`8:1`), no `thinkingLevel`, up to 14 reference images and image editing (recommended replacement for gemini-2.5-flash-image)
  - `gemini-2.5-flash-image` — fast 1K image generation and editing (legacy, retiring 2026-10-02; prefer gemini-3.1-flash-lite-image)
- `aspectRatio` (string, optional): Image aspect ratio. Default: `1:1`. Options: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` (`1:4`, `1:8`, `4:1`, `8:1` require `gemini-3.1-flash-image`)
- `imageSize` (string, optional): Output resolution. Default: `1K`. Options: `0.5K`, `1K`, `2K`, `4K` (`0.5K` requires `gemini-3.1-flash-image`; `gemini-3.1-flash-lite-image` supports `1K` only; omit for `gemini-2.5-flash-image`)
- `imagePaths` (array, optional): Local reference images for editing or style transfer (max 14; `gemini-2.5-flash-image` supports at most 3). Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`), HEIC (`.heic`), HEIF (`.heif`)
- `systemInstruction` (string, optional): System instruction for Gemini 3 image models
- `thinkingLevel` (string, optional): Gemini 3.1 Flash Image thinking level: `minimal` or `high`
- `mediaResolution` (string, optional): Media resolution for reference image inputs: `low`, `medium`, `high`

**Behavior:**
- Generated images are saved to `GEMINI_IMAGE_OUTPUT_DIR` (defaults to `~/Pictures/gemini-generated` on macOS, Windows, and Linux)
- Returns image data (base64) along with file paths of saved images

**Examples:**
```
# Generate a square image with default model
generate_image: "A serene mountain landscape at sunset"

# Generate a wide-format image with Nano Banana 2 at 4K
generate_image: "Futuristic cityscape at night"
model: "gemini-3.1-flash-image"
aspectRatio: "16:9"
imageSize: "4K"
```

### generate_speech

Generate speech from text using Gemini TTS models.

**Parameters:**
- `prompt` (string, required): Text or transcript to synthesize
- `model` (string, optional): Speech model. `gemini-3.1-flash-tts-preview` (default) works on both backends. The 2.5 tiers differ per backend: Vertex AI uses `gemini-2.5-flash-tts` / `gemini-2.5-pro-tts`; Google AI Studio uses `gemini-2.5-flash-preview-tts` / `gemini-2.5-pro-preview-tts`
- `voiceName` (string, optional): Prebuilt voice for single-speaker TTS. Default: `Kore`
- `languageCode` (string, optional): BCP-47 language code
- `speakers` (array, optional): Exactly two `{ speaker, voiceName }` entries for multi-speaker TTS

**Behavior:**
- Generated speech is saved to `GEMINI_SPEECH_OUTPUT_DIR` (defaults to `~/Music/gemini-generated/speech`)
- Returns MCP `audio` content and saved file paths
- Gemini TTS is text-only input; audio, image, and video reference files are not supported by `generate_speech`

### generate_music

Generate music using Lyria 3 models.

**Parameters:**
- `prompt` (string, required): Music generation prompt
- `model` (string, optional): Music model. Options: `lyria-3-clip-preview` (default), `lyria-3-pro-preview`
- `outputMimeType` (string, optional): Vertex AI mode supports `audio/mp3` only. Gemini API/AI Studio mode supports `audio/mp3`, or `audio/wav` with `lyria-3-pro-preview`
- `imagePaths` (array, optional): Local image paths for multimodal music generation inputs (max 10). Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`), HEIC (`.heic`), HEIF (`.heif`)
- `lyrics` (string, optional): User-provided lyrics
- `instrumental` (boolean, optional): Request instrumental-only output; cannot be combined with `lyrics` or `vocalStyle`
- `vocalStyle` (string, optional): Vocal generation direction
- `language` (string, optional): Output language direction. Options: English, German, Spanish, French, Hindi, Japanese, Korean, Portuguese
- `durationSeconds` (number, optional): Target duration in seconds; requires `lyria-3-pro-preview`; max 184 seconds
- `bpm` (number, optional): Tempo direction in beats per minute
- `intensity` (string, optional): `low`, `medium`, or `high`

**Behavior:**
- Generated music is saved to `GEMINI_MUSIC_OUTPUT_DIR` (defaults to `~/Music/gemini-generated/music`)
- Returns MCP `audio` content, saved file paths, and any lyrics/song-structure text returned by Lyria
- Lyria 3 Clip is fixed at 30 seconds; Lyria 3 Pro supports longer structured songs up to 184 seconds
- Lyria 3 output is 44.1 kHz, one clip per prompt; Vertex AI mode supports 192 kbps MP3 only, while Gemini API/AI Studio Pro can also request WAV
- Lyria 3 accepts text prompts and optional image references only; audio and video reference files are not supported by `generate_music`; negative prompting is not supported

### generate_video

Generate videos from text prompts using Veo video generation models.

**Parameters:**
- `prompt` (string, required): Video generation prompt describing what to generate
- `model` (string, optional): Video model to use. Default: `veo-3.1-fast-generate-001`. Options:
  - `veo-3.1-fast-generate-001` (default) — fast video generation
  - `veo-3.1-generate-001` — standard quality generation
  - `veo-3.1-lite-generate-001` — cost-efficient generation
- `aspectRatio` (string, optional): Video aspect ratio. Default: `16:9`. Options: `16:9`, `9:16`
- `durationSeconds` (string, optional): Video duration. Default: `8`. Options: `4`, `6`, `8` (1080p/4k require 8)
- `resolution` (string, optional): Video resolution. Default: `720p`. Options: `720p`, `1080p`, `4k` (1080p/4k require 8 second duration)
- `generateAudio` (boolean, optional): Generate audio for the video. Default: `true`
- `enhancePrompt` (boolean, optional): Use Veo prompt rewriting/enhancement
- `personGeneration` (string, optional): Person generation control: `allow_adult`, `dont_allow`
- `negativePrompt` (string, optional): Description of what to exclude from the video
- `seed` (number, optional): Random seed for reproducibility
- `numberOfVideos` (number, optional): Number of videos to generate. Default: `1`
- `imagePath` (string, optional): Local file path of input image for image-to-video generation. Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`)
- `lastFramePath` (string, optional): Local file path of last frame for interpolation (requires `imagePath`). Same supported image file types as `imagePath`
- `referenceImagePaths` (array, optional): Local file paths of reference images for style guidance (max 3, Veo 3.1 only). Same supported image file types as `imagePath`
- `videoPath` (string, optional): Local file path of a Veo-generated 720p MP4 (`.mp4`) video to extend

**Behavior:**
- Generated videos are saved to `GEMINI_VIDEO_OUTPUT_DIR` (defaults to `~/Movies/gemini-generated` on macOS, `~/Videos/gemini-generated` on Windows/Linux)
- `generate_video` returns an operation ID; `check_video` polls the operation and returns saved file paths when complete
- Supports text-to-video, image-to-video, interpolation, reference image, and Veo video extension modes
- Veo 3.1 Lite does not support `4k` or reference asset images; model availability can differ between Vertex AI and Google AI Studio
- Audio file references are not supported by `generate_video`; describe dialogue, sound effects, and ambience in `prompt`

**Examples:**
```
# Simple text-to-video
generate_video: "A dancing robot in a cyberpunk city"

# Text-to-video with custom settings
generate_video: "Ocean waves crashing on a beach"
model: "veo-3.1-generate-001"
aspectRatio: "16:9"
durationSeconds: "8"
resolution: "1080p"

# Image-to-video (animation)
generate_video: "Animate this image"
imagePath: "/path/to/image.jpg"

# Interpolation (morph between two frames)
generate_video: "Smooth transition"
imagePath: "/path/to/start_frame.jpg"
lastFramePath: "/path/to/end_frame.jpg"

# Video with reference images for style
generate_video: "Generate a video with cyberpunk aesthetic"
referenceImagePaths: ["/path/to/style1.jpg", "/path/to/style2.jpg"]

# Extend a previous Veo-generated video
generate_video: "Follow the subject as the scene continues into the hallway"
videoPath: "/path/to/previous-veo-output.mp4"
resolution: "720p"
```

### generate_omni_video

Generate or conversationally edit short videos with Gemini Omni Flash (`gemini-omni-flash-preview`). This is a **non-Veo** video model on the Google AI Studio (Gemini API) backend, using the Interactions API. Unlike `generate_video`/`check_video`, it is **synchronous** — a single call returns the finished, saved video (no operation ID, no polling).

**Parameters:**
- `prompt` (string, required): Video prompt for a new generation (oneshot), or a natural-language edit instruction when `previousInteractionId` is set
- `model` (string, optional): Omni video model. Options: `gemini-omni-flash-preview` (default)
- `aspectRatio` (string, optional): Aspect ratio. Default: `16:9`. Options: `16:9`, `9:16`. Output is 720p only; clips run a few seconds — steer timing within the `prompt` (Omni Flash has no structured duration parameter)
- `imagePaths` (array, optional): Local file paths of source/reference images for image-to-video or reference-to-video (max 7). Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`). Omit for interactive edits
- `previousInteractionId` (string, optional): Interaction ID from a prior `generate_omni_video` call. When set, conversationally edits that video (no image re-upload) instead of generating a new one

**Behavior:**
- Two paths: (1) **oneshot** generation — text-to-video, or image/reference-to-video via `imagePaths`; (2) **interactive** editing — set `previousInteractionId` to edit a prior video with a natural-language instruction (no image re-upload; chain up to 3 sequential edits)
- 720p output only; a synced audio track is generated automatically (audio reference inputs are not accepted — describe dialogue, sound effects, and ambience in `prompt`)
- Generated videos are saved to `GEMINI_VIDEO_OUTPUT_DIR` (defaults to `~/Movies/gemini-generated` on macOS, `~/Videos/gemini-generated` on Windows/Linux)
- The response includes `interactionId` (pass it back as `previousInteractionId` to edit) and the saved video file path

**Examples:**
```
# Oneshot text-to-video
generate_omni_video: "A golden retriever surfing a wave at sunset"
aspectRatio: "16:9"

# Image-to-video
generate_omni_video: "Animate this scene with gentle camera motion"
imagePaths: ["/path/to/frame.png"]

# Interactive edit of a prior result
generate_omni_video: "Make it night time and add rain"
previousInteractionId: "<interactionId from previous call>"
```

### reference_search

AI-assisted reference search: answer a question from live web sources using Gemini's Google Search grounding, and return organized citations. Unlike the OpenAI-spec `search`/`fetch` connector tools, this composes a synthesized answer **and** returns the source links plus claim→source supports in one call.

**Parameters:**
- `prompt` (string, required): Research question or topic to answer from live web sources
- `model` (string, optional): Gemini model override; must support Google Search grounding (default: server model)
- `excludeDomains` (array, optional): Domains to exclude from results, e.g. `["reddit.com","pinterest.com"]` (max 2000). **Vertex AI backend only**
- `blockingConfidence` (string, optional): Block risky/low-quality sites at or above this confidence. Options: `low` (most aggressive), `medium`, `high`. **Vertex AI backend only**
- `timeRange` (object, optional): Restrict results to a publish-time window (`startTime`/`endTime`, both required RFC 3339). **Google AI Studio backend only**
- `includeImages` (boolean, optional): Also enable image-search grounding in addition to web search
- `urls` (array, optional): Specific http(s) URLs to ground the answer on via URL context (max 20; both backends)
- `systemInstruction` (string, optional): System instruction to steer the tone, depth, or scope of the answer
- `thinkingLevel` (string, optional): Gemini 3 thinking level override. Options: `minimal`, `low`, `medium`, `high`

**Behavior:**
- Returns a JSON payload: `answer` (synthesized text), `citations` (deduped `{index,title,uri,domain}` sources), `supports` (answer segments mapped to citation indices with confidence scores), `searchQueries` (the queries the model actually ran), and `searchSuggestionsHtml` (Google's required Search Suggestions markup to display alongside the answer)
- Search-scope tuning is backend-asymmetric — invalid combinations are rejected at validation with a structured error naming the supported backend
- When `urls` are supplied, a URL context tool is added so the model also grounds on those specific pages

**Examples:**
```
# Recency-tuned research on Google AI Studio
reference_search: "What changed in the latest Gemini API pricing?"
backend: "ai-studio"
timeRange: { "startTime": "2026-06-01T00:00:00Z", "endTime": "2026-07-01T00:00:00Z" }

# Curated web research on Vertex AI (skip low-signal domains)
reference_search: "Production best practices for MCP servers"
excludeDomains: ["reddit.com", "pinterest.com"]
blockingConfidence: "medium"

# Ground on specific pages
reference_search: "Summarize the key points from these docs"
urls: ["https://ai.google.dev/gemini-api/docs/grounding"]
```

## Security

The gemini-mcp-server implements comprehensive security measures to protect against common vulnerabilities. See [SECURITY.md](SECURITY.md) for complete documentation.

### Defense Layers

#### 1. SSRF (Server-Side Request Forgery) Protection
- **HTTPS-only**: HTTP requests are blocked; only HTTPS is allowed for web resources
- **Private IP blocking**: Blocks access to internal networks (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x)
- **Cloud metadata blocking**: Prevents access to AWS, GCP, Azure, and Alibaba Cloud metadata endpoints
- **Redirect validation**: All redirects are manually validated; cross-domain redirects are blocked

#### 2. Prompt Injection Guardrails
- **Trust boundaries**: Clear separation between user input (trusted) and external content (untrusted)
- **Content tagging**: All fetched web content is wrapped in `<external_content>` tags with security warnings
- **System prompt hardening**: Built-in instructions to ignore malicious commands in external content
- **Information disclosure protection**: Guidelines prevent revealing system prompts or internal details

#### 3. File Security (Multimodal Content)
- **MIME type validation**: Only known safe types (images, video, audio, PDF, code) are allowed
- **Executable rejection**: Blocks `.exe`, `.sh`, `.dll`, and other executable file types
- **Path traversal prevention**: All paths are normalized and validated against a whitelist
- **Directory whitelist**: Local files only allowed in safe directories (cwd, Documents, Downloads, Desktop)
- **URI scheme validation**: Only `gs://`, `https://`, and conditionally `file://` URIs are allowed

#### 4. Content Boundaries
- **Size limits**: Web content limited to 50KB to prevent resource exhaustion
- **Content type validation**: Basic validation of response content types
- **Encoding validation**: Proper handling of character encodings

### Configuration

#### File Security (Multimodal)
```bash
# Default: false (secure) - file:// URIs are disabled
export GEMINI_ALLOW_FILE_URIS="false"

# For CLI environments only - enables local file:// URIs with whitelist validation
export GEMINI_ALLOW_FILE_URIS="true"
```

**Security Note**: Never enable `GEMINI_ALLOW_FILE_URIS` in production or web-facing applications. It's designed for trusted CLI environments only.

#### Security Monitoring
```bash
# Enable logging to monitor security events
export GEMINI_DISABLE_LOGGING="false"
export GEMINI_LOG_DIR="/var/log/gemini-mcp"

# Log to stderr for real-time monitoring
export GEMINI_LOG_TO_STDERR="true"
```

### Best Practices

#### For Desktop Applications (Recommended)
```json
{
  "mcpServers": {
    "gemini": {
      "env": {
        "GEMINI_ALLOW_FILE_URIS": "false"
      }
    }
  }
}
```

#### For CLI Tools (Use with Caution)
```bash
export GEMINI_ALLOW_FILE_URIS="true"
export GEMINI_LOG_TO_STDERR="true"
```

### Security Testing

Run comprehensive security test suite:
```bash
# All security tests
npx tsx test/url-security-test.ts        # 21 tests - SSRF protection
npx tsx test/file-security-test.ts       # 34 tests - File validation
npx tsx test/webfetch-security-test.ts   # 5 tests - Content tagging
npx tsx test/security-guidelines-test.ts # 3 tests - Prompt injection
npx tsx test/multimodal-security-test.ts # 6 tests - Multimodal files
```

**Total**: 69 security-focused tests covering SSRF, path traversal, MIME validation, and prompt injection.

For detailed security information, threat models, and vulnerability reporting, see [SECURITY.md](SECURITY.md).

## Architecture

### Agentic Loop

```
User Query
  ↓
┌─── Turn 1..10 Loop ───┐
│                        │
│  1. Build Prompt       │
│     + Tool Definitions │
│     + History          │
│                        │
│  2. Gemini Generation  │
│     (with thinking)    │
│                        │
│  3. Parse Response     │
│     - Reasoning?       │
│     - Tool Calls?      │
│     - Final Output?    │
│                        │
│  4. Execute Tools      │
│     (parallel + retry) │
│                        │
│  5. Check MaxTurns     │
│     Continue or Exit?  │
│                        │
└────────────────────────┘
  ↓
Final Result + Stats
```

### Project Structure

```
src/
├── agentic/           # Core agentic loop
│   ├── AgenticLoop.ts       # Main orchestrator
│   ├── RunState.ts          # Turn-based state management
│   ├── ResponseProcessor.ts # Parse Gemini responses
│   └── Tool.ts              # Tool interface (MCP standard)
│
├── mcp/               # MCP client implementation
│   ├── EnhancedMCPClient.ts # Unified stdio + HTTP client
│   ├── StdioMCPConnection.ts
│   └── HttpMCPConnection.ts
│
├── tools/             # Tool implementations
│   ├── WebFetchTool.ts      # Secure web fetching
│   └── ToolRegistry.ts      # Tool management + parallel execution
│
├── services/          # External services
│   └── GeminiAIService.ts   # Gemini API (with thinkingConfig, image generation)
│
├── handlers/          # MCP tool handlers
│   ├── QueryHandler.ts
│   ├── SearchHandler.ts
│   ├── FetchHandler.ts
│   └── ImageGenerationHandler.ts  # Image generation via Gemini image models
│
├── managers/          # Business logic
│   └── ConversationManager.ts
│
├── errors/            # Custom error types
├── types/             # TypeScript type definitions
├── schemas/           # Zod validation schemas (including ImageGenerationSchema)
├── config/            # Configuration loading
├── utils/             # Shared utilities (Logger, security, imageSaver)
│
└── server/            # MCP server bootstrap
    └── GeminiAIMCPServer.ts
```

See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Advanced Usage

### External MCP Servers

Connect to external MCP servers for extended capabilities:

**Stdio (subprocess):**
```bash
export GEMINI_MCP_SERVERS='[
  {
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]
  }
]'
```

**HTTP:**
```bash
export GEMINI_MCP_SERVERS='[
  {
    "name": "api-server",
    "transport": "http",
    "url": "https://api.example.com/mcp",
    "headers": {"Authorization": "Bearer token"}
  }
]'
```

Tools from external servers are automatically discovered and made available to the agent.

### Reasoning Traces

**Default: Console Logging**

Logs are sent to stderr by default, making them visible in MCP client logs.

**For File-Based Logging:**
```bash
export GEMINI_LOG_TO_STDERR="false"        # Disable console, use files
export GEMINI_LOG_DIR="./logs"             # Log directory (default: ./logs)
```

Then check logs:
```bash
tail -f logs/general.log     # All logs
tail -f logs/reasoning.log   # Gemini thinking process only
```

**To Disable All Logging:**
```bash
export GEMINI_DISABLE_LOGGING="true"
```

### Custom Tool Development

Tools follow MCP standard:

```typescript
import { BaseTool, ToolResult, RunContext } from './agentic/Tool.js';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'Description for LLM';
  parameters = {
    type: 'object',
    properties: {
      arg: { type: 'string', description: 'Argument' }
    },
    required: ['arg']
  };

  async execute(args: any, context: RunContext): Promise<ToolResult> {
    // Your implementation
    return {
      status: 'success',
      content: 'Result'
    };
  }
}
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Development Mode
```bash
npm run dev
```

## Troubleshooting

### MCP Server Connection Issues

If the MCP server appears to be "dead" or disconnects unexpectedly:

**Check MCP client logs** (logs are sent to stderr by default):
- **macOS**: `~/Library/Logs/Claude/mcp*.log`
- **Windows**: `%APPDATA%\Claude\Logs\mcp*.log`

Server logs will appear in these files automatically.

### Log Directory Errors

If you encounter errors like `ENOENT: no such file or directory, mkdir './logs'`:

**This should not happen with default settings** (console logging is default).

If you enabled file logging (`GEMINI_LOG_TO_STDERR="false"`):

**Solution:** Use a writable log directory:
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GEMINI_LOG_TO_STDERR": "false",
        "GEMINI_LOG_DIR": "/tmp/gemini-logs"
      }
    }
  }
}
```

### Authentication Errors
1. Verify credentials: `gcloud auth application-default login`
2. Check project ID: `echo $GOOGLE_CLOUD_PROJECT`
3. Enable Vertex AI API: `gcloud services enable aiplatform.googleapis.com`

### Tool Execution Failures
- Check logs in `logs/general.log` (if logging is enabled)
- Verify MCP server configurations in `GEMINI_MCP_SERVERS`
- Ensure external servers are running (for HTTP transport)

### MaxTurns Exceeded
- Agent returns best-effort response after 10 turns
- Check if tools are repeatedly failing
- Review reasoning logs to understand loop behavior (if logging is enabled)

## Documentation

- [SECURITY.md](SECURITY.md) - **Security documentation and best practices**
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and agentic loop design
- [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) - Code organization
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [BUILD.md](BUILD.md) - Build and release process
- [MULTIMODAL.md](MULTIMODAL.md) - Multimodal content guide
- [PROMPT_CUSTOMIZATION.md](PROMPT_CUSTOMIZATION.md) - System prompt customization
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
