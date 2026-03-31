import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lost & Found - VFetch',
  description: 'Find your lost items with our AI-powered search platform',
  icons: {
    icon: '/favicon-nobg.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Manrope:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-surface min-h-screen antialiased text-on-surface">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
