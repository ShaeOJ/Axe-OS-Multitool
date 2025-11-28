export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is a nested layout - it inherits the root layout's HTML structure
  return <>{children}</>;
}
