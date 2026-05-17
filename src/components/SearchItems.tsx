'use client';

import { Venue } from '@/types';
import WizardShell from '@/components/wizard/WizardShell';

interface SearchItemsProps {
  venue: Venue;
}

export default function SearchItems({ venue }: SearchItemsProps) {
  return <WizardShell venue={venue} />;
}
