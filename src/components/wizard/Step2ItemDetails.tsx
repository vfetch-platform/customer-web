'use client';

import { useRef } from 'react';
import { SearchFormData, ITEM_CATEGORIES, PHOTO_MAX_SIZE_BYTES, PHOTO_ACCEPTED_TYPES, PHOTO_MAX_COUNT } from '@/constants/search';
import { isBelowHardMin, isBelowSoftMin, getMissingSuggestions } from '@/lib/validation';

interface Step2ItemDetailsProps {
  formData: SearchFormData;
  fieldErrors: Record<string, string>;
  descriptionTouched: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCategorySelect: (category: string) => void;
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (index: number) => void;
  onDescriptionBlur: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2ItemDetails({
  formData, fieldErrors, descriptionTouched,
  onInputChange, onCategorySelect, onPhotosAdd, onPhotoRemove,
  onDescriptionBlur, onNext, onBack,
}: Step2ItemDetailsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(
      (f) => PHOTO_ACCEPTED_TYPES.includes(f.type) && f.size <= PHOTO_MAX_SIZE_BYTES
    );
    if (valid.length > 0) {
      onPhotosAdd(valid.slice(0, PHOTO_MAX_COUNT - formData.photos.length));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter(
      (f) => PHOTO_ACCEPTED_TYPES.includes(f.type) && f.size <= PHOTO_MAX_SIZE_BYTES
    );
    if (valid.length > 0) {
      onPhotosAdd(valid.slice(0, PHOTO_MAX_COUNT - formData.photos.length));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-2">Describe your item</h1>
        <p className="text-on-secondary-container text-sm">
          The more details you provide, the faster our curators can identify your lost belonging.
        </p>
      </div>

      {/* Item Category */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <p className="text-xs font-bold uppercase tracking-wider text-on-secondary-container mb-4">Item Category</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ITEM_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => onCategorySelect(cat.key)}
              className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${
                formData.category === cat.key
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-outline-variant/15 bg-white text-on-secondary-container hover:border-primary/30'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${formData.category === cat.key ? 'text-primary' : 'text-on-secondary-container'}`}>
                {cat.icon}
              </span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
        {fieldErrors.category && <p className="text-xs text-error mt-2">{fieldErrors.category}</p>}
      </section>

      {/* Detailed Description */}
      <section>
        <label htmlFor="itemDescription" className="block text-sm font-bold text-on-surface mb-2">Detailed Description</label>
        <textarea
          id="itemDescription" name="itemDescription" rows={5}
          value={formData.itemDescription} onChange={onInputChange}
          onBlur={onDescriptionBlur}
          className={`w-full bg-white rounded-xl px-4 py-4 text-on-surface placeholder:text-outline/40 border transition-colors resize-none ${
            descriptionTouched && isBelowHardMin(formData.itemDescription) ? 'border-error' :
            descriptionTouched && isBelowSoftMin(formData.itemDescription) ? 'border-tertiary-fixed-dim' :
            'border-outline-variant/20 focus:border-primary'
          }`}
          placeholder="Please describe identifying marks, brand, color, and condition..."
        />
        {descriptionTouched && isBelowHardMin(formData.itemDescription) && (
          <div className="flex items-center gap-2 mt-2" role="alert">
            <span className="material-symbols-outlined text-error text-sm">error</span>
            <p className="text-xs text-error">Please describe your item in at least a few words (e.g. item type, colour, brand)</p>
          </div>
        )}
        {formData.itemDescription.trim().length > 0 && isBelowSoftMin(formData.itemDescription) && !isBelowHardMin(formData.itemDescription) && (
          <div className="flex items-start gap-3 rounded-xl border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4 mt-3">
            <span className="material-symbols-outlined text-on-tertiary-fixed-variant mt-0.5 text-sm">lightbulb</span>
            <div>
              <p className="text-xs font-medium text-on-tertiary-fixed-variant mb-1">Adding more detail helps our AI find your item faster:</p>
              <ul className="list-disc list-inside text-xs text-on-tertiary-fixed-variant space-y-0.5">
                {getMissingSuggestions(formData.itemDescription).map((s, i) => (
                  <li key={i}>{s.replace(/^\+ /, '')}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Photo Upload */}
      <section>
        <p className="text-sm font-bold text-on-surface mb-3">Photos of the item (if available)</p>
        <div className="flex flex-wrap gap-4">
          {/* Upload area */}
          {formData.photos.length < PHOTO_MAX_COUNT && (
            <div
              className="w-40 h-40 md:w-52 md:h-44 rounded-xl bg-surface-container-low border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <span className="material-symbols-outlined text-3xl text-outline/50 mb-1">photo_camera</span>
              <p className="text-xs font-medium text-on-secondary-container">Upload main photo</p>
              <p className="text-[10px] text-outline">PNG, JPG up to 10MB</p>
            </div>
          )}

          {/* Photo previews */}
          {formData.photos.map((photo, idx) => (
            <div key={idx} className="relative w-40 h-40 md:w-52 md:h-44 rounded-xl overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(photo)}
                alt={`Upload ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onPhotoRemove(idx)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}

          {/* Additional photo slot */}
          {formData.photos.length > 0 && formData.photos.length < PHOTO_MAX_COUNT && (
            <div
              className="w-40 h-40 md:w-52 md:h-44 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-3xl text-outline/30">add</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={PHOTO_ACCEPTED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_left</span>
          Back
        </button>
        <button
          type="button" onClick={onNext}
          className="bg-primary text-white px-10 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2"
        >
          Next Step
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
