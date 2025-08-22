import React from 'react';

export const BitcoinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M6 12h8a4 4 0 0 1 0 8h-1a4 4 0 0 0 0-8h1Z" />
    <path d="M6 4h8a4 4 0 0 1 0 8h-1a4 4 0 0 0 0-8h1Z" />
    <path d="M9 2v20" />
  </svg>
);