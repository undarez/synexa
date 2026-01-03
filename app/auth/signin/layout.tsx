// Forcer le rendu dynamique pour cette route
export const dynamic = "force-dynamic";

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

