---
"rollipop": patch
---

Add a `GET /bundlers/:id/status` dev-server endpoint that returns the current lifecycle state of the bundler with that id as a JSON snapshot — `{ "id": "<id>", "status": "idle" | "building" | "build-done" | "build-failed" }`. `:id` matches the bundler id carried in build SSE events. Unknown ids return 404 with `{ "error": "not found" }`. Bare `/status` is unaffected and keeps returning the React Native community middleware's `packager-status:running` response.
