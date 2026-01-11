export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-lg border border-border bg-card p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom duration-300">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Organizer. Built with focus.
      </p>
    </div>
  );
}
