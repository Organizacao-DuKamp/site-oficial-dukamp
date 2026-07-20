import type { SVGProps } from "react";

export const FacebookBrand = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.875 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.313 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.384A12.003 12.003 0 0 0 24 12z"/>
    <path fill="#FFFFFF" d="M16.671 15.47 17.203 12h-3.328V9.749c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.373-.234-2.686-.234c-2.741 0-4.533 1.661-4.533 4.668V12H7.078v3.47h3.047v8.384a12.06 12.06 0 0 0 3.75 0V15.47h2.796z"/>
  </svg>
);

export const InstagramBrand = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <defs>
      <radialGradient id="igg" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="5%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#igg)"/>
    <path fill="none" stroke="#fff" strokeWidth="2" d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/>
  </svg>
);

export const YoutubeBrand = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
    <path fill="#FFFFFF" d="M9.6 15.6V8.4L15.8 12l-6.2 3.6z"/>
  </svg>
);

export const TikTokBrand = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#25F4EE" d="M19.3 8.6a6.9 6.9 0 0 1-3.2-1.5v7.2a5.4 5.4 0 1 1-5.4-5.4c.2 0 .5 0 .7.1v2.8a2.6 2.6 0 1 0 1.8 2.5V2h2.7a4.2 4.2 0 0 0 3.4 3.7v2.9z" transform="translate(-1 0)"/>
    <path fill="#FE2C55" d="M20.3 9.6a6.9 6.9 0 0 1-3.2-1.5v7.2a5.4 5.4 0 1 1-5.4-5.4c.2 0 .5 0 .7.1v2.8a2.6 2.6 0 1 0 1.8 2.5V3h2.7a4.2 4.2 0 0 0 3.4 3.7v2.9z" transform="translate(1 0)"/>
    <path fill="#FFFFFF" d="M19.6 9a6.9 6.9 0 0 1-3.2-1.5v7.2a5.4 5.4 0 1 1-5.4-5.4c.2 0 .5 0 .7.1v2.8a2.6 2.6 0 1 0 1.8 2.5V2.4h2.7a4.2 4.2 0 0 0 3.4 3.7V9z"/>
  </svg>
);

export const WhatsappBrand = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" {...props}>
    <path fill="#25D366" d="M16 0a16 16 0 0 0-13.87 23.94L0 32l8.28-2.17A16 16 0 1 0 16 0z"/>
    <path fill="#FFFFFF" d="M23.42 19.34c-.4-.2-2.36-1.16-2.72-1.3-.37-.13-.63-.2-.9.2-.26.4-1.03 1.3-1.26 1.56-.23.27-.46.3-.86.1-.4-.2-1.69-.62-3.22-1.98-1.19-1.06-2-2.37-2.23-2.77-.23-.4-.02-.61.17-.81.18-.18.4-.46.6-.7.2-.23.26-.4.4-.66.13-.27.06-.5-.03-.7-.1-.2-.9-2.17-1.24-2.97-.32-.78-.66-.67-.9-.68l-.76-.02c-.27 0-.7.1-1.06.5-.36.4-1.4 1.36-1.4 3.31 0 1.95 1.43 3.84 1.63 4.1.2.27 2.83 4.32 6.85 6.05.96.41 1.7.66 2.29.85.96.3 1.83.26 2.52.16.77-.12 2.36-.97 2.7-1.9.33-.94.33-1.73.23-1.9-.1-.16-.36-.26-.76-.46z"/>
  </svg>
);
