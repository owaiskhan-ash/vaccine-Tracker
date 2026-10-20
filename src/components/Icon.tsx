import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M18.4 5.6l-1.1 1.1M6.7 17.3l-1.1 1.1" />
  </Base>
);

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="4" />
    <path d="M8 3.4v3.4M16 3.4v3.4M3.6 10.2h16.8" />
  </Base>
);

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.4 9.6a5.6 5.6 0 0 1 11.2 0c0 4 1.4 5.4 1.4 5.4H5s1.4-1.4 1.4-5.4Z" />
    <path d="M10.2 18.4a2 2 0 0 0 3.6 0" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.4" r="3.7" />
    <path d="M4.8 20.2c.6-3.6 3.6-5.6 7.2-5.6s6.6 2 7.2 5.6" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" />
  </Base>
);

export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.4 5.6l6.4 6.4-6.4 6.4" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.8 12.6l4.6 4.6L19.4 7" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4.2v10.4M7.6 10.6L12 15l4.4-4.4M4.8 19.2h14.4" />
  </Base>
);

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.4V5M7.6 9.4L12 5l4.4 4.4M4.8 19.2h14.4" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.8 7.2h14.4M9.6 7.2V5.4a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v1.8M6.6 7.2l.8 11.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.8-11.2" />
  </Base>
);

export const IconSparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.6c.6 4.3 2.5 6.2 6.8 6.8-4.3.6-6.2 2.5-6.8 6.8-.6-4.3-2.5-6.2-6.8-6.8 4.3-.6 6.2-2.5 6.8-6.8Z" />
    <path d="M18.4 16.4c.2 1.5.9 2.2 2.4 2.4-1.5.2-2.2.9-2.4 2.4-.2-1.5-.9-2.2-2.4-2.4 1.5-.2 2.2-.9 2.4-2.4Z" />
  </Base>
);

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.2M12 7.9v.2" />
  </Base>
);

export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.2V3.8M8.4 7.2L12 3.6l3.6 3.6" />
    <path d="M5.4 13.4v4.8a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2v-4.8" />
  </Base>
);

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.8 19.2h4l9.6-9.6-4-4-9.6 9.6v4Z" />
    <path d="M13.6 6.4l4 4" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6V12l3 1.8" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.4l6.6 2.4v5.4c0 3.8-2.6 7-6.6 8.4-4-1.4-6.6-4.6-6.6-8.4V5.8L12 3.4Z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c4-4.4 6-7.4 6-10a6 6 0 1 0-12 0c0 2.6 2 5.6 6 10Z" />
    <circle cx="12" cy="10.8" r="2.2" />
  </Base>
);

export const IconBaby = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M9 10.2v.2M15 10.2v.2M9.4 14.6c1.6 1.2 3.6 1.2 5.2 0" />
  </Base>
);
