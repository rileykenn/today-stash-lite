import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description:
        "Website Terms and Conditions of Use for Today's Stash marketplace — governing your use of our platform.",
};

export default function TermsAndConditionsPage() {
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
                    <span className="text-white/80">Terms and Conditions</span>
                </nav>

                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Website Terms and Conditions of Use
                </h1>

                <p className="mt-4 text-sm text-white/60">
                    These terms govern your use of{" "}
                    <a
                        href="https://www.todaysstash.com.au"
                        className="underline underline-offset-2 hover:text-white"
                    >
                        www.todaysstash.com.au
                    </a>{" "}
                    operated by Todays Stash Pty Ltd ACN 694 263 315.
                </p>

                <div className="mt-10 space-y-10 text-sm leading-relaxed text-white/80">
                    {/* ── 1. About the Website ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            1. About the Website
                        </h2>
                        <p className="mt-3">
                            Welcome to www.todaysstash.com.au (<strong className="text-white/90">Website</strong>). The Website facilitates interactions between:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>parties providing services (<strong className="text-white/90">Provider</strong>); and</li>
                            <li>parties receiving services (<strong className="text-white/90">Receiver</strong>),</li>
                        </ul>
                        <p className="mt-2">
                            making it easier for the Receiver and the Provider to locate, communicate, arrange payment and deliver the services in a fast and secure manner (<strong className="text-white/90">Services</strong>).
                        </p>
                        <p className="mt-3">
                            The Website is operated by Todays Stash Pty Ltd ACN 694 263 315. Access to and use of the Website, or any of its associated products or Services, is provided by Todays Stash Pty Ltd. Please read these terms and conditions (<strong className="text-white/90">Terms</strong>) carefully. By using, browsing and/or reading the Website, this signifies that you have read, understood and agree to be bound by the Terms. If you do not agree with the Terms, you must cease usage of the Website, or any of its products or Services, immediately.
                        </p>
                        <p className="mt-3">
                            Todays Stash Pty Ltd reserves the right to review and change any of the Terms by updating this page at its sole discretion. When Todays Stash Pty Ltd updates the Terms, it will use reasonable endeavours to provide you with notice of updates of the Terms. Any changes to the Terms take immediate effect from the date of their publication.
                        </p>
                    </section>

                    {/* ── 2. Acceptance of the Terms ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            2. Acceptance of the Terms
                        </h2>
                        <p className="mt-3">
                            You accept the Terms by registering for the Services and/or making any payment as required under the Terms for use of the Services. You may also accept the Terms by clicking to accept or agree to the Terms where and if this option is made available to you by Todays Stash Pty Ltd in the user interface.
                        </p>
                    </section>

                    {/* ── 3. The Services ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            3. The Services
                        </h2>
                        <p className="mt-3">
                            In order to access the Services, both the Receiver and the Provider are required to register for an account through the Website (<strong className="text-white/90">Account</strong>).
                        </p>
                        <p className="mt-3">
                            As part of the registration process, or as part of your continued use of the Services, you may be required to provide personal information about yourself (such as identification or contact details), including:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>Email address</li>
                            <li>Preferred username</li>
                            <li>Mailing address</li>
                            <li>Mobile telephone number</li>
                            <li>Password</li>
                        </ul>
                        <p className="mt-3">
                            You warrant that any information you give to Todays Stash Pty Ltd in the course of completing the registration process will always be accurate, correct and up to date.
                        </p>
                        <p className="mt-3">
                            Once you have completed the registration process, you will be a registered member of the Website (<strong className="text-white/90">Member</strong>) and agree to be bound by the Terms.
                        </p>
                        <p className="mt-3">You may not use the Services and may not accept the Terms if:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>you are not of legal age to form a binding contract with Todays Stash Pty Ltd; or</li>
                            <li>you are a person barred from receiving the Services under the laws of Australia or other countries including the country in which you are resident or from which you use the Services.</li>
                        </ul>
                    </section>

                    {/* ── 4. Your obligations as a Member ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            4. Your Obligations as a Member
                        </h2>
                        <p className="mt-3">As a Member, you agree to comply with the following:</p>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-white/70">
                            <li>You will not share your profile with any other person.</li>
                            <li>You will use the Services only for purposes that are permitted by the Terms and any applicable law, regulation or generally accepted practices or guidelines in the relevant jurisdictions.</li>
                            <li>You have sole responsibility for protecting the confidentiality of your password and/or email address. Use of your password by any other person may result in the immediate cancellation of the Services.</li>
                            <li>Any use of your registration information by any other person, or third parties, is strictly prohibited. You agree to immediately notify Todays Stash Pty Ltd of any unauthorised use of your password or email address or any breach of security of which you have become aware.</li>
                            <li>You must not expressly or impliedly impersonate another Member or use the profile or password of another Member at any time.</li>
                            <li>Any content that you broadcast, publish, upload, transmit, post or distribute on the Website (<strong className="text-white/90">Your Content</strong>) will always be accurate, correct and up to date and you will maintain reasonable records of Your Content.</li>
                            <li>You agree not to harass, impersonate, stalk, threaten another Member of the Website.</li>
                            <li>Access and use of the Website is limited, non-transferable and allows for the sole use of the Website by you for the purposes of providing the Services.</li>
                            <li>You will not use the Services or the Website in connection with any commercial endeavours except those that are specifically endorsed or approved by the management of Todays Stash Pty Ltd.</li>
                            <li>You will not use the Services or Website for any illegal and/or unauthorised use which includes collecting email addresses of Members by electronic or other means for the purpose of sending unsolicited email or unauthorised framing of or linking to the Website.</li>
                            <li>You agree that commercial advertisements, affiliate links and other forms of solicitation may be removed from Member profiles without notice and may result in termination of the Services.</li>
                            <li>You acknowledge and agree that any automated use of the Website or its Services is prohibited.</li>
                            <li>You agree to use the Website and its Services only for lawful purposes and in accordance with these Terms, and you will not engage in any activity that interferes with or disrupts the Website or its Services.</li>
                        </ul>
                    </section>

                    {/* ── 5. Using the Website as the Receiver ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            5. Using the Website as the Receiver
                        </h2>
                        <p className="mt-3">
                            Consumers create a free account on the Today&apos;s Stash platform by providing their email address, password and mobile telephone number. Once registered, they can browse verified local deals and in-store offers from nearby businesses. When a consumer finds a deal they wish to use, they click the &apos;Redeem&apos; button, which generates a unique QR code on their account. The consumer then visits the participating business location and presents the QR code to staff for scanning and validation. Upon successful scanning, the business applies the discount or offer to the consumer&apos;s purchase.
                        </p>
                        <p className="mt-3">The Receiver must adhere to the terms and conditions of the offer redeemed.</p>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-white/70">
                            <li><strong className="text-white/90">Reserve</strong> means the action taken by a Receiver through the Website to claim or hold an offer made available by a Provider, which generates a unique QR code for that specific offer and temporarily allocates that offer to the Receiver&apos;s Account.</li>
                            <li><strong className="text-white/90">Redeem</strong> means the completion of the reservation process whereby the Receiver physically presents the QR code at the Provider&apos;s location, the Provider scans and validates the QR code, and the offer is applied to the Receiver&apos;s purchase in accordance with the offer terms.</li>
                            <li><strong className="text-white/90">No-Show</strong> means where a Receiver Reserves an offer but fails to Redeem that offer within the validity period specified for that offer.</li>
                        </ul>
                        <p className="mt-3">
                            <strong className="text-white/90">Voucher and Deal Expiry.</strong> Receivers must comply with all applicable laws regarding offer validity and expiry.
                        </p>
                    </section>

                    {/* ── 6. Using the Website as the Provider ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            6. Using the Website as the Provider
                        </h2>
                        <p className="mt-3">
                            Local businesses and retailers register for an account on the Today&apos;s Stash platform by providing their business details, email address and password. Once approved, providers access the platform&apos;s dashboard where they can create digital coupon offers for their business. Providers may use the AI-powered deal creation tool available on the site to generate promotional content, or manually enter their offer details including the discount or deal terms, validity period, and redemption conditions. Providers set the quantity of coupons available for each particular offer and specify their own terms and conditions for redemption. When a consumer redeems an offer, the provider receives notification through the real-time inventory management system. At their physical location, staff scan the consumer&apos;s QR code using the platform&apos;s verification system to validate and apply the offer. Providers can monitor redemption rates, manage active offers, and track campaign performance through their dashboard.
                        </p>
                    </section>

                    {/* ── 7. Refund Policy and Consumer Law ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            7. Refund Policy and Consumer Law
                        </h2>
                        <p className="mt-3">
                            All Providers agree to comply with the Australian Consumer Law. Any benefits set out in this Policy may apply in addition to consumer&apos;s rights under the Australian Consumer Law.
                        </p>
                        <p className="mt-3">
                            Since Todays Stash Pty Ltd is only a facilitator in introducing the Receiver to the Provider. Todays Stash does not receive payments from Receivers. Receivers pay directly to the Provider. Todays Stash Pty Ltd does not hold any liability to the Receiver directly and will not personally refund them any payments made in the use of Services.
                        </p>
                        <p className="mt-3">
                            Nothing in these Terms excludes, restricts or modifies any consumer guarantee, right or remedy conferred on you by the ACL or any other applicable law that cannot be excluded, restricted or modified by agreement.
                        </p>
                        <p className="mt-3">Under the ACL, Providers must ensure that:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>All offers advertised on the Website are accurate and not misleading or deceptive;</li>
                            <li>Goods and services provided are of acceptable quality, fit for purpose, and match any description provided;</li>
                            <li>Offer terms and conditions, including expiry dates, redemption conditions, and any limitations, are clearly disclosed before a Receiver Reserves an offer;</li>
                            <li>They honour all validly Reserved and Redeemed offers in accordance with the advertised terms.</li>
                        </ul>
                        <p className="mt-3">
                            Todays Stash Pty Ltd acts as a facilitator connecting Receivers with Providers. The contractual relationship for the supply of goods or services is formed directly between the Receiver and the Provider.
                        </p>
                        <p className="mt-3">Providers are solely responsible for:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>Compliance with all consumer guarantees under the ACL;</li>
                            <li>Providing refunds, replacements, or remedies where required by law;</li>
                            <li>Resolving disputes with Receivers regarding the quality, delivery, or terms of goods or services supplied;</li>
                            <li>Ensuring their offers do not contain false, misleading, or deceptive representations.</li>
                        </ul>
                        <p className="mt-3">
                            If a Receiver believes they are entitled to a remedy under the ACL (including a refund, replacement, or compensation for loss or damage), the Receiver should first contact the Provider directly to request the appropriate remedy. If the Provider does not respond or resolve the issue within fourteen (14) days, contact Todays Stash Pty Ltd through the &apos;Contact Us&apos; section of the Website.
                        </p>
                        <p className="mt-3">
                            For more information about your rights under the ACL, visit the ACCC website at{" "}
                            <a
                                href="https://www.accc.gov.au"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:text-white"
                            >
                                www.accc.gov.au
                            </a>{" "}
                            or contact your local consumer protection agency.
                        </p>
                    </section>

                    {/* ── 8. Copyright and Intellectual Property ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            8. Copyright and Intellectual Property
                        </h2>
                        <p className="mt-3">
                            The Website, the Services and all of the related products of Todays Stash Pty Ltd are subject to copyright. The material on the Website is protected by copyright under the laws of Australia and through international treaties. Unless otherwise indicated, all rights (including copyright) in the Services and compilation of the Website (including but not limited to text, graphics, logos, button icons, video images, audio clips, Website code, scripts, design elements and interactive features) or the Services are owned or controlled for these purposes, and are reserved by Todays Stash Pty Ltd or its contributors.
                        </p>
                        <p className="mt-3">
                            All trademarks, service marks and trade names are owned, registered and/or licensed by Todays Stash Pty Ltd, who grants to you a worldwide, non-exclusive, royalty-free, revocable license whilst you are a Member to:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>Use the Website pursuant to the Terms;</li>
                            <li>Copy and store the Website and the material contained in the Website in your device&apos;s cache memory; and</li>
                            <li>Print pages from the Website for your own personal and non-commercial use.</li>
                        </ul>
                        <p className="mt-3">
                            Todays Stash Pty Ltd does not grant you any other rights whatsoever in relation to the Website or the Services. All other rights are expressly reserved by Todays Stash Pty Ltd.
                        </p>
                        <p className="mt-3">
                            You may not, without the prior written permission of Todays Stash Pty Ltd and the permission of any other relevant rights owners: broadcast, republish, upload to a third party, transmit, post, distribute, show or play in public, adapt or change in any way the Services or third party Services for any purpose, unless otherwise provided by these Terms.
                        </p>
                    </section>

                    {/* ── 9. General Disclaimer / AI Disclaimer ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            9. General Disclaimer
                        </h2>
                        <p className="mt-3">
                            You acknowledge that Todays Stash Pty Ltd does not make any terms, guarantees, warranties, representations or conditions whatsoever other than those expressly set out in the Terms. Nothing in the Terms excludes, restricts or modifies any condition, warranty, right or remedy implied or imposed by any applicable legislation which cannot lawfully be excluded, restricted or modified.
                        </p>
                    </section>

                    {/* ── 10. AI-Generated Content Disclaimer ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            10. AI-Generated Content Disclaimer
                        </h2>
                        <p className="mt-3">
                            The Website makes artificial intelligence tools available to Providers for the purpose of generating promotional content, including but not limited to deal titles, descriptions, and marketing copy (<strong className="text-white/90">AI-Generated Content</strong>). AI-Generated Content is produced by third-party language models and is provided &quot;as is&quot; without any warranty of accuracy, completeness, or fitness for a particular purpose.
                        </p>
                        <p className="mt-3">
                            Providers are solely responsible for reviewing, editing, and approving all AI-Generated Content before it is published on the Website. By publishing AI-Generated Content, the Provider represents and warrants that it is accurate, not misleading or deceptive, compliant with the Australian Consumer Law and all applicable laws, and does not infringe the intellectual property or other rights of any third party.
                        </p>
                        <p className="mt-3">
                            Todays Stash Pty Ltd reserves the right to remove any AI-Generated Content that, in its sole discretion, appears to be inaccurate, misleading, unlawful, or in breach of these Terms, but has no obligation to monitor or review AI-Generated Content before or after publication.
                        </p>
                    </section>

                    {/* ── 11. Competitors ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            11. Competitors
                        </h2>
                        <p className="mt-3">
                            If you are in the business of providing similar Services for the purpose of providing them to users for a commercial gain, whether business users or domestic users, then you are a competitor of Todays Stash Pty Ltd. Competitors are not permitted to use or access any information or content on our Application. If you breach this provision, Todays Stash Pty Ltd will hold you fully responsible for any loss that we may sustain and hold you accountable for all loss, cost and damages from such a breach.
                        </p>
                    </section>

                    {/* ── 12. Limitation of Liability ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            12. Limitation of Liability
                        </h2>
                        <p className="mt-3">
                            Todays Stash Pty Ltd&apos;s total liability arising out of or in connection with the Services or these Terms, however arising, including under contract, tort (including negligence), in equity, under statute or otherwise, will not exceed the resupply of the Services to you.
                        </p>
                        <p className="mt-3">
                            You expressly understand and agree that Todays Stash Pty Ltd, its affiliates, employees, agents, contributors and licensors shall not be liable to you for any direct, indirect, incidental, special consequential or exemplary damages which may be incurred by you, however caused and under any theory of liability. This shall include, but is not limited to, any loss of profit (whether incurred directly or indirectly), any loss of goodwill or business reputation and any other intangible loss.
                        </p>
                    </section>

                    {/* ── 13. Termination of Contract ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            13. Termination of Contract
                        </h2>
                        <p className="mt-3">
                            You may terminate the Terms at any time by ceasing to use the Website and the Services. You may also request deletion of your Account by contacting Todays Stash Pty Ltd via the &apos;Contact Us&apos; link on our homepage.
                        </p>
                        <p className="mt-3">Todays Stash Pty Ltd may at any time, terminate the Terms with you if:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>You have breached any provision of the Terms or intend to breach any provision;</li>
                            <li>Todays Stash Pty Ltd is required to do so by law;</li>
                            <li>Todays Stash Pty Ltd is transitioning to no longer providing the Services to Members in the country in which you are resident or from which you use the service; or</li>
                            <li>The provision of the Services to you by Todays Stash Pty Ltd is, in the opinion of Todays Stash Pty Ltd, no longer commercially viable;</li>
                            <li>The user has engaged in repeated violations of these Terms or has been the subject of multiple complaints from other users or third parties.</li>
                        </ul>
                        <p className="mt-3">
                            Subject to local applicable laws, Todays Stash Pty Ltd reserves the right to discontinue or cancel your membership at any time and may suspend or deny, in its sole discretion, your access to all or any portion of the Website or the Services without notice if you breach any provision of the Terms or any applicable law or if your conduct impacts Todays Stash Pty Ltd&apos;s name or reputation or violates the rights of those of another party.
                        </p>

                        <h3 className="mt-6 text-base font-semibold text-white/90">
                            Account Suspension for Repeated No-Shows
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>If a Receiver accumulates three (3) or more No-Shows within any rolling 30-day period, Todays Stash Pty Ltd reserves the right to suspend or terminate the Receiver&apos;s Account without prior notice;</li>
                            <li>Todays Stash Pty Ltd may, at its sole discretion, issue a warning to the Receiver after the first or second No-Show, but is under no obligation to do so;</li>
                            <li>Receivers acknowledge that repeated No-Shows negatively impact Providers who allocate limited inventory to Reserved offers, and such conduct may constitute a breach of these Terms;</li>
                            <li>Any suspension or termination under this clause does not affect Todays Stash Pty Ltd&apos;s right to pursue other remedies under these Terms or at law.</li>
                        </ul>
                    </section>

                    {/* ── 14. Indemnity ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            14. Indemnity
                        </h2>
                        <p className="mt-3">
                            You agree to indemnify Todays Stash Pty Ltd, its affiliates, employees, agents, contributors, third party content providers and licensors from and against:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>All actions, suits, claims, demands, liabilities, costs, expenses, loss and damage (including legal fees on a full indemnity basis) incurred, suffered or arising out of or in connection with Your Content;</li>
                            <li>Any direct or indirect consequences of you accessing, using or transacting on the Website or attempts to do so; and/or</li>
                            <li>Any breach of the Terms.</li>
                        </ul>
                    </section>

                    {/* ── 15. Dispute Resolution ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            15. Dispute Resolution
                        </h2>
                        <p className="mt-3">
                            <strong className="text-white/90">Compulsory:</strong> If a dispute arises out of or relates to the Terms, either party may not commence any Tribunal or Court proceedings in relation to the dispute, unless the following clauses have been complied with (except where urgent interlocutory relief is sought).
                        </p>
                        <p className="mt-3">
                            <strong className="text-white/90">Notice:</strong> A party to the Terms claiming a dispute (<strong className="text-white/90">Dispute</strong>) has arisen under the Terms, must give written notice to the other party detailing the nature of the dispute, the desired outcome and the action required to settle the Dispute.
                        </p>
                        <p className="mt-3">
                            <strong className="text-white/90">Resolution:</strong> On receipt of that notice (<strong className="text-white/90">Notice</strong>) by that other party, the parties to the Terms (<strong className="text-white/90">Parties</strong>) must:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                            <li>Within 28 days of the Notice endeavour in good faith to resolve the Dispute expeditiously by negotiation or such other means upon which they may mutually agree;</li>
                            <li>If for any reason whatsoever, 28 days after the date of the Notice, the Dispute has not been resolved, the Parties must either agree upon selection of a mediator or request that an appropriate mediator be appointed by the Resolution Institute;</li>
                            <li>The Parties are equally liable for the fees and reasonable expenses of a mediator and the cost of the venue of the mediation;</li>
                            <li>The mediation will be held in Melbourne, Australia.</li>
                        </ul>
                        <p className="mt-3">
                            <strong className="text-white/90">Confidential:</strong> All communications concerning negotiations made by the Parties arising out of and in connection with this dispute resolution clause are confidential and to the extent possible, must be treated as &quot;without prejudice&quot; negotiations for the purpose of applicable laws of evidence.
                        </p>
                        <p className="mt-3">
                            <strong className="text-white/90">Termination of Mediation:</strong> If 2 months have elapsed after the start of a mediation of the Dispute and the Dispute has not been resolved, either Party may ask the mediator to terminate the mediation and the mediator must do so.
                        </p>
                    </section>

                    {/* ── 16. Venue and Jurisdiction ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            16. Venue and Jurisdiction
                        </h2>
                        <p className="mt-3">
                            The Services offered by Todays Stash Pty Ltd are intended to be used by residents of Australia. In the event of any dispute arising out of or in relation to the Website, you agree that the exclusive venue for resolving any dispute shall be in the courts of Victoria, Australia.
                        </p>
                    </section>

                    {/* ── 17. Governing Law ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            17. Governing Law
                        </h2>
                        <p className="mt-3">
                            The Terms are governed by the laws of Victoria, Australia. Any dispute, controversy, proceeding or claim of whatever nature arising out of or in any way relating to the Terms and the rights created hereby shall be governed, interpreted and construed by, under and pursuant to the laws of Victoria, Australia, without reference to conflict of law principles, notwithstanding mandatory rules. The validity of this governing law clause is not contested. The Terms shall be binding to the benefit of the parties hereto and their successors and assigns.
                        </p>
                    </section>

                    {/* ── 18. Severance ── */}
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            18. Severance
                        </h2>
                        <p className="mt-3">
                            If any part of these Terms is found to be void or unenforceable by a Court of competent jurisdiction, that part shall be severed and the rest of the Terms shall remain in force.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
