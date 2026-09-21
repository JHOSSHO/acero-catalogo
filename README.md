# Nervio · Selector de perfiles de acero

Abre **index.html** con doble clic. Funciona directamente en Chrome, Edge o Firefox, sin servidor, sin instalar dependencias y sin conexión. Conserva los archivos y las carpetas juntos. Los enlaces a las fuentes web sí requieren internet.

Introduce el **momento en kN·m**, Fy en ksi y la tolerancia de exceso de S. Puedes escribir coma o punto decimal y momentos positivos o negativos. La página usa el valor absoluto. Los cuatro botones de ejemplo y el diagrama corresponden al nervio de la figura 7 del informe.

La búsqueda compara **S top y S bottom**, filtra canales C o vigas I y selecciona **el menor área dentro de la banda solicitada**. “Ver todo el catálogo” también muestra perfiles insuficientes y perfiles que exceden la tolerancia, identificados por separado. La ficha y el CSV contienen la fuente y el cálculo. “Imprimir memoria / PDF” imprime el caso vigente.

## Resultado inicial del informe

La figura 7, página PDF 12 (página impresa 10), tiene los momentos principales +20,98, −24,36, −8,24 y +11,78 kN·m. Para una misma sección a lo largo del nervio, gobierna **|M| = 24,36 kN·m**.

```text
1 kN·m = 8,850745791327 kip·in
|M| = 24,36 × 8,850745791327 = 215,6041674767 kip·in
Fy = 50 ksi = 50 kip/in²
S requerido = |M| / Fy = 4,3120833495 in³
Tolerancia inicial = 20 % de exceso
Banda de búsqueda = 4,3120833495 a 5,1745000194 in³
```

El momento **no se convierte a ksi**. La conversión correcta es kN·m → kip·in; luego, (kip·in)/(kip/in²) = in³. Fu = 65 ksi no entra en la ecuación S = M/Fy.

Con ambos catálogos y todas las familias, el mejor ajuste geométrico por menor área es:

| Propiedad | PHR C 254 × 67 × 2,5 mm |
|---|---:|
| Fuente | ACESCO, tabla 14, págs. 48–49 |
| Área | 1008,20 mm² = 1,562713 in² |
| S top = S bottom = Sx | 71 969 mm³ = 4,391818 in³ |
| Exceso respecto a S requerido | 1,8491 % |
| Peso publicado | 7,97 kg/m |

En AISC únicamente, el mínimo de área es **M8X6.2** (sección I, A = 1,82 in², Sx = 4,39 in³). Si se filtra AISC + canales C, es **MC10X6.5** (A = 1,95 in², Sx = 4,59 in³). No se presupone que una sección C siempre tenga menos área que una I.

Se incluye **Memoria - nervio grupo 2.pdf** con el caso inicial. Es una captura del cálculo inicial: para otros valores, genera una memoria nueva desde la página.

## Criterio y límites

- Flexión alrededor del eje fuerte x–x, con el alma vertical. Las familias incluidas son simétricas respecto al eje horizontal: **S top = S bottom = Sx**. S bottom no es Sy. Se comprueban ambas fibras explícitamente.
- Se exige S top ≥ S requerido y S bottom ≥ S requerido. La tolerancia limita únicamente el **exceso** de S gobernante = mín(S top, S bottom). Nunca permite una sección insuficiente. Se calcula sin redondear; la presentación se redondea.
- Si no hay perfiles en la banda, la alternativa suficiente con menor exceso se muestra como **fuera de tolerancia**. Si ninguno es suficiente, se informa sin proponer una solución.
- El criterio es elástico de sección bruta, **no es una comprobación LRFD/ASD**. El informe ya emplea cargas mayoradas (1,2D + 1,6L). El diseño final requiere verificar resistencia de diseño, arriostramiento, pandeos, cortante, flechas y conexiones. Para C conformados en frío se debe comprobar la sección efectiva y el pandeo distorsional, entre otros.
- No se vuelve a analizar el nervio ni se añade automáticamente el peso del perfil. Cambiar la rigidez entre tramos, las cargas o la continuidad exige revisar el análisis estructural original.
- “A972” no corresponde al grado estructural solicitado: ASTM A972 se refiere a pilotes tubulares con recubrimiento epoxi. **ASTM A572 grado 50** tiene Fy mínimo = 50 ksi y Fu mínimo = 65 ksi; **A992** también tiene esos mínimos. Los C conformados en frío de ACESCO usan acero de lámina: las mismas propiedades mecánicas no convierten el producto en A572. La interfaz adopta los valores 50/65 sin certificar un grado para todo el catálogo.

## Datos y fuentes

**436 perfiles reales**, sin valores inventados:

- **401 AISC**: 274 W, 18 M, 28 S, 11 HP, 31 C y 39 MC, extraídos del archivo local `data/AISC Shapes Database v13.2.xlsx`, hoja `Database v13.2`, bloque imperial. Cada ficha conserva la fila de origen. No se reemplazó la versión entregada por otra más reciente.
- **35 ACESCO**: perfiles C sencillos PHR, tabla 14 del [manual oficial de perfiles C y Z grado 50](https://acesco.com.ec/wp-content/uploads/2019/01/perfiles-c-y-z-grado-50-manual-tecnico.pdf), guardado en `data/ACESCO - Perfiles C y Z grado 50.pdf`. Página PDF 25, páginas impresas 48–49. Se divide S en mm³ entre 25,4³ y A en mm² entre 25,4². Se usa el peso publicado. Estas tablas históricas no aseguran disponibilidad comercial actual.
- El PDF original `data/ACESCO - Manual Técnico.pdf` es de **Metaldeck grado 40**, no contiene el catálogo de perfiles C/I usado en esta búsqueda y se conserva intacto.
- La fila PHR C 150 × 60 de espesor 1,5 mm tiene B = 50 mm en las columnas geométricas. Se normaliza a 150 × 50 y se muestra una nota en la ficha, conservando la referencia original en los datos.
- [ASTM A572: propiedades por grado](https://store.astm.org/a0572_a0572m-12.html), [ASTM: referencia de A972](https://store.astm.org/products-services/standards-and-publications/standards/steel-standards.html), [AISC: propiedades A992](https://www.aisc.org/globalassets/aisc/research-library/updating-standard-shape-material-properties-database-for-design-and-reliability.pdf), [ficha técnica ACESCO](https://www.acesco.com.co/descargas/fichastecnicas/ficha-tecnica-perfiles.pdf).

## Archivos y mantenimiento

La aplicación entregada no tiene dependencias de ejecución ni llamadas externas. `index.html`, `styles.css`, `calculator.js`, `app.js` y `data/catalog.js` son suficientes para calcular. Los PDF y el Excel permiten revisar las fuentes. `data/catalog.json` es una copia legible de los datos con unidades, referencia y hash SHA-256 de los catálogos.

Para regenerar los datos y ejecutar las pruebas de desarrollo, se necesita Python con `pymupdf`, `openpyxl` y `playwright`, además de Chrome. El Python portátil de esta carpeta está en `.tools/python/python.exe`; no es necesario para usar la página.

```powershell
.\.tools\python\python.exe scripts/build_catalog.py
.\.tools\python\python.exe scripts/test_app.py
```

Las pruebas verifican conversiones, signos, entradas inválidas, límites de tolerancia, ambas fibras en un caso asimétrico, elección por área, filtros, navegación de tablas, exportación CSV, diagrama, ejecución directa desde archivo y tamaño de pantalla de celular. Las capturas quedan en `test-results`.
