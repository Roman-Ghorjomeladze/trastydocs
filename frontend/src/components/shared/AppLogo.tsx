interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M24 2L4 10v12c0 11.5 8.2 22.2 20 25.8 11.8-3.6 20-14.3 20-25.8V10L24 2z"
        fill="#2563eb"
      />
      <path
        d="M24 5L7 12v10c0 9.8 6.8 19 17 22 10.2-3 17-12.2 17-22V12L24 5z"
        fill="#1d4ed8"
      />
      <rect x="15" y="11" width="18" height="24" rx="2" fill="white" />
      <path d="M27 11v5.5h5.5L27 11z" fill="#bfdbfe" />
      <rect x="18" y="20" width="12" height="2" rx="1" fill="#2563eb" opacity="0.5" />
      <rect x="18" y="25" width="9" height="2" rx="1" fill="#2563eb" opacity="0.5" />
      <rect x="18" y="30" width="6" height="2" rx="1" fill="#2563eb" opacity="0.5" />
    </svg>
  );
}
