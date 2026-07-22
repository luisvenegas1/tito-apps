import { Footer } from "@titoapps/ui";
import { InstallButton } from "@/components/InstallButton";

/** Footer de NutriCoach: el componente neutral de @titoapps/ui con los datos de la app. */
export function AppFooter({ mode = "flow" }: { mode?: "flow" | "fixed" | "fixed-desktop" }) {
  return (
    <div>
      <Footer
        mode={mode}
        productName="NutriCoach"
        companyName="Tito Apps"
        developerName="Luis Diego Venegas"
        developerUrl="https://wa.me/50688238325"
        version={__APP_VERSION__}
        showInstall={false}
      />
      {/* Instalación con modal de instrucciones por plataforma (reemplaza el enlace chico). */}
      <div className="pb-4 text-center">
        <InstallButton />
      </div>
    </div>
  );
}
