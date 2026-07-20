import type { Metadata } from "next";
import { dbGetSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How Eclipse Motors collects, uses and protects your personal information.",
};

export default async function PrivacyPage() {
  const settings = await dbGetSettings();

  return (
    <div className="container max-w-3xl py-14 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy notice
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        How {settings.dealerName} handles your personal information.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">
            What we collect
          </h2>
          <p className="mt-2">
            When you enquire about a vehicle we ask for your{" "}
            <span className="text-foreground">full name</span>, a{" "}
            <span className="text-foreground">WhatsApp or call number</span> and
            your <span className="text-foreground">email address</span>. We also
            record which vehicles you enquire about. That is all — we do not ask
            for identification documents, financial details or your address.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Why we collect it
          </h2>
          <p className="mt-2">
            Solely to respond to your enquiry: to answer questions about a
            vehicle, arrange a viewing, and — if you ask us to — hold a vehicle
            for you. We rely on your consent, which you give by ticking the box
            on the enquiry form. You can withdraw it at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Your reference number
          </h2>
          <p className="mt-2">
            We issue you a reference (for example{" "}
            <span className="font-mono text-foreground">A7K2-9QMX</span>) so you
            don&apos;t have to repeat your details. Quoting it lets our team find
            your previous enquiries. Anyone holding your reference can enquire
            under it, so treat it as you would a booking code.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Website measurement
          </h2>
          <p className="mt-2">
            We count how often each vehicle listing is viewed so we know what
            our customers are interested in. This uses a random token stored in
            your browser. We do{" "}
            <span className="text-foreground">not</span> log IP addresses, use
            advertising trackers, or attempt to identify you from browsing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Who can see it
          </h2>
          <p className="mt-2">
            Only authorised {settings.dealerName} staff, through a
            password-protected admin area over an encrypted connection. We do
            not sell, rent or share your details with third parties for
            marketing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            How long we keep it
          </h2>
          <p className="mt-2">
            We keep enquiry records for up to 24 months after your last contact
            with us, then delete them. You can ask us to delete your details
            sooner at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Your rights
          </h2>
          <p className="mt-2">
            You may ask us to show you the information we hold about you,
            correct it, or delete it. Message us on WhatsApp at{" "}
            <span className="text-foreground">{settings.whatsappNumber}</span>{" "}
            quoting your reference and we will action it. Under Ghana&apos;s Data
            Protection Act, 2012 (Act 843) you may also complain to the Data
            Protection Commission.
          </p>
        </section>
      </div>
    </div>
  );
}
