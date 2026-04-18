export function Logo({ size = 24 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[6px] border border-border bg-surface-elevated"
      style={{ height: size, width: size }}
      aria-hidden="true"
    >
      <svg
        width={size / 2}
        height={size / 2}
        viewBox="0 0 12 12"
        fill="none"
      >
        {/* stylized "L" for Lexitude */}
        <path
          d="M4 2V10H10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
