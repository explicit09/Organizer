export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 bg-[#09090b]">
      <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-8">
        {children}
      </div>
    </div>
  );
}
