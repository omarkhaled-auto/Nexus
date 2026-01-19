# Gemini CLI Research

## Installation
- Already installed via: `npm install -g @anthropic-ai/gemini-cli` (or similar)
- Path: `/c/Users/Omar Khaled/AppData/Roaming/npm/gemini`
- Version tested: 0.24.0

## Authentication
- Method: OAuth/gcloud auth (cached credentials)
- The CLI outputs "Loaded cached credentials." on startup
- No explicit API key environment variable needed when using gcloud auth
- Can alternatively use API key via environment variable (needs verification)

## Command Format
- Basic positional: `gemini "prompt here"`
- Via stdin: `echo "prompt" | gemini`
- With flags: `gemini --model gemini-2.5-pro --yolo -o json "prompt"`
- Deprecated flag: `-p, --prompt` (use positional prompt instead)

## Output Formats
Three output formats available via `-o, --output-format`:

### 1. `text` (default)
- Plain text output
- Human-readable format
- Includes all CLI startup messages

### 2. `json`
Full JSON response with structure:
```json
{
  "session_id": "uuid",
  "response": "The actual response text",
  "stats": {
    "models": {
      "model-name": {
        "api": { "totalRequests": 1, "totalErrors": 0, "totalLatencyMs": 2447 },
        "tokens": { "input": 16353, "prompt": 16353, "candidates": 2, "total": 16371, "cached": 0, "thoughts": 16, "tool": 0 }
      }
    },
    "tools": { "totalCalls": 0, ... },
    "files": { "totalLinesAdded": 0, "totalLinesRemoved": 0 }
  }
}
```

### 3. `stream-json`
NDJSON (Newline-Delimited JSON) streaming format:
```json
{"type":"init","timestamp":"...","session_id":"...","model":"auto-gemini-3"}
{"type":"message","timestamp":"...","role":"user","content":"..."}
{"type":"message","timestamp":"...","role":"assistant","content":"partial","delta":true}
{"type":"result","timestamp":"...","status":"success","stats":{...}}
```

## Useful Flags

| Flag | Description |
|------|-------------|
| `-o, --output-format` | `text`, `json`, or `stream-json` |
| `-m, --model` | Specify model (e.g., `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview`) |
| `-y, --yolo` | Auto-approve all tool calls (non-interactive) |
| `--approval-mode` | `default`, `auto_edit`, or `yolo` |
| `-s, --sandbox` | Run in sandbox mode |
| `-d, --debug` | Enable debug output |
| `-r, --resume` | Resume previous session |
| `--include-directories` | Additional directories for context |
| `-e, --extensions` | Specify extensions to use |

## Example Commands

```bash
# Simple non-interactive prompt with JSON output
echo "Say hello" | gemini -o json --yolo

# Specify model
echo "Analyze this code" | gemini -o json --yolo --model gemini-2.5-pro

# Stream response
echo "Long task" | gemini -o stream-json --yolo

# Include additional directories
gemini --yolo -o json --include-directories ./src "Review code"
```

## Key Implementation Notes for GeminiCLIClient

1. **Use `--yolo` flag** for non-interactive operation
2. **Use `-o json`** for structured output (easier to parse)
3. **Use `-o stream-json`** for streaming responses
4. **Response is in `response` field** of JSON output
5. **Token usage available** in `stats.models.<model>.tokens`
6. **Stderr contains startup messages** (server loading, extension loading)
7. **Exit code 0** on success
8. **Model selection** via `--model` flag

## Limitations

1. **Startup overhead**: CLI loads extensions and MCP servers on each invocation
2. **stderr noise**: Even with JSON output, stderr contains loading messages
3. **Session-based**: Each invocation creates a new session
4. **No direct tool definition**: Tools are managed via MCP servers, not CLI args
5. **Cached credentials**: Relies on gcloud auth, may need re-auth periodically

## Differences from ClaudeCodeCLIClient

| Aspect | Claude Code CLI | Gemini CLI |
|--------|-----------------|------------|
| Output format | JSON via `--output-format json` | JSON via `-o json` |
| Non-interactive | `--print` flag | `--yolo` flag |
| Streaming | `--stream` | `-o stream-json` |
| Model selection | `--model` | `-m, --model` |
| Input method | Stdin or file | Stdin or positional arg |
| Tool handling | Built-in tool format | MCP server based |
