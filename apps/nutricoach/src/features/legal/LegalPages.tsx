import type { ReactNode } from "react";

function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-white px-6 py-10">
      <a href="/" className="text-sm text-green-700 underline">
        ← Volver a NutriCoach
      </a>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="mt-1 text-xs text-slate-400">Última actualización: julio 2026 · NutriCoach (Tito Apps)</p>
      <div className="prose mt-6 space-y-4 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 text-base font-bold text-slate-900">{children}</h2>;
}

export function PrivacyPage() {
  return (
    <Layout title="Política de Privacidad">
      <p>
        En NutriCoach cuidamos tus datos. Esta política explica qué información recopilamos, cómo la usamos y
        qué control tenés sobre ella.
      </p>

      <H>Qué datos recopilamos</H>
      <p>
        Tu correo, nombre y usuario; y lo que registrás en la app: comidas, calorías y macros, peso, agua,
        entrenamientos y tus objetivos. Si activás conexiones con servicios de terceros (Strava, Fitbit, Oura),
        guardamos de forma segura los permisos (tokens) necesarios para importar tus entrenamientos.
      </p>

      <H>Cómo usamos tus datos</H>
      <p>
        Solo para brindarte el servicio: calcular tus calorías y macros, mostrar tu progreso y darte
        recomendaciones. Las fotos o textos que registrás se procesan con un proveedor de inteligencia
        artificial para estimar los alimentos y sus valores nutricionales.
      </p>

      <H>Con quién se comparten</H>
      <p>
        No vendemos tus datos ni los usamos para publicidad. Se almacenan en nuestra base de datos (Supabase).
        Los proveedores de IA procesan únicamente las imágenes o textos que enviás para el análisis. Los
        servicios que conectás (Strava, Fitbit, Oura) nos entregan tus entrenamientos solo con tu autorización.
      </p>

      <H>Tus derechos</H>
      <p>
        Podés exportar todos tus datos cuando quieras (Perfil → Exportar mis datos), desconectar cualquier
        servicio de terceros, y solicitar la eliminación de tu cuenta y tus datos.
      </p>

      <H>Seguridad</H>
      <p>
        Protegemos tu información con controles de acceso a nivel de fila (RLS) y guardamos los tokens de los
        servicios conectados solo en el servidor, nunca expuestos en la app.
      </p>

      <H>Contacto</H>
      <p>
        Ante cualquier consulta sobre tus datos, escribinos a <b>hola@titoapps.com</b>.
      </p>
    </Layout>
  );
}

export function TermsPage() {
  return (
    <Layout title="Términos de Servicio">
      <p>Al usar NutriCoach aceptás estos términos. Si no estás de acuerdo, por favor no uses la aplicación.</p>

      <H>Naturaleza del servicio</H>
      <p>
        NutriCoach es una herramienta informativa que usa inteligencia artificial para ayudarte a registrar y
        entender tu alimentación. <b>No brinda asesoramiento médico ni nutricional profesional</b> y no
        reemplaza a un médico o nutricionista. Ante dudas de salud, consultá a un profesional.
      </p>

      <H>Uso bajo tu responsabilidad</H>
      <p>
        Las estimaciones de calorías, macros y calorías quemadas son aproximadas y pueden contener errores. Las
        decisiones que tomes en base a la app son tu responsabilidad.
      </p>

      <H>Tu cuenta</H>
      <p>
        Sos responsable de mantener la confidencialidad de tu contraseña y de la actividad de tu cuenta.
      </p>

      <H>Servicios de terceros</H>
      <p>
        Las conexiones con Strava, Fitbit, Oura y otros están sujetas a los términos y políticas de esos
        servicios. NutriCoach solo accede a los datos que autorizás.
      </p>

      <H>Disponibilidad y cambios</H>
      <p>
        Hacemos nuestro mejor esfuerzo por mantener el servicio disponible, pero puede haber interrupciones.
        Podemos actualizar estos términos; los cambios se publican en esta misma página.
      </p>

      <H>Contacto</H>
      <p>
        Consultas: <b>hola@titoapps.com</b>.
      </p>
    </Layout>
  );
}
