import { checkRateLimit } from "@/server/api/check-rate-limit";
import { resolveProject } from "@/server/api/resolve-project";
import { resolveRequestOrigin } from "@/server/api/resolve-request-origin";
import { validateReviewer } from "@/server/api/validate-reviewer";
import {
  ALLOWED_RECORDING_TYPES,
  effectiveMaxRecordingBytes,
  maxRecordingDurationMs,
  recordingExtension,
} from "@/server/feedback/recording-limits";
import { s3Client } from "@/server/storage";
import { createAsset } from "@/server/storage/create-asset";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { putObject } from "@better-upload/server/helpers";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

// Multipart framing (boundaries, part headers) adds a few hundred bytes on top
// of the file itself. Allow a small margin so a file exactly at the cap is not
// rejected by the pre-read guard, which sees the whole envelope.
const MULTIPART_OVERHEAD_ALLOWANCE = 8 * 1024;

/**
 * MediaRecorder reports its MIME with codec parameters attached
 * ("video/webm;codecs=vp9,opus"). Compare on the base type only — an exact
 * allow-list match against the raw value rejects every real recording.
 */
function baseMimeType(value: string): string {
  return value.split(";")[0]!.trim().toLowerCase();
}

// PUT /api/v1/feedback/:id/recording — attach a screen recording after creation
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const project = await resolveProject(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resolveRequestOrigin(req.headers, project).allowed) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const reviewerToken = req.headers.get("x-reviewer-token");
  const reviewer = await validateReviewer(reviewerToken, project.id);
  if (!reviewer) {
    return NextResponse.json(
      { error: "Invalid reviewer token" },
      { status: 403 },
    );
  }

  // Recordings get their own, much tighter bucket than `submit`. A recording is
  // ~4x the bytes of a screenshot, so sharing the 100/h submit budget would put
  // the per-project hourly ingest ceiling in the gigabytes.
  const { allowed } = await checkRateLimit(project.id, "recording");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  const maxBytes = effectiveMaxRecordingBytes();
  const limitLabel = `${Math.floor(maxBytes / (1024 * 1024))}MB`;

  // Refuse oversized bodies before `formData()` buffers them into memory. This
  // is the guard that actually bounds the DoS surface; the post-read length
  // check below only catches a lying or absent Content-Length.
  const declaredLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes + MULTIPART_OVERHEAD_ALLOWANCE
  ) {
    return NextResponse.json(
      { error: `Recording exceeds ${limitLabel} limit` },
      { status: 413 },
    );
  }

  const feedback = await prisma.feedback.findFirst({
    where: { id, projectId: project.id },
  });
  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  // Don't overwrite an existing recording — mirrors the screenshot route, and
  // keeps a retry from stranding the first upload's object in the bucket.
  if (feedback.recordingId) {
    return NextResponse.json(
      { error: "Recording already attached" },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const recordingField = formData.get("recording");
  if (!(recordingField instanceof File)) {
    return NextResponse.json(
      { error: "Missing recording file" },
      { status: 400 },
    );
  }

  const mimeType = baseMimeType(recordingField.type);
  if (!ALLOWED_RECORDING_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Invalid recording type. Allowed: WebM, MP4" },
      { status: 400 },
    );
  }

  // Optional: the widget knows the wall-clock length of what it recorded; the
  // server cannot derive it without demuxing. Stored on the Asset so the
  // dashboard can label a clip before fetching a byte of it.
  //
  // The duration bound is enforced here as well as in the widget because the
  // widget's stop-at-30s is a client-side courtesy, not a control — this route
  // is reachable with any body. It is a coarse guard, though: the value is
  // self-reported, so the byte cap is what actually bounds an upload.
  const maxDurationMs = maxRecordingDurationMs();
  let durationMs: number | undefined;
  const durationField = formData.get("durationMs");
  if (durationField !== null) {
    const parsed = Number(durationField);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maxDurationMs) {
      return NextResponse.json(
        { error: `Invalid durationMs (max ${maxDurationMs})` },
        { status: 400 },
      );
    }
    durationMs = parsed;
  }

  const buffer = Buffer.from(await recordingField.arrayBuffer());
  if (buffer.length > maxBytes) {
    return NextResponse.json(
      { error: `Recording exceeds ${limitLabel} limit` },
      { status: 413 },
    );
  }

  const ext = recordingExtension(mimeType);
  const key = `feedback-recordings/${project.id}/${crypto.randomUUID()}.${ext}`;
  const bucket = process.env.STORAGE_BUCKET_NAME!;

  await putObject(s3Client, {
    bucket,
    key,
    body: buffer,
    contentType: mimeType,
  });

  const asset = await createAsset({
    key,
    bucket,
    // "r2" matches the screenshot path: buildAssetUrl()'s r2 branch is the one
    // that resolves through NEXT_PUBLIC_STORAGE_BASE_URL, which is what this
    // self-hosted Supabase Storage deployment uses. Not a Cloudflare claim.
    provider: "r2",
    filename: `recording.${ext}`,
    mimeType,
    size: buffer.length,
    ...(durationMs !== undefined ? { metadata: { durationMs } } : {}),
  });

  const updated = await prisma.feedback.update({
    where: { id },
    data: { recordingId: asset.id },
    include: {
      recording: { select: { key: true, provider: true, bucket: true } },
    },
  });

  const recordingUrl = updated.recording
    ? await getSignedAssetUrl(updated.recording)
    : null;

  return NextResponse.json({ recordingUrl });
}
