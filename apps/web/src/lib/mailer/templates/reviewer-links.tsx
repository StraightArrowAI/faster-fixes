import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { emailTailwindConfig } from "./tailwind.config";

type ReviewerLink = {
  host: string;
  url: string;
};

export type ReviewerLinksEmailProps = {
  projectName?: string;
  message?: string;
  primaryLink?: ReviewerLink;
  alternativeLinks?: ReviewerLink[];
};

export const ReviewerLinksEmail = ({
  projectName = "My project",
  message,
  primaryLink = {
    host: "app.example.com",
    url: "https://app.example.com/?ff_token=example",
  },
  alternativeLinks = [],
}: ReviewerLinksEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind config={emailTailwindConfig}>
        <Head />
        <Body className="bg-secondary py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] bg-card px-[40px] py-[40px]">
            <Section>
              <Text className="mt-0 mb-[24px] text-[24px] font-bold text-foreground">
                Review access for {projectName}
              </Text>

              {message && (
                <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] whitespace-pre-line text-foreground">
                  {message}
                </Text>
              )}

              <Text className="mt-0 mb-[32px] text-[16px] leading-[24px] text-foreground">
                The link below opens {primaryLink.host} with the feedback
                widget signed in as you, so your comments are attributed to
                you.
              </Text>

              <Section className="mb-[32px] text-center">
                <Button
                  href={primaryLink.url}
                  className="box-border bg-primary px-[32px] py-[12px] text-[16px] font-medium text-primary-foreground no-underline"
                >
                  Open {primaryLink.host}
                </Button>
              </Section>

              <Text className="mt-0 mb-[8px] text-[14px] leading-[20px] text-muted-foreground">
                If the button does not work, copy this link into your
                browser:
              </Text>
              <Text className="mt-0 mb-[32px] text-[14px] break-all text-muted-foreground">
                {primaryLink.url}
              </Text>

              {alternativeLinks.length > 0 && (
                <>
                  <Hr className="my-[32px] border-border" />
                  <Text className="mt-0 mb-[16px] text-[14px] leading-[20px] text-foreground">
                    Links for other environments, for your records:
                  </Text>
                  {alternativeLinks.map((link) => (
                    <Text
                      key={link.url}
                      className="mt-0 mb-[12px] text-[14px] leading-[20px] break-all text-muted-foreground"
                    >
                      <strong className="text-foreground">{link.host}</strong>
                      <br />
                      <Link href={link.url} className="text-muted-foreground">
                        {link.url}
                      </Link>
                    </Text>
                  ))}
                </>
              )}

              <Hr className="my-[32px] border-border" />

              <Text className="mt-0 mb-[8px] text-[12px] text-muted-foreground">
                These links are personal. Do not share them; anyone with a
                link can leave feedback in your name.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
