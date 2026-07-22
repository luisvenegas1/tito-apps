import { useId, useState, InputHTMLAttributes } from "react";

/**
 * Campo de contraseña con botón para verla u ocultarla.
 *
 * Se escribe a ciegas y en el celular es fácil equivocarse; poder mirar lo que
 * uno tecleó evita el "usuario o contraseña incorrectos" que en realidad era un
 * dedazo. Arranca oculta y vuelve a ocultarse sola al salir del campo.
 *
 * El toggle usa emojis: 👁️ (mostrar) y 🙈 (ocultar), en vez del ícono clásico.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Texto del <label>. Si no viene, no se dibuja label. */
  label?: string;
  /** Ayuda debajo del campo. */
  hint?: string;
};

export function PasswordInput({ label, hint, className, id, onBlur, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const auto = useId();
  const inputId = id ?? auto;

  return (
    <div>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          type={visible ? "text" : "password"}
          className={`input pr-11 ${className ?? ""}`}
          onBlur={(e) => {
            setVisible(false);
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          // onMouseDown + preventDefault: sin esto el input pierde el foco al
          // tocar el botón, se dispara onBlur y la contraseña se re-oculta antes
          // de que el clic surta efecto.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-lg leading-none"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar" : "Mostrar"}
          tabIndex={-1}
        >
          <span aria-hidden>{visible ? "🙈" : "👁️"}</span>
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
