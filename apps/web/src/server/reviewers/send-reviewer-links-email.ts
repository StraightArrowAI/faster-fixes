import "server-only";

import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import {
  ReviewerLinksEmail,
  type ReviewerLinksEmailProps,
} from "@/lib/mailer/templates/reviewer-links";
import { render } from "@react-email/components";
import { createElement } from "react";

import { buildReviewerShareUrl } from "./reviewer-share-url";

type SendReviewerLinksEmailInput = {
  projectName: string;
  to: string;
  token: string;
  // Primary first; the first entry becomes the main button.
  domains: { host: string; url: string }[];
  message?: string;
};

export async function sendReviewerLinksEmail({
  projectName,
  to,
  token,
  domains,
  message,
}: SendReviewerLinksEmailInput) {
  const [primary, ...alternatives] = domains.map((domain) => ({
    host: domain.host,
    url: buildReviewerShareUrl(domain.url, token),
  }));

  if (!primary) {
    throw new Error("sendReviewerLinksEmail requires at least one domain.");
  }

  // createElement (not JSX) keeps this a .ts module like the other senders.
  // No explicit plain-text part: MailOptions has no `text` field, and Resend
  // derives one from the HTML when it is omitted.
  const body = await render(
    createElement<ReviewerLinksEmailProps>(ReviewerLinksEmail, {
      projectName,
      message: message || undefined,
      primaryLink: primary,
      alternativeLinks: alternatives,
    }),
  );

  await mailer.emails.send({
    from: SENDER_EMAIL,
    to: to.toLowerCase().trim(),
    subject: `Review access for ${projectName}`,
    body,
  });
}
