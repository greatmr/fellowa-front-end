import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import {
  animation,
  backgroundImage,
  blur,
  borderRadius,
  boxShadow,
  fontSize,
  maxWidth,
  transitionTimingFunction,
} from '../../tailwind.config'

/**
 * tailwind-merge only knows Tailwind's default scales. Without this, a
 * custom size like `text-label` is read as a text *color* and silently
 * removes `text-primary-foreground` (or vice versa) in the same `cn()` call.
 * Group names come from tailwind.config.ts so the two cannot drift.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: Object.keys(fontSize) }],
      shadow: [{ shadow: Object.keys(boxShadow) }],
      rounded: [{ rounded: Object.keys(borderRadius) }],
      'bg-image': [{ bg: Object.keys(backgroundImage) }],
      'max-w': [{ 'max-w': Object.keys(maxWidth) }],
      animate: [{ animate: Object.keys(animation) }],
      ease: [{ ease: Object.keys(transitionTimingFunction) }],
      blur: [{ blur: Object.keys(blur) }],
      'backdrop-blur': [{ 'backdrop-blur': Object.keys(blur) }],
    },
  },
})

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
