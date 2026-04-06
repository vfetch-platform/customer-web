import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-surface pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/demo" className="inline-flex items-center gap-2 text-sm text-on-secondary-container hover:text-primary transition-colors mb-6">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </Link>

        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">Terms of Use</h1>
        <p className="text-on-secondary-container leading-relaxed mb-8">
          These terms outline how the lost and found service should be used and what to expect during recovery.
        </p>

        <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-6 md:p-8 space-y-4">
          <p className="text-on-secondary-container text-sm leading-relaxed">
            You are responsible for providing accurate item details and contact information when submitting a search.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Collection and delivery are subject to venue verification, availability, and applicable fees.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Vfetch and partner venues may request additional verification before releasing an item.
          </p>
        </div>
      </div>
    </main>
  );
}
