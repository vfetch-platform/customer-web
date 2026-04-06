import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/demo" className="inline-flex items-center gap-2 text-sm text-on-secondary-container hover:text-primary transition-colors mb-6">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </Link>

        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">Privacy Policy</h1>
        <p className="text-on-secondary-container leading-relaxed mb-8">
          We collect only the information needed to help identify, verify, and return lost items.
        </p>

        <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-6 md:p-8 space-y-4">
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Information such as contact details, stay dates, and item descriptions is used to process your search and claim.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Data is shared only with relevant venue and delivery partners required to complete your return process.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            For privacy questions, contact <a href="mailto:support@vfetch.com" className="text-primary underline underline-offset-4">support@vfetch.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
