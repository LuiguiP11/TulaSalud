// api/gemini-proxy.js

// Importa 'node-fetch' para hacer solicitudes HTTP.
// Vercel usa Node.js en sus funciones, así que necesitamos una forma de hacer 'fetch'.
// En entornos más nuevos de Node.js, 'fetch' podría ser nativo, pero 'node-fetch' asegura compatibilidad.
const fetch = require('node-fetch');

// Esta es la forma estándar de exportar una función sin servidor en Vercel.
// Recibe un objeto 'req' (request - la solicitud que llega) y un objeto 'res' (response - la respuesta que envías).
export default async function handler(req, res) {
    // 1. Verificar el Método HTTP:
    // Aseguramos que solo las solicitudes POST sean procesadas, ya que son para enviar datos.
    if (req.method !== 'POST') {
        // Si no es POST, enviamos un error 405 (Método no permitido).
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 2. Obtener los Datos de la Solicitud del Frontend:
        // Vercel automáticamente parsea el cuerpo JSON de la solicitud y lo pone en `req.body`.
        // Extraemos el `model` (el modelo de IA a usar) y el `payload` (el contenido del prompt, etc.).
        const { model, payload } = req.body;

        // 3. Acceder a la Clave de la API (¡El paso de seguridad crítico!):
        // `process.env` es donde Node.js guarda las variables de entorno.
        // `GEMINI_API_KEY` es el nombre de la variable que configuraste en el panel de Vercel.
        const apiKey = process.env.GEMINI_API_KEY;

        // 4. Validar la Clave API:
        // Si la clave no está configurada, devolvemos un error 500 (Error interno del servidor).
        if (!apiKey) {
            console.error("GEMINI_API_KEY no está configurada como variable de entorno en Vercel.");
            return res.status(500).json({ message: 'Server configuration error: API key not set.' });
        }

        // 5. Construir la URL para la API de Gemini:
        // Usamos el `model` y la `apiKey` para crear la URL completa para la solicitud a Gemini.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log(`[Vercel Function] Reenviando solicitud a Gemini: ${apiUrl}`);

        // 6. Realizar la Solicitud a la API de Gemini:
        // Hacemos la llamada real a la API de Gemini con el payload (prompt) recibido del frontend.
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload), // El payload (prompt) se reenvía tal cual.
        });

        // 7. Manejar Posibles Errores de la API de Gemini:
        // Si la respuesta de Gemini no es exitosa (ej. clave API inválida, error del modelo),
        // capturamos el error y lo reenviamos al frontend con el código de estado apropiado.
        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error(`[Vercel Function] Error de la API de Gemini (${geminiResponse.status}): ${errorBody}`);
            return res.status(geminiResponse.status).json({ message: `Error de la API de Gemini: ${errorBody}` });
        }

        // 8. Leer y Devolver la Respuesta de Gemini:
        // Si todo fue bien, obtenemos el resultado JSON de Gemini.
        const result = await geminiResponse.json();
        console.log("[Vercel Function] Respuesta de Gemini recibida:", result);

        // Devolvemos el resultado JSON de Gemini directamente a tu frontend con un estado 200 (OK).
        return res.status(200).json(result);

    } catch (error) {
        // 9. Manejo de Errores Internos de la Función:
        // Si ocurre cualquier otro error inesperado dentro de esta función (ej. al parsear JSON),
        // lo registramos y devolvemos un error 500.
        console.error('[Vercel Function] Error al procesar la solicitud:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
