# eddie — reglas de trabajo

**`BRIEF.md` es la fuente de verdad.** Léelo completo al empezar cada sesión. Si algo aquí contradice el brief, gana el brief.

## Proceso
- Trabajar por fases, en el orden de "Orden de trabajo" del brief. Al cerrar cada fase, mostrar el resultado y esperar aprobación antes de pasar a la siguiente.
- Si una decisión técnica del brief no funciona o hay una alternativa claramente mejor: explicar por qué y preguntar antes de cambiarla.
- No construir nada fuera del alcance de la versión 1. Las ideas extra se proponen, no se implementan.
- Ante la duda, gana la opción más simple ("el editor desaparece y queda el texto").

## Código
- Código, nombres, comentarios y commits en inglés. Interfaz y README en español neutro.
- El nombre de la app siempre en minúscula: **eddie**.
- La capa de datos (`src/storage/`) no importa nada de la UI. La UI solo habla con `storage` a través de su API pública.
- Web estándar: nada que impida una futura migración a Tauri.
- Commits pequeños y descriptivos.

## Verificación
- Antes de declarar una fase terminada: `npm run build` sin errores y prueba real en Chrome.
- Los atajos de teclado se prueban también con eddie instalado como app.

## Decisiones tomadas
Registrar aquí, en una línea cada una, las decisiones que cambien o precisen el brief (con fecha).

- 2026-10-19 · Repo propio `eddie`, publicado en GitHub Pages bajo `/eddie/` (`base` en `vite.config.ts`).
- 2026-10-19 · Título: `customTitle` manual; si es `null`, se deriva del primer `# ` (ignorando el front matter) o de la primera línea.
- 2026-10-19 · Eliminar una carpeta borra (lógicamente) sus subcarpetas y documentos; la confirmación indica cuántos.
- 2026-10-19 · El respaldo `.json` incluye los elementos borrados; al importar se fusiona por `id` y gana el `updatedAt` más reciente.
- 2026-10-19 · Teclado en español: detectar atajos por tecla física (`event.code`) y evitar teclas que requieren Option/Shift. Si un atajo se complica, se descarta.
- 2026-10-19 · Tablas en fuente monoespaciada dentro del editor para que las columnas se alineen.
- 2026-10-19 · Un solo resaltador de código (Lezer) para el editor y la exportación.
- 2026-10-19 · PDF: se imprime el HTML de exportación desde un iframe oculto.
- 2026-10-19 · Las actualizaciones del service worker se aplican al reabrir la app, nunca en caliente.
- 2026-10-19 · `icons/` contiene íconos con estilo macOS/iOS (bordes redondeados); se usan como base para los íconos de la PWA en la fase 7.
- 2026-10-19 · `public/eddie-logo.png` se convirtió a blanco sobre transparente y se recortó (846×244); el original traía fondo oscuro.
- 2026-10-19 · Sidebar: el menú "⋯" (o clic derecho) tiene renombrar y eliminar; doble clic renombra. Las carpetas colapsadas se recuerdan (`collapsedFolderIds`). El atajo para esconder el sidebar queda para la fase 6.
- 2026-10-19 · Colores verificados en claude.ai (tema oscuro actual): `--bg` #151515, `--bg-sidebar` #111111, `--bg-code` #20201f, `--text` #f9f9f7, `--text-muted` #97958d. El fucsia queda en 5,7:1 sobre `--bg` (antes 4,7:1). Los tamaños de títulos se mantienen (2 / 1,5 / 1,25 em) porque el usuario los aprobó.
- 2026-10-19 · Exportación: `.html` con el tema oscuro de eddie; `.pdf` con fondo claro (legible e imprimible), fucsia oscurecido para links (#b30d91) y Mermaid en tema `neutral`. Se exporta desde el menú "⋯" de cada documento; respaldo e importación desde el "⋯" del encabezado del sidebar.
- 2026-10-19 · Atajos: mostrar/esconder panel pasa de `⌘ \` a `⌘ .` (en teclado español `\` requiere Option). `⌘ /` se detecta por carácter (en español es `⌘ ⇧ 7`). El resto por tecla física. La lista vive en `src/shortcuts.ts` y alimenta el panel de atajos. Pendiente probar con la app instalada (fase 7).
- 2026-10-19 · PWA: íconos `any` con forma de macOS (cuadrado redondeado 824/1024 con margen transparente) y uno `maskable` con margen de seguridad. El service worker guarda todo en caché (~7 MB, incluye Mermaid y lenguajes) para exportar sin conexión. Publicación: GitHub Pages con GitHub Actions (`.github/workflows/deploy.yml`).
