const { verificarToken, tokenDesdeHeader, hashPassword, validarPassword } = require("./utils/adminAuth");
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
      return { statusCode: 403, body: JSON.stringify({ error: "Solo un owner puede resetear contraseñas" }) };
    }

    const { id, password } = JSON.parse(event.body || "{}");
    if (!validarPassword(password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "La contraseña debe tener mínimo 8 caracteres y al menos un número" }),
      };
    }

    const idx = admins.findIndex((a) => a.id === id);
    if (idx === -1) return { statusCode: 404, body: JSON.stringify({ error: "Admin no encontrado" }) };

    admins[idx].passwordHash = hashPassword(password);

    await guardarAdmins(admins, `Resetea contraseña de ${admins[idx].email} (por ${yo.email})`, sha);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
