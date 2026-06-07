import '../styles/globals.css'

export const metadata = {
  title: 'Aletheia — See the Truth Unfold',
  description: 'Autonomous explainability-first research agent',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy text-text-main font-body">
        {children}
      </body>
    </html>
  )
}
