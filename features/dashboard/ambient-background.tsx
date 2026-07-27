/** Subtle ambient background texture behind the dashboard shell. Server Component — no interactivity. */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="noise-overlay absolute inset-0" />
    </div>
  );
}
