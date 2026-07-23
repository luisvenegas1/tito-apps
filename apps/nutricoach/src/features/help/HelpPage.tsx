import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@titoapps/ui";

interface Item {
  q: string;
  desc?: string;
  steps?: string[];
}
interface Section {
  icon: string;
  title: string;
  intro?: string;
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    icon: "📊",
    title: "Tu tablero (Inicio)",
    intro: "Es lo primero que ves. De un vistazo sabés cómo vas hoy.",
    items: [
      {
        q: "El velocímetro de calorías",
        desc:
          "Arranca en verde y la aguja avanza a amarillo, naranja y rojo según cuánto consumiste respecto a tu meta. En el centro ves las calorías consumidas, tu meta y las que te quedan.",
      },
      {
        q: "Tarjetas de macros",
        desc:
          "Debajo ves proteína, carbohidratos, grasa, fibra, azúcar, sodio, agua, calorías quemadas, tu peso y tu objetivo. Cada barra muestra cuánto llevás de la meta.",
      },
    ],
  },
  {
    icon: "🍽️",
    title: "Registrar comida (7 formas)",
    intro: "Tocá el botón verde + del centro (o “Registrar comida”) y elegí el método más rápido para vos.",
    items: [
      {
        q: "📷 Foto (con IA)",
        steps: [
          "Tocá “Foto”.",
          "Tomá o subí una foto del plato.",
          "La IA detecta los alimentos y estima las cantidades.",
          "Revisá, corregí lo que haga falta y confirmá.",
        ],
      },
      {
        q: "✍️ Escribir (con IA)",
        steps: [
          "Tocá “Escribir”.",
          "Describí lo que comiste, ej: “2 huevos, una tajada de jamón de pavo y una tortilla con queso”.",
          "La IA calcula calorías y macros de cada cosa.",
          "Ajustá si querés y confirmá.",
        ],
      },
      {
        q: "⚖️ Balanza",
        steps: [
          "Tocá “Balanza”.",
          "Tomá una foto del alimento sobre la balanza.",
          "La IA identifica el alimento y lee el peso.",
          "Si el peso no salió bien, corregilo, y registrá.",
        ],
      },
      {
        q: "📶 Código de barras",
        steps: [
          "Tocá “Código de barras”. Se abre la cámara.",
          "Apuntá al código: se lee solo y busca el producto.",
          "Poné los gramos que comiste y registrá.",
          "¿No prende la cámara? Escribí el número del código a mano.",
        ],
      },
      {
        q: "🏷️ Etiqueta nutricional",
        steps: [
          "Tocá “Etiqueta”.",
          "Tomá una foto de la tabla nutricional del empaque.",
          "La IA lee los valores por 100 g.",
          "Indicá los gramos consumidos y registrá.",
        ],
      },
      {
        q: "🔍 Buscar / ✏️ Personalizado",
        desc:
          "“Buscar” encuentra alimentos que ya usaste. “Personalizado” te deja crear uno poniendo sus valores por 100 g (ideal si ya los sabés).",
      },
      {
        q: "⭐ Frecuentes (un toque)",
        desc:
          "Lo que registrás seguido aparece como botón arriba del hub para agregarlo en un solo toque, sin volver a cargarlo.",
      },
      {
        q: "Corregir la lista antes de guardar",
        desc:
          "Podés editar el nombre y la cantidad, quitar un alimento (con botón de Deshacer por si fue sin querer) o agregar uno nuevo. Si cambiás un nombre o agregás algo, las calorías se recalculan solas.",
      },
    ],
  },
  {
    icon: "💬",
    title: "Coach con IA",
    items: [
      {
        q: "Hablar con el coach",
        steps: [
          "Tocá “Coach” en la barra de abajo.",
          "Escribí lo que quieras: “¿Qué ceno?”, “¿Puedo comer pizza hoy?”, “¿Qué me falta consumir?”.",
          "Responde teniendo en cuenta tu día (lo que llevás y lo que te falta).",
        ],
        desc: "Es un asistente informativo con IA: puede equivocarse y no reemplaza a un profesional de la salud.",
      },
      {
        q: "Consejo del día",
        desc: "En el Inicio aparece una recomendación breve del coach según cómo venís ese día.",
      },
    ],
  },
  {
    icon: "💡",
    title: "Ideas de comida",
    items: [
      {
        q: "Qué comer para cerrar el día",
        desc:
          "En el Inicio, si te falta para la meta (por ejemplo proteína o calorías), NutriCoach te sugiere opciones que encajan y las registrás en un toque.",
      },
    ],
  },
  {
    icon: "🎯",
    title: "Objetivos y metas",
    items: [
      {
        q: "Definir tu objetivo",
        steps: [
          "Andá a Perfil → “Editar objetivo y metas”.",
          "Elegí qué querés: bajar grasa, ganar músculo, mantener, déficit, volumen o personalizado.",
          "Completá sexo, edad, altura, peso y nivel de actividad.",
          "La app calcula tus calorías y macros diarios automáticamente.",
        ],
      },
    ],
  },
  {
    icon: "📈",
    title: "Historial y progreso",
    items: [
      {
        q: "Ver tus tendencias",
        steps: [
          "Tocá “Historial” en la barra de abajo.",
          "Cambiá entre Hoy / Semana / Mes.",
          "Vas a ver calorías por día vs tu meta, la tendencia de tu peso, tu adherencia (% de días en meta) y tu racha.",
        ],
      },
      {
        q: "Mantenimiento adaptativo",
        desc:
          "Con el tiempo, la app estima tu gasto real (cuántas calorías “quemás” de verdad) cruzando lo que comés con cómo cambia tu peso. Necesita algunos días de registro y al menos dos pesos.",
      },
    ],
  },
  {
    icon: "🏋️",
    title: "Entrenamientos y dispositivos",
    items: [
      {
        q: "Registrar actividad",
        steps: [
          "Perfil → “Entrenamientos”.",
          "Elegí el tipo (correr, pesas, etc.) y la duración.",
          "Estima las calorías quemadas por tu peso; podés ajustarlas.",
        ],
      },
      {
        q: "Conectar reloj / pulsera",
        desc:
          "En “Conectar dispositivo”. Amazfit y Apple Watch se conectan a través de Strava; Fitbit directo. Hay una guía paso a paso con ilustraciones.",
      },
    ],
  },
  {
    icon: "💧🔔",
    title: "Agua y recordatorios",
    items: [
      {
        q: "Registrar agua",
        desc: "En el Inicio, tocá +250, +500 o +750 ml. La tarjeta de agua se actualiza al toque.",
      },
      {
        q: "Recordatorios",
        steps: [
          "Perfil → “Recordatorios”.",
          "Activalos y aceptá el permiso de notificaciones.",
          "Elegí la hora y qué recordar (agua, proteína o calorías).",
          "A esa hora te avisa lo que te falta. Con la app instalada, llegan aunque esté cerrada.",
        ],
      },
    ],
  },
  {
    icon: "⬇️📲",
    title: "Exportar e instalar",
    items: [
      {
        q: "Exportar tus datos",
        desc: "Perfil → “Exportar mis datos”: descargás todo tu historial en CSV o JSON. Tus datos son tuyos.",
      },
      {
        q: "Instalar la app en el celular",
        desc:
          "En el pie de página tocá “📲 Instalar app” y seguí los pasos para iPhone o Android. Instalada funciona como app nativa y recibe recordatorios.",
      },
    ],
  },
  {
    icon: "👤",
    title: "Tu cuenta",
    items: [
      {
        q: "Entrar y datos",
        desc:
          "Podés entrar con tu correo o tu usuario. En Perfil cambiás tu nombre, usuario y contraseña, y elegís unidades (kg o lb).",
      },
    ],
  },
];

function Accordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="text-2xl">{section.icon}</span>
        <span className="flex-1 font-semibold text-slate-800">{section.title}</span>
        <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
          {section.intro && <p className="text-sm text-slate-500">{section.intro}</p>}
          {section.items.map((it, i) => (
            <div key={i}>
              <div className="text-sm font-semibold text-slate-700">{it.q}</div>
              {it.steps && (
                <ol className="mt-1 space-y-1">
                  {it.steps.map((s, j) => (
                    <li key={j} className="flex gap-2 text-sm text-slate-600">
                      <span className="font-semibold text-green-700">{j + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
              {it.desc && <p className="mt-1 text-sm text-slate-500">{it.desc}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HelpPage() {
  return (
    <div className="p-4">
      <PageHeader title="Ayuda" subtitle="Cómo usar NutriCoach" />
      <p className="mt-3 text-sm text-slate-500">
        Tocá cada tema para ver los pasos. Si algo no te queda claro, preguntale al Coach.
      </p>

      <div className="mt-4 space-y-3">
        {SECTIONS.map((s, i) => (
          <Accordion key={i} section={s} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link to="/coach" className="text-sm font-semibold text-green-700 underline">
          Preguntarle al Coach
        </Link>
        <Link to="/" className="text-sm text-slate-400 underline">
          Volver al inicio
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        NutriCoach usa IA con fines informativos y no reemplaza a un profesional de la salud.
      </p>
    </div>
  );
}
