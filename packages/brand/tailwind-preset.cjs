/**
 * Preset de Tailwind compartido de Tito Apps.
 * Mapea nombres semánticos a los design tokens (variables CSS), de modo que
 * los componentes de @titoapps/ui usen `bg-primary`, `text-muted`, `shadow-md`,
 * etc. sin conocer el color real de ninguna app.
 *
 * Simplicidad: exponemos solo lo que los componentes realmente usan.
 */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: "var(--tt-primary)",
        "primary-hover": "var(--tt-primary-hover)",
        "primary-contrast": "var(--tt-primary-contrast)",
        secondary: "var(--tt-secondary)",
        accent: "var(--tt-accent)",
        "accent-alt": "var(--tt-accent-alt)",
        surface: "var(--tt-surface)",
        "surface-subtle": "var(--tt-surface-subtle)",
        bg: "var(--tt-bg)",
        fg: "var(--tt-fg)",
        muted: "var(--tt-fg-muted)",
        border: "var(--tt-border)",
        ring: "var(--tt-ring)",
        danger: "var(--tt-danger)",
        warning: "var(--tt-warning)",
        success: "var(--tt-success)",
        info: "var(--tt-info)",
      },
      fontFamily: {
        sans: "var(--tt-p-font-sans)",
      },
      borderRadius: {
        token: "var(--tt-radius)",
        "token-sm": "var(--tt-p-radius-sm)",
        "token-md": "var(--tt-p-radius-md)",
        "token-lg": "var(--tt-p-radius-lg)",
        "token-xl": "var(--tt-p-radius-xl)",
      },
      boxShadow: {
        "token-sm": "var(--tt-shadow-sm)",
        "token-md": "var(--tt-shadow-md)",
        "token-lg": "var(--tt-shadow-lg)",
      },
      transitionTimingFunction: {
        standard: "var(--tt-p-ease-standard)",
      },
      transitionDuration: {
        fast: "var(--tt-p-dur-fast)",
        base: "var(--tt-p-dur-base)",
        slow: "var(--tt-p-dur-slow)",
      },
    },
  },
};
