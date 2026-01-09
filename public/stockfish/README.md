# Stockfish WASM Files

This directory contains the Stockfish WASM files from [lichess-org/stockfish.wasm](https://github.com/lichess-org/stockfish.wasm).

## Files

- `stockfish.js` - Main Stockfish JavaScript wrapper
- `stockfish.wasm` - WebAssembly binary
- `stockfish.worker.js` - Web Worker script

These files are copied from the `stockfish.wasm` npm package.

## Installation

Files are installed via npm and copied to this directory:

```bash
npm install stockfish.wasm
cp node_modules/stockfish.wasm/stockfish.* public/stockfish/
```

## Requirements

SharedArrayBuffer is required for multi-threading. The following HTTP headers are configured in `next.config.ts`:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

## Browser Support

- Chrome 79+: Full support
- Firefox 79+: Full support
- Safari: No SharedArrayBuffer support (will fall back to single-threaded or error)

## Testing

After setup, test in browser console:

```javascript
// Check SharedArrayBuffer availability
import { isSharedArrayBufferAvailable } from "@/app/lib/chess";
console.log("SharedArrayBuffer:", isSharedArrayBufferAvailable());

// Test engine
import { getEngine } from "@/app/lib/chess";
const engine = getEngine();
await engine.init();
engine.onEngineUpdate(info => console.log(info));
engine.analyze("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
```
