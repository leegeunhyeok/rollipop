---
"rollipop": patch
---

Always use the filesystem bundle store and drop the `BUNDLE_STORE` env var. Bundles are now written to disk on every build for easier debugging; user-modified files take precedence until the next rebuild overwrites them.
