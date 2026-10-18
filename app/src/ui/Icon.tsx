import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const glyphs = {
  bag: (
    <>
      <Path d="M6 7h12l1 13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 7z" />
      <Path d="M9 7V6a3 3 0 0 1 6 0v1" />
    </>
  ),
  layers: (
    <>
      <Rect x="3" y="9" width="4.5" height="6" rx="1.2" />
      <Rect x="9.75" y="9" width="4.5" height="6" rx="1.2" />
      <Rect x="16.5" y="9" width="4.5" height="6" rx="1.2" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  wallet: (
    <>
      <Path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" />
      <Rect x="4" y="7" width="16" height="12.5" rx="2.5" />
      <Path d="M16 13.25h.01" />
    </>
  ),
  receipt: <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  shield: <Path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  back: <Path d="M15 18l-6-6 6-6" />,
  chevronRight: <Path d="M9 18l6-6-6-6" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  close: <Path d="M18 6L6 18M6 6l12 12" />,
  check: <Path d="M20 6L9 17l-5-5" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  compose: (
    <>
      <Path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4z" />
    </>
  ),
  qr: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" />
      <Path d="M14 14h3v3M21 14v.01M14 21h.01M17.5 21H21v-3.5" />
    </>
  ),
  scan: <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />,
  chat: <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z" />,
  phone: (
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),

  phoneIncoming: <Path d="M18 6L6 18M6 8v10h10" />,
  phoneOutgoing: <Path d="M6 18L18 6M8 6h10v10" />,
  phoneEnd: (
    <Path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.1 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9 10.9M22 2L2 22" />
  ),
  mic: (
    <>
      <Rect x="9" y="2" width="6" height="12" rx="3" />
      <Path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
    </>
  ),
  micOff: (
    <>
      <Path d="M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 5.1 2.1" />
      <Path d="M19 10v1a7 7 0 0 1-.9 3.4M5 10v1a7 7 0 0 0 11.2 5.6M12 18v4M3 3l18 18" />
    </>
  ),
  speaker: (
    <>
      <Path d="M11 5L6 9H3v6h3l5 4V5z" />
      <Path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  send: <Path d="M12 19V5M5 12l7-7 7 7" />,
  image: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Circle cx="9" cy="9" r="1.75" />
      <Path d="M21 15l-5-5L5 21" />
    </>
  ),
  file: (
    <>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <Path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  download: <Path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  copy: (
    <>
      <Rect x="9" y="9" width="12" height="12" rx="2.5" />
      <Path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  ),
  share: <Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />,
  trash: <Path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M6 6l1 14a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 20l1-14" />,
  timer: (
    <>
      <Circle cx="12" cy="13.5" r="7.5" />
      <Path d="M12 9.5v4l2.5 2.5M9.5 2.5h5" />
    </>
  ),
  bell: <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  sliders: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <Circle cx="16" cy="7" r="2" />
      <Circle cx="8" cy="17" r="2" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  hash: <Path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />,
  card: (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="2.5" />
      <Path d="M2 10h20" />
    </>
  ),
  moon: <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  eyeOff: (
    <>
      <Path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
    </>
  ),
  ban: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  flag: <Path d="M4 22V4s1-1 4-1 5 2 8 2 4-1 4-1v11s-1 1-4 1-5-2-8-2-4 1-4 1" />,
  help: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 16v-4M12 8h.01" />
    </>
  ),
  alert: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v4M12 16h.01" />
    </>
  ),
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  doc: (
    <>
      <Path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <Path d="M8 12h8M8 16h8M8 8h3" />
    </>
  ),
  logout: <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  external: <Path d="M7 17L17 7M8 7h9v9" />,
  camera: (
    <>
      <Path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.6-2.4A1.5 1.5 0 0 1 10 3h4a1.5 1.5 0 0 1 1.2.6L16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  screenshot: (
    <>
      <Rect x="5" y="2" width="14" height="20" rx="2.5" />
      <Path d="M9 7H8.5v1M15 7h.5v1M9 16h-.5v-1M15 16h.5v-1" />
    </>
  ),
  delete: <Path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9l-5 6M12 9l5 6" />,
  play: <Path d="M7 4.5v15a.5.5 0 0 0 .8.4l11.2-7.5a.5.5 0 0 0 0-.8L7.8 4.1a.5.5 0 0 0-.8.4z" />,
  pause: <Path d="M8 5v14M16 5v14" />,
  retry: <Path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />,
} as const;

export type IconName = keyof typeof glyphs;

const filled: Partial<Record<IconName, true>> = { play: true };

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color, strokeWidth = 1.75 }: Props) {
  const isFilled = filled[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyphs[name]}
    </Svg>
  );
}
