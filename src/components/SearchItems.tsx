'use client';

import { Venue } from '@/types';
import WizardShell from '@/components/wizard/WizardShell';

interface SearchItemsProps {
  venue: Venue;
  onSwitchTab?: (tab: string) => void;
}

export default function SearchItems({ venue, onSwitchTab }: SearchItemsProps) {
  return <WizardShell venue={venue} onSwitchTab={onSwitchTab} />;
}
