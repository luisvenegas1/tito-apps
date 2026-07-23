import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button } from "@titoapps/ui";

const SEEN_KEY = "nutricoach.tourSeen";

/** Marca el tour como visto para no mostrarlo automáticamente de nuevo. */
export function tourSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface Slide {
  icon: string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: "🥑",
    title: "¡Bienvenido a NutriCoach!",
    text: "Tu asistente de nutrición con IA. Te muestro lo básico en 30 segundos — podés saltarlo cuando quieras.",
  },
  {
    icon: "🍽️",
    title: "Registrá tu comida fácil",
    text: "Con el botón verde + de abajo: tomá una foto, escribí lo que comiste, escaneá el código de barras o la etiqueta… la IA calcula las calorías y macros.",
  },
  {
    icon: "📊",
    title: "Mirá cómo vas",
    text: "El velocímetro del inicio te dice cuánto llevás de tu meta del día, con tus macros, agua, peso y calorías quemadas.",
  },
  {
    icon: "💬",
    title: "Preguntale al Coach",
    text: "“¿Qué ceno?”, “¿puedo comer pizza hoy?” — el coach te responde según lo que llevás en el día. Es informativo, no reemplaza a un profesional.",
  },
  {
    icon: "🔔",
    title: "Recordatorios y mucho más",
    text: "Activá alertas de agua o proteína, registrá entrenamientos y conectá tu reloj. Todo está explicado en la sección de Ayuda.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Mini-tour de bienvenida, saltable. Se muestra la primera vez y desde el ícono de ayuda. */
export function WelcomeTour({ open, onClose }: Props) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  const finish = () => {
    markSeen();
    setI(0);
    onClose();
  };

  return (
    <Modal open={open} onClose={finish} placement="center">
      <div className="text-center">
        <div className="text-5xl">{slide.icon}</div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{slide.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{slide.text}</p>
      </div>

      {/* Indicadores */}
      <div className="mt-4 flex justify-center gap-1.5">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-green-600" : "w-1.5 bg-slate-300"}`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {i > 0 ? (
          <Button variant="ghost" className="flex-1" onClick={() => setI((v) => v - 1)}>
            Atrás
          </Button>
        ) : (
          <Button variant="ghost" className="flex-1" onClick={finish}>
            Saltar
          </Button>
        )}
        {last ? (
          <Button className="flex-1" onClick={finish}>
            ¡Empezar!
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => setI((v) => v + 1)}>
            Siguiente
          </Button>
        )}
      </div>

      {last && (
        <Link
          to="/help"
          onClick={finish}
          className="mt-3 block text-center text-sm font-semibold text-green-700 underline"
        >
          Ver la Ayuda completa
        </Link>
      )}
    </Modal>
  );
}
