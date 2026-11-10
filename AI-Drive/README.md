# IA-Drive

Interfaz de gestión de archivos con Angular y Angular Material, pensada como proyecto de portafolio. Incluye búsqueda, navegación, listado de archivos y un panel de asistente visual.

> El asistente se conecta al backend local y los documentos listados y cargados se consultan allí. Las carpetas y acciones de demostración no son persistentes.

## Carga de archivos

Desde **Nuevo → Subir archivos** puedes seleccionar varios archivos o arrastrarlos al área principal. El frontend acepta únicamente PDF con texto seleccionable, TXT, Markdown (MD) y CSV, con un máximo de 25 MB por archivo. Cada archivo se envía como `multipart/form-data` a `POST http://localhost:3000/api/documents/upload`, usando el campo `file`; la respuesta exitosa agrega el documento a la lista y muestra la cantidad de fragmentos indexados. La detección de PDF escaneados la realiza el backend.

La lista del Drive se consulta mediante `GET http://localhost:3000/api/documents` al abrir la pantalla y después de subir archivos. Si falla, la interfaz muestra el error y permite reintentar.

El panel del asistente envía las preguntas a `POST http://localhost:3000/api/chat` como JSON (`{ "message": "..." }`) y muestra la respuesta recibida.

## Requisitos

- Node.js y npm

## Desarrollo

Desde esta carpeta, instala las dependencias y levanta el servidor de desarrollo:

```bash
npm install
npm start
```

La aplicación se abrirá en `http://localhost:4200/` y se actualizará al modificar los archivos fuente.

## Compilación

```bash
npm run build
```

Los artefactos se generan en `dist/ia-drive/`.

## Pruebas

```bash
npm test -- --watch=false
```

## Stack

- Angular 22
- Angular Material 22
- TypeScript y SCSS

## Estructura de la aplicación

La aplicación está organizada por funcionalidades en `src/app/features/drive/`: `pages/` compone la pantalla, `components/` contiene las piezas de interfaz, `data-access/` concentra el estado y las reglas de archivos, y `models/` define sus tipos. Los componentes standalone usan señales para entradas y estado local, y se comunican mediante entradas y salidas tipadas.
