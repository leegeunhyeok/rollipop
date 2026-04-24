---
"rollipop": patch
---

Include `src/runtime/hmr-client.ts` in the published tarball. The `./hmr-client` export maps to this raw TypeScript source, but the `files` field in `package.json` only listed `bin`, `dist`, and `client.d.ts` — so consumers hitting `import 'rollipop/hmr-client'` against a published version would fail to resolve the file.
