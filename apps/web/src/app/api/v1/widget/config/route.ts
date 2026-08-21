import { checkRateLimit } from "@/server/api/check-rate-limit";
import { resolveProject } from "@/server/api/resolve-project";
import { validateOrigin } from "@/server/api/validate-origin";
import { resolveOrganizationPlan } from "@/server/auth/subscription/resolve-organization-plan";
import {
  ALLOWED_RECORDING_TYPES,
  effectiveMaxRecordingBytes,
  maxRecordingDurationMs,
  PREFERRED_RECORDING_TYPES,
  RECOMMENDED_RECORDING_ENCODING,
} from "@/server/feedback/recording-limits";
import {
  ALLOWED_SCREENSHOT_TYPES,
  effectiveMaxScreenshotBytes,
} from "@/server/feedback/screenshot-limits";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const project = await resolveProject(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!validateOrigin(req.headers, project.domain)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(project.id, "read");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  const config = project.widgetConfig;
  const plan = await resolveOrganizationPlan(project.organizationId, prisma);

  return NextResponse.json({
    enabled: config?.enabled ?? true,
    branding: !plan.limits.whiteLabel,
    // Published so the widget can downscale or refuse up front and say why,
    // instead of letting a reviewer capture something and then discover the
    // upload is refused — or, above the platform ceiling, get an error page
    // from the host that this app never sees. Both ceilings are
    // deployment-dependent, so the widget must read them rather than hard-code
    // a number.
    screenshot: {
      maxBytes: effectiveMaxScreenshotBytes(),
      allowedTypes: ALLOWED_SCREENSHOT_TYPES,
    },
    recording: {
      maxBytes: effectiveMaxRecordingBytes(),
      maxDurationMs: maxRecordingDurationMs(),
      allowedTypes: ALLOWED_RECORDING_TYPES,
      preferredTypes: PREFERRED_RECORDING_TYPES,
      recommendedEncoding: RECOMMENDED_RECORDING_ENCODING,
    },
  });
}
