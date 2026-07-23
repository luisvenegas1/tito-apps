import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Button } from "@titoapps/ui";
import { WelcomeTour } from "./WelcomeTour";

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
    title: "La pantalla de inicio",
    intro: "Es lo primero que ves al abrir la app. Con un vistazo sabés cómo vas hoy.",
    items: [
      {
        q: "El círculo grande (velocímetro)",
        desc:
          "Es el resumen de tu día. Empieza en verde y se va llenando conforme comés; si se pone naranja o rojo es que ya casi llegaste (o pasaste) tu meta. En el centro ves: las calorías que llevás, tu meta del día y cuántas te quedan.",
      },
      {
        q: "Las tarjetas de abajo",
        desc:
          "Muestran proteína, carbohidratos, grasa, agua, etc., y cuánto llevás de cada una. No hace falta entenderlas todas: mirá sobre todo las calorías y la proteína.",
      },
      {
        q: "El botón verde grande (+)",
        desc: "Está siempre abajo, en el centro. Es para anotar lo que comés.",
      },
      {
        q: "El signo de pregunta (?)",
        desc: "Arriba a la derecha. Te trae a esta pantalla de Ayuda cuando la necesites.",
      },
    ],
  },
  {
    icon: "🍽️",
    title: "Anotar lo que comés (7 maneras)",
    intro: "Tocá el botón verde + de abajo. Se abren varias opciones; elegí la que te resulte más fácil.",
    items: [
      {
        q: "📷 Con una foto",
        steps: [
          "Tocá “Foto”.",
          "Tomá una foto del plato (o elegí una de tu galería).",
          "Esperá unos segundos: la app reconoce los alimentos y calcula las calorías.",
          "Si algo no está bien, tocalo y corregilo.",
          "Tocá “Confirmar y registrar”.",
        ],
      },
      {
        q: "✍️ Escribiéndolo",
        steps: [
          "Tocá “Escribir”.",
          "Escribí con tus palabras lo que comiste, por ejemplo: “2 huevos y una tortilla con queso”.",
          "Tocá “Calcular calorías”.",
          "Revisá que esté bien y tocá “Confirmar y registrar”.",
        ],
      },
      {
        q: "⚖️ Con una balanza (peso exacto)",
        steps: [
          "Poné el alimento sobre la balanza.",
          "Tocá “Balanza” y tomá la foto.",
          "La app reconoce el alimento y lee el peso.",
          "Si el peso no salió bien, escribilo a mano.",
          "Tocá “Confirmar y registrar”.",
        ],
      },
      {
        q: "📶 Escaneando el código de barras",
        steps: [
          "Tocá “Código de barras”. Se abre la cámara.",
          "Apuntá al código de barras del producto (las rayitas).",
          "Cuando lo lee, aparece el producto solo.",
          "Escribí cuántos gramos comiste y tocá “Registrar”.",
          "Si la cámara no funciona, escribí los números del código a mano.",
        ],
      },
      {
        q: "🏷️ Con la etiqueta del producto",
        steps: [
          "Tocá “Etiqueta”.",
          "Tomá una foto de la tabla de información nutricional (los números del paquete).",
          "Escribí cuántos gramos comiste.",
          "Tocá “Confirmar y registrar”.",
        ],
      },
      {
        q: "🔍 Buscar / ✏️ Crear a mano",
        desc:
          "“Buscar” encuentra algo que ya anotaste antes. “Personalizado” te deja crear un alimento nuevo escribiendo sus valores (ideal si ya los sabés).",
      },
      {
        q: "⭐ Tus comidas frecuentes",
        desc:
          "Lo que anotás seguido aparece arriba como un botón. Tocalo una vez y queda anotado, sin repetir todo de nuevo.",
      },
      {
        q: "¿Me equivoqué al anotar?",
        desc:
          "Antes de guardar podés cambiar el nombre o la cantidad, borrar algo (sale un botón “Deshacer” por si fue sin querer) o agregar otro alimento. Si cambiás algo, las calorías se calculan de nuevo solas.",
      },
    ],
  },
  {
    icon: "💧",
    title: "Anotar el agua",
    items: [
      {
        q: "Cómo anotar lo que tomaste",
        desc:
          "En la pantalla de inicio buscá “Agregar agua” y tocá +250, +500 o +750 ml según lo que tomaste. La tarjeta de agua sube al toque.",
      },
    ],
  },
  {
    icon: "💬",
    title: "Hablar con el Coach (la IA)",
    items: [
      {
        q: "Cómo preguntarle",
        steps: [
          "Tocá “Coach” en la barra de abajo.",
          "Escribí tu pregunta, como “¿Qué puedo cenar?” o “¿Puedo comer un postre hoy?”.",
          "Te responde teniendo en cuenta lo que ya comiste hoy.",
        ],
      },
      {
        q: "Importante",
        desc:
          "Es una ayuda informativa hecha con inteligencia artificial: puede equivocarse. Ante dudas de salud, consultá a tu médico o nutricionista.",
      },
    ],
  },
  {
    icon: "💡",
    title: "Ideas para cerrar el día",
    items: [
      {
        q: "Qué son",
        desc:
          "En el inicio, si te falta comer algo para llegar a tu meta (por ejemplo proteína o calorías), la app te sugiere opciones que encajan y las anotás con un solo toque.",
      },
    ],
  },
  {
    icon: "🎯",
    title: "Tu objetivo y tus metas",
    items: [
      {
        q: "Configurar tu objetivo",
        steps: [
          "Andá a “Perfil” (abajo a la derecha).",
          "Tocá “Editar objetivo y metas”.",
          "Elegí qué querés lograr (bajar grasa, mantenerte, ganar músculo, etc.).",
          "Completá tus datos: sexo, edad, altura, peso y qué tan activa sos.",
          "La app calcula tus calorías y tu proteína del día. Podés cambiarlo cuando quieras.",
        ],
      },
    ],
  },
  {
    icon: "📈",
    title: "Ver tu progreso",
    items: [
      {
        q: "El historial",
        steps: [
          "Tocá “Historial” en la barra de abajo.",
          "Elegí “Hoy”, “Semana” o “Mes”.",
          "Vas a ver tus calorías por día, cómo cambia tu peso y qué tan seguido cumpliste tu meta.",
        ],
      },
    ],
  },
  {
    icon: "⌚",
    title: "Conectar un reloj o pulsera (wearable)",
    intro:
      "Si tenés un reloj o pulsera inteligente (Amazfit, Apple Watch, Fitbit, Garmin…), podés conectarlo para que tus entrenamientos y las calorías que quemás se anoten SOLOS, sin escribir nada.",
    items: [
      {
        q: "¿Para qué sirve?",
        desc:
          "Cada vez que hacés ejercicio con tu reloj, esas calorías quemadas entran a NutriCoach automáticamente y se suman a tu día. Así tu meta se ajusta a lo que realmente gastaste.",
      },
      {
        q: "Amazfit o Apple Watch",
        steps: [
          "Estos relojes se conectan a través de una app gratis llamada Strava.",
          "En la app de tu reloj (Zepp para Amazfit, o la app Salud del iPhone para Apple Watch), conectá con Strava.",
          "En NutriCoach: Perfil → “Entrenamientos” → “Conectar dispositivo”.",
          "Elegí Strava y autorizá. Adentro hay una guía con dibujos paso a paso.",
        ],
      },
      {
        q: "Fitbit",
        desc: "Fitbit se conecta directo desde la misma pantalla “Conectar dispositivo”.",
      },
      {
        q: "Anotar un entrenamiento a mano",
        steps: [
          "Perfil → “Entrenamientos”.",
          "Elegí la actividad (caminar, correr, pesas…) y cuántos minutos.",
          "La app calcula las calorías quemadas por vos; podés ajustarlas.",
        ],
      },
    ],
  },
  {
    icon: "🔔",
    title: "Recordatorios (avisos)",
    items: [
      {
        q: "Para qué sirven",
        desc:
          "Que la app te avise algo a la hora que elijas, por ejemplo: “te falta tomar agua para tu meta de hoy”.",
      },
      {
        q: "Cómo activarlos",
        steps: [
          "Perfil → “Recordatorios”.",
          "Tocá “Activar recordatorios” y aceptá el permiso que pide el teléfono.",
          "Elegí la hora y qué querés que te recuerde (agua, proteína o calorías).",
          "Para que te lleguen con la app cerrada, conviene instalar la app (ver abajo).",
        ],
      },
    ],
  },
  {
    icon: "📲",
    title: "Instalar la app en el teléfono",
    items: [
      {
        q: "Para qué",
        desc:
          "Queda como una app normal en tu pantalla de inicio, se abre más rápido y recibe los recordatorios aunque no la tengas abierta.",
      },
      {
        q: "Cómo instalarla",
        desc:
          "En el pie de la pantalla tocá “📲 Instalar app” y seguí los pasos. Te muestra las instrucciones para iPhone o para Android según tu teléfono.",
      },
    ],
  },
  {
    icon: "👤",
    title: "Tu cuenta",
    items: [
      {
        q: "Entrar",
        desc:
          "Podés entrar con tu correo o con tu nombre de usuario, y tu contraseña. Para ver la contraseña mientras la escribís, tocá el ojito 👁️.",
      },
      {
        q: "Cambiar tus datos",
        desc:
          "En Perfil podés cambiar tu nombre, tu usuario y tu contraseña, y elegir si usás kilos o libras.",
      },
      {
        q: "Descargar tus datos",
        desc: "En Perfil → “Exportar mis datos” bajás todo tu historial en un archivo. Tus datos son tuyos.",
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
              {it.desc && <p className="mt-1 text-sm leading-relaxed text-slate-500">{it.desc}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HelpPage() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div className="p-4">
      <PageHeader title="Ayuda" subtitle="Cómo usar NutriCoach" />
      <p className="mt-3 text-sm text-slate-500">
        Tocá cada tema para abrirlo y ver los pasos. Con calma, no hay que aprender todo de una.
      </p>

      <Button variant="ghost" className="mt-3 w-full" onClick={() => setTourOpen(true)}>
        ▶️ Ver el tour de bienvenida
      </Button>

      <div className="mt-4 space-y-3">
        {SECTIONS.map((s, i) => (
          <Accordion key={i} section={s} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link to="/coach" className="text-sm font-semibold text-green-700 underline">
          ¿Dudas? Preguntale al Coach
        </Link>
        <Link to="/" className="text-sm text-slate-400 underline">
          Volver al inicio
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        NutriCoach usa IA con fines informativos y no reemplaza a un profesional de la salud.
      </p>

      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
