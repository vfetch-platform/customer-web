'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { customerApi } from '@/lib/api';
import { Venue } from '@/types';
import SearchItems from '@/components/SearchItems';
import ClaimStatus from '@/components/ClaimStatus';

export default function LostAndFoundPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'status'>('search');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const response = await customerApi.getVenue(venueId);
        setVenue(response.data);
      } catch (err) {
        setError('Venue not found');
        console.error('Error fetching venue:', err);
      } finally {
        setLoading(false);
      }
    };

    if (venueId) {
      fetchVenue();
    }
  }, [venueId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Venue not found'}
          </h1>
          <p className="text-gray-600">
            Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with venue branding */}
      <div 
        className="bg-gradient-to-r from-blue-600 to-blue-800 text-white"
        style={{
          background: venue.branding_colors?.primary 
            ? `linear-gradient(to right, ${venue.branding_colors.primary}, ${venue.branding_colors.secondary || venue.branding_colors.primary})`
            : undefined
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            {venue.logo && (
              <img 
                src={venue.logo} 
                alt={`${venue.name} logo`}
                className="h-12 w-12 object-contain bg-white rounded p-1"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">Lost & Found</h1>
              <p className="text-blue-100">{venue.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search for Item
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Check Claim Status
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' && <SearchItems venue={venue} />}
        {activeTab === 'status' && <ClaimStatus venue={venue} />}
      </div>

      {/* Footer with venue contact info */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-2 text-gray-600">
                <p>{venue.address}</p>
                <p>Phone: {venue.phone}</p>
                <p>Email: {venue.email}</p>
                {venue.website && (
                  <p>
                    Website: <a href={venue.website} className="text-blue-600 hover:underline">
                      {venue.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
            
            {venue.collection_hours && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Hours</h3>
                <div className="space-y-1 text-gray-600">
                  {Object.entries(venue.collection_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize">{day}:</span>
                      <span>
                        {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
              <ol className="space-y-2 text-gray-600 text-sm">
                <li>1. Search for your lost item</li>
                <li>2. Claim the item if found</li>
                <li>3. Wait for venue approval</li>
                <li>4. Choose collection method</li>
                <li>5. Collect your item</li>
              </ol>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}