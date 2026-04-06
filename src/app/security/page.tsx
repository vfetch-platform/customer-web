import Link from 'next/link';

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-surface pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/demo" className="inline-flex items-center gap-2 text-sm text-on-secondary-container hover:text-primary transition-colors mb-6">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </Link>

        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">Security</h1>
        <p className="text-on-secondary-container leading-relaxed mb-8">
          Your claim data and item recovery workflow are protected with secure handling and verification controls.
        </p>

        <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-6 md:p-8 space-y-4">
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Access to claim details is restricted to authorized staff and systems involved in item verification and return.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            We use secure transport and controlled integrations for payments and delivery partners.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            If you believe there is a security concern, contact <a href="mailto:support@vfetch.com" className="text-primary underline underline-offset-4">support@vfetch.com</a> with your claim ID.
          </p>
        </div>
      </div>
    </main>
  );
}
