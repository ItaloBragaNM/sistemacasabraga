export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-petrol px-4 py-10">
      {children}
    </div>
  );
}
