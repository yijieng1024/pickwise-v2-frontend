import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — PickWise",
  description:
    "What personal data PickWise collects, how it is used to power recommendations, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="16 July 2026"
      intro="This policy explains what personal data PickWise collects, why we collect it, who processes it on our behalf, and the choices you have. We collect only what the service needs to work — there is no advertising and we never sell your data."
    >
      <LegalSection title="1. Data we collect">
        <p>
          <strong>Account data.</strong> Username, email address, and password.
          Passwords are stored only as salted bcrypt hashes — we never store or
          see them in plain text.
        </p>
        <p>
          <strong>Optional profile details.</strong> Birthday, gender,
          occupation, and a profile photo, if you choose to add them. These are
          optional and help Pico put recommendations in context.
        </p>
        <p>
          <strong>Google Sign-In.</strong> If you sign in with Google, we
          receive your email and profile picture from Google to create or link
          your account. We never see your Google password.
        </p>
        <p>
          <strong>Laptop preferences.</strong> Your Needs Wizard answers —
          budget range, purpose, factor priorities, screen size, portability,
          and brand preferences — plus a tech-savviness level that tunes how
          Pico explains things.
        </p>
        <p>
          <strong>Conversations with Pico.</strong> Your chat messages,
          Pico&apos;s replies, and the laptop shortlists produced in each
          conversation are stored so conversations can continue where they
          left off.
        </p>
        <p>
          <strong>Service logs.</strong> We log technical details of each
          recommendation request (for example, whether a search found confident
          results) to monitor and improve search quality.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use your data">
        <LegalList
          items={[
            "Personalizing recommendations and PickScores to your stated needs, budget, and preferences.",
            "Powering Pico conversations and remembering their history.",
            "Sending account emails — verification and password reset. We don't send marketing email.",
            "Monitoring and improving recommendation and search quality.",
            "Keeping the service secure and preventing abuse.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. AI processing">
        <p>
          Pico is powered by third-party AI models. When you chat, your
          messages, saved preferences, and relevant catalog data are sent to
          AI providers (Google&apos;s Gemini models and model providers via
          OpenRouter) to generate a reply. These providers process the data on
          our behalf.{" "}
          <strong>
            Please don&apos;t include sensitive personal information in chat
            messages
          </strong>{" "}
          — Pico doesn&apos;t need it to recommend a laptop.
        </p>
      </LegalSection>

      <LegalSection title="4. Who we share data with">
        <p>
          We share personal data only with service providers that run PickWise
          for us, and only what each one needs:
        </p>
        <LegalList
          items={[
            <>
              <strong>Database and hosting</strong> — our database is hosted on
              Supabase and our servers run on Render.
            </>,
            <>
              <strong>AI providers</strong> — Google (Gemini) and OpenRouter
              process chat and recommendation requests (see section 3).
            </>,
            <>
              <strong>Price search</strong> — live market-price lookups query
              Serper.dev with the laptop&apos;s name only, never your personal
              data.
            </>,
            <>
              <strong>Email delivery</strong> — verification and password-reset
              emails are sent through our email provider.
            </>,
          ]}
        />
        <p>
          We do not sell personal data, and we do not share it with advertisers
          — PickWise has no ads or ad tracking.
        </p>
      </LegalSection>

      <LegalSection title="5. Data stored in your browser">
        <LegalList
          items={[
            <>
              <strong>Sign-in token</strong> — kept in your browser&apos;s
              local storage so you stay signed in; it expires after 7 days and
              is deleted when you log out.
            </>,
            <>
              <strong>Theme choice</strong> — your light/dark mode preference.
            </>,
            <>
              <strong>Saved laptops</strong> — your saved list currently lives
              only in your browser, not on our servers.
            </>,
          ]}
        />
        <p>We don&apos;t use advertising or cross-site tracking cookies.</p>
      </LegalSection>

      <LegalSection title="6. How long we keep data">
        <p>
          We keep your account data, preferences, and conversation history for
          as long as your account exists. Service logs are kept only as long as
          needed for quality monitoring. When your account is deleted, the
          personal data linked to it is deleted too.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <LegalList
          items={[
            <>
              <strong>Access and update</strong> — view and edit your profile
              details and laptop preferences anytime on your{" "}
              <Link
                href="/profile"
                className="text-brand underline underline-offset-2"
              >
                profile page
              </Link>
              .
            </>,
            <>
              <strong>Remove your photo</strong> — delete your profile photo
              from the profile page at any time.
            </>,
            <>
              <strong>Delete your account</strong> — you may request deletion
              of your account and associated data.
            </>,
          ]}
        />
        <p>
          If you are in Malaysia, you also have rights under the Personal Data
          Protection Act 2010 (PDPA), including the right to access and correct
          your personal data.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          All traffic to PickWise is encrypted with HTTPS, passwords are
          bcrypt-hashed, and sessions use short-lived signed tokens. No online
          service can promise perfect security, but we design for it — for
          example, we never store plain-text passwords, and Google Sign-In
          means we never handle your Google credentials at all.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          PickWise is not directed at children under 13, and we don&apos;t
          knowingly collect their personal data.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          We may update this policy as the service evolves — for example, when
          new features move data from your browser to your account. We&apos;ll
          change the &ldquo;Last updated&rdquo; date above when we do. See also
          our{" "}
          <Link
            href="/terms"
            className="text-brand underline underline-offset-2"
          >
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
