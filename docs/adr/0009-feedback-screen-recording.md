---
status: accepted
---

# Screen recording: a second, optional Asset on a Feedback

A Feedback may carry a short **Screen recording** — a capture of the sequence that
produced the defect — *in addition to* its screenshot. A still frame shows the end
state; the recording shows how the reviewer got there, which is what makes a bug
reproducible.

## Shape

- A new nullable `Feedback.recordingId` FK to `Asset`, alongside (never replacing)
  `screenshotId`. Both are independently nullable: a Feedback may have both, either,
  or neither, and every read path must render the absent branch.
- No new storage model. `Asset` already carries `mimeType`, `size`, `provider` and a
  `metadata` escape hatch, so it is media-agnostic as it stands.
- Recordings are **private**, like screenshots: the object is never public, and every
  read path mints a short-lived presigned GET URL through `getSignedAssetUrl`. An
  unsigned request to the bucket stays refused.
- Key convention: `feedback-recordings/{projectId}/{uuid}.{webm|mp4}`.

## Upload: a sibling route, not a mode flag on the screenshot route

`PUT /api/v1/feedback/:id/recording` is its own route rather than a branch inside
`PUT /api/v1/feedback/:id/screenshot`, because the two differ in every dimension that
route actually decides: allowed MIME types, byte cap, rate-limit bucket, storage key
prefix, and the 409 conflict message. Folding them together would make the 5 MB
screenshot guard depend on request content — a mutable limit on a path that is in
production use — for no gain beyond one fewer file.

A recording is attached **after** the Feedback exists; it is never accepted inline on
`POST /api/v1/feedback`. Submitting a report should not be gated on the upload of the
largest artifact it carries: if the video upload fails, the report itself must still
land. The create response therefore always reports `recordingUrl: null`.

## Limits: duration is the control, bytes are the backstop

**The 30-second cap is the decision this ADR turns on.** Every other number follows
from it. Bounding the artifact at the source — the reviewer stops recording, or the
widget stops for them — is what makes a screen recording fit through a request body at
all. A byte cap alone would reject the upload *after* the reviewer had already spent
the effort, which is the worst possible moment to say no.

The arithmetic, so the next person changing a number knows what they are trading
against:

| | |
|---|---|
| Duration | **30 s** (`FEEDBACK_RECORDING_MAX_DURATION_MS`) |
| Bitrate | **~600 kbps** recommended to the widget |
| Frame rate | **12 fps** recommended to the widget |
| Expected artifact | **~2.2 MB** |
| Byte backstop | **8 MB** default (`FEEDBACK_RECORDING_MAX_BYTES`) |
| Platform ceiling | **4.5 MB** on Vercel |

2.2 MB sits comfortably inside the 4.5 MB platform ceiling with room for a busy screen.
The 8 MB backstop exists for a pathological encoder — a VP8 fallback on a video-heavy
page can reach ~2 Mbps, which is 7.5 MB in 30 seconds — and on Vercel it clamps to 4.5
anyway. Raising the duration is what breaks this; raising the bitrate is what breaks it
second.

### Codec and quality

We do not need high quality, and that is worth exploiting. Screen content is long
stretches of identical pixels punctuated by small deltas, so **dropping the frame rate
cuts size far more than lowering the bitrate does** — hence 12 fps requested via
`getDisplayMedia({ video: { frameRate } })`.

Codec preference is **negotiated, never hardcoded**: the widget walks
`preferredTypes` with `MediaRecorder.isTypeSupported()` and takes the first hit —
`video/webm;codecs=vp9` → `vp8` → `video/mp4`. VP9 leads because it compresses static
UI best. Safari supports none of the WebM entries and emits H.264/AAC in MP4, which is
why MP4 is in the allow-list and last in the preference order. (Verified in Chrome 151:
vp9, vp8, av01 and mp4/avc1 are all supported; the preference list is deliberately
shorter than that, since av01 encode is slow enough to be a poor default.)

### Types accepted

`video/webm` and `video/mp4`, compared on the **base** type. `MediaRecorder` reports
`video/webm;codecs=vp9,opus`; an exact allow-list match against the raw value — which
is what the screenshot route does for images — would reject every real recording.

### Rate

**20 uploads/hour/project**, its own bucket rather than the shared `submit` budget of
100/h. A recording is several times the bytes of a screenshot, and charging them to the
same bucket would put one project's worst-case hourly ingest an order of magnitude
above what a screenshot-only budget implies.

The cap is enforced **twice**: once against `Content-Length` *before* `formData()`
buffers anything, which is the check that actually bounds the denial-of-service
surface, and once against the materialised buffer, which catches an absent or lying
header. The duration bound is enforced server-side too, but it is self-reported and
therefore coarse — the byte cap is what really constrains an upload.

### Every limit is configuration, not a constant

`FEEDBACK_RECORDING_MAX_BYTES`, `FEEDBACK_RECORDING_MAX_DURATION_MS` and
`FEEDBACK_SCREENSHOT_MAX_BYTES` are read from the environment with the defaults above.
A self-hoster who sets 50 MB gets 50 MB. The platform clamp described below is a safety
ceiling applied on top, never the source of the number.

## Deployment constraint, and how the widget learns about it

The handler buffers the whole file in memory, so the effective ceiling is whatever the
host allows as a request body. **This deployment is on Vercel** (project `faster-fixes`,
serving `fixes.straightarrow.ai`), where a Serverless Function's request body is capped
at 4.5 MB with no way to raise it. The platform rejects the request before the handler
runs, so our own 413 never fires and the reviewer sees a platform error page.

Rather than pick one number and hope, `clampToPlatformLimit()` takes the minimum of an
app-level cap and the platform ceiling when `VERCEL` is set, and
`GET /api/v1/widget/config` publishes the result. The widget reads it and stops
recording at the limit, so a reviewer is told the bound before they record rather than
after. Hard-coding the cap in the widget would put the same number in two places, one of
which is deployed separately and cannot be corrected.

### This was already a live bug for screenshots

The screenshot route's 5 MB cap has always sat above the 4.5 MB platform line, so its
top 0.5 MB was dead: a reviewer on a hi-DPI display whose PNG landed between the two
limits got a platform error page instead of the route's actionable 413, and the widget
had no way to know the real bound. The same clamp is now applied to both screenshot
paths (`POST /api/v1/feedback` and `PUT /api/v1/feedback/:id/screenshot`) and published
as `screenshot.maxBytes`. The self-hosted number is unchanged at 5 MB.

## Considered options (rejected)

- **Reusing `screenshotId` for whichever medium was captured** — rejected: it makes the
  two mutually exclusive, when the requirement is explicitly "in addition to, not
  instead of". It would also silently change the meaning of every existing row.
- **A presigned direct-to-storage upload** (`client → storage`, the pattern
  `/api/upload` already uses for logos and avatars) — the right long-term answer:
  it removes the body-size ceiling and the memory cost entirely. Deferred because
  that route authenticates a dashboard **session**, and the widget has only a
  Reviewer token, so it needs a second authorisation path — a larger change than
  this feature warrants, and one that should be made for screenshots and recordings
  together rather than for recordings alone.
- **Transcoding or re-encoding server-side** — rejected: it turns a request handler
  into a media pipeline. The widget picks the codec its browser supports and we store
  the bytes.
- **Putting the recording URL into the mirrored GitHub / Jira / Linear issue body and
  the Slack message** — rejected as a decision, not omitted by oversight. Those surfaces
  embed the screenshot because a tracker rehosts or proxies an image; a presigned video
  URL expires in an hour and would leave a permanent issue carrying a permanently dead
  link, which is worse than carrying none. The issue body already links back to the
  dashboard, which mints a fresh URL on every load. Revisit only if a medium is found
  that can hold a durable reference without making the object public.
- **Storing duration by demuxing the file** — rejected: the widget already knows the
  wall-clock length of what it recorded. It reports `durationMs` as an optional form
  field, stored in `Asset.metadata`; a missing value is normal and renders as unknown.
- **Hardcoding the caps as constants** — rejected: the right number depends on the
  deployment, and the one deployment we control is on a platform whose ceiling is lower
  than any sensible app-level cap. Configuration plus a published effective value lets
  the same code serve both without the widget guessing.
