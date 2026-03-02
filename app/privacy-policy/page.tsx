import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "Privacy Policy for Today's Stash — how we collect, use and protect your personal information.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="relative isolate overflow-hidden bg-[#0A0F13] text-white">
            {/* Background */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_0%_0%,rgba(34,197,94,0.18),transparent_60%),linear-gradient(to_bottom,rgba(15,23,42,0.4),rgba(15,23,42,1))]"
            />

            <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="mb-8 text-xs text-white/50">
                    <Link href="/" className="hover:text-white transition">
                        Home
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-white/80">Privacy Policy</span>
                </nav>

                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Privacy Policy
                </h1>

                <p className="mt-4 text-sm text-white/60">
                    This Privacy Policy applies to all personal information collected by
                    Todays Stash Pty Ltd (<strong className="text-white/80">we</strong>,{" "}
                    <strong className="text-white/80">us</strong> or{" "}
                    <strong className="text-white/80">our</strong>) via the website
                    located at{" "}
                    <a
                        href="https://www.todaysstash.com.au"
                        className="underline underline-offset-2 hover:text-white"
                    >
                        www.todaysstash.com.au
                    </a>{" "}
                    (Website).
                </p>

                <div className="mt-10 space-y-10 text-sm leading-relaxed text-white/80">
                    {/* ── What information do we collect? ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            What information do we collect?
                        </h2>
                        <p className="mt-3">
                            The kind of Personal Information that we collect from you will
                            depend on how you use the website. The Personal Information which
                            we collect and hold about you may include:
                        </p>
                        <p className="mt-2 font-medium text-white/90">
                            Name, email address, location, login credentials, phone number,
                            address.
                        </p>
                    </section>

                    {/* ── Types of information ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Types of information
                        </h2>
                        <p className="mt-3">
                            The Privacy Act 1988 (Cth) (<strong>Privacy Act</strong>) defines
                            types of information, including Personal Information and Sensitive
                            Information.
                        </p>
                        <p className="mt-3">
                            <strong className="text-white/90">Personal Information</strong>{" "}
                            means information or an opinion about an identified individual or
                            an individual who is reasonably identifiable — whether the
                            information or opinion is true or not, and whether the information
                            or opinion is recorded in a material form or not.
                        </p>
                        <p className="mt-3">
                            If the information does not disclose your identity or enable your
                            identity to be ascertained, it will in most cases not be classified
                            as &quot;Personal Information&quot; and will not be subject to this
                            privacy policy.
                        </p>
                        <p className="mt-3">
                            <strong className="text-white/90">Sensitive Information</strong>{" "}
                            is defined in the Privacy Act as including information or opinion
                            about such things as an individual&apos;s racial or ethnic origin,
                            political opinions, membership of a political association,
                            religious or philosophical beliefs, membership of a trade union or
                            other professional body, criminal record or health information.
                        </p>
                        <p className="mt-3">
                            Sensitive Information will be used by us only:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>for the primary purpose for which it was obtained;</li>
                            <li>
                                for a secondary purpose that is directly related to the primary
                                purpose; and
                            </li>
                            <li>
                                with your consent or where required or authorised by law.
                            </li>
                        </ul>
                    </section>

                    {/* ── How we collect your Personal Information ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            How we collect your Personal Information
                        </h2>
                        <p className="mt-3">
                            We may collect Personal Information from you whenever you input
                            such information into the Website, related app or provide it to us
                            in any other way.
                        </p>
                        <p className="mt-3">
                            We may also collect cookies from your computer which enable us to
                            tell when you use the Website and also to help customise your
                            Website experience. As a general rule, however, it is not possible
                            to identify you personally from our use of cookies.
                        </p>
                        <p className="mt-3">
                            We use different types of cookies including essential cookies for
                            Website functionality, analytical cookies to improve user
                            experience, and marketing cookies that may be set by third parties.
                            Third-party cookies are subject to their respective privacy
                            policies, which we encourage you to review.
                        </p>
                        <p className="mt-3">
                            We generally don&apos;t collect Sensitive Information, but when we
                            do, we will comply with the preceding paragraph.
                        </p>
                        <p className="mt-3">
                            Where reasonable and practicable we collect your Personal
                            Information from you only. However, sometimes we may be given
                            information from a third party, in cases like this we will take
                            steps to make you aware of the information that was provided by a
                            third party.
                        </p>
                        <p className="mt-2 text-xs text-white/60">
                            Sources may include: CRM providers, database services, analytics
                            tools, and email marketing platforms.
                        </p>
                    </section>

                    {/* ── Purpose of collection ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Purpose of collection
                        </h2>
                        <p className="mt-3">
                            We collect Personal Information to provide you with the best
                            service experience possible on the Website and keep in touch with
                            you about developments in our business.
                        </p>
                        <p className="mt-3">
                            We customarily only disclose Personal Information to our service
                            providers who assist us in operating the Website. Your Personal
                            Information may also be exposed from time to time to maintenance
                            and support personnel acting in the normal course of their duties.
                        </p>
                        <p className="mt-3">
                            By using our Website, you consent to the receipt of direct
                            marketing material. We will only use your Personal Information for
                            this purpose if we have collected such information direct from you,
                            and if it is material of a type which you would reasonably expect
                            to receive from us. We do not use sensitive Personal Information in
                            direct marketing activity. Our direct marketing material will
                            include a simple means by which you can request not to receive
                            further communications of this nature, such as an unsubscribe
                            button link.
                        </p>
                        <p className="mt-3">
                            You can manage your marketing preferences through your account
                            settings or by contacting our Privacy Officer. We will process
                            opt-out requests within 7 business days and maintain records of
                            your preferences. Marketing communications will not exceed 10
                            messages per month, and each communication will clearly display
                            preference management options. If you choose to opt-out, we will
                            retain minimal Personal Information necessary to ensure compliance
                            with your request.
                        </p>
                    </section>

                    {/* ── Security, Access and correction ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Security, Access and Correction
                        </h2>
                        <p className="mt-3">
                            We store your Personal Information in a way that reasonably
                            protects it from unauthorised access, misuse, modification or
                            disclosure. When we no longer require your Personal Information for
                            the purpose for which we obtained it, we will take reasonable steps
                            to destroy and anonymise or de-identify it. Most of the Personal
                            Information that is stored in our client files and records will be
                            kept for a maximum of 2 years to fulfill our record keeping
                            obligations.
                        </p>
                        <p className="mt-3">The Australian Privacy Principles:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>
                                permit you to obtain access to the Personal Information we hold
                                about you in certain circumstances (Australian Privacy Principle
                                12); and
                            </li>
                            <li>
                                allow you to correct inaccurate Personal Information subject to
                                certain exceptions (Australian Privacy Principle 13).
                            </li>
                        </ul>
                        <p className="mt-3">
                            Where you would like to obtain such access, please contact us in
                            writing on the contact details set out at the bottom of this
                            privacy policy.
                        </p>
                    </section>

                    {/* ── Complaint procedure ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Complaint procedure
                        </h2>
                        <p className="mt-3">
                            If you have a complaint concerning the manner in which we maintain
                            the privacy of your Personal Information, please contact us on the
                            contact details set out at the bottom of this policy. All
                            complaints will be considered by a representative of the company
                            and we may seek further information from you to clarify your
                            concerns. If we agree that your complaint is well founded, we will,
                            in consultation with you, take appropriate steps to rectify the
                            problem. If you remain dissatisfied with the outcome, you may refer
                            the matter to the Office of the Australian Information
                            Commissioner.
                        </p>
                    </section>

                    {/* ── Overseas transfer ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Overseas transfer
                        </h2>
                        <p className="mt-3">
                            Your Personal Information may be transferred overseas or stored
                            overseas for a variety of reasons. It is not possible to identify
                            each and every country to which your Personal Information may be
                            sent. If your Personal Information is sent to a recipient in a
                            country with data protection laws which are at least substantially
                            similar to the Australian Privacy Principles, and where there are
                            mechanisms available to you to enforce protection of your Personal
                            Information under that overseas law, we will not be liable for a
                            breach of the Australian Privacy Principles if your Personal
                            Information is mishandled in that jurisdiction.
                        </p>
                        <p className="mt-3">
                            If your Personal Information is transferred to a jurisdiction which
                            does not have data protection laws as comprehensive as
                            Australia&apos;s, we will take reasonable steps to secure a
                            contractual commitment from the recipient to handle your
                            information in accordance with the Australian Privacy Principles.
                        </p>
                    </section>

                    {/* ── Contact ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            How to contact us about privacy
                        </h2>
                        <p className="mt-3">
                            If you have any queries, or if you seek access to your Personal
                            Information, or if you have a complaint about our privacy
                            practices, you can contact us through:{" "}
                            <a
                                href="mailto:privacy@todaysstash.com.au"
                                className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                            >
                                privacy@todaysstash.com.au
                            </a>
                            .
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
