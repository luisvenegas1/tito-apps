import { useId, useState, InputHTMLAttributes } from "react";

/**
 * Campo de contraseña con botón para verla.
 *
 * Se escribe a ciegas y en el celular es fácil equivocarse; poder mirar lo que
 * uno tecleó evita el "usuario o contraseña incorrectos" que en realidad era
 * un dedazo. Arranca oculta y vuelve a ocultarse sola al salir del campo, para
 * no dejar la clave a la vista si alguien se asoma.
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
          // pr-11: deja lugar al botón para que no tape lo que escribís.
          className={`input pr-11 ${className ?? ""}`}
          onBlur={(e) => {
            setVisible(false);
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          // onMouseDown + preventDefault: sin esto el input pierde el foco al
          // tocar el ojo, se dispara onBlur y la contraseña se re-oculta antes
          // de que el clic llegue a hacer efecto.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar" : "Mostrar"}
          tabIndex={-1}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m1 1 22 22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    </svg>
  );
}
