---
"rollipop": patch
---

Add a `GET /bundlers/:id/status` dev-server endpoint that returns the current lifecycle state of the bundler with that id (`idle` / `building` / `build-done` / `build-failed`) as plain text. `:id` matches the bundler id carried in build SSE events. Bare `/status` is unaffected and keeps returning the React Native community middleware's `packager-status:running` response.
