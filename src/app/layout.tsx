import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lost & Found - VFetch',
  description: 'Find your lost items with our AI-powered search platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-gray-50 min-h-screen antialiased text-gray-900">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}