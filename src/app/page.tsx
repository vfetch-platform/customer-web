import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            VFetch Lost & Found
          </h1>
          <p className="text-gray-600 mb-8">
            AI-powered platform to help you find your lost items
          </p>
          
          <div className="space-y-4">
            <Link
              href="/demo"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Demo
            </Link>
            
            <p className="text-sm text-gray-500">
              For businesses: Contact us to integrate with your website
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}