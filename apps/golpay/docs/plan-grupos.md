# Plan: Grupos en GolPay

Estado: **propuesta, esperando aprobación**

Decisiones ya tomadas:

- Un jugador puede estar en varios grupos, con **nivel y posición por grupo**.
- Todos los que están en un grupo **pueden todo** (crear partidos, importar, armar equipos, aprobar pagos). El creador decide a quién agrega.

---

## 1. El problema con el modelo de hoy

Hoy todo cuelga de `owner_id = auth.uid()`. Los partidos y los jugadores son
tuyos y de nadie más. Por eso:

- Ale no puede aprobar pagos de un partido que creaste vos.
- Sebas no puede armar los equipos.
- Si Sebas crea su propio partido, tiene que volver a cargar los 24 jugadores,
  con sus niveles y posiciones. De ahí salen los duplicados.

Hay **11 políticas RLS** que dicen "sos el dueño". Todas cambian a "sos miembro
del grupo".

---

## 2. Modelo de datos

### Tablas nuevas

```
groups
  id, name, created_by, created_at

group_members
  group_id, user_id, role ('owner' | 'admin'), added_by, created_at
  pk (group_id, user_id)
```

`role` solo distingue quién puede **eliminar el grupo y quitar miembros**
(owner). Para todo lo demás, owner y admin son iguales — que es lo que pediste.

### Jugadores: dos caminos posibles

**Opción A — fila por grupo, con identidad compartida (recomendada)**

```
frequent_players
  + group_id     → a qué grupo pertenece esta ficha
  + person_id    → misma persona en distintos grupos
  (nivel, posición, notas, etc. quedan donde están: por grupo, gratis)
```

Sebas en Sombrero y Sebas en Jaggermasters son **dos filas** con el mismo
`person_id`. El nivel ya es por grupo sin hacer nada. El índice único
anti-duplicados pasa de `(owner_id, name_norm)` a `(group_id, name_norm)`:
mismo mecanismo que ya funciona.

- A favor: migración trivial, todas las consultas siguen igual + un filtro.
  El apodo puede variar por grupo (en un grupo es "Sebas C", en otro "Sebas").
- En contra: el nombre está duplicado; si lo corregís en un grupo no cambia en
  el otro. Se puede resolver después con un "sincronizar nombre".

**Opción B — identidad separada de la ficha**

```
players        → id, name, nickname, phone        (la persona)
group_players  → group_id, player_id, skill_level, posición, notas… (la ficha)
```

Más "correcto", pero obliga a reescribir todas las consultas de jugadores,
estadísticas e importación, y complica el índice anti-duplicados (el nombre
vive en otra tabla, así que no se puede indexar junto al grupo sin duplicarlo
igual).

**Recomiendo A.** Da lo que pediste con una fracción del riesgo. Si algún día
molesta que el nombre no se sincronice, migrar de A a B es posible.

### Partidos

```
matches + group_id
```

---

## 3. Seguridad (RLS)

Una función y todas las políticas pasan por ella:

```sql
create function is_group_member(gid uuid) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from group_members
       where group_id = gid and user_id = auth.uid()
    );
  $$;
```

Las 11 políticas quedan como `is_group_member(group_id)` — directo en `matches`
y `frequent_players`, y vía join en `match_players`, `teams`, `team_members`,
`payment_events`, `match_results`, `match_games`.

Lo público (el enlace del partido) no cambia: sigue entrando por
`get_public_match` y las RPC con el token.

---

## 4. Navegación

```
/                     → lista de grupos
/grupo/nuevo          → crear grupo
/g/:gid               → partidos del grupo (el dashboard de hoy)
/g/:gid/miembros      → quién está adentro, invitar, quitar
/g/:gid/jugadores     → los de hoy, filtrados por grupo
/g/:gid/partido/:id   → …y el resto igual, bajo el prefijo
/j/:token             → público, sin cambios
```

Poner el grupo en la URL (en vez de un "grupo actual" guardado) hace que los
enlaces se puedan compartir entre Ale, Sebas y vos sin que abran el grupo
equivocado.

Si solo tenés un grupo, `/` entra directo a ese grupo para no agregar un clic
de más.

---

## 5. Invitaciones por WhatsApp

```
group_invites
  id, group_id, token, label, invited_by, expires_at, accepted_at, accepted_by
```

Flujo: generás la invitación, la app abre WhatsApp con el mensaje y el enlace
`/invitacion/:token`. Reglas:

- **Un solo uso.** Al aceptarse se marca `accepted_at` y deja de servir. Si
  Sebas lo reenvía, el segundo no entra.
- **Expira a los 7 días.**
- **Exige sesión iniciada.** Sin cuenta no hay forma de entrar: el enlace
  guarda el token, manda a registrarse y recién ahí se acepta. Nunca se otorgan
  permisos a un anónimo.
- **Revocable** desde la pantalla de miembros mientras esté pendiente.

Todo esto se aplica en una RPC `accept_group_invite(token)` con
`security definer`, que valida token + expiración + no usado + `auth.uid()` no
nulo, y recién entonces inserta en `group_members`. Ponerlo en el servidor
importa: si la validación viviera en el frontend, bastaría con llamar a la API
directo para saltársela.

---

## 6. Migración de lo que ya existe

Automática, sin perder nada:

1. Por cada perfil con partidos o jugadores, crear un grupo `"Mi grupo"`.
2. Meter a ese perfil como `owner`.
3. `update matches set group_id = <su grupo>` y lo mismo en `frequent_players`.
4. `person_id = id` en cada jugador (cada uno es su propia identidad).
5. Recién entonces poner `group_id` como `not null` y cambiar las políticas.
6. Podés renombrar los grupos desde la app ("Partido Sombrero", etc.).

`owner_id` se queda en las tablas por un tiempo: si algo sale mal, sirve para
reconstruir. Se borra en una migración posterior.

---

## 7. Orden de trabajo

| # | Qué | Riesgo |
|---|-----|--------|
| 1 | Tablas, función RLS, migración de datos | Alto — se corre con la app quieta |
| 2 | Políticas RLS nuevas | Alto |
| 3 | Rutas con `/g/:gid` y pantalla de grupos | Medio |
| 4 | Filtrar jugadores y partidos por grupo | Medio |
| 5 | Miembros e invitaciones | Bajo |
| 6 | Linkear un jugador a otro grupo | Bajo |

Los pasos 1 y 2 van juntos y en una sola pasada: entre uno y otro, la app queda
sin poder leer sus propios datos.

---

## 8. Antes de empezar

- **Backup**: en Supabase, Database → Backups, o `pg_dump`. Es producción y la
  migración toca todas las tablas.
- **No cargar partidos nuevos** mientras corren los pasos 1–2.
- Desplegar el front **antes** de correr el SQL cuando algo se elimina —
  la lección del PIN.
