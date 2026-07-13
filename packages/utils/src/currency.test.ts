import { describe, it, expect } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("CRC: símbolo ₡ con locale es-CR (coincide con el formato nativo del entorno)", () => {
    // Robusto ante variaciones de ICU: valida que agregue el símbolo al número es-CR.
    expect(formatCurrency(2200, { locale: "es-CR", symbol: "₡" })).toBe(
      "₡" + (2200).toLocaleString("es-CR"),
    );
  });

  it("USD con locale en-US y código de moneda", () => {
    expect(formatCurrency(1500, { locale: "en-US", currency: "USD" })).toBe("$1,500.00");
  });

  it("modo símbolo con agrupación determinista (en-US)", () => {
    expect(formatCurrency(2200, { locale: "en-US", symbol: "₡" })).toBe("₡2,200");
  });

  it("redondea el monto", () => {
    expect(formatCurrency(2199.6, { locale: "en-US", symbol: "$" })).toBe("$2,200");
  });

  it("sin símbolo ni moneda devuelve solo el número formateado", () => {
    expect(formatCurrency(1000, { locale: "en-US" })).toBe("1,000");
  });
});
