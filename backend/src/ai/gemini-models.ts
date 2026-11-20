// Cadena de fallback compartida: Google retira modelos Flash con frecuencia.
// Si el principal devuelve 404 (retirado) o 503 (saturado), se prueba el siguiente.
export const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
