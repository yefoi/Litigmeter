export default function Logo({ tamano = 28 }: { tamano?: number }) {
  return (
    <span className="marca">
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 32 32"
        role="img"
        aria-label="Litigmeter"
        focusable="false"
      >
        <rect width="32" height="32" rx="8" fill="var(--acento)" />
        <rect x="7" y="17" width="4" height="8" rx="1" fill="#ffffff" opacity="0.85" />
        <rect x="14" y="12" width="4" height="13" rx="1" fill="#ffffff" />
        <rect x="21" y="7" width="4" height="18" rx="1" fill="#ffffff" opacity="0.7" />
      </svg>
      <span className="marcaTexto">Litigmeter</span>
    </span>
  );
}
