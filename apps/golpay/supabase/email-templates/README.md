# Plantillas de correo de GolPay

Supabase **no** guarda estas plantillas en el repo ni en las migraciones: viven
en el panel. Si alguien las sobrescribe, o se recrea el proyecto, se pierden.
Por eso están acá — esta carpeta es la copia de referencia.

## Cómo aplicarlas

Supabase → **Authentication → Emails** → pestaña de cada plantilla → pegar el
HTML → *Save*.

| Archivo | Plantilla en Supabase | Cuándo se manda |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Al crear una cuenta |
| `reset-password.html` | Reset password | Al pedir recuperar contraseña |

## Estado actual (pruebas)

El **SMTP está desactivado** y *Confirm email* también, para poder crear cuentas
sin depender del correo mientras probamos. Con eso, la plantilla de
confirmación no se usa; la de recuperación tampoco funciona sin SMTP.

Para volver a activarlo cuando salgamos de pruebas:

1. Supabase → Authentication → Emails → **SMTP Settings**: configurar Resend
   (host, puerto, usuario, API key) y verificar el dominio remitente.
2. Authentication → Providers → Email → activar **Confirm email**.
3. Pegar de nuevo las dos plantillas de esta carpeta.

Sin SMTP propio, Supabase usa su mailer de cortesía, limitado a **3 correos por
hora**. Al pasarse devuelve `Error sending confirmation email`, que es
exactamente lo que rompió el registro.

## Detalles de las plantillas

- Los acentos y emojis van como entidades HTML (`&aacute;`, `&#9917;`) porque
  varios clientes de correo rompen el UTF-8 crudo — ya nos pasó y se veían
  símbolos raros en el preview.
- Layout con `<table>` y estilos en línea, no flex ni clases: Outlook y Gmail
  ignoran buena parte del CSS moderno.
- Variables disponibles: `{{ .ConfirmationURL }}`, `{{ .Email }}`,
  `{{ .SiteURL }}`, `{{ .Token }}`.

## Ojo con las invitaciones a grupos

Las invitaciones de GolPay **no** usan correo: se mandan por WhatsApp con un
enlace de un solo uso (`/invitacion/:token`). No hace falta plantilla, y por eso
apagar el SMTP no las afecta.
