# Plantillas de correo de NutriCoach

Supabase **no** guarda estas plantillas en el repo ni en las migraciones: viven
en el panel. Si alguien las sobrescribe, o se recrea el proyecto, se pierden.
Por eso están acá — esta carpeta es la copia de referencia (igual que GolPay).

## Cómo aplicarlas

Supabase → **Authentication → Emails** → pestaña de cada plantilla → pegar el
HTML → *Save*.

| Archivo | Plantilla en Supabase | Cuándo se manda |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Al crear una cuenta |
| `reset-password.html` | Reset password | Al pedir recuperar contraseña |
| `password-changed.html` | Security → Password changed | Cuando el usuario cambia su contraseña |

Para "Password changed": activá el toggle **Enable notification**, poné el
Subject **"Tu contraseña fue cambiada"** y pegá el HTML. Ojo: esa plantilla
**no** tiene `{{ .ConfirmationURL }}` (es solo aviso); sus variables son
`{{ .Email }}`, `{{ .SiteURL }}` y `{{ .Data }}`.

## Marca

Alineadas al libro de marca (`packages/brand/src/brands/nutricoach.ts`):

- Verde primario **#3FA535** (wordmark "Nutri", botones).
- Azul marino **#1E3A5F** (wordmark "Coach", títulos).
- Naranja de acento **#F26E36** (no se usa en los correos, reservado).
- Fondo suave **#F2F8F1**, banda del encabezado **#ECFDF3**.
- Tagline: *La IA hace las cuentas. Vos solo comé mejor.*

## El logo

El encabezado usa el logo real, no un emoji:

```
https://nutricoach.tito-apps.com/logo.png
```

Es `public/logo.png` servido por el dominio de producción. **Requiere que la
app esté desplegada** en ese dominio para que la imagen cargue en el correo.
Se usa PNG (no SVG) porque Gmail y Outlook no renderizan SVG. Si algún cliente
bloquea imágenes, el `alt="NutriCoach"` deja el nombre visible.

## Detalles técnicos

- Los acentos y símbolos van como entidades HTML (`&aacute;`, `&ntilde;`,
  `&#127881;`) porque varios clientes rompen el UTF-8 crudo.
- Layout con `<table>` y estilos en línea, no flex ni clases: Outlook y Gmail
  ignoran buena parte del CSS moderno.
- Variables disponibles: `{{ .ConfirmationURL }}`, `{{ .Email }}`,
  `{{ .SiteURL }}`, `{{ .Token }}`.

## Estado (pruebas)

Igual que GolPay: sin SMTP propio, Supabase usa su mailer de cortesía, limitado
a **3 correos por hora**. Para producción, configurar SMTP (p. ej. Resend) en
Authentication → Emails → SMTP Settings, verificar el dominio remitente, y
activar **Confirm email** en Authentication → Providers → Email.
