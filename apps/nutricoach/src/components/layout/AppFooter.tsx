import { Footer } from "@titoapps/ui";

/** Footer de NutriCoach: el componente neutral de @titoapps/ui con los datos de la app. */
export function AppFooter({ mode = "flow" }: { mode?: "flow" | "fixed" | "fixed-desktop" }) {
  return (
    <Footer
      mode={mode}
      productName="NutriCoach"
      companyName="Tito Apps"
      developerName="Luis Diego Venegas"
      developerUrl="https://wa.me/50688238325"
      version={__APP_VERSION__}
    />
  );
}
