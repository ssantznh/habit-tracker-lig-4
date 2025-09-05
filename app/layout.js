import './globals.css'

export const metadata = {
  title: 'Habit Tracker - Lig-4 Style',
  description: 'Interactive habit tracker with Connect 4 style visualization',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
