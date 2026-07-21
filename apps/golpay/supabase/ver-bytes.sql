-- Un solo statement. Borrá el editor, pegá esto y Run.
-- Mandame las primeras ~10 filas (sobre todo la columna hex).
--
-- Cómo leerlo: "roly" limpio en hex es exactamente  726f6c79
--   · c2a0     = espacio duro (NBSP)
--   · e2808b   = espacio de ancho cero
--   · efbbbf   = BOM
--   · 20       = espacio normal
-- Si "caracteres" es mayor que la cantidad de letras que ves, ahí está.

select
  name                                     as nombre,
  length(name)                             as caracteres,
  octet_length(name)                       as bytes,
  encode(convert_to(name, 'UTF8'), 'hex')  as hex,
  ascii(left(name, 1))                     as codigo_primer_caracter
from public.frequent_players
order by name
limit 15;
