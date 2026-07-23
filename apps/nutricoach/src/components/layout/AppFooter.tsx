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
      <div className="pb-2 text-center">
        <InstallButton />
      </div>

      {/* Aviso: la IA no reemplaza a un profesional de salud. */}
      <p className="px-6 pb-2 text-center text-[11px] leading-snug text-slate-400">
        NutriCoach usa inteligencia artificial y tiene fines informativos. Sus estimaciones y consejos
        pueden tener errores y <strong className="font-semibold">no sustituyen</strong> la orientación de un
        profesional de la salud (médico o nutricionista).
      </p>
      <p className="pb-4 text-center text-[11px] text-slate-400">
        <a href="/privacy" className="underline">Privacidad</a> · <a href="/terms" className="underline">Términos</a>
      </p>
    </div>
  );
}
