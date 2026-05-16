'use client';

import { useState } from 'react';
import { CustomsData } from '@/types';

interface CustomsFormProps {
  initialItemDescription?: string;
  initialItemValue?: number;
  tariffCodeRequired: boolean;
  onSubmit: (data: CustomsData) => void;
  onBack: () => void;
}

export default function CustomsForm({
  initialItemDescription = '',
  initialItemValue = 0,
  tariffCodeRequired,
  onSubmit,
  onBack,
}: CustomsFormProps) {
  const [exportReason, setExportReason] = useState<CustomsData['export_reason']>('Gift');
  const [vatStatus, setVatStatus] = useState<CustomsData['vat_status']>('NotRegistered');
  const [recipientVatStatus, setRecipientVatStatus] = useState<CustomsData['recipient_vat_status']>('Individual');
  const [description, setDescription] = useState(initialItemDescription);
  const [value, setValue] = useState(String(initialItemValue || ''));
  const [tariffCode, setTariffCode] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors: Record<string, string> = {};
  if (!description.trim()) errors.description = 'Required';
  if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) errors.value = 'Enter a valid value';
  if (tariffCodeRequired && !tariffCode.trim()) errors.tariffCode = 'Required for this destination';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ description: true, value: true, tariffCode: true });
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      export_reason: exportReason,
      vat_status: vatStatus,
      recipient_vat_status: recipientVatStatus,
      contents: [
        {
          description: description.trim(),
          quantity: 1,
          estimated_value: parseFloat(value),
          ...(tariffCode.trim() && { tariff_code: tariffCode.trim() }),
          origin_country: 'GBR',
        },
      ],
    });
  };

  const mark = (field: string) => setTouched(t => ({ ...t, [field]: true }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">info</span>
          <p className="text-sm text-amber-800">
            International shipments require a customs declaration. This information is submitted to the courier and customs authorities.
          </p>
        </div>
      </div>

      {/* Export reason */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          Reason for export *
        </label>
        <select
          value={exportReason}
          onChange={e => setExportReason(e.target.value as CustomsData['export_reason'])}
          className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low py-3 px-4 text-on-surface focus:bg-white focus:border-primary"
        >
          <option value="Gift">Gift (returning lost property to owner)</option>
          <option value="Sale">Sale</option>
          <option value="Sample">Sample</option>
          <option value="Repair">Repair / Return</option>
          <option value="Documents">Documents</option>
          <option value="TemporaryExport">Temporary export</option>
        </select>
        <p className="text-xs text-on-secondary-container mt-1">
          For lost property being returned to its owner, &ldquo;Gift&rdquo; is typically correct.
        </p>
      </div>

      {/* Sender VAT status */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          Venue VAT status
        </label>
        <div className="flex gap-4">
          {(['NotRegistered', 'Registered'] as const).map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${vatStatus === v ? 'border-primary' : 'border-outline-variant/40'}`}>
                {vatStatus === v && <span className="w-2 h-2 rounded-full bg-primary block" />}
              </span>
              <input type="radio" className="sr-only" checked={vatStatus === v} onChange={() => setVatStatus(v)} />
              <span className="text-sm text-on-surface">{v === 'NotRegistered' ? 'Not VAT registered' : 'VAT registered'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Recipient type */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          Recipient type
        </label>
        <div className="flex gap-4">
          {(['Individual', 'Business'] as const).map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${recipientVatStatus === v ? 'border-primary' : 'border-outline-variant/40'}`}>
                {recipientVatStatus === v && <span className="w-2 h-2 rounded-full bg-primary block" />}
              </span>
              <input type="radio" className="sr-only" checked={recipientVatStatus === v} onChange={() => setRecipientVatStatus(v)} />
              <span className="text-sm text-on-surface">{v}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Item description */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          Item description *
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => mark('description')}
          placeholder="e.g. Leather wallet"
          className={`w-full rounded-lg border bg-surface-container-low py-3 px-4 text-on-surface focus:bg-white focus:border-primary ${errors.description && touched.description ? 'border-error' : 'border-outline-variant/30'}`}
        />
        {errors.description && touched.description && <p className="mt-1 text-xs text-error">{errors.description}</p>}
      </div>

      {/* Declared value */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          Declared value (£) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-medium">£</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={() => mark('value')}
            placeholder="50"
            className={`w-full pl-8 pr-4 py-3 rounded-lg border bg-surface-container-low text-on-surface focus:bg-white focus:border-primary ${errors.value && touched.value ? 'border-error' : 'border-outline-variant/30'}`}
          />
        </div>
        {errors.value && touched.value && <p className="mt-1 text-xs text-error">{errors.value}</p>}
      </div>

      {/* Tariff code */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
          HS / Tariff code {tariffCodeRequired ? '*' : '(optional)'}
        </label>
        <input
          type="text"
          value={tariffCode}
          onChange={e => setTariffCode(e.target.value)}
          onBlur={() => mark('tariffCode')}
          placeholder="e.g. 420232"
          className={`w-full rounded-lg border bg-surface-container-low py-3 px-4 text-on-surface focus:bg-white focus:border-primary ${errors.tariffCode && touched.tariffCode ? 'border-error' : 'border-outline-variant/30'}`}
        />
        {errors.tariffCode && touched.tariffCode && <p className="mt-1 text-xs text-error">{errors.tariffCode}</p>}
        <p className="text-xs text-on-secondary-container mt-1">
          Find your code at{' '}
          <a href="https://www.gov.uk/trade-tariff" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            gov.uk/trade-tariff
          </a>
          . Common codes: wallet 420232, phone 851712, clothing 610910.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
        >
          Continue to Payment
        </button>
      </div>
    </form>
  );
}
