export const metadata = {
  title: 'LinkedIn Scraper - Dynamic Jobs Dashboard',
  description: 'A beautiful, dynamic job scraper interface.',
};

import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
