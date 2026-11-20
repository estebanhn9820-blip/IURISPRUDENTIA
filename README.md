# IURISPRUDENTIA

Biblioteca web privada para cargar providencias en PDF, DOCX o TXT, extraer su texto, generar un resumen en español y consultar los documentos cargados.

## Importante: GitHub Pages no ejecuta el backend

GitHub Pages solo publica archivos estáticos. La carga, el almacenamiento privado y los resúmenes necesitan un servidor Node.js. Este repositorio incluye la aplicación completa, pero para usar estas funciones hay que desplegarla en un servicio que ejecute Node (por ejemplo, Render, Railway o un servidor propio) y configurar las variables de entorno indicadas abajo. En GitHub Pages la interfaz no podrá conectarse a `/api/sentences`.

## Configuración

Requisitos: Node.js 20 o superior y `unzip` disponible en el sistema para procesar documentos DOCX.

1. Clona el repositorio y ejecuta `npm install`.
2. Configura estas variables en el servicio de alojamiento; no las publiques en el repositorio:
   - `APP_PASSWORD`: contraseña larga para proteger toda la aplicación. El usuario es `admin` por defecto; puedes cambiarlo con `APP_USER`.
   - `OPENAI_API_KEY`: clave de API del proveedor OpenAI. Se usa solo en el servidor, nunca en el navegador.
   - `OPENAI_MODEL`: opcional; por defecto `gpt-4o-mini`.
   - `DATA_DIR`: opcional; directorio persistente donde se guarda el texto extraído y los resúmenes. En alojamiento remoto, conecta un disco/volumen persistente y apunta esta variable a él.
   - `PORT`: normalmente lo define automáticamente el proveedor.
3. Ejecuta `npm start` o configura el servicio para que use `npm start` como comando de inicio.
4. Abre la URL HTTPS del servicio. El navegador solicitará las credenciales de acceso; usuario `admin` (salvo que cambies `APP_USER`) y la contraseña de `APP_PASSWORD`.

La aplicación acepta archivos de hasta 15 MB, limita el texto extraído y guarda los registros como archivos JSON en `DATA_DIR`. Asegúrate de habilitar almacenamiento persistente en el proveedor: el disco efímero puede borrar los documentos al reiniciar o volver a desplegar.

## Privacidad y uso

La aplicación requiere contraseña y no inicia si faltan `APP_PASSWORD` u `OPENAI_API_KEY`. El texto de la providencia se envía al proveedor configurado para generar el resumen; no cargues documentos confidenciales sin verificar primero las políticas de privacidad y retención aplicables. No subas claves ni credenciales al repositorio. Los resúmenes generados por IA pueden contener errores y deben contrastarse con el texto oficial de la providencia. Los PDF escaneados como imágenes necesitan OCR antes de cargarse.
