"use server";

import { parseEnvironmentColors } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import { parseFeedbackTags } from "./parse-feedback-tags";
import { readRecordingDurationMs } from "@/server/feedback/recording-metadata";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

export const getFeedback = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { prisma, session } = ctx;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const feedback = await prisma.feedback.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: { id: true, name: true } },
        assignee: {
          select: {
            id: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        screenshot: {
          select: { id: true, key: true, provider: true, bucket: true },
        },
        recording: {
          select: {
            id: true,
            key: true,
            provider: true,
            bucket: true,
            metadata: true,
          },
        },
        issueLink: {
          select: {
            issueNumber: true,
            issueUrl: true,
            issueState: true,
          },
        },
        linearIssueLink: {
          select: {
            issueId: true,
            issueIdentifier: true,
            issueUrl: true,
            issueStateType: true,
          },
        },
        jiraIssueLink: {
          select: {
            issueId: true,
            issueKey: true,
            issueUrl: true,
            issueStatusCategory: true,
          },
        },
      },
    });

    const items = await Promise.all(
      feedback.map(async (f) => ({
        id: f.id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        status: f.status,
        columnId: f.columnId,
        comment: f.comment,
        pageUrl: f.pageUrl,
        clickX: f.clickX,
        clickY: f.clickY,
        selector: f.selector,
        browserName: f.browserName,
        browserVersion: f.browserVersion,
        os: f.os,
        viewportWidth: f.viewportWidth,
        viewportHeight: f.viewportHeight,
        reviewer: f.reviewer,
        assignee: f.assignee
          ? {
              id: f.assignee.id,
              name: f.assignee.user.name,
              image: f.assignee.user.image,
            }
          : null,
        screenshotUrl: f.screenshot
          ? await getSignedAssetUrl(f.screenshot)
          : null,
        // Null for every report submitted before screen recording existed, and
        // for any report whose reviewer chose not to record. Consumers must
        // render the no-recording branch, not assume a URL.
        recordingUrl: f.recording ? await getSignedAssetUrl(f.recording) : null,
        recordingDurationMs: readRecordingDurationMs(f.recording?.metadata),
        metadata: f.metadata as Record<string, unknown> | null,
        tags: parseFeedbackTags(f.tags),
        issueLink: f.issueLink,
        linearIssueLink: f.linearIssueLink,
        jiraIssueLink: f.jiraIssueLink,
      })),
    );

    // Colors ride along with the list so cards can render env badges without
    // a second round trip; they are project-wide, so sent once, not per item.
    return {
      items,
      environmentColors: parseEnvironmentColors(project.environmentColors),
    };
  });

export type GetFeedbackOutput = inferProcedureOutput<typeof getFeedback>;
export type FeedbackItem = GetFeedbackOutput["items"][number];
