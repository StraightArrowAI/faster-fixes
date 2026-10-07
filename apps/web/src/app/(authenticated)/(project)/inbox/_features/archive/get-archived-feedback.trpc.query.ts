"use server";

import { parseEnvironmentColors } from "@/app/(authenticated)/(project)/_features/environment/environment-color.schema";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { PrismaClient } from "@workspace/db/generated/prisma/client";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

import { NO_ENVIRONMENT_FILTER } from "../filters/no-environment-filter";
import { parseFeedbackTags } from "../parse-feedback-tags";

async function getEnvironmentWhere(
  prisma: PrismaClient,
  projectId: string,
  env: string | undefined,
) {
  if (!env) return {};
  if (env !== NO_ENVIRONMENT_FILTER) {
    return { tags: { path: ["env"], equals: env } };
  }
  // Prisma JSON filters can't express "key absent" (a missing path compares
  // as SQL NULL and drops out of NOT too), so resolve the ids with `?`.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "feedback"
    WHERE "projectId" = ${projectId} AND "status" = 'closed'
      AND NOT ("tags" ? 'env')
  `;
  return { id: { in: rows.map((r) => r.id) } };
}

export const getArchivedFeedback = protectedProcedure
  .input(
    z.object({
      projectId: z.string(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      env: z.string().max(64).optional(),
      sortBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }),
  )
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

    const where = {
      projectId: input.projectId,
      status: "closed",
      ...(input.search
        ? { comment: { contains: input.search, mode: "insensitive" as const } }
        : {}),
      ...(await getEnvironmentWhere(prisma, input.projectId, input.env)),
    };

    const [items, totalCount] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { [input.sortBy]: input.sortOrder },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
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
            select: { id: true, key: true, provider: true, bucket: true },
          },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    const mappedItems = await Promise.all(
      items.map(async (f) => ({
        id: f.id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        comment: f.comment,
        pageUrl: f.pageUrl,
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
        recordingUrl: f.recording ? await getSignedAssetUrl(f.recording) : null,
        tags: parseFeedbackTags(f.tags),
      })),
    );

    return {
      items: mappedItems,
      environmentColors: parseEnvironmentColors(project.environmentColors),
      totalCount,
      pageCount: Math.ceil(totalCount / input.pageSize),
    };
  });

export type GetArchivedFeedbackOutput = inferProcedureOutput<typeof getArchivedFeedback>;
