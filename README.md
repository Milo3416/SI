# Demo Sí Vale + Genesys Cloud Predictive Engagement + Knowledge Portal

Esta carpeta contiene una recreación estática de la página capturada en `www.sivale.mx` a partir del archivo `.h2d`, con assets locales, una invitación de bot para demostración y un **Portal de Conocimiento** simulado para mostrar búsqueda, categorías, artículos, captura de intención y tracking digital hacia Genesys Cloud.

## Cómo probar localmente

```bash
cd sivale_genesys_demo
python3 -m http.server 8080
```

Abre:

- Página principal: `http://localhost:8080/`
- Portal de conocimiento: `http://localhost:8080/knowledge-portal.html`

En la página principal puedes abrir el portal desde **Ir al Portal**, **Centro de Ayuda** o **¡Quiero cotizar!**.

## Configurar Genesys Cloud

Edita `js/genesys-config.js`:

```js
window.SIVALE_GENESYS = {
  enabled: true,
  deploymentId: 'TU_DEPLOYMENT_ID',
  environment: 'prod',
  scriptUrl: 'https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js',
  inactivitySeconds: 15,
  openMessengerOnAccept: true
};
```

Usa los valores reales del snippet de **Admin > Message > Messenger Deployments**. Si tu región no usa `apps.mypurecloud.com`, reemplaza también `scriptUrl` y `environment` con los valores del snippet copiado desde Genesys Cloud.

## Portal de conocimiento incluido

Archivo nuevo: `knowledge-portal.html`.

Funcionalidades de demo:

- Búsqueda de artículos.
- Navegación por categorías.
- Artículos sugeridos/top viewed simulados.
- Feedback de utilidad.
- Bot CTA y escalamiento a agente.
- Panel visual de **Intención capturada**.
- Feed local de eventos enviados con `Journey.record`.

## Captura de intenciones

La lógica de intención está en `js/knowledge-portal.js`. Usa reglas locales para clasificar búsquedas y clics en categorías/artículos. Ejemplos de intenciones:

- `consultar_saldo`
- `activar_tarjeta`
- `soporte_tarjeta`
- `beneficios_fiscales`
- `cotizar_prestaciones`
- `comercios_afiliados`
- `facturacion`
- `hablar_con_agente`

Cada intención detectada se envía a Genesys Cloud como evento digital personalizado mediante:

```js
Genesys('command', 'Journey.record', {
  eventName: 'knowledge_intent_detected',
  customAttributes: {
    intentName: 'consultar_saldo',
    intentLabel: 'Consultar saldo',
    confidence: '88',
    source: 'knowledge_portal_search',
    searchTerm: 'quiero consultar saldo'
  },
  traitsMapper: []
});
```

## Eventos Journey.record incluidos

Página principal:

- `sivale_demo_home_loaded`: página cargada y Journey listo.
- `bot_invite_shown`: invitación mostrada tras 15 segundos sin interacción.
- `bot_invite_accepted`: usuario acepta hablar con el bot.
- `bot_invite_dismissed`: usuario descarta la invitación.
- `bot_launcher_clicked`: clic en launcher flotante.
- `site_cta_clicked`: clics en CTAs/nav relevantes.

Portal de conocimiento:

- `knowledge_portal_loaded`: portal cargado.
- `knowledge_portal_page_loaded`: pageview del portal cuando Journey está listo.
- `knowledge_portal_search`: búsqueda del usuario.
- `knowledge_intent_detected`: intención inferida por búsqueda, categoría o artículo.
- `knowledge_category_selected`: selección de categoría.
- `knowledge_articles_rendered`: resultados mostrados.
- `knowledge_article_opened`: clic en artículo.
- `knowledge_article_feedback`: feedback positivo/negativo.
- `knowledge_bot_started`: usuario continúa con bot.
- `knowledge_escalation_requested`: usuario solicita agente.
- `intent_captured`: helper genérico disponible como `SivaleDemoTracking.captureIntent()`.

## Cómo usarlo para una demo de Genesys Cloud

1. Configura Messenger con tu deployment real.
2. Abre `knowledge-portal.html`.
3. Busca frases como:
   - `quiero consultar saldo`
   - `activar mi tarjeta y recuperar NIP`
   - `beneficios fiscales para vales de despensa`
   - `dónde aceptan mi tarjeta`
   - `quiero hablar con un agente`
4. Observa el panel **Intención capturada** y el feed de eventos.
5. Abre Messenger desde el bot CTA para continuar la conversación.
6. En Genesys Cloud, usa los eventos personalizados para segmentos, action maps, outcomes o validación en vistas de journey/Live Now.

## Notas

- El portal es una maqueta estática para demo visual. No consulta una Knowledge Base real de Genesys Cloud.
- Para producción, configura el Knowledge Portal desde Messenger Configurations, selecciona una Knowledge Base y despliega el snippet oficial del portal.
- Respeta consentimiento/cookies antes de activar tracking en un ambiente real.
- El popup propio de la demo no reemplaza una Action Map real; sirve para disparar la experiencia en demo. Puedes ocultarlo y usar Action Maps de Genesys Cloud si prefieres que Genesys decida la oferta.

## Genesys Cloud Messenger configurado

La demo ya incluye el deployment de Messenger compartido:

- Environment: `prod`
- Bootstrap: `https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js`
- Deployment ID: `3ef5b987-e978-4d21-a6da-9562d5eebb9d`

El archivo que controla esta configuración es `js/genesys-config.js`. El loader de `js/genesys-tracking.js` usa esos valores para cargar Messenger y para ejecutar `Messenger.open` cuando el visitante acepta la invitación predictiva o presiona el launcher flotante.
