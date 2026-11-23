# CRM de RD Asesores

Programa para tener en un solo sitio todo lo de cada cliente del despacho: datos, documentación, modelos tributarios con sus plazos, facturas pendientes de contabilizar, historial y avisos.

> **Los 5 clientes que trae son inventados.** Antes de meter datos reales, consultadlo en el despacho (protección de datos).

## Cómo abrirlo

1. Descarga la carpeta del programa (en GitHub: botón verde **Code → Download ZIP**) y descomprímela.
2. Haz doble clic en el archivo **`index.html`**. Se abre en el navegador (Chrome, Edge o Firefox).
3. Arriba a la derecha, en **Usuario**, elige quién eres.

No hace falta instalar nada.

## Qué hay en cada pantalla

- **HOY**: lo urgente de todos los clientes (vencido, próximos 7 días, de 8 a 15 días, documentación que el cliente no ha enviado, facturas antiguas sin contabilizar y otras tareas). El botón **Solo lo mío** muestra solo tus clientes y tareas. Marca la casilla cuando algo esté hecho; si te equivocas, pulsa **Deshacer**.
- **CLIENTES**: listado con buscador y filtros por tipo, responsable y estado. El punto de color indica:
  - 🟢 verde: al día.
  - 🟠 naranja: tiene algo pendiente.
  - 🔴 rojo: algo vence en 7 días o menos, o ya ha vencido.
- **Ficha de cliente** (pulsa su nombre): datos, modelos y sus vencimientos, documentación presentada y pendiente, documentos de la carpeta CLIENTES, facturas, historial de actividad y tareas.
- **CALENDARIO**: todos los vencimientos y tareas del mes, filtrables por cliente y responsable. En el móvil se ve como lista.
- **AJUSTES**: personas del equipo, ruta de la carpeta CLIENTES, copias de seguridad y volver a los datos de ejemplo.

## Fechas de los modelos

Las fechas se calculan solas según el calendario fiscal (303, 111, 115, 130, 202, 390, 347, 200, 100…). Si el último día cae en sábado, domingo o festivo nacional, pasa al siguiente día hábil. **Son orientativas**: revisad cada año el calendario oficial de la AEAT.

## Carpeta CLIENTES

En la ficha de cada cliente, apartado **Carpeta CLIENTES**, puedes:

- Apuntar cada documento a mano, indicando dónde está guardado.
- O pulsar **Leer carpeta del cliente…** y elegir su carpeta. El programa solo lee los **nombres** de los archivos (no los abre ni los envía a ningún sitio) y los ordena por tipo y año.

El botón **Abrir** funciona desde un ordenador de la oficina con acceso a esa carpeta. Si el navegador no lo abre, usa **Copiar ruta** y pégala en el Explorador de archivos.

## Importante: dónde se guardan los datos

En esta primera versión los datos se guardan **solo en el navegador del ordenador donde se usa**. Esto significa que:

- Cada ordenador tiene sus propios datos (todavía no se comparten entre el equipo).
- Si se borra el historial del navegador, se pueden perder. **Descarga una copia a menudo** desde Ajustes → Descargar copia.

Para que todo el equipo comparta los mismos datos hará falta un siguiente paso: alojar el programa en un servidor del despacho o en un servicio en la nube con acceso protegido por contraseña.

## Archivos del programa (por si alguien técnico lo revisa)

- `index.html`: la página.
- `css/estilos.css`: colores y diseño (azul #47859F, naranja #F8994A, Poppins).
- `js/calendario-fiscal.js`: cálculo de las fechas de los modelos.
- `js/datos.js`: guardado y clientes de ejemplo.
- `js/app.js`: las pantallas.
