export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is a nested layout - it inherits the root layout's HTML structure
  // We just render children directly since ThemeProvider and Toaster are in root layout
  return <>{children}</>;
}
