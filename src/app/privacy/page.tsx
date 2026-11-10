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
      updated="10 November 2026"
      intro="This policy explains what personal data PickWise collects, why we collect it, who processes it on our behalf, and the choices you have. We collect only what the service needs to work — there is no advertising and we never sell your data."
    >
      <LegalSection title="1. Data we collect">
        <p>
          <strong>Account data.</strong> Username, email address, and password.
          Passwords are stored only as salted bcrypt hashes — we never store or
          see them in plain text.
        </p>
        <p>
          <strong>Profile photo.</strong> A photo, if you choose to add one.
        </p>
        <p>
          <strong>Google Sign-In.</strong> If you sign in with Google, we
          receive your email and profile picture from Google to create or link
          your account. We never see your Google password.
        </p>
        <p>
          <strong>Laptop preferences.</strong> Your Needs Wizard answers —
          budget range, purpose, factor priorities, screen size, portability,
          and brand preferences.
        </p>
        <p>
          <strong>Background answers.</strong> After the Needs Wizard we ask a
          few more questions: whether you are a student, working, buying for a
          business or something else; what you study, if you are a student;
          how much you know about laptops; the laptop you use now; and why you
          want to change. Every one is optional, you can change or clear them
          on your profile page, and we use them only to tailor Pico&apos;s
          answers to you.
        </p>
        <p>
          <strong>Conversations with Pico.</strong> Your chat messages,
          Pico&apos;s replies, and the laptop shortlists produced in each
          conversation are stored so conversations can continue where they
          left off.
        </p>
        <p>
          <strong>Saved laptops.</strong> Your saved list is stored with your
          account.
        </p>
        <p>
          <strong>Service logs.</strong> We keep monitoring logs of each Pico
          turn, including your message and Pico&apos;s reply, and a search log
          with the search text. Deleting a conversation deletes its monitoring
          logs; the search log is deleted with your account. We also keep
          counts of AI usage (the model and how much text it processed, never
          the text itself).
        </p>
      </LegalSection>

      <LegalSection title="2. How we use your data">
        <LegalList
          items={[
            "Personalizing recommendations and Pick Scores to your stated needs, budget, and preferences.",
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
          messages, saved preferences, background answers, and relevant catalog
          data are sent to
          AI providers (Google&apos;s Gemini and Gemma models) to generate a reply. These providers process the data on
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
              <strong>AI providers</strong> — Google (Gemini, Gemma)
              process chat and recommendation requests (see section 3).
            </>,
            <>
              <strong>Price search</strong> — live market-price lookups query
              SerpApi (Google Shopping) with the laptop&apos;s name only, never your personal
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
              <strong>Needs Wizard progress</strong> — an unfinished draft of
              your answers, plus two reminders: whether we have already sent you
              to the wizard, and whether you closed the reminder banner. They
              stay in your browser&apos;s local storage, not on our server, and
              the draft is deleted once you finish the wizard.
            </>,
          ]}
        />
        <p>We don&apos;t use advertising or cross-site tracking cookies.</p>
      </LegalSection>

      <LegalSection title="6. How long we keep data">
        <p>
          We keep your account data, preferences, and conversation history for
          as long as your account exists. Service logs are kept only as long as
          needed for quality monitoring. You can delete your account yourself
          with the &ldquo;Delete account&rdquo; button on your{" "}
          <Link
            href="/profile"
            className="text-brand-text underline underline-offset-2"
          >
            profile page
          </Link>
          . It asks you to type your username, then deletes your account
          together with your conversations
          (messages, replies and shortlists), the monitoring and search logs
          linked to you, your preferences, background answers, saved laptops
          and photo.
        </p>
        <p>
          Two things are kept, with nothing that points to you. AI usage counts
          stay, with your account removed from them. Search text logged before
          10 November 2026 was stored without a link to any account, so we
          cannot tell which of it was yours and it is not deleted.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <LegalList
          items={[
            <>
              <strong>Access and update</strong> — view and edit your background
              answers and laptop preferences anytime on your{" "}
              <Link
                href="/profile"
                className="text-brand-text underline underline-offset-2"
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
              <strong>Delete your account</strong> — use the &ldquo;Delete
              account&rdquo; button on your profile page. It deletes your
              account and the data linked to it (section 6 lists what is
              deleted and what is kept).
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
            className="text-brand-text underline underline-offset-2"
          >
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Contact us">
        <p>
          Email{" "}
          <a
            href="mailto:admin-pickwise@ngyijie.com"
            className="text-brand-text underline underline-offset-2"
          >
            admin-pickwise@ngyijie.com
          </a>{" "}
          to ask what data we hold about you, to ask for a correction, or with
          any question about privacy. To delete your account, use the
          &ldquo;Delete account&rdquo; button on your profile page (section 6).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
