'use client';

import { useState } from 'react';
import { customerApi } from '@/lib/api';
import { Venue, Item } from '@/types';
import { MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ProgressSteps } from './ProgressSteps';

interface SearchItemsProps {
  venue: Venue;
}

export default function SearchItems({ venue }: SearchItemsProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    checkinDate: '',
    checkoutDate: '',
    bookingReference: '',
    itemDescription: '',
  });
  const [matchedItems, setMatchedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  // Track which item descriptions are expanded
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  // Modal carousel state
  const [photoModalItem, setPhotoModalItem] = useState<Item | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const openPhotoModal = (item: Item, index: number = 0) => {
    setPhotoModalItem(item);
    setPhotoIndex(index);
    // slight delay to ensure modal mounted before focusing
    setTimeout(() => {
      const closeBtn = document.getElementById('photo-modal-close-btn');
      closeBtn?.focus();
    }, 0);
  };
  const closePhotoModal = () => {
    setPhotoModalItem(null);
    setPhotoIndex(0);
  };
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
    if (e.key === 'Escape') {
      e.preventDefault();
      closePhotoModal();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextPhoto();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevPhoto();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create query and get AI matches
      const queryResponse = await customerApi.createQuery({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        datesOfStay: {
          checkin: formData.checkinDate,
          checkout: formData.checkoutDate,
        },
        bookingReference: formData.bookingReference || undefined,
        itemDescription: formData.itemDescription,
        venueId: venue.id,
      });

      setQueryId(queryResponse.data.id);

      // Get AI-matched items with 85%+ similarity
      const matchesResponse = await customerApi.getMatchedItems(queryResponse.data.id, 1);
      setMatchedItems(matchesResponse.data);
      setStep(2);
    } catch (error) {
      console.error('Error submitting query:', error);
      alert('Error submitting your query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async (item: Item) => {
    if (!queryId) return; // still referencing for contextual notes

    setLoading(true);
    try {
  const response = await customerApi.createClaim(
        item.id,
        { name: formData.name, email: formData.email, phone: formData.phone || undefined },
        { queryId }
      );
      setClaimId(response.data.id);
      setSelectedItem(item);
    } catch (error) {
      console.error('Error creating claim:', error);
      alert('Error creating claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
  <div className="max-w-5xl mx-auto text-gray-900 font-sans">
        <div className="mb-6">
          <ProgressSteps
            current={1}
            steps={[
              { title: 'Describe', description: 'Provide your details & stay info' },
              { title: 'Matches', description: 'Review potential items & claim' }
            ]}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">
              Find Your Lost Item
            </h2>
            <p className="text-blue-100 mt-1">
              Fill in the details below and we'll search for matching items
            </p>
          </div>
          
          <form onSubmit={handleSubmitQuery} className="p-8" noValidate>
            {/* Personal Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                  1
                </div>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent text-gray-900 bg-white"
                    placeholder="Full Name"
                  />
                  <label htmlFor="name" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                    Full Name *
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent text-gray-900 bg-white"
                    placeholder="Email Address"
                  />
                  <label htmlFor="email" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                    Email Address *
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent text-gray-900 bg-white"
                    placeholder="Phone Number"
                  />
                  <label htmlFor="phone" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                    Phone Number
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent text-gray-900 bg-white"
                    placeholder="Room 204, Conference Hall A"
                  />
                  <label htmlFor="location" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                    Location/Room Number *
                  </label>
                </div>
              </div>
            </div>

            {/* Stay Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                  2
                </div>
                Stay Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                  <input
                    type="date"
                    id="checkinDate"
                    name="checkinDate"
                    required
                    value={formData.checkinDate}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 bg-white"
                  />
                  <label htmlFor="checkinDate" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700">
                    Check-in Date *
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type="date"
                    id="checkoutDate"
                    name="checkoutDate"
                    required
                    value={formData.checkoutDate}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 bg-white"
                  />
                  <label htmlFor="checkoutDate" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700">
                    Check-out Date *
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="bookingReference"
                    name="bookingReference"
                    value={formData.bookingReference}
                    onChange={handleInputChange}
                    className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent text-gray-900 bg-white"
                    placeholder="BK123456"
                  />
                  <label htmlFor="bookingReference" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                    Booking Reference (Optional)
                  </label>
                </div>
              </div>
            </div>

            {/* Item Description Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                  3
                </div>
                Item Description
              </h3>
              <div className="relative">
                <textarea
                  id="itemDescription"
                  name="itemDescription"
                  required
                  rows={4}
                  value={formData.itemDescription}
                  onChange={handleInputChange}
                  className="peer w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-transparent resize-none text-gray-900 bg-white"
                  placeholder="Please describe your lost item in detail..."
                />
                <label htmlFor="itemDescription" className="absolute left-4 -top-2.5 bg-white px-2 text-sm font-medium text-gray-700 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">
                  Description of Lost Item *
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Include details like color, brand, model, size, and any distinctive features
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 font-semibold text-lg shadow-lg"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-6 w-6" />
                    <span>Search for My Item</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Show matched items
  return (
  <div className="max-w-6xl mx-auto text-gray-900 font-sans">
      <div className="mb-6">
        <ProgressSteps
          current={2}
          steps={[
            { title: 'Describe', description: 'Details you provided' },
            { title: 'Matches', description: 'Review & claim your item' }
          ]}
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">
            Potential Matches Found
          </h2>
          <p className="text-green-100 mt-1">
            {matchedItems.length > 0 
              ? `We found ${matchedItems.length} item(s) that might match your description`
              : "No items found matching your description"
            }
          </p>
        </div>
        
        <div className="p-8">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                    <div className="space-y-2 pt-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="h-10 bg-gray-200 rounded mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && matchedItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MagnifyingGlassIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No matches found
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                We couldn&apos;t find any items matching your description at the moment. 
                You can try searching again with different keywords.
              </p>
              <button
                onClick={() => setStep(1)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold"
              >
                Try Another Search
              </button>
            </div>
          ) : (!loading && matchedItems.length > 0) ? (
            <>
              <div className="mb-8">
                <p className="text-gray-600 text-lg">
                  Click &quot;Claim This Item&quot; if you recognize your lost item below.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {matchedItems.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    {item.images && item.images.length > 0 && (
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openPhotoModal(item, 0); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
                          aria-label="View photos"
                        >
                          <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg shadow">
                            View Photos ({item.images.length})
                          </span>
                        </button>
                      </div>
                    )}
                    
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                        {item.title}
                      </h3>
                      {/* Description with Show More / Less toggle */}
                      <div className="mb-4">
                        <p
                          className={
                            `text-gray-600 ${expandedDescriptions[item.id] ? '' : 'line-clamp-3'}`
                          }
                        >
                          {item.description}
                        </p>
                        {item.description && item.description.length > 140 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDescriptions(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                            aria-expanded={!!expandedDescriptions[item.id]}
                          >
                            {expandedDescriptions[item.id] ? 'Show Less' : 'Show More'}
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Category:</span>
                          <span className="font-medium text-gray-900 capitalize">{item.category}</span>
                        </div>
                        {item.color && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color:</span>
                            <span className="font-medium text-gray-900 capitalize">{item.color}</span>
                          </div>
                        )}
                        {item.brand && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Brand:</span>
                            <span className="font-medium text-gray-900">{item.brand}</span>
                          </div>
                        )}
                        {item.location_found && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Found at:</span>
                            <span className="font-medium text-gray-900">{item.location_found}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date found:</span>
                          <span className="font-medium text-gray-900">{new Date(item.date_found).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleClaimItem(item)}
                        disabled={loading || !!claimId}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Claim This Item</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-600 mb-4">
                  Don&apos;t see your item? Try searching with different keywords.
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-semibold"
                >
                  Try Another Search
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      
      {claimId && (
        <div className="mt-6 relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-green-200/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-emerald-200/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-green-100 ring-4 ring-white/60 shadow-inner rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                Claim Submitted!
              </h3>
              <p className="text-green-800/90 leading-relaxed mb-4">
                We&apos;ve received your claim and generated a unique ID. An email with full details will be sent to
                {formData.email ? <span className="font-semibold"> {formData.email}</span> : ' your address'} shortly. You will be notified automatically of any updates (approval, additional information required, pickup or delivery instructions) very soon.
              </p>
              <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-lg p-4 mb-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700 font-medium mb-1">Claim ID</p>
                    <p className="font-mono text-lg sm:text-xl font-semibold text-green-900 tracking-wide select-all break-all">
                      {claimId}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(claimId || '');
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow"
                    >
                      Copy ID
                    </button>
                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-white text-green-700 border border-green-300 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Search Again
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                  <p className="font-semibold text-green-800 mb-1">What Happens Next</p>
                  <p className="text-green-700/80 leading-snug">Venue staff review & match your details with the item.</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                  <p className="font-semibold text-green-800 mb-1">Email Updates</p>
                  <p className="text-green-700/80 leading-snug">We email you on status changes or if more info is needed.</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                  <p className="font-semibold text-green-800 mb-1">Keep This ID</p>
                  <p className="text-green-700/80 leading-snug">Use it to check status or verify pickup / delivery.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Photo Modal */}
      {photoModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={photoModalItem.title + ' photos'}
          onKeyDown={handleModalKey}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePhotoModal} />
          <div className="relative max-w-4xl w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 truncate pr-4">{photoModalItem.title}</h4>
              <button
                id="photo-modal-close-btn"
                onClick={closePhotoModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '420px' }}>
              {photoModalItem.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${photoModalItem.title} image ${idx + 1} of ${photoModalItem.images?.length}`}
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${idx === photoIndex ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden={idx === photoIndex ? 'false' : 'true'}
                />
              ))}
              {photoModalItem.images && photoModalItem.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Previous photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Next photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-2">
                    {photoModalItem.images.map((_, i) => {
                      const active = i === photoIndex;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPhotoIndex(i)}
                          aria-label={`Go to photo ${i + 1}`}
                          className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${active ? 'w-6 bg-white shadow' : 'w-2.5 bg-white/50 hover:bg-white'} `}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>
                Photo {photoIndex + 1} of {photoModalItem.images?.length || 1}
              </span>
              <button
                onClick={closePhotoModal}
                className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}