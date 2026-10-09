import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Merges NativeWind class lists so later classes win (e.g. a caller's `text-4xl` over a
 * variant's `text-base`). NativeWind doesn't guarantee CSS order, so conflicts must be removed.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Our per-weight families (tailwind.config.js) are font *families*, not weights.
      'font-family': [
        { font: ['sans', 'sans-medium', 'sans-semibold', 'sans-bold', 'display', 'display-bold'] },
      ],
    },
  },
});

export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(' '));
}
