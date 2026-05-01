// Subtle "tech" background: silver panel grid + slow blue diagonal sweep.
// Replaces the consumer-style radial gradient with a Linear/Vercel/Tesla feel.
// Pure CSS — no JS, GPU-only animation, respects prefers-reduced-motion.
export function TechBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      <div className="absolute inset-0 panel-grid" />
      <div className="absolute inset-0 panel-sweep" />
    </div>
  );
}
