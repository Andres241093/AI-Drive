# AI Drive Backend

Backend de demostración RAG con Express y OpenAI. OpenAI almacena los documentos en un vector store, hace el procesamiento/embedding y busca fragmentos relevantes; el backend envía esos fragmentos al modelo de chat. No se crean embeddings ni índices vectoriales locales.

## Formatos soportados por el frontend

- `.pdf`
- `.txt`
- `.md`
- `.csv` (el backend lo envía a OpenAI como texto plano para su indexación)

Tamaño máximo: 25 MB por archivo. El límite y la lista también se validan en el backend.

## Configuración e inicio

Requiere Node.js 20 o superior y una API key de OpenAI con acceso a los modelos configurados. El uso de la API y el almacenamiento del vector store pueden generar cargos según la cuenta y el consumo.

Desde `AI-Drive-Backend`:

```bash
npm install
```

Configura `.env`:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_CHAT_MODEL=gpt-4o-mini
PORT=3000
```

`OPENAI_VECTOR_STORE_ID` es opcional. Si no se define, el backend crea un vector store y persiste su ID en `.openai-vector-store-id` (archivo local ignorado por Git). Los documentos que ya estén en `documentos/` se sincronizan al iniciar; los que ya estén en el vector store no se vuelven a subir.

```bash
npm start
```

Servidor: `http://localhost:3000`. CORS permite `http://localhost:4200`.

## Flujo RAG

1. `POST /api/documents/upload` guarda el archivo localmente y lo sube al vector store de OpenAI. El endpoint espera a que OpenAI termine de indexarlo.
2. `POST /api/chat` busca hasta cinco fragmentos en el vector store y los pasa al modelo de chat con instrucciones para contestar únicamente con evidencia y citar el nombre del archivo.

La copia local sirve para sincronizar archivos si se configura otro vector store; el índice semántico vive en OpenAI y persiste entre reinicios. OpenAI recibe los archivos y las preguntas para procesarlos.

## API

### Subir archivo

`POST /api/documents/upload` con `multipart/form-data`; el campo del archivo se llama `file`.
La respuesta contiene `file.storedAs`; úsalo para descargar la copia local.

```json
{
  "message": "Archivo cargado correctamente.",
  "file": {
    "name": "manual.pdf",
    "storedAs": "identificador-manual.pdf",
    "size": 12345,
    "indexed": true,
    "status": "completed"
  }
}
```

### Listar archivos

`GET /api/documents` devuelve los archivos compatibles que están guardados localmente:

```json
{
  "files": [
    {
      "name": "manual.pdf",
      "storedAs": "identificador-manual.pdf",
      "size": 12345,
      "updatedAt": "2026-11-10T18:00:00.000Z",
      "downloadUrl": "/api/download/identificador-manual.pdf"
    }
  ],
  "total": 1
}
```

### Descargar archivo

`GET /api/download/:filename`, donde `:filename` es el valor `storedAs` devuelto al subir el archivo. La respuesta contiene el archivo como descarga. Ejemplo:

```text
GET http://localhost:3000/api/download/identificador-manual.pdf
```

### Chat

`POST /api/chat` con `Content-Type: application/json`:

```json
{
  "message": "¿Qué dicen los documentos sobre ...?"
}
```

```json
{
  "reply": "Respuesta basada en fragmentos recuperados [manual.pdf]."
}
```
