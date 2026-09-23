# Nervio · Acero y vigas

Página: https://jhossho.github.io/acero-catalogo/

## Instalar y usar sin internet

1. Abre la página con internet y espera **Disponible sin conexión**.
2. En iPhone/iPad, usa Safari → Compartir → Añadir a pantalla de inicio. En Android, usa Instalar aplicación en Chrome.
3. Abre la aplicación instalada una primera vez con internet y comprueba el mismo mensaje. Después puedes usar el catálogo y la calculadora de vigas sin Wi-Fi ni datos.

Los documentos y las fuentes externas necesitan internet. Borrar los datos del navegador o la eliminación del almacenamiento por el dispositivo obliga a descargar otra vez la aplicación. Las actualizaciones se descargan al volver a conectarse; pulsa **Actualizar y recargar** cuando aparezca.

En computador tambi?n puedes descargar el proyecto y abrir index.html directamente conservando sus carpetas. La instalación mediante service worker requiere HTTPS o localhost.

## Funciones

- 991 perfiles I, H, C, Z, cuadrados, rectangulares y circulares, con fuentes del catálogo.
- Fy y Fu editables, filtros por altura y tolerancia, comparación de peso y exceso de S.
- Vigas continuas con múltiples apoyos, cargas por tramo, reacciones y diagramas de cortante y momento.
- Interfaz oscura y adaptable a celular y iPad.

El momento se convierte de kN·m a kip·in, no a ksi. Al dividir por Fy en ksi, S queda en in³. La comparación M/Fy es un predimensionamiento geométrico; la verificación de resistencia, estabilidad y servicio depende del diseño estructural completo.

## Publicación y desarrollo

Cada push a main ejecuta .github/workflows/pages.yml. GitHub Pages debe usar GitHub Actions como fuente. scripts/build_site.py prepara site-dist con una lista explícita de archivos de la aplicación; excluye informes, catálogos originales y direcciones de la red local.

Al modificar archivos de la aplicación, incrementa VERSION en sw.js para que los dispositivos descarguen la actualizaci?n completa. La caché se activa cuando todos los archivos se han descargado.

Prueba offline: ejecuta scripts/build_site.py y luego scripts/test_pwa.py con Python y Playwright instalados (la prueba usa Chrome en Windows). Comprueba recarga offline, parámetros del enlace, catálogo completo, vigas de seis apoyos y tama?o móvil.
