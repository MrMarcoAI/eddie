---
proyecto: eddie
version: 1.0
tipo: webapp instalable (PWA)
navegador_objetivo: Chrome (escritorio, macOS)
---

# eddie — Brief técnico

## Propósito

eddie es un editor de Markdown personal, minimalista y oscuro. Sirve para escribir ideas, contenido y UX writing con rapidez y control, guardar los documentos en un sidebar ordenado por carpetas y exportar a `.md`, `.html` o `.pdf` solo cuando el autor lo decide. Los archivos exportados a `.md` se usan después como insumo en flujos con Claude Code.

eddie se instala desde Chrome como una app independiente: ventana propia, ícono en el Dock, búsqueda desde Spotlight y apertura al iniciar sesión.

Principio rector: **el editor desaparece y queda el texto.** Ante cualquier duda de diseño o funcionalidad, gana la opción más simple.

## Instrucciones para Claude Code

- Lee este brief completo antes de escribir código.
- Trabaja por fases (ver "Orden de trabajo") y muéstrame el resultado al terminar cada una antes de seguir.
- Si una decisión técnica de este brief no funciona o hay una alternativa claramente mejor, explícame por qué y pregunta antes de cambiarla.
- No agregues funciones que no estén en el alcance. Si crees que falta algo, proponlo, no lo construyas.
- El código, los nombres de variables y los commits van en inglés. La interfaz y el README, en español.
- El nombre de la app se escribe siempre en minúscula: **eddie**.

## Alcance de la versión 1

### 1. Editor

- Una sola columna, sin vista previa aparte.
- **Renderización intermedia:** el formato se aplica mientras se escribe, pero los símbolos de Markdown quedan visibles en un gris tenue.
  - `# Título` se ve como título grande (con jerarquía visual clara de H1 a H3; H4 a H6 más discretos).
  - `**negrita**` se ve en negrita y `*cursiva*` en cursiva apenas se cierran los símbolos.
  - `` `código` `` en línea con fondo sutil.
  - Citas (`>`) con borde izquierdo en el color de acento.
  - Links: el texto se ve como link; se abren con `Cmd/Ctrl + clic` en el navegador. Un clic normal permite editarlos.
- **Listas automáticas:** al presionar Enter dentro de una lista, se crea el siguiente ítem (viñeta, número o checkbox). Enter en un ítem vacío termina la lista. `Tab` anida y `Shift + Tab` desanida.
- **Checkboxes:** `- [ ]` y `- [x]`, clickeables para marcar o desmarcar.
- **Tablas** (sintaxis GFM): se muestran alineadas y legibles dentro del editor. No se requiere un editor visual de tablas.
- **Bloques de código** con resaltado de sintaxis según el lenguaje indicado.
- **Front matter** YAML (bloque entre `---` al inicio del documento): se muestra con estilo atenuado, distinguible del contenido.
- **Diagramas Mermaid:** en el editor se ven como bloque de código (` ```mermaid `). Solo se dibujan en la exportación HTML y PDF.
- **Guardado automático** mientras se escribe (con un breve retraso). No existe botón de guardar.
- Contador discreto de palabras y caracteres.

### 2. Sidebar de documentos

- Se puede **esconder y mostrar** con atajo de teclado y con un botón discreto. Su estado se recuerda entre sesiones.
- En la parte superior, el logo de eddie (`eddie-logo.png`, versión blanca) en tamaño pequeño.
- Muestra documentos y **carpetas** (con al menos un nivel de anidación).
- Acciones: crear documento, crear carpeta, renombrar, mover entre carpetas (arrastrar y soltar), eliminar con confirmación.
- **Orden** seleccionable: fecha de creación, nombre o última modificación. El orden elegido se recuerda.
- El título del documento se toma del primer `# Título`; si no existe, de la primera línea. Debe poder renombrarse manualmente.
- Buscador simple por título y contenido.

### 3. Almacenamiento

- Los documentos se guardan en **IndexedDB** del navegador.
- **Respaldo:** exportar todos los documentos y carpetas a un único archivo `.json` e importarlo de vuelta.
- **Preparado para sincronizar en el futuro** (no implementar sincronización ahora). Cada documento y carpeta debe tener:
  - `id` (UUID, nunca autoincremental)
  - `createdAt`, `updatedAt` (ISO 8601)
  - `deletedAt` (borrado lógico, para poder sincronizar eliminaciones)
  - `folderId` (o `null` si está en la raíz)
- Mantén la capa de datos separada de la interfaz (por ejemplo, un módulo `storage` con funciones claras), para poder cambiar IndexedDB por un backend después sin tocar la UI.

### 4. Exportación

- Exportación **manual** del documento actual a:
  - **`.md`:** el texto tal cual, incluido el front matter.
  - **`.html`:** archivo autocontenido (estilos incluidos en el mismo archivo), con el tema de eddie, código resaltado y diagramas Mermaid dibujados.
  - **`.pdf`:** generado con el diálogo de impresión de Chrome ("Guardar como PDF") y estilos de impresión cuidados (fondo claro u oscuro, a definir en la fase de diseño).
- En `.md` y `.html`, usar `showSaveFilePicker` (File System Access API) para que Chrome pregunte **dónde guardar y con qué nombre**. Nombre sugerido: el título del documento en formato `kebab-case`.
- Si la API no está disponible (por ejemplo, en iPad), usar una descarga normal como respaldo.

### 5. App instalable (PWA)

- `manifest.webmanifest` con:
  - `name` y `short_name`: `eddie`
  - `display`: `standalone` (ventana propia, sin barra de direcciones ni pestañas)
  - `background_color` y `theme_color`: el fondo del editor (`--bg`)
  - Íconos generados a partir de `eddie-logo-app.png` (1080 × 1080, fondo `#242424`, letra y cursor fucsia `#FF2BD6`): como mínimo 192 × 192 y 512 × 512, más una versión `maskable`. Verificar cómo se ve el ícono en el Dock de macOS y ajustar márgenes si Chrome lo recorta o lo muestra sin esquinas redondeadas.
- **Service worker** para que eddie abra y funcione **sin conexión**. Al publicar una nueva versión, la app debe actualizarse sin perder documentos.
- **Publicación:** sitio estático en GitHub Pages o Vercel (proponer el más simple). Solo se publica el código; los documentos permanecen en el navegador del usuario.
- Favicon a partir de `eddie-logo-app.png`.
- El README debe explicar cómo:
  1. Instalar eddie desde Chrome.
  2. Abrirlo desde Spotlight (verificar que aparezca al escribir "eddie").
  3. Agregarlo a los ítems de inicio de macOS (Ajustes del Sistema → General → Ítems de inicio).

## Fuera de alcance (versión 2 o más adelante)

- Sincronización entre dispositivos.
- Versión optimizada para iPad.
- Diagramas dibujados dentro del editor.
- Renderización completa estilo MarkText (símbolos que desaparecen).
- App nativa (Tauri). El código debe mantenerse como web estándar para que esa migración sea posible.

Descartados: modo enfoque, temas intercambiables, matemáticas/LaTeX y notas al pie.

## Diseño

### Dirección

Minimalista y oscuro, inspirado en la interfaz dark de Claude. Nada de decoración: sin degradados, sin sombras marcadas, sin animaciones de entrada. Solo transiciones breves que respondan a una acción (abrir y cerrar el sidebar, por ejemplo). Respetar `prefers-reduced-motion`.

### Recursos de marca

| Archivo | Uso |
|---|---|
| `eddie-logo-app.png` | Ícono de la app, favicon e íconos del manifest. Fondo `#242424`, letra y cursor fucsia `#FF2BD6`. |
| `eddie-logo.png` | Logo blanco sobre fondo transparente, para usar dentro de la interfaz oscura. |

Ambos archivos van en `public/` (o la carpeta de recursos estáticos que corresponda).

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | por definir (aprox. `#262624`) | Fondo del editor |
| `--bg-sidebar` | por definir (aprox. `#1f1e1d`) | Fondo del sidebar |
| `--text` | por definir (aprox. `#f5f4ef`) | Texto principal |
| `--text-muted` | por definir | Símbolos de Markdown, metadatos |
| `--border` | por definir | Separadores sutiles |
| `--accent` | `#FF2BD6` | Fucsia de marca: links, viñetas, bordes de citas, selección, foco, cursor |

Notas:
- Los valores "aprox." son una estimación y deben verificarse inspeccionando la interfaz dark de Claude en Chrome.
- El fucsia `#FF2BD6` es el color de marca de eddie y se usa tanto en el ícono como en la interfaz. Sobre `#262624` tiene un contraste de aproximadamente 4,7:1, suficiente para texto normal según WCAG AA (mínimo 4,5:1). Si `--bg` cambia al verificar los colores de Claude, recalcular el contraste.
- El cursor de escritura del editor usa el fucsia de marca, en referencia al cursor del ícono.

### Tipografía

- Familia única: `"Helvetica Neue", Helvetica, Arial, sans-serif`. No incrustar archivos de fuente (Helvetica tiene licencia; se usa la del sistema).
- Código: `ui-monospace, "SF Mono", Menlo, monospace`.
- Tamaño base y escala de títulos: tomar como referencia los tamaños de texto de la interfaz de Claude (verificar en Chrome con "Inspeccionar"). Ancho máximo de línea del texto: alrededor de 70 caracteres, centrado en el área de escritura.

### Calidad mínima

- Foco de teclado visible (en el color de acento).
- Contraste legible en todo el texto, incluido el gris de los símbolos.
- Estados vacíos útiles: un sidebar sin documentos invita a crear el primero; no muestra un mensaje decorativo.

## Atajos de teclado

Propuesta inicial. **Antes de implementarlos, verifica que Chrome permita capturarlos**, también con eddie instalado como app: Chrome reserva algunos atajos (como `Cmd/Ctrl + N`, `T` y `W`) y una página web no puede reemplazarlos. Si alguno choca, propón una alternativa.

| Acción | Mac | Windows |
|---|---|---|
| Mostrar / esconder sidebar | `Cmd + \` | `Ctrl + \` |
| Nuevo documento | `Option + N` | `Alt + N` |
| Nueva carpeta | `Option + Shift + N` | `Alt + Shift + N` |
| Buscar documentos | `Cmd + K` | `Ctrl + K` |
| Negrita | `Cmd + B` | `Ctrl + B` |
| Cursiva | `Cmd + I` | `Ctrl + I` |
| Insertar link | `Cmd + Shift + K` | `Ctrl + Shift + K` |
| Código en línea | `Cmd + E` | `Ctrl + E` |
| Título H1 / H2 / H3 | `Cmd + 1 / 2 / 3` | `Ctrl + 1 / 2 / 3` |
| Anidar / desanidar ítem | `Tab` / `Shift + Tab` | `Tab` / `Shift + Tab` |
| Exportar a .md | `Cmd + Shift + M` | `Ctrl + Shift + M` |
| Exportar a .html | `Cmd + Shift + H` | `Ctrl + Shift + H` |
| Exportar a .pdf | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| Deshacer / rehacer | `Cmd + Z` / `Cmd + Shift + Z` | `Ctrl + Z` / `Ctrl + Y` |
| Ver todos los atajos | `Cmd + /` | `Ctrl + /` |

`Cmd + /` abre un panel con la lista completa de atajos dentro de la app.

## Stack técnico sugerido

Sugerencia, no obligación (ver "Instrucciones para Claude Code"):

- **Vite + TypeScript**, sin framework pesado salvo que lo justifiques.
- **CodeMirror 6** con `@codemirror/lang-markdown` para el editor: permite la renderización intermedia mediante decoraciones y trae la continuación automática de listas.
- **Dexie** (o `idb`) para IndexedDB.
- **markdown-it** (o similar) para generar el HTML de exportación.
- **highlight.js** o **Shiki** para el resaltado de código.
- **Mermaid** cargado de forma diferida, solo cuando el documento contiene un diagrama.
- **vite-plugin-pwa** (o equivalente) para el manifest y el service worker.

## Repositorio

- Nombre: `eddie`.
- Debe incluir un **`README.md` en español** con:
  1. Qué es eddie y para qué sirve (el propósito de este brief, en pocas líneas), con el logo al inicio.
  2. Cómo instalarlo y correrlo en local.
  3. Cómo instalarlo como app en macOS, abrirlo desde Spotlight y agregarlo a los ítems de inicio.
  4. La **tabla completa de atajos de teclado**, actualizada con los que finalmente se implementen.
  5. Cómo funcionan el guardado, el respaldo y la exportación.
  6. Limitaciones conocidas (por ejemplo: los documentos viven en el navegador; si se borran los datos de Chrome sin respaldo, se pierden).
- `.gitignore` adecuado y commits pequeños y descriptivos.

## Orden de trabajo

1. **Base:** proyecto, estructura de carpetas, capa de datos (IndexedDB) y modelo de datos.
2. **Editor:** CodeMirror con renderización intermedia, listas, links, tablas, código y front matter.
3. **Sidebar:** documentos, carpetas, orden, búsqueda, esconder y mostrar.
4. **Diseño:** tokens de color, tipografía, logo y estados.
5. **Exportación y respaldo:** `.md`, `.html`, `.pdf` y `.json`.
6. **Atajos de teclado** y panel de atajos.
7. **PWA y publicación:** manifest, íconos, service worker y despliegue.
8. **README** y revisión final contra este brief.

## Criterios de aceptación

- Puedo escribir un documento con títulos, negritas, listas anidadas, una tabla, un bloque de código y un diagrama Mermaid, y todo se ve correcto en el editor (excepto el diagrama, que se ve como código).
- Cierro eddie, lo vuelvo a abrir y mis documentos, carpetas, orden y estado del sidebar siguen igual.
- Exporto a `.md` y `.html`, eddie me pregunta dónde guardar, y el `.html` se ve con el tema y el diagrama dibujado.
- Exporto a `.pdf` y el resultado es legible y ordenado.
- Respaldo todo en `.json`, borro los datos de Chrome, importo el respaldo y recupero todo.
- Instalo eddie desde Chrome, lo encuentro en Spotlight escribiendo "eddie", se abre en su propia ventana con su ícono en el Dock, y funciona sin conexión a internet.
- Todos los atajos del README funcionan con eddie instalado como app.
