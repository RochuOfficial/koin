import { Image } from 'expo-image';
import { ICONS, type IconName } from './registry';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
}

/**
 * Renders a full-color icon asset (#128). No `color` prop: unlike a
 * single-path glyph font, these are multi-color illustrations that can't be
 * recolored via tint — see ICON_SYSTEM.md's Component API note.
 */
export function Icon({ name, size = 24 }: IconProps) {
  return (
    <Image
      source={ICONS[name]}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{ width: size, height: size }}
    />
  );
}
