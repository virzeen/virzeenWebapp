// The Virzeen mark: the owner's artwork (public/brand/logo/logo-black.svg and logo-white.svg, 2026-09-30), with no
// circle. Colour follows `currentColor`: black on light backgrounds, white on dark ones (`text-canvas`).

type LogoMarkProps = {
  className?: string;
  /** Leave out when the mark sits next to the name (decorative). */
  title?: string;
};

export function LogoMark({ className, title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 460.76 376.74"
      className={className}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M.23,1.62s172.72,143.11,215.57,371.34c.41,2.19,2.31,3.78,4.53,3.78h0c2.69,0,4.81-2.28,4.63-4.96l-13.75-197.96c-1.68-24.16-14.24-46.25-34.16-60.04L17.57,3.32C12.63-.1,6.28-1,.68,1.19.03,1.45-.22,1.62.23,1.62Z" />
      <path d="M460.53,1.62s-172.72,143.11-215.57,371.34c-.41,2.19-2.31,3.78-4.53,3.78h0c-2.69,0-4.81-2.28-4.63-4.96l13.75-197.96c1.68-24.16,14.24-46.25,34.16-60.04L443.18,3.32c4.94-3.42,11.29-4.33,16.89-2.13.66.26.9.42.46.42Z" />
    </svg>
  );
}
