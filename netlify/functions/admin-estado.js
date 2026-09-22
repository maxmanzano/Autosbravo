const { verificarToken, tokenDesdeHeader } = require("./utils/adminAuth");
const { leerAdmins, guardarAdmins, buscarPorEmail } = require("./utils/adminStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const payload = verificarToken(tokenDesdeHeader(event));
    if (!payload) return { statusCode: 401, body: JSON.stringify({ error: "Token invalido o expirado" }) };

    const { admins, sha } = await leerAdmins();
    const yo = buscarPorEmail(admins, payload.email);
    if (!yo || yo.activo === false) {
      return { statusCode: 401, body: JSON.stringify({ error: "No autorizado" }) };
    }
    if (yo.role !== "owner") {
      return { statusCode: 403, body: JSON.stringify({ error: "Solo un owner puede cambiar el estado de administradores" }) };
    }

    const { id, activo } = JSON.parse(event.body || "{}");
    if (String(id) === String(yo.id)) {
      return { statusCode: 400, body: JSON.stringify({ error: "No puedes deshabilitarte a ti mismo" }) };
    }

    const idx = admins.findIndex((a) => a.id === id);
    if (idx === -1) return { statusCode: 404, body: JSON.stringify({ error: "Admin no encontrado" }) };

    admins[idx].activo = Boolean(activo);

    await guardarAdmins(
      admins,
      `${activo ? "Habilita" : "Deshabilita"} a ${admins[idx].email} (por ${yo.email})`,
      sha
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
