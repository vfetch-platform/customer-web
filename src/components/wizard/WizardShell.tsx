'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Venue, Item } from '@/types';
import { SearchFormData, DEFAULT_SEARCH_FORM_DATA } from '@/constants/search';
import { STORAGE_KEY_SEARCH_FORM } from '@/constants/storage';
import { EMAIL_REGEX } from '@/constants/regex';
import { isBelowHardMin, isBelowSoftMin } from '@/lib/validation';
import { customerApi, getErrorMessage } from '@/lib/api';
import { ProgressSteps } from '@/components/ProgressSteps';
import Step1Identity from './Step1Identity';
import Step2ItemDetails from './Step2ItemDetails';
import Step3Review from './Step3Review';
import MatchedItemsView from './MatchedItemsView';
import OTPModal from './OTPModal';

interface WizardShellProps {
  venue: Venue;
  onSwitchTab?: (tab: string) => void;
}

type WizardStep = 1 | 2 | 3 | 'results';

const WIZARD_STEPS = [
  { title: 'Identity' },
  { title: 'Item Details' },
  { title: 'Review' },
];

export default function WizardShell({ venue, onSwitchTab }: WizardShellProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const hasMountedWizardStepRef = useRef(false);
  const [formData, setFormData] = useState<SearchFormData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY_SEARCH_FORM);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SEARCH_FORM_DATA, ...parsed, photos: [] };
        }
      } catch { /* ignore */ }
    }
    return DEFAULT_SEARCH_FORM_DATA;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const [matchedItems, setMatchedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Email OTP state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Persist form data (excluding photos which are not serializable)
  useEffect(() => {
    const { photos, ...serializable } = formData;
    sessionStorage.setItem(STORAGE_KEY_SEARCH_FORM, JSON.stringify(serializable));
  }, [formData]);

  useEffect(() => {
    if (!hasMountedWizardStepRef.current) {
      hasMountedWizardStepRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [wizardStep]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
    if (name === 'email') {
      setEmailVerified(false);
      setOtpModalOpen(false);
      setOtpError(null);
    }
  }, [fieldErrors]);

  const handleCategorySelect = useCallback((category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    if (fieldErrors.category) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next.category; return next; });
    }
  }, [fieldErrors]);

  const handlePhotosAdd = useCallback((files: File[]) => {
    setFormData((prev) => ({ ...prev, photos: [...prev.photos, ...files] }));
  }, []);

  const handlePhotoRemove = useCallback((index: number) => {
    setFormData((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  }, []);

  // Step 1 validation
  const validateStep1 = (): boolean => {
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    setDescriptionTouched(true);
    if (!formData.category) errors.category = 'Please select a category';
    if (isBelowHardMin(formData.itemDescription)) {
      errors.itemDescription = 'Please describe your item in more detail';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOTP = useCallback(async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      await customerApi.sendOTP(formData.email.trim());
      setOtpModalOpen(true);
    } catch (err: unknown) {
      setFieldErrors((prev) => ({ ...prev, email: getErrorMessage(err) }));
    } finally {
      setOtpSending(false);
    }
  }, [formData.email]);

  const handleResendOTP = useCallback(async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      await customerApi.sendOTP(formData.email.trim());
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  }, [formData.email]);

  const handleVerifyOTP = useCallback(async (code: string) => {
    setOtpVerifying(true);
    setOtpError(null);
    try {
      await customerApi.verifyOTP(formData.email.trim(), code);
      setEmailVerified(true);
      setOtpModalOpen(false);
      setWizardStep(2);
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err));
    } finally {
      setOtpVerifying(false);
    }
  }, [formData.email]);

  const handleNextStep1 = () => {
    if (!validateStep1()) return;
    if (emailVerified) {
      setWizardStep(2);
      return;
    }
    handleSendOTP();
  };

  const handleNextStep2 = () => {
    if (validateStep2()) {
      setWizardStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setTermsError('Please accept the Terms & Conditions before searching.');
      return;
    }

    setLoading(true);
    setError(null);
    setTermsError(null);
    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (formData.photos.length > 0) {
        try {
          photoUrls = await customerApi.uploadPhotos(formData.photos);
        } catch {
          // Photo upload failure is non-blocking
          console.warn('Photo upload failed, continuing without photos');
        }
      }

      const queryResponse = await customerApi.createQuery({
        name: formData.name,
        email: formData.email,
        phone: formData.phoneCountryCode + ' ' + formData.phone,
        location: formData.location,
        datesOfStay: { checkin: formData.checkinDate, checkout: formData.checkoutDate },
        bookingReference: formData.bookingReference || undefined,
        itemDescription: formData.itemDescription,
        venueId: venue.id,
        category: formData.category || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });

      const newQueryId = queryResponse.data.id;
      setQueryId(newQueryId);

      // Immediately fetch matches
      const matchesResponse = await customerApi.getMatchedItems(newQueryId);
      setMatchedItems(matchesResponse.data);
      setWizardStep('results');
    } catch (err: unknown) {
      console.error('Error searching:', err);
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
      sessionStorage.removeItem(STORAGE_KEY_SEARCH_FORM);
    } catch (err: unknown) {
      console.error('Error creating claim:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAgain = () => {
    setWizardStep(1);
    setMatchedItems([]);
    setClaimId(null);
    setQueryId(null);
    setError(null);
    setTermsAccepted(false);
    setTermsError(null);
    setOtpModalOpen(false);
    setOtpError(null);
    // emailVerified intentionally kept — email hasn't changed, no need to re-verify
  };

  const handleEditStep = (step: number) => {
    setWizardStep(step as 1 | 2);
  };

  const handleGoToTracking = () => {
    if (onSwitchTab) onSwitchTab('status');
  };

  // Results view
  if (wizardStep === 'results') {
    return (
      <main className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
        <MatchedItemsView
          matchedItems={matchedItems}
          loading={loading}
          error={error}
          claimId={claimId}
          formEmail={formData.email}
          checkoutDate={formData.checkoutDate}
          onClaimItem={handleClaimItem}
          onSearchAgain={handleSearchAgain}
          onDismissError={() => setError(null)}
        />
      </main>
    );
  }

  const currentStep = typeof wizardStep === 'number' ? wizardStep : 1;

  return (
    <main className="pt-28 pb-20 px-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-1">Find Your Lost Item</h1>
        <p className="text-on-secondary-container text-sm">
          Step {currentStep} of 3 — Tell us about your item and we'll instantly search the venue's lost and found.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="my-8">
        <ProgressSteps current={currentStep} steps={WIZARD_STEPS} />
      </div>

      {/* Step Content */}
      {wizardStep === 1 && (
        <Step1Identity
          formData={formData}
          fieldErrors={fieldErrors}
          onInputChange={handleInputChange}
          onNext={handleNextStep1}
          onCancel={handleSearchAgain}
          emailVerified={emailVerified}
          otpSending={otpSending}
        />
      )}
      {otpModalOpen && (
        <OTPModal
          email={formData.email}
          otpVerifying={otpVerifying}
          otpSending={otpSending}
          otpError={otpError}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          onClose={() => setOtpModalOpen(false)}
        />
      )}
      {wizardStep === 2 && (
        <Step2ItemDetails
          formData={formData}
          fieldErrors={fieldErrors}
          descriptionTouched={descriptionTouched}
          onInputChange={handleInputChange}
          onCategorySelect={handleCategorySelect}
          onPhotosAdd={handlePhotosAdd}
          onPhotoRemove={handlePhotoRemove}
          onDescriptionBlur={() => setDescriptionTouched(true)}
          onNext={handleNextStep2}
          onBack={() => { setWizardStep(1); }}
        />
      )}
      {wizardStep === 3 && (
        <Step3Review
          formData={formData}
          loading={loading}
          error={error}
          termsAccepted={termsAccepted}
          termsError={termsError}
          onTermsAcceptedChange={(accepted) => {
            setTermsAccepted(accepted);
            if (termsError) {
              setTermsError(null);
            }
          }}
          onSubmit={handleSubmit}
          onBack={() => { setWizardStep(2); }}
          onEditStep={handleEditStep}
        />
      )}
    </main>
  );
}
