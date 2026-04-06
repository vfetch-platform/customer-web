import Link from 'next/link';

interface SupportPageProps {
  searchParams?: {
    from?: string;
  };
}

export default function SupportPage({ searchParams }: SupportPageProps) {
  const backHref = searchParams?.from && searchParams.from !== '/support'
    ? searchParams.from
    : '/demo';

  return (
    <main className="min-h-screen bg-surface pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-on-secondary-container hover:text-primary transition-colors mb-6">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back
        </Link>

        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">Help &amp; Support</h1>
        <p className="text-on-secondary-container leading-relaxed mb-8">
          Need help with a lost item search, claim status, or collection details? Our support team is here to assist.
        </p>

        <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-6 md:p-8 space-y-4">
          <h2 className="font-headline text-xl font-bold text-primary">Contact options</h2>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            For urgent collection or verification issues, contact the venue directly using your claim ID. For platform support,
            email <a href="mailto:support@vfetch.com" className="text-primary underline underline-offset-4">support@vfetch.com</a>.
          </p>
          <p className="text-on-secondary-container text-sm leading-relaxed">
            Please include your claim ID, venue name, and a short summary so we can help faster.
          </p>
        </div>
      </div>
    </main>
  );
}
