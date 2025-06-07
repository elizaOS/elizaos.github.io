import React from "react";

const GoldCheckmarkIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="128"
    height="128"
    viewBox="0 0 128 128"
    // The className prop is applied here to control size and other utilities.
    // Original fill="currentColor" is removed as the SVG has its own gradient.
    className={className}
  >
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff8dc" />
        <stop offset="40%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#b8860b" />
      </linearGradient>
    </defs>
    {/* Hexagon shape */}
    <polygon
      points="64,8 112,36 112,92 64,120 16,92 16,36"
      fill="url(#goldGradient)"
      stroke="#b8860b"
      strokeWidth="4"
    />

    {/* Checkmark with black outline */}
    <path
      d="M46 68 l12 14 l24 -30"
      fill="none"
      stroke="black"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Checkmark inner white part */}
    <path
      d="M46 68 l12 14 l24 -30"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default GoldCheckmarkIcon;
