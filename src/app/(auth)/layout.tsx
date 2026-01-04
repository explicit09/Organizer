export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-stone-200/70 bg-white/90 p-8 shadow-[0_20px_50px_-30px_rgba(20,20,20,0.5)] backdrop-blur">
        {children}
      </div>
    </div>
  );
}
