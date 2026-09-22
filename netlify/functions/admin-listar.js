const { verificarToken, tokenDesdeHeader } = require("./utils/adminAuth");
const { leerAdmins, buscarPorEmail } = require("./utils/adminStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const payload = verificarToken(tokenDesdeHeader(event));
    if (!payload) return { statusCode: 401, body: JSON.stringify({ error: "Token invalido o expirado" }) };

    const { admins } = await leerAdmins();
    const yo = buscarPorEmail(admins, payload.email);
    if (!yo || yo.activo === false) {
      return { statusCode: 401, body: JSON.stringify({ error: "No autorizado" }) };
    }
    if (yo.role !== "owner") {
      return { statusCode: 403, body: JSON.stringify({ error: "Solo un owner puede ver esta lista" }) };
    }

    const listaSinPassword = admins.map(({ passwordHash, ...resto }) => resto);
    return { statusCode: 200, body: JSON.stringify({ admins: listaSinPassword }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
