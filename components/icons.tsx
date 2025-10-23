
import React from 'react';

export const LoadingSpinner: React.FC<{className?: string}> = ({ className }) => (
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
    className={`animate-spin ${className}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);


export const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20.71,4.04C20.32,3.65 19.69,3.65 19.3,4.04L16.22,7.12L12.96,3.86C12.57,3.47 11.94,3.47 11.55,3.86L10.29,5.12L11.71,6.54L10,8.25L4,14.25L4,18C4,18.55 4.45,19 5,19L8.75,19L14.75,13L16.46,11.29L17.88,12.71L19.14,11.45C19.53,11.06 19.53,10.43 19.14,10.04L15.88,6.78L18.96,3.7L20.71,5.45C21.1,5.06 21.1,4.43 20.71,4.04M2.93,19.07L11.5,10.5L13.5,12.5L4.93,21.07C4.74,21.26 4.48,21.37 4.22,21.37C3.96,21.37 3.71,21.26 3.52,21.07C3.13,20.68 3.13,20.05 3.52,19.66L2.93,19.07Z" />
    </svg>
);


export const AudioWaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 9V15H7L12 20V4L7 9H3M16 10.5C16 8.73 14.83 7.22 13.23 6.72L12 7.64V16.36L13.23 17.28C14.83 16.78 16 15.27 16 13.5V12.5H18V13.5C18 16.15 16.14 18.33 13.77 18.84L12 19.56V22H10V2H12V4.44L13.77 5.16C16.14 5.67 18 7.85 18 10.5V11.5H16V10.5Z" />
    </svg>
);

export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-6h2v6h-2zm0-8V7h2v2h-2z" clipRule="evenodd" />
    </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
    </svg>
);