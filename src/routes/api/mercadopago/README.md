
``` ts
// SDK _ Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';
// add credentials
const client = new MercadoPagoConfig({ accessToken: 'YOUR_ACCESS_TOKEN' });
```

``` ts
// create preference
const preference = new Preference(client);

preference.create({
  body: {
    items: [
      {
        title: 'My Order/Product',
        quantity: 1,
        unit_price: 2000,
      }
    ],
    back_urls: {
      success: 'https://www.yourdomain.com/mercadopago/success',
      failure: 'https://www.yourdomain.com/mercadopago/failure',
      pending: 'https://www.yourdomain.com/mercadopago/pending',
    },
    auto_return: "approved",
  }
})
.then(console.log)
.catch(console.log);

// contains id
// "id": "787997534-6dad21a1-6145-4f0d-ac21-66bf7a5e7a58"
```

``` jsx
// the frontend part
import React from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Initialize Mercado Pago with your Public Key
initMercadoPago('YOUR_PUBLIC_KEY');

const App = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1>Botón de Pago</h1>
      <p>Haz clic en el botón para realizar el pago.</p>
      {/* Renderiza el botón de pago */}
      <div style={{ width: '300px' }}>
        <Wallet initialization={{ preferenceId: 'YOUR_PREFERENCE_ID' }} />
      </div>
    </div>
  );
};

export default App;
```

# Configurar notificaciones de pago 

Las notificaciones **Webhooks**, también conocidas como **devoluciones de llamada web**, son un método efectivo que permiten a los servidores de Mercado Pago enviar información en **tiempo real** cuando ocurre un evento específico relacionado con tu integración. 

En lugar de que tu sistema realice consultas constantes para verificar actualizaciones, los Webhooks permiten la transmisión de datos de manera **pasiva y automática** entre Mercado Pago y tu integración a través de una solicitud **HTTP POST**, optimizando la comunicación y reduciendo la carga en los servidores.

Consulta el flujo general de una notificación en el diagrama a continuación. 

![Diagram](/images/cow/notifications-diagrama-es.jpg)

A continuación, presentamos un paso a paso para configurar las notificaciones de creación y actualización de pagos. Una vez configuradas, las notificaciones Webhook se enviarán cada vez que se cree un pago o se modifique su estado (Pendiente, Rechazado o Aprobado). 

> NOTE
>
> Esta documentación trata exclusivamente de la configuración de notificaciones de pago, incluidas creaciones y actualizaciones, a través del evento **Pagos**. Para obtener información sobre otros eventos de notificaciones disponibles para configuración, consulta la [documentación de Notificaciones](/developers/es/docs/checkout-pro/additional-content/notifications) general.

En el proceso de integración con Mercado Pago, puedes configurar las notificaciones de dos maneras:

| Tipo de Configuración | Descripción | Ventajas | Cuándo Usar |
|-|-|-|-|
| Configuración a través de Tus Integraciones       | Este método permite configurar notificaciones directamente en tu Panel de Desarrollador. Puedes configurar notificaciones para cada una de tus aplicaciones, identificar cuentas distintas si es necesario, y validar el origen de la notificación mediante una firma secreta. | - Identificación sencilla de cuentas distintas, asegurando una adecuada gestión en entornos diversos. <br> - Alta seguridad al validar el origen de las notificaciones mediante una firma secreta, que garantiza la integridad de la información recibida. <br> - Más versátil y eficaz para mantener un control centralizado y gestionar la comunicación con las aplicaciones de manera eficiente. | Recomendado para la mayoría de las integraciones.                                                          |
| Configuración durante la creación de preferencias | Las notificaciones se configuran para cada transacción individualmente durante la creación de la preferencia.                                                                                                                  | - Ajustes específicos para cada transacción. <br> - Flexibilidad en casos de necesidad de parámetros dinámicos obligatorios. <br> - Ideal para integraciones como plataformas de pago para múltiples vendedores.                                                                                    | Conveniente en los casos en que sea necesario enviar un query parameter dinámico de forma obligatoria, además de ser adecuado para integraciones que funcionan como una plataforma de pago para múltiples vendedores. |

> RED_MESSAGE
>
> Importante
>
> Las URLs configuradas durante la creación de un pago tendrán prioridad por sobre aquellas configuradas a través de Tus integraciones.

:::::TabsComponent

::::TabComponent{title="Configuración a través de Tus integraciones"}
## Configuración a través de Tus integraciones
Puedes configurar notificaciones para cada una de tus aplicaciones directamente desde [Tus integraciones](/developers/panel/app) de manera eficiente y segura. En este apartado, explicaremos cómo:

1. Indicar las URLs de notificación y configurar eventos
2. Validar el origen de una notificación
3. Simular el recibimiento de una notificación

### 1. Indicar URLs de notificación y configurar el evento
Para configurar notificaciones Webhooks, es necesario indicar las URLs a las que las mismas serán enviadas.
Para hacerlo, sigue el paso a paso a continuación:
1. Ingresa a [Tus integraciones](/developers/panel/app) y selecciona la aplicación integrada con Checkout Pro para la que deseas activar las notificaciones. 

![Application](/images/cow/not1-select-app-es.png)

2. En el menú de la izquierda, selecciona **Webhooks > Configurar notificaciones**.

![Webhooks](/images/cow/not2-webhooks-es.png) 

3. Selecciona la pestaña **Modo productivo** y proporciona una `URL HTTPS` para recibir notificaciones con tu integración productiva. 

![URL](/images/cow/not3-url-es.png) 

4. Selecciona el evento **Pagos** para recibir notificaciones, que serán enviadas en formato `JSON` a través de un `HTTPS POST` a la URL especificada anteriormente.

![Payment](/images/cow/not4-payment-es.png) 

5. Por último, haz clic en **Guardar configuración**. Esto generará una **clave secreta** exclusiva para la aplicación, que permitirá validar la autenticidad de las notificaciones recibidas, garantizando que hayan sido enviadas por Mercado Pago. Ten en cuenta que esta clave generada no tiene plazo de caducidad y su renovación periódica no es obligatoria, aunque sí recomendada. Para hacerlo, basta con cliquear en el botón **Restablecer**.

### 2. Simular la recepción de la notificación
Para garantizar que las notificaciones sean configuradas correctamente, es necesario simular su recepción. Para hacerlo, sigue el paso a paso a continuación.
1. Después de configurar las URLs y los Eventos, haz clic en **Guardar configuración**.
2. Luego, haz clic en **Simular** para probar si la URL indicada está recibiendo las notificaciones correctamente.
3. En la pantalla de simulación, selecciona la URL que se va a probar, que puede ser **la URL de prueba o la de producción**.
4. A continuación, elige el **tipo de evento** e ingresa la **identificación** que se enviará en el cuerpo de la notificación (Data ID).
5. Por último, haz clic en **Enviar prueba** para verificar la solicitud, la respuesta proporcionada por el servidor y la descripción del evento. Recibirás una respuesta similar al ejemplo a continuación, que representa el `body` de la notificación recibida en tu servidor.

```
{
  "action": "payment.updated",
  "api_version": "v1",
  "data": {
    "id": "123456"
  },
  "date_created": "2021-11-01T02:02:02Z",
  "id": "123456",
  "live_mode": false,
  "type": "payment",
  "user_id": 724484980
}
```

### 3. Validar origen de la notificación
La validación del origen de una notificación es fundamental para asegurar la seguridad y la autenticidad de la información recibida. Este proceso ayuda a prevenir fraudes y garantiza que solo las notificaciones legítimas sean procesadas.

Mercado Pago enviará a su servidor una notificación similar al ejemplo a continuación para una alerta del tópico `payment`. En este ejemplo, se incluye la notificación completa, que contiene los `query params`, el `body` y el `header` de la notificación.
- **_Query params_**: Son parámetros de consulta que acompañan la URL. En el ejemplo, tenemos  `data.id=123456` y `type=payment`. 
- **_Body_**: El cuerpo de la notificación contiene información detallada sobre el evento, como `action`, `api_version`, `data`, `date_created`, `id`, `live_mode`, `type` y `user_id`. 
- **_Header_**: El encabezado contiene metadatos importantes, incluyendo la firma secreta de la notificación `x-signature`.

```
POST /test?data.id=123456&type=payment HTTP/1.1
Host: prueba.requestcatcher.com
Accept: */*
Accept-Encoding: *
Connection: keep-alive
Content-Length: 177
Content-Type: application/json
Newrelic: eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkFwcCIsImFjIjoiOTg5NTg2IiwiYXAiOiI5NjA2MzYwOTQiLCJ0eCI6IjU3ZjI4YzNjOWE2ODNlZDYiLCJ0ciI6IjY0NjA0OTM3OWI1ZjA3MzMyZDdhZmQxMjEyM2I5YWE4IiwicHIiOjAuNzk3ODc0LCJzYSI6ZmFsc2UsInRpIjoxNzQyNTA1NjM4Njg0LCJ0ayI6IjE3MDk3MDcifX0=
Traceparent: 00-646049379b5f07332d7afd12123b9aa8-e7f77a41f687aecd-00
Tracestate: 1709707@nr=0-0-989586-960636094-e7f77a41f687aecd-57f28c3c9a683ed6-0-0.797874-1742505638684
User-Agent: restclient-node/4.15.3
X-Request-Id: bb56a2f1-6aae-46ac-982e-9dcd3581d08e
X-Rest-Pool-Name: /services/webhooks.js
X-Retry: 0
X-Signature: ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b
X-Socket-Timeout: 22000
{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":724484980}
```

A partir de la notificación Webhook recibida, podrás validar la autenticidad de su origen. Mercado Pago siempre incluirá la clave secreta en las notificaciones Webhooks que serán recibidas, lo que permitirá validar su autenticidad. Esta clave será enviada en el _header_ `x-signature`, que será similar al ejemplo debajo.

```
`ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b`
```

Para confirmar la validación, es necesario extraer la clave contenida en el _header_ y compararla con la clave otorgada para tu aplicación en Tus integraciones. Para eso, sigue el paso a paso a continuación. Al final, disponibilizamos nuestros SDKs con ejemplos de códigos completos para facilitar el proceso.

1. Para extraer el timestamp (`ts`) y la clave (`v1`) del header `x-signature`, divide el contenido del _header_ por el carácter “,", lo que resultará en una lista de elementos. El valor para el prefijo `ts` es el _timestamp_ (en milisegundos) de la notificación y _v1_ es la clave encriptada. Siguiendo el ejemplo presentado anteriormente, `ts=1742505638683` y `v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b`.
2. Utilizando el _template_ a continuación, sustituye los parámetros con los datos recibidos en tu notificación.

```
id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
```
- Los parámetros con el sufijo `_url` provienen de _query params_. Ejemplo: [data.id_url] se sustituirá por el valor correspondiente al ID del evento (`data.id`). Este _query param_ puede ser hallado en la notificación recibida. En el ejemplo de notificación mencionado anteriormente, el `data.id_url` es `123456`.
- [x-request-id_header] deberá ser sustituido por el valor recibido en el _header_ `x-request-id`. En el ejemplo de notificación mencionado anteriormente, el `x-request-id` es `bb56a2f1-6aae-46ac-982e-9dcd3581d08e`.
- [ts_header] será el valor `ts` extraído del _header_ `x-signature`. En el ejemplo de notificación mencionado anteriormente, el `ts` es `1742505638683`.
- Al aplicar los datos al _template_, quedaría de la siguiente manera:
`id:123456;request-id:bb56a2f1-6aae-46ac-982e-9dcd3581d08e;ts:1742505638683;`

> RED_MESSAGE
>
> Importante
>
> Si alguno de los valores presentados en el modelo anterior no está presente en la notificación recibida, debes removerlo.

3. En [Tus integraciones](/developers/panel/app), selecciona la aplicación integrada, haz clic en **Webhooks > Configurar notificación** y revela la clave secreta generada.

![Signature](/images/cow/not6-signature-es.png) 

4. Genera la contraclave para la validación. Para hacer esto, calcula un [HMAC](https://es.wikipedia.org/wiki/HMAC) con la función de `hash SHA256` en base hexadecimal, utilizando la **clave secreta** como clave y el template con los valores como mensaje.

[[[
```php
$cyphedSignature = hash_hmac('sha256', $data, $key);
```
```node
const crypto = require('crypto');
const cyphedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureTemplateParsed)
    .digest('hex'); 
```
```java
String cyphedSignature = new HmacUtils("HmacSHA256", secret).hmacHex(signedTemplate);
```
```python
import hashlib, hmac, binascii

cyphedSignature = binascii.hexlify(hmac_sha256(secret.encode(), signedTemplate.encode()))
```
]]]

5. Finalmente, compara la clave generada con la clave extraída del _header_, asegurándote de que tengan una correspondencia exacta. Además, puedes usar el _timestamp_ extraído del header para compararlo con un timestamp generado en el momento de la recepción de la notificación, con el fin de establecer una tolerancia de demora en la recepción del mensaje.

A continuación, puedes ver ejemplos de código completo:

[[[

```
```javascript
// Obtain the x-signature value from the header
const xSignature = headers['x-signature']; // Assuming headers is an object containing request headers
const xRequestId = headers['x-request-id']; // Assuming headers is an object containing request headers

// Obtain Query params related to the request URL
const urlParams = new URLSearchParams(window.location.search);
const dataID = urlParams.get('data.id');

// Separating the x-signature into parts
const parts = xSignature.split(',');

// Initializing variables to store ts and hash
let ts;
let hash;

// Iterate over the values to obtain ts and v1
parts.forEach(part => {
    // Split each part into key and value
    const [key, value] = part.split('=');
    if (key && value) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        if (trimmedKey === 'ts') {
            ts = trimmedValue;
        } else if (trimmedKey === 'v1') {
            hash = trimmedValue;
        }
    }
});

// Obtain the secret key for the user/application from Mercadopago developers site
const secret = 'your_secret_key_here';

// Generate the manifest string
const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;

// Create an HMAC signature
const hmac = crypto.createHmac('sha256', secret);
hmac.update(manifest);

// Obtain the hash result as a hexadecimal string
const sha = hmac.digest('hex');

if (sha === hash) {
    // HMAC verification passed
    console.log("HMAC verification passed");
} else {
    // HMAC verification failed
    console.log("HMAC verification failed");
}
```

]]]
::::

::::TabComponent{title="Configuración al crear preferencias"}
## Configuración al crear preferencias
Durante el proceso de creación de [preferencias](/developers/es/reference/preferences/_checkout_preferences/post), es posible configurar la URL de notificación de forma más específica para cada pago utilizando el campo `notification_url`. 

> RED_MESSAGE
>
> Importante
>
> La `notification_url` debe ser una URL con protocolo HTTPS. Esto garantiza que las notificaciones se transmitan de forma segura y que los datos intercambiados estén encriptados, protegiendo la integridad y confidencialidad de la información. Además, HTTPS autentica que la comunicación se realiza con el servidor legítimo, evitando posibles interceptaciones malintencionadas.

A continuación, explicamos cómo configurar notificaciones al crear un pago utilizando nuestros SDKs.

1. En el campo `notification_url`, indica la URL desde la que se recibirán las notificaciones, como se muestra a continuación.

[[[

```node
const preference = new Preference(client);

preference.create({
  body: {
    notification_url: 'https://www.your_url_to_notification.com/',
    items: [
      {
        title: 'Mi producto',
        quantity: 1,
        unit_price: 2000
      }
    ],
  }
})
.then(console.log)
.catch(console.log);

```

]]]

2. Implementa el receptor de notificaciones usando el siguiente código como ejemplo:


Luego de realizar la configuración  necesaria, la notificación Webhook será enviada con formato `JSON`. Puedes ver a continuación un ejemplo de notificación del tópico `payment`, y las descripciones de la información enviada en la tabla debajo.

> WARNING
>
> Importante
>
> Los pagos de prueba, creados con credenciales de prueba, no enviarán notificaciones. La única vía para probar la recepción de notificaciones es mediante la [Configuración a través de Tus integraciones](/developers/es/docs/your-integrations/notifications/webhooks#configuracinatravsdetusintegraciones).

```json
{
 "id": 12345,
 "live_mode": true,
 "type": "payment",
 "date_created": "2015-03-25T10:04:58.396-04:00",
 "user_id": 44444,
 "api_version": "v1",
 "action": "payment.created",
 "data": {
     "id": "999999999"
 }
}
```

| Atributo | Descripción | Ejemplo en el JSON |
| --- | --- | --- |
| **id** | ID de la notificación | `12345` |
| **live_mode** | Indica si la URL ingresada es válida.| `true` |
| **type** | Tipo de notificacion recebida e acuerdo con el tópico previamente seleccionado (payments, mp-connect, subscription, claim, automatic-payments, etc) | `payment` |
| **date_created** | Fecha de creación del recurso notificado | `2015-03-25T10:04:58.396-04:00` |
| **user_id**| Identificador del vendedor | `44444` |
| **api_version** | Valor que indica la versión de la API que envía la notificación | `v1` |
| **action** | Evento notificado, que indica si es una actualización de un recurso o la creación de uno nuevo | `payment.created` |
| **data.id**  | ID del pago, de la orden comercial o del reclamo. | `999999999` |
::::

:::::

Una vez que las notificaciones sean configuradas, consulta las acciones necesarias después de recibir una notificación para informar que las mismas fueron debidamente recibidas:

## Acciones necesarias después de recibir la notificación

Cuando recibes una notificación en tu plataforma, Mercado Pago espera una respuesta para validar que esa recepción fue correcta. Para eso, debes devolver un `HTTP STATUS 200 (OK)` o `201 (CREATED)`.

El tiempo de espera para esa confirmación será de 22 segundos. Si no se envía esta respuesta, el sistema entenderá que la notificación no fue recibida y realizará un nuevo intento de envío cada 15 minutos, hasta que reciba la respuesta. Después del tercer intento, el plazo será prorrogado, pero los envíos continuarán sucediendo.

<pre class="mermaid">
sequenceDiagram
    participant MercadoPago as Mercado Pago
    participant Integrador as Integrador

    MercadoPago->>Integrador: reintento: 1. Demora: 0 minutos
    MercadoPago->>Integrador: reintento: 2. Demora: 15 minutos
    MercadoPago->>Integrador: reintento: 3. Demora: 30 minutos
    MercadoPago->>Integrador: reintento: 4. Demora: 6 horas
    MercadoPago->>Integrador: reintento: 5. Demora: 48 horas
    MercadoPago->>Integrador: reintento: 6. Demora: 96 horas
    MercadoPago->>Integrador: reintento: 7. Demora: 96 horas
    MercadoPago->>Integrador: reintento: 8. Demora: 96 horas
</pre>

Luego de responder la notificación, confirmando su recibimiento, puedes obtener toda la información sobre el evento del tópico `payments` notificado haciendo un GET al endpoint [v1/payments/{id}](/developers/es/reference/payments/_payments_id/get). 

Con esta información podrás realizar las actualizaciones necesarias a tu plataforma, como por ejemplo, actualizar un pago aprobado.

Además, para consultar el estado del evento posterior a la notificación, puedes utilizar los diferentes métodos de nuestros SDKs para realizar la consulta con el ID que fue enviado en la notificación.

[[[

```node
mercadopago.configurations.setAccessToken('ENV_ACCESS_TOKEN');
switch (type) {
  case 'payment':
    const payment = await mercadopago.payment.findById(data.id);
    break;
  case 'plan':
    const plan = await mercadopago.plans.get(data.id);
    break;
  case 'subscription':
    const subscription = await mercadopago.subscriptions.get(data.id);
    break;
  case 'invoice':
    const invoice = await mercadopago.invoices.get(data.id);
    break;
  case 'point_integration_wh':
    // Contiene la informaciòn relacionada a la notificaciòn.
    break;
}
```

]]]