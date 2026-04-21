---
"rollipop": patch
---

Drop the filesystem-cache class now that rolldown owns the build cache natively. The unused `BundlerContext.cache` field, the `FileSystemCache` class, and the `Cache` interface are removed. The remaining live pieces — resolving the cache directory and clearing it — live in `src/utils/reset-cache.ts` as plain functions (`getCacheDirectory`, `resetCache`). The `/reset-cache` control endpoint, the `reset_cache` MCP tool, and the `--reset-cache` CLI flag all continue to work unchanged for callers.
