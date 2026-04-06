'use client';

import { Venue } from '@/types';
import WizardShell from '@/components/wizard/WizardShell';

interface SearchItemsProps {
  venue: Venue;
  onSwitchTab?: (tab: string) => void;
}

export default function SearchItems({ venue }: SearchItemsProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<SearchFormData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY_SEARCH_FORM);
        if (stored) return { ...DEFAULT_SEARCH_FORM_DATA, ...JSON.parse(stored) };
      } catch { /* ignore */ }
    }
    return DEFAULT_SEARCH_FORM_DATA;
  });
  const [matchedItems, setMatchedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const claimSuccessRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [descriptionWarningDismissed, setDescriptionWarningDismissed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SEARCH_FORM, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (claimId && claimSuccessRef.current) {
      claimSuccessRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [claimId]);

  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [photoModalItem, setPhotoModalItem] = useState<Item | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const openPhotoModal = (item: Item, index: number = 0) => {
    setPhotoModalItem(item);
    setPhotoIndex(index);
    setTimeout(() => {
      const closeBtn = document.getElementById('photo-modal-close-btn');
      closeBtn?.focus();
    }, 0);
  };
  const closePhotoModal = () => { setPhotoModalItem(null); setPhotoIndex(0); };
  const nextPhoto = () => {
    if (!photoModalItem?.images) return;
    setPhotoIndex(p => (p + 1) % photoModalItem.images.length);
  };
  const prevPhoto = () => {
    if (!photoModalItem?.images) return;
    setPhotoIndex(p => (p - 1 + photoModalItem.images.length) % photoModalItem.images.length);
  };
  const handleModalKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!photoModalItem) return;
    if (e.key === 'Escape') { e.preventDefault(); closePhotoModal(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nextPhoto(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPhoto(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'itemDescription' && !isBelowSoftMin(value)) {
      setDescriptionWarningDismissed(false);
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const validateFields = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.checkinDate) errors.checkinDate = 'Check-in date is required';
    if (!formData.checkoutDate) errors.checkoutDate = 'Check-out date is required';
    if (formData.checkinDate && formData.checkoutDate && new Date(formData.checkoutDate) < new Date(formData.checkinDate)) {
      errors.checkoutDate = 'Check-out date must be on or after check-in date';
    }
    return errors;
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setDescriptionTouched(true);
    const desc = formData.itemDescription;
    if (isBelowHardMin(desc)) return;
    if (isBelowSoftMin(desc) && !descriptionWarningDismissed) { setDescriptionWarningDismissed(true); return; }

    setLoading(true);
    setError(null);
    try {
      const queryResponse = await customerApi.createQuery({
        name: formData.name, email: formData.email, phone: formData.phone,
        location: formData.location || undefined,
        datesOfStay: { checkin: formData.checkinDate, checkout: formData.checkoutDate },
        bookingReference: formData.bookingReference || undefined,
        itemDescription: formData.itemDescription, venueId: venue.id,
      });
      setQueryId(queryResponse.data.id);
      const matchesResponse = await customerApi.getMatchedItems(queryResponse.data.id);
      setMatchedItems(matchesResponse.data);
      setStep(2);
    } catch (err: unknown) {
      console.error('Error submitting query:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async (item: Item) => {
    if (!queryId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await customerApi.createClaim(
        item.id,
        { name: formData.name, email: formData.email, phone: formData.phone || undefined },
        { queryId }
      );
      setClaimId(response.data.id);
      setSelectedItem(item);
      sessionStorage.removeItem(STORAGE_KEY_SEARCH_FORM);
    } catch (err: unknown) {
      console.error('Error creating claim:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 1: SEARCH FORM ─────────────────────────────────────
  if (step === 1) {
    return (
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
        {/* Hero Section */}
        <header className="mb-16 text-center md:text-left">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-primary tracking-tight mb-4 leading-tight">
            Let&apos;s find <br className="hidden md:block" /> what you <span className="text-surface-tint">lost.</span>
          </h1>
          <p className="font-body text-on-secondary-container text-lg max-w-2xl leading-relaxed">
            Our digital concierge service is here to reunite you with your belongings. Provide us with a few details and we&apos;ll scan our vault immediately.
          </p>
        </header>

        <form onSubmit={handleSubmitQuery} noValidate>
          <div className="space-y-12">
            {/* Section 01: Personal Information */}
            <section className="bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-[0px_24px_48px_rgba(7,30,39,0.06)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed/20 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline font-bold text-sm">01</span>
                  <h2 className="font-headline text-2xl font-bold text-primary">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Full Name *</label>
                    <input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange}
                      className={`bg-surface-container-low border-0 border-b py-4 px-1 text-on-surface placeholder:text-outline/50 transition-all ${fieldErrors.name ? 'border-error' : 'border-outline-variant/30'}`}
                      placeholder="e.g. Alexander Mitchell" />
                    {fieldErrors.name && <p className="text-sm text-error">{fieldErrors.name}</p>}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Email Address *</label>
                    <input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange}
                      className={`bg-surface-container-low border-0 border-b py-4 px-1 text-on-surface placeholder:text-outline/50 transition-all ${fieldErrors.email ? 'border-error' : 'border-outline-variant/30'}`}
                      placeholder="alexander@example.com" />
                    {fieldErrors.email && <p className="text-sm text-error">{fieldErrors.email}</p>}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Phone Number</label>
                    <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange}
                      className="bg-surface-container-low border-0 border-b border-outline-variant/30 py-4 px-1 text-on-surface placeholder:text-outline/50 transition-all"
                      placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Room Number</label>
                    <input id="location" name="location" type="text" value={formData.location} onChange={handleInputChange}
                      className="bg-surface-container-low border-0 border-b border-outline-variant/30 py-4 px-1 text-on-surface placeholder:text-outline/50 transition-all"
                      placeholder="Suite 402" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 02: Stay Information */}
            <section className="bg-surface-container p-8 md:p-12 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline font-bold text-sm">02</span>
                <h2 className="font-headline text-2xl font-bold text-primary">Stay Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="checkinDate" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Check-in Date *</label>
                  <div className="relative">
                    <input id="checkinDate" name="checkinDate" type="date" required value={formData.checkinDate} onChange={handleInputChange}
                      className={`w-full bg-white/50 border-0 border-b py-4 px-1 text-on-surface transition-all appearance-none ${fieldErrors.checkinDate ? 'border-error' : 'border-outline-variant/30'}`} />
                    <span className="material-symbols-outlined absolute right-2 top-4 text-outline pointer-events-none">calendar_today</span>
                  </div>
                  {fieldErrors.checkinDate && <p className="text-sm text-error">{fieldErrors.checkinDate}</p>}
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="checkoutDate" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Check-out Date *</label>
                  <div className="relative">
                    <input id="checkoutDate" name="checkoutDate" type="date" required value={formData.checkoutDate} onChange={handleInputChange}
                      className={`w-full bg-white/50 border-0 border-b py-4 px-1 text-on-surface transition-all appearance-none ${fieldErrors.checkoutDate ? 'border-error' : 'border-outline-variant/30'}`} />
                    <span className="material-symbols-outlined absolute right-2 top-4 text-outline pointer-events-none">event_available</span>
                  </div>
                  {fieldErrors.checkoutDate && <p className="text-sm text-error">{fieldErrors.checkoutDate}</p>}
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="bookingReference" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Booking Reference</label>
                  <input id="bookingReference" name="bookingReference" type="text" value={formData.bookingReference} onChange={handleInputChange}
                    className="bg-white/50 border-0 border-b border-outline-variant/30 py-4 px-1 text-on-surface placeholder:text-outline/50 transition-all"
                    placeholder="e.g. VX-99281" />
                </div>
              </div>
            </section>

            {/* Section 03: Item Description */}
            <section className="bg-surface-container-low p-8 md:p-12 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline font-bold text-sm">03</span>
                <h2 className="font-headline text-2xl font-bold text-primary">Item Description</h2>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="itemDescription" className="text-xs font-bold uppercase tracking-wider text-outline px-1">Tell us what&apos;s missing *</label>
                  <textarea id="itemDescription" name="itemDescription" required rows={4}
                    value={formData.itemDescription} onChange={handleInputChange}
                    onBlur={() => setDescriptionTouched(true)}
                    aria-invalid={descriptionTouched && isBelowHardMin(formData.itemDescription) ? 'true' : undefined}
                    className={`bg-surface-container-lowest border-0 border-b py-4 px-4 text-on-surface placeholder:text-outline/40 transition-all rounded-t-xl resize-none ${
                      descriptionTouched && isBelowHardMin(formData.itemDescription) ? 'border-error' :
                      descriptionTouched && isBelowSoftMin(formData.itemDescription) ? 'border-tertiary-fixed-dim' :
                      'border-outline-variant/30'
                    }`}
                    placeholder="Black iPhone 14 Pro in a blue silicone case, last seen near the pool lounge area around 4 PM..." />
                </div>

                {/* Hard min error */}
                {descriptionTouched && isBelowHardMin(formData.itemDescription) && (
                  <div className="flex items-center gap-2" role="alert">
                    <span className="material-symbols-outlined text-error text-lg">error</span>
                    <p className="text-sm text-error">Please describe your item in at least a few words (e.g. item type, colour, brand)</p>
                  </div>
                )}

                {/* Teal info banner */}
                <div className="flex flex-wrap gap-4 items-center p-4 bg-tertiary-fixed/10 rounded-xl">
                  <span className="material-symbols-outlined text-on-tertiary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <p className="text-sm text-on-tertiary-fixed-variant font-medium">Be as descriptive as possible. Include brands, colors, unique stickers, or distinguishing marks.</p>
                </div>

                {/* Example queries */}
                {!formData.itemDescription.trim() && (
                  <div>
                    <p className="text-xs font-medium text-outline uppercase tracking-wide mb-2">Examples</p>
                    <div className="flex flex-col gap-2">
                      {EXAMPLE_QUERIES.map((example, i) => (
                        <p key={i} className="text-sm text-on-secondary-container rounded-lg px-3 py-2">&ldquo;{example}&rdquo;</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft min nudge banner */}
                {formData.itemDescription.trim().length > 0 && isBelowSoftMin(formData.itemDescription) && !isBelowHardMin(formData.itemDescription) && (
                  <div className="flex items-start gap-3 rounded-xl border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4">
                    <span className="material-symbols-outlined text-on-tertiary-fixed-variant mt-0.5">lightbulb</span>
                    <div>
                      <p className="text-sm font-medium text-on-tertiary-fixed-variant mb-2">Improve your search for better results</p>
                      <p className="text-xs text-on-tertiary-fixed-variant mb-3">Adding more detail helps our AI find your item faster. Try including:</p>
                      <ul className="list-disc list-inside text-xs text-on-tertiary-fixed-variant space-y-1">
                        {getMissingSuggestions(formData.itemDescription).map((suggestion, i) => (
                          <li key={i}>{suggestion.replace(/^\+ /, '')}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} />}

            {/* Submit Action */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6">
              <div className="flex items-center gap-4 text-outline">
                <span className="material-symbols-outlined">security</span>
                <p className="text-sm leading-snug">Your data is encrypted and handled <br /> with hospitality-grade privacy.</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-primary to-primary-container text-white px-12 py-5 rounded-full font-headline font-bold text-lg shadow-[0px_24px_48px_rgba(7,30,39,0.12)] hover:opacity-90 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                ) : (
                  <>
                    <span>{descriptionWarningDismissed && isBelowSoftMin(formData.itemDescription) ? 'Search Anyway' : 'Search for My Item'}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    );
  }

  // ─── STEP 2: MATCHED ITEMS ─────────────────────────────────
  return (
    <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-16">
        <h1 className="font-headline font-extrabold text-5xl md:text-6xl text-primary tracking-tighter mb-4">
          Potential Matches
        </h1>
        <p className="font-body text-on-secondary-container text-lg md:text-xl max-w-2xl leading-relaxed">
          {matchedItems.length > 0
            ? 'Based on your description, here are items found at the venue. Review and claim yours.'
            : 'No items found matching your description.'}
        </p>
      </header>

      {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} className="mb-8" />}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-container-lowest rounded-[2rem] overflow-hidden editorial-shadow ghost-border">
              <div className="h-72 bg-surface-container-high" />
              <div className="p-8 space-y-4">
                <div className="h-3 bg-surface-container-high rounded w-1/4" />
                <div className="h-5 bg-surface-container-high rounded w-3/4" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
                <div className="h-3 bg-surface-container-high rounded w-2/3" />
                <div className="h-12 bg-surface-container-high rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No matches */}
      {!loading && matchedItems.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-outline">search_off</span>
          </div>
          <h3 className="font-headline text-2xl font-bold text-primary mb-3">No matches found</h3>
          <p className="text-on-secondary-container mb-8 max-w-md mx-auto">
            We couldn&apos;t find any items matching your description at the moment. You can try searching again with different keywords.
          </p>
          <button onClick={() => setStep(1)}
            className="bg-gradient-to-r from-primary to-primary-container text-white py-4 px-8 rounded-full font-headline font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10">
            Try Another Search
          </button>
        </div>
      )}

      {/* Bento grid of matched items */}
      {!loading && matchedItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {matchedItems.map((item) => {
              const matchScore = (item as any).match_score || (item as any).similarity_score;
              const isHighMatch = matchScore && matchScore >= 90;
              return (
                <div key={item.id} className="group relative flex flex-col bg-surface-container-lowest rounded-[2rem] overflow-hidden editorial-shadow ghost-border transition-all duration-300 hover:translate-y-[-4px]">
                  {/* Image */}
                  {item.images && item.images.length > 0 && (
                    <div className="relative h-72 overflow-hidden">
                      <img src={item.images[0]} alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); openPhotoModal(item, 0); }}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                        aria-label="View photos">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-on-surface text-sm font-medium px-4 py-2 rounded-full shadow transition-opacity">
                          View Photos ({item.images.length})
                        </span>
                      </button>
                      {/* Match badge */}
                      {matchScore && (
                        <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full font-headline font-bold text-sm shadow-sm flex items-center gap-1.5 ${
                          isHighMatch ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface'
                        }`}>
                          <span className="material-symbols-outlined text-[18px]" style={isHighMatch ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                            {isHighMatch ? 'verified' : 'check_circle'}
                          </span>
                          {Math.round(matchScore)}% Match
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-8 flex-grow flex flex-col">
                    <div className="mb-6">
                      <span className="text-xs font-bold uppercase tracking-widest text-on-secondary-container opacity-60 mb-1 block">
                        {item.category}
                      </span>
                      <h3 className="font-headline font-bold text-2xl text-primary line-clamp-2">{item.title}</h3>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="mb-4">
                        <p className={`text-on-secondary-container text-sm ${expandedDescriptions[item.id] ? '' : 'line-clamp-3'}`}>
                          {item.description}
                        </p>
                        {item.description.length > DESCRIPTION_TRUNCATION_THRESHOLD && (
                          <button type="button"
                            onClick={() => setExpandedDescriptions(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="mt-1 text-sm font-medium text-surface-tint hover:underline"
                            aria-expanded={!!expandedDescriptions[item.id]}>
                            {expandedDescriptions[item.id] ? 'Show Less' : 'Show More'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-3 mb-8">
                      {item.location_found && (
                        <div className="flex items-center gap-3 text-on-secondary-container text-sm">
                          <span className="material-symbols-outlined text-[20px] text-surface-tint">location_on</span>
                          <span>{item.location_found}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-on-secondary-container text-sm">
                        <span className="material-symbols-outlined text-[20px] text-surface-tint">calendar_today</span>
                        <span>Found {new Date(item.date_found).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {item.color && (
                        <div className="flex items-center gap-3 text-on-secondary-container text-sm">
                          <span className="material-symbols-outlined text-[20px] text-surface-tint">palette</span>
                          <span className="capitalize">{item.color}</span>
                        </div>
                      )}
                      {item.brand && (
                        <div className="flex items-center gap-3 text-on-secondary-container text-sm">
                          <span className="material-symbols-outlined text-[20px] text-surface-tint">sell</span>
                          <span>{item.brand}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <button onClick={() => handleClaimItem(item)} disabled={loading || !!claimId}
                      className="mt-auto w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-headline font-bold tracking-tight hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
                      This is mine
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary action */}
          <div className="mt-20 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-surface-container rounded-[1.5rem] p-8 text-center">
              <p className="font-body text-on-secondary-container mb-6">
                Don&apos;t see your item here? Our concierge team is constantly cataloging new items.
              </p>
              <button onClick={() => setStep(1)}
                className="px-8 py-3 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold tracking-tight hover:bg-surface-container-high transition-colors active:scale-95">
                None of these are mine
              </button>
            </div>
          </div>
        </>
      )}

      {/* Claim success card */}
      {claimId && (
        <div ref={claimSuccessRef} className="mt-12 relative overflow-hidden rounded-[2rem] bg-surface-container-lowest editorial-shadow p-8 md:p-12">
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-tertiary-fixed/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-tertiary-fixed/5 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-tertiary-fixed/20 ring-4 ring-white/60 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-2xl font-bold text-primary mb-3">Claim Submitted!</h3>
              <p className="text-on-secondary-container leading-relaxed mb-4">
                We&apos;ve received your claim and generated a unique ID. An email with full details will be sent to
                {formData.email ? <span className="font-semibold"> {formData.email}</span> : ' your address'} shortly.
              </p>
              <div className="bg-surface-container-low rounded-xl p-4 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-outline font-medium mb-1">Claim ID</p>
                    <p className="font-headline text-lg sm:text-xl font-bold text-primary tracking-wide select-all break-all">{claimId}</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => navigator.clipboard.writeText(claimId || '')}
                      className="px-4 py-2 text-sm font-headline font-bold rounded-full bg-gradient-to-r from-primary to-primary-container text-white hover:opacity-90 active:scale-95 transition-all shadow-sm">
                      Copy ID
                    </button>
                    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-4 py-2 text-sm font-headline font-bold rounded-full bg-secondary-container text-on-secondary-container hover:bg-surface-container-high transition-colors">
                      Search Again
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-headline font-bold text-primary mb-1">What Happens Next</p>
                  <p className="text-on-secondary-container leading-snug">Venue staff review & match your details with the item.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-headline font-bold text-primary mb-1">Email Updates</p>
                  <p className="text-on-secondary-container leading-snug">We email you on status changes or if more info is needed.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-headline font-bold text-primary mb-1">Keep This ID</p>
                  <p className="text-on-secondary-container leading-snug">Use it to check status or verify pickup / delivery.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label={photoModalItem.title + ' photos'} onKeyDown={handleModalKey}>
          <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" onClick={closePhotoModal} />
          <div className="relative max-w-4xl w-full bg-surface-container-lowest rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <h4 className="font-headline text-lg font-bold text-primary truncate pr-4">{photoModalItem.title}</h4>
              <button id="photo-modal-close-btn" onClick={closePhotoModal}
                className="text-outline hover:text-primary transition-colors rounded-full p-1" aria-label="Close">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="relative bg-on-surface flex items-center justify-center" style={{ minHeight: '420px' }}>
              {photoModalItem.images?.map((img, idx) => (
                <img key={idx} src={img}
                  alt={`${photoModalItem.title} image ${idx + 1} of ${photoModalItem.images?.length}`}
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${idx === photoIndex ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden={idx !== photoIndex} />
              ))}
              {photoModalItem.images && photoModalItem.images.length > 1 && (
                <>
                  <button type="button" onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-on-surface rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Previous photo">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button type="button" onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-on-surface rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Next photo">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-2">
                    {photoModalItem.images.map((_, i) => (
                      <button key={i} type="button" onClick={() => setPhotoIndex(i)} aria-label={`Go to photo ${i + 1}`}
                        className={`h-2.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white shadow' : 'w-2.5 bg-white/50 hover:bg-white'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 flex items-center justify-between text-sm text-on-secondary-container">
              <span>Photo {photoIndex + 1} of {photoModalItem.images?.length || 1}</span>
              <button onClick={closePhotoModal} className="text-surface-tint hover:underline font-headline font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
