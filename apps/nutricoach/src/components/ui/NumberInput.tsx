import { useState } from "react";
import { Input, type InputProps } from "@titoapps/ui";

type Props = Omit<InputProps, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (n: number) => void;
};

/**
 * Campo numérico que permite quedar VACÍO mientras se edita (no fuerza un "0"
 * pegado que hay que borrar a mano). Reporta el número al padre; si el campo
 * queda vacío no cambia el valor, y al salir (blur) vuelve a mostrar el actual.
 */
export function NumberInput({ value, onValueChange, onBlur, ...rest }: Props) {
  const [text, setText] = useState<string | null>(null); // null → mostrar `value`
  const display = text ?? (Number.isFinite(value) ? String(value) : "");
  return (
    <Input
      {...rest}
      type="number"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(n)) onValueChange(n);
      }}
      onBlur={(e) => {
        setText(null); // descarta el texto en curso y vuelve a mostrar el valor real
        onBlur?.(e);
      }}
    />
  );
}
