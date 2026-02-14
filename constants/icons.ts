/**
 * Icon-related constants and mappings
 */
import {
  Check,
  Link2,
  Trash2,
  EyeOff,
  VolumeX,
  Volume2,
  Bookmark,
  Flag,
  AlertCircle,
  Repeat2,
} from 'lucide-react-native';

export const TOAST_ICONS = {
  copied: Link2,
  deleted: Trash2,
  hidden: EyeOff,
  muted: VolumeX,
  unmuted: Volume2,
  saved: Bookmark,
  reported: Flag,
  reposted: Repeat2,
  success: Check,
  error: AlertCircle,
} as const;

export const SF_SYMBOL_MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} as const;
