/** Accent color for the public storefront (orange, mobile-first design). */
export const storefrontAccent = {
    button: 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-500 dark:text-white dark:hover:bg-orange-600',
    /** Use on outline Buttons when selected so dark variant styles do not override orange. */
    buttonOnOutline:
        'border-transparent bg-orange-500 text-white hover:bg-orange-600 dark:border-transparent dark:bg-orange-500 dark:text-white dark:hover:bg-orange-600',
    pill: 'bg-orange-500 text-white dark:bg-orange-500 dark:text-white',
    pillMuted: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    text: 'text-orange-500 dark:text-orange-400',
    border: 'border-orange-500 dark:border-orange-400',
    ring: 'ring-orange-500 dark:ring-orange-400',
    avatar: 'bg-orange-500 text-white dark:bg-orange-500 dark:text-white',
    cardActive: 'border-orange-300 dark:border-orange-500/60',
} as const;
