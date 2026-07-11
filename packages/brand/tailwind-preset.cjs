/**
 * Preset de Tailwind compartido de Tito Apps.
 * Mapea nombres semánticos a los design tokens (variables CSS), de modo que
 * los componentes de @titoapps/ui usen `bg-primary`, `text-muted`, etc.
 * sin conocer el color real de ninguna app.
 *
 * Cada app agrega este preset en su tailwind.config y define sus colores
 * vía applyBrand()/tokens.css.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "var(--tt-primary)",
        "primary-hover": "var(--tt-primary-hover)",
        "primary-contrast": "var(--tt-primary-contrast)",
        secondary: "var(--tt-secondary)",
        surface: "var(--tt-surface)",
        "surface-subtle": "var(--tt-surface-subtle)",
        fg: "var(--tt-fg)",
        muted: "var(--tt-fg-muted)",
        border: "var(--tt-border)",
        danger: "var(--tt-danger)",
        warning: "var(--tt-warning)",
        success: "var(--tt-success)",
      },
      borderRadius: {
        token: "var(--tt-radius)",
      },
    },
  },
};
