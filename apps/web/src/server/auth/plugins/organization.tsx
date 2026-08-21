import { ORGANIZATION_ROLES } from "@/app/_features/organization/_utils/organization-roles";
import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { OrganizationInvitation } from "@/lib/mailer/templates/organization-invitation";
import { deleteFeedbackMedia } from "@/server/storage/delete-feedback-media";
import { getAppUrl } from "@/utils/url/get-app-url";
import { render } from "@react-email/components";
import { organization } from "better-auth/plugins";

export const organizationPlugin = organization({
  schema: {
    organization: {
      additionalFields: {
        isDefault: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },
      },
    },
  },
  organizationHooks: {
    // `Organization -> Project -> Feedback` is `onDelete: Cascade` the whole
    // way down, so deleting an organization silently takes every report in it
    // and would orphan all of their media: Asset rows and stored objects
    // referenced by nothing, reachable through no report.
    // Better Auth owns the delete itself, so this is the only seam available.
    beforeDeleteOrganization: async ({ organization: org }) => {
      await deleteFeedbackMedia({
        project: { organizationId: org.id },
      });
    },
  },
  sendInvitationEmail: async (data) => {
    try {
      const { email, organization: org, inviter } = data;
      const normalizedEmail = email.toLowerCase().trim();
      const from = SENDER_EMAIL;
      const inviterName = inviter.user.name || inviter.user.email;
      const role =
        ORGANIZATION_ROLES[data.role as keyof typeof ORGANIZATION_ROLES] ??
        data.role;
      const invitationLink = `${getAppUrl()}/organization/invitations`;

      const body = await render(
        <OrganizationInvitation
          organizationName={org.name}
          inviterName={inviterName}
          invitationLink={invitationLink}
          role={role}
        />,
      );

      await mailer.emails.send({
        from,
        to: normalizedEmail,
        subject: `Invitation to join ${org.name}`,
        body,
      });
    } catch (error) {
      console.error("Error sending organization invitation email:", error);
    }
  },
});
