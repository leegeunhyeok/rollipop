---
"rollipop": patch
---

Add a `GET /bundlers/:id/status` dev-server endpoint. It returns the most recent build-lifecycle event for the bundler with that id as JSON — shaped exactly like the event that would arrive live on `/sse/events` (`bundle_build_started` / `bundle_build_done` / `bundle_build_failed`). `null` is returned when no build has been observed yet; unknown ids return 404 with `{ "error": "not found" }`. Bare `/status` is unaffected and keeps returning the React Native community middleware's `packager-status:running` response.
