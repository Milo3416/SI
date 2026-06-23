# Rutas de tracking - Up Si Vale

La demo usa paginas HTML fisicas para facilitar el rastreo por URL y el analisis del journey en Genesys Cloud.

## Rutas

| Pagina | Etapa | Intencion |
|---|---|---|
| index.html | Inicio | explorar_prestaciones |
| productos.html | Productos | comparar_productos |
| vales-beneficios.html | Beneficios | beneficios_fiscales |
| comercios-afiliados.html?q=restaurantes | Red de aceptacion | buscar_comercios |
| cotizacion.html?product=despensa | Cotizacion | cotizar_prestaciones |
| checkout.html?product=despensa&empleados=51-250 | Solicitud comercial | crear_oportunidad |
| confirmacion.html | Conversion | solicitud_enviada |
| continuidad.html | Continuidad asistida | recuperar_contexto |
| knowledge-portal.html?q=activar%20tarjeta | Knowledge Portal | buscar_conocimiento |

## Busquedas de sitio

Parametro de consulta en Genesys Cloud:

```txt
q
```

## Knowledge Portal

`knowledge-portal.html` contiene el contenedor oficial requerido:

```html
<div id="genesys-support-center"></div>
```

El contenido real depende de la configuracion del Messenger Deployment y de la base de conocimiento publicada en Genesys Cloud.


## Predictive Engagement

- `index.html`: popup de bienvenida despues de 15 segundos sin interaccion.
- Paginas secundarias: popup contextual despues de 10 segundos de permanencia, aun si el usuario esta scrolleando o si la pantalla permanece fija.
- Evento principal: `predictive_popup_shown`, con atributos `inviteRoute`, `inviteTitle`, `inviteMessage`, `dwellSeconds` y `userScrolledBeforePopup`.
