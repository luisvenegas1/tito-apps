# Especificación de features

Leyenda de estado: ✅ funcional · 🔷 cableado (UI + contrato) · 🔜 roadmap.

> Bloque 2 conectó la IA en vivo: los métodos con 📷 usan visión real cuando hay `AI_API_KEY` configurada (si no, stub). El código de barras y la etiqueta ya están operativos.

## Dashboard ✅

Pantalla principal. Elementos:

- **Velocímetro semicircular de calorías.** Inicia 100% verde. Conforme se consumen calorías la aguja avanza verde → amarillo → naranja → rojo. El color depende del **porcentaje de la meta** consumido:
  - 0–70% verde, 70–90% amarillo, 90–100% naranja, >100% rojo.
- **Centro del velocímetro:** calorías consumidas, meta diaria, calorías restantes.
- **Tarjetas de macros:** proteína, carbohidratos, grasa, azúcar, fibra, agua, calorías quemadas, peso actual, objetivo. Cada una con progreso, sin saturar de números (valor grande + barra fina).
- **Acción principal:** botón grande "Registrar comida".
- **Bloque coach:** una recomendación proactiva del día (ver Coach).

Detalles visuales en [ui.md](./ui.md#velocímetro).

## Registro de comida

Debe existir **más de una forma** de agregar alimentos. Orden por fricción (menor a mayor):

1. **Comidas frecuentes / recientes** ✅ — un toque para re-registrar algo ya comido.
2. **Foto (IA)** ✅ — la IA detecta alimentos, estima cantidades y calcula macros. Imagen comprimida en cliente antes de enviarse. Corrección manual completa: editar nombre, cantidad, quitar y agregar items. Ver [ai.md](./ai.md#análisis-de-foto).
3. **Modo balanza** ✅ — foto del alimento sobre una balanza; la IA identifica **alimento + peso** y calcula macros. Variantes:
   - a) Si el peso no se detecta, se edita a mano.
   - b) El usuario solo escribe el peso (sin foto de balanza).
   - c) Foto de la **tabla nutricional** del empaque → NutriCoach calcula los valores para el peso consumido (pantalla Etiqueta).
4. **Código de barras** ✅ — escaneo con `BarcodeDetector` (o código a mano) → Open Food Facts → cache en `foods`.
5. **Etiqueta nutricional** ✅ — foto de la tabla → OCR IA → valores por 100 g → macros por gramos consumidos.
5. **Buscar alimento** ✅ — búsqueda en el catálogo del usuario + resultados cacheados.
6. **Crear alimento personalizado** ✅ — formulario mínimo (por 100 g). Ideal cuando sabés todos los valores.

### Registro semiautomático por texto ✅

Forma rápida de registrar una comida **describiéndola en lenguaje natural**, sin foto y sin saber los macros. El usuario escribe algo como:

> "2 huevos, una tajada de jamón de pavo y una tortilla con queso"

y la IA interpreta cada ítem, estima las cantidades y calcula calorías/carbos/proteína/grasa, mostrando una tarjeta editable (mismo patrón de corrección que la foto: editar nombre/cantidad, quitar, agregar) antes de confirmar. Complementa —no reemplaza— al formulario manual full-control.

Implementación: Edge Function `parse-meal-text` (solo texto, sin visión) sobre la abstracción `AIProvider` (método `parseMealText`), pantalla `/log/text` ("Escribir" en el hub) y escalado de macros con `@titoapps/nutrition`. Con clave de IA usa el modelo real; sin clave, stub de demo.

### Editor de alimentos (foto y texto)

Ambos flujos comparten `MealItemsEditor`: editar nombre y cantidad, quitar con **deshacer** (por si tocás la ✕ sin querer), y **recálculo automático de macros por IA** al renombrar o agregar un alimento. Nunca se guarda una comida en 0 kcal: al confirmar, cualquier fila con nombre pero sin macros (o modificada) se recalcula con `parse-meal-text` antes de registrar (`features/log/estimate.ts`).

### Recordatorios / alertas ✅

Recordatorios locales configurables (Perfil → Recordatorios): elegís la hora y qué recordar (agua, proteína, calorías). A esa hora, si te falta para la meta, salta una notificación tipo *"Te faltan 700 ml de agua para tu objetivo de hoy. ¡Dale un empujón!"* (usa `computeRemaining`). Botón "Probar ahora" para verlo al instante. Funciona con la app abierta o instalada; entrega con la app cerrada requiere Web Push (backend) — siguiente paso.

Todo registro produce `log_items` con macros snapshot y `source` correspondiente. Ver [database.md](./database.md#log_items).

## Coach IA 🔷

- **Conversacional:** responde "¿Qué debería cenar?", "¿Puedo comer pizza hoy?", "¿Qué debería evitar?", "¿Qué me falta consumir hoy?".
- **Con contexto:** cada respuesta recibe un snapshot del día (macros consumidos/faltantes, objetivo, peso, entrenamientos) para respuestas concretas, no genéricas.
- **Proactivo:** genera recomendaciones automáticas (ej. "llevas poca proteína a las 4pm, considera X").
- **Tono seguro:** sin culpa, sin dietas extremas, respeta rangos saludables. Ver salvaguardas en [ai.md](./ai.md#salvaguardas).

## Ideas de comida ✅

A partir de los **faltantes del día** ("te faltan 40 g proteína, 300 kcal"), NutriCoach sugiere opciones de comida que encajan, con la porción sugerida y registro en un toque. Motor: `rankMealIdeas` en `@titoapps/nutrition` (puntúa cuánto cierra la brecha de proteína sin excederse de calorías) sobre una librería curada de alimentos (`features/log/foodLibrary.ts`). Aparece como card en el dashboard.

## Objetivos ✅

El usuario elige: bajar grasa, ganar músculo, mantener peso, déficit calórico, volumen, personalizado. A partir del objetivo + perfil, `@titoapps/nutrition` calcula BMR (Mifflin-St Jeor), TDEE (por nivel de actividad) y las metas diarias de calorías y macros. Editable manualmente (modo personalizado).

## Historial ✅

- **Diario:** timeline de comidas del día agrupado por comida.
- **Semanal / mensual:** gráfico SVG de calorías por día vs meta (barras ámbar si se pasa) y línea de tendencia de peso.
- **Estadísticas:** adherencia (% de días dentro de ±10% de meta), racha de registro, promedio de calorías.
- **Mantenimiento adaptativo:** estimación del TDEE real a partir de ingesta y tendencia de peso (`adaptiveMaintenance` en `@titoapps/nutrition`), visible en semana/mes.

## Entrenamientos ✅

- **Registro manual:** tipo de actividad, duración y calorías, con **estimación automática por MET + peso** (`estimateCalories` de `@titoapps/health`), editable. Suma a "calorías quemadas" del dashboard.
- **Lista** de entrenamientos recientes con borrado; muestra el origen (manual/wearable).
- **Conectar dispositivo** (`/workouts/connect`): Apple Health, Google Health, Garmin, Fitbit y Amazfit listados con el seam listo (`HealthProvider` en `@titoapps/health`). Un botón de demo ejecuta el pipeline real (normalización → dedupe por `source + external_id` → guardado con upsert) usando un proveedor mock, sin OAuth.
- **Amazfit y Apple Watch:** no tienen API directa apta para web. La ruta real es **Strava** (Amazfit vía app Zepp, Apple Watch vía app Salud → Strava, que sí tiene API pública OAuth). Implementado en `StravaProvider` (`@titoapps/health`); atribuye la actividad al dispositivo real (`amazfit`/`apple_health`) para no requerir cambios de esquema. Falta solo el flujo OAuth (client id/secret) para emitir el token. También existe `FitbitProvider` para conexión directa a Fitbit.

## Recetas y comidas frecuentes 🔷

- Guardar recetas con ingredientes; macros calculados automáticamente (`@titoapps/nutrition`).
- Registrar una receta como un `log_item`.
- **Comidas frecuentes aprendidas:** la app detecta qué registra el usuario a menudo y lo ofrece primero (Bloque 3 para el aprendizaje automático; el MVP muestra "recientes").

## Plan de comidas por IA ✅

Genera un plan de comidas para **un día o una semana** a partir de tus metas diarias y objetivo (edge function `meal-plan`, con stub sin clave). Cada día trae desayuno/almuerzo/cena/snack con calorías y proteína. Pantalla `/plan`.

## Exportación de datos ✅

Portabilidad: descargá todo tu historial (comidas, pesos, entrenamientos) en **CSV** (un archivo por tabla) o **JSON** completo. `lib/csv.ts` (con tests) + pantalla `/export`.

## Agua ✅

Registro rápido (vasos/ml). El dashboard muestra el progreso hacia la meta de hidratación.
