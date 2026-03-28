'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { customerApi } from '@/lib/api';

interface Venue {
    id: string;
    name: string;
    type: string;
    city?: string;
}

export default function DemoPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
        try {
            const data = await customerApi.getVenues();
            const activeVenues = [
                ...data
            ].filter((v, i, self) => 
                // Deduplicate by ID just in case
                i === self.findIndex((t) => t.id === v.id)
            );

            setVenues(activeVenues);
            if (activeVenues.length > 0) {
                setSelectedVenue(activeVenues[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch venues:", error);
            // Fallback if API fails completely
            setVenues([
                { id: 'demo-hotel-123', name: 'Grand Plaza Hotel (Demo)', type: 'hotel' }
            ]);
            setSelectedVenue('demo-hotel-123');
        } finally {
            setLoading(false);
        }
    };

    fetchVenues();
  }, []);

  const handleVisitDemo = () => {
    if (selectedVenue) {
        router.push(`/venue/${selectedVenue}/lost-and-found`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Demo Lost & Found Platform
          </h1>
          <p className="text-gray-600">
            Experience how the platform works for different types of venues
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
              Choose a demo venue:
            </label>
            {loading ? (
                <div className="w-full h-10 bg-gray-100 rounded animate-pulse"></div>
            ) : (
                <select
                id="venue"
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                >
                {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                    {venue.name} ({venue.type?.replace('_', ' ') || 'Venue'}) {venue.city ? `- ${venue.city}` : ''}
                    </option>
                ))}
                </select>
            )}
          </div>

          <button
            onClick={handleVisitDemo}
            disabled={loading || !selectedVenue}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Visit Demo Platform
          </button>

          <div className="text-sm text-gray-500 space-y-2">
            <p><strong>What you can do in the demo:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Search for lost items with AI-powered matching</li>
              <li>Submit a claim for found items</li>
              <li>Check claim status with a Claim ID</li>
              <li>Choose collection methods (pickup, courier)</li>
              <li>Experience the complete customer journey</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}