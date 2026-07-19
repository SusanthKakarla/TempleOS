/** Static, decorative background blobs behind the dashboard shell. Server Component — no interactivity. */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="blob-drift gradient-saffron-gold absolute -top-32 -left-24 size-[32rem] rounded-full opacity-15 blur-3xl" />
      <div className="blob-drift gradient-blue-purple absolute top-1/3 -right-32 size-[28rem] rounded-full opacity-10 blur-3xl [animation-delay:-8s]" />
      <div className="blob-drift gradient-green-emerald absolute -bottom-40 left-1/4 size-[30rem] rounded-full opacity-10 blur-3xl [animation-delay:-16s]" />
    </div>
  );
}
