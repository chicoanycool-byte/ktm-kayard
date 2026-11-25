// Bandera del rol de consulta para el lado del navegador. La pone Layout al pintar,
// y el cliente de Supabase la lee para no dejar pasar ninguna escritura.
let activo = false;
export const marcarSoloLectura = (v: boolean) => { activo = v; };
export const enSoloLectura = () => activo;
