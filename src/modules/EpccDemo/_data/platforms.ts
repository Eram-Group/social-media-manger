import type { IconType } from 'react-icons';
import {
  FaXTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaFacebookF,
  FaSnapchat,
  FaTiktok,
} from 'react-icons/fa6';

// Mock platform catalogue for the EPCC demo. Each platform carries its real
// brand icon (react-icons) + brand color used for chips/avatars.
export interface IPlatform {
  id: TPlatformId;
  name: string;
  Icon: IconType;
  color: string; // brand hex
  textOnBrand: string; // readable text/icon color on the brand color
}

export type TPlatformId =
  | 'x'
  | 'instagram'
  | 'linkedin'
  | 'facebook'
  | 'snapchat'
  | 'tiktok';

export const PLATFORMS: IPlatform[] = [
  { id: 'x', name: 'X', Icon: FaXTwitter, color: '#000000', textOnBrand: '#FFFFFF' },
  { id: 'instagram', name: 'Instagram', Icon: FaInstagram, color: '#E1306C', textOnBrand: '#FFFFFF' },
  { id: 'linkedin', name: 'LinkedIn', Icon: FaLinkedinIn, color: '#0A66C2', textOnBrand: '#FFFFFF' },
  { id: 'facebook', name: 'Facebook', Icon: FaFacebookF, color: '#1877F2', textOnBrand: '#FFFFFF' },
  { id: 'snapchat', name: 'Snapchat', Icon: FaSnapchat, color: '#FFFC00', textOnBrand: '#1A1A1A' },
  { id: 'tiktok', name: 'TikTok', Icon: FaTiktok, color: '#010101', textOnBrand: '#FFFFFF' },
];

export const getPlatform = (id: TPlatformId): IPlatform =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

// Chart-friendly colors. X and TikTok are both "black" brands, so they're given
// distinct readable tones for charts; Snapchat's yellow becomes a readable amber.
const CHART_COLOR: Record<TPlatformId, string> = {
  x: '#1D2733', // dark slate (vs pure black)
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  snapchat: '#F0B400', // readable amber
  tiktok: '#EE1D52', // TikTok red (distinct from X)
};

export const platformChartColor = (id: TPlatformId): string => CHART_COLOR[id] ?? '#025FCC';

export const platformColorByName = (name: string): string => {
  const p = PLATFORMS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return p ? platformChartColor(p.id) : '#025FCC';
};

// Instagram needs a gradient for an authentic look (used by the avatar chip).
export const INSTAGRAM_GRADIENT =
  'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)';
