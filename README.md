# Demo Up Si Vale + Genesys Cloud

Demo estatica para mostrar Digital User Tracking, Messenger, Knowledge Portal y engagement proactivo sobre un sitio de Up Si Vale.

## Que cambio en esta version

- Se agregaron paginas HTML fisicas, no solo una maqueta en una pagina.
- Cada pagina tiene `data-route` y envia atributos de journey con `Journey.pageview` y `Journey.record`.
- La navegacion funciona con URLs reales para que Genesys Cloud pueda rastrear paginas y rutas.
- `knowledge-portal.html` usa el contenedor oficial `genesys-support-center` para renderizar el Knowledge Portal configurado en Genesys Cloud.
- Se elimino el globo de bienvenida estatico de la captura original. Ese texto ahora vive dentro del popup propio de Predictive Engagement.
- En `index.html`, el popup predictivo aparece al centro de la pantalla despues de 15 segundos sin interaccion y abre Messenger al aceptar.
- En paginas secundarias, el popup aparece despues de 10 segundos de permanencia, tanto si el visitante esta scrolleando como si la pantalla queda fija, con mensajes distintos por ruta.
- El parametro configurado para busquedas de sitio es `q`.

## Deployment de Genesys Cloud

Configurado en `js/genesys-config.js`:

```js
window.SIVALE_GENESYS = {
  deploymentId: '3ef5b987-e978-4d21-a6da-9562d5eebb9d',
  environment: 'prod',
  scriptUrl: 'https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js'
}
```

## Paginas trackeables

- `index.html` - Home recreado desde la pagina original.
- `productos.html` - Catalogo de productos.
- `vales-beneficios.html` - Beneficios fiscales y prestaciones.
- `comercios-afiliados.html?q=restaurantes` - Red de aceptacion y busqueda rastreable.
- `cotizacion.html?product=despensa` - Formulario de cotizacion.
- `checkout.html?product=despensa&empleados=51-250` - Solicitud comercial.
- `confirmacion.html` - Conversion.
- `continuidad.html` - Vista de continuidad asistida para demostrar contexto.
- `knowledge-portal.html?q=activar%20tarjeta` - Knowledge Portal con busqueda rastreable.

La matriz completa esta en `sivale-routes.json`.


## Mensajes predictivos por pagina

Los textos se controlan desde `js/genesys-tracking.js` en el objeto `messages` dentro de `setupInvite()`.

- Home: bienvenida de Sí Mon y horario de atencion. Disparo: 15 segundos sin interaccion.
- Productos: comparacion de vales. Disparo: 10 segundos de permanencia.
- Vales y beneficios: beneficios fiscales y experiencia del colaborador. Disparo: 10 segundos de permanencia.
- Comercios afiliados: red de aceptacion. Disparo: 10 segundos de permanencia.
- Cotizacion: apoyo para completar contexto comercial. Disparo: 10 segundos de permanencia.
- Checkout: ayuda antes de enviar la solicitud. Disparo: 10 segundos de permanencia.
- Confirmacion: proximos pasos y seguimiento. Disparo: 10 segundos de permanencia.
- Continuidad: recuperacion de contexto para asesor. Disparo: 10 segundos de permanencia.
- Knowledge Portal: consulta de articulos en MEX_CS_SIVALE. Disparo: 10 segundos de permanencia.

## Eventos enviados

- `route_loaded`
- `site_interaction`
- `site_search_performed`
- `intent_captured`
- `form_submitted`
- `predictive_popup_shown`
- `bot_invite_shown`
- `bot_invite_accepted`
- `bot_invite_dismissed`
- `bot_launcher_clicked`

Atributos principales:

- `pageUrl`
- `path`
- `query`
- `route`
- `stage`
- `segment`
- `inferredIntent`
- `journeyScore`
- `product`
- `employees`
- `searchTerm`
- `knowledgeBase`

## Configuracion requerida en Genesys Cloud

### Digital User Tracking

En Busquedas de seguimiento de sitios, agrega el parametro:

```txt
q
```

Ejemplo de URL generada:

```txt
knowledge-portal.html?q=consultar%20saldo
```

### Knowledge Portal

Para que `knowledge-portal.html` muestre respuestas reales de `MEX_CS_SIVALE`, valida:

1. El deployment esta activo.
2. La configuracion asignada al deployment tiene Knowledge Portal habilitado.
3. La base de conocimiento `MEX_CS_SIVALE` tiene articulos publicados.
4. Las categorias deseadas estan seleccionadas.
5. El dominio donde se hospeda esta demo esta permitido para el deployment.
6. La pagina contiene el div oficial:

```html
<div id="genesys-support-center"></div>
```

## Como probar localmente

Publica con un servidor local o en un dominio permitido por el deployment. Evita abrir el archivo con `file://`, porque Messenger/Knowledge Portal puede requerir un origen web valido.

Ejemplo:

```bash
cd sivale_genesys_demo
python3 -m http.server 8080
```

Luego abre:

```txt
http://localhost:8080/index.html
```
