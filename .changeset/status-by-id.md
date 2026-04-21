---
"rollipop": patch
---

Add a `GET /status/:id` dev-server endpoint that returns the current lifecycle state of the bundler with that id (`idle` / `building` / `build-done` / `build-failed`) as plain text. `:id` matches the bundler id carried in build SSE events. Bare `/status` continues to return the React Native community middleware's `packager-status:running` response.
