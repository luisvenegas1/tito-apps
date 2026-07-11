import { forwardRef } from "react";
import { Input, InputProps } from "./Input";

export type DateInputProps = Omit<InputProps, "type">;

/** Input de fecha (wrapper neutral sobre <input type="date">). */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>((props, ref) => (
  <Input ref={ref} type="date" {...props} />
));
DateInput.displayName = "DateInput";
