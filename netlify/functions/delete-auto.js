const { getFile, putFile } = require("./utils/github");
const { verificarToken, tokenDesdeHeader } = require("./utils/adminAuth");

const AUTOS_PATH = "data/autos.json";

function requireUser(event) {
  const payload = verificarToken(tokenDesdeHeader(event));
  if (!payload) {
    const err = new Error("No autorizado. Inicia sesión en el panel.");
    err.statusCode = 401;
    throw err;
  }
  return payload;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const user = requireUser(event);
    const { id } = JSON.parse(event.body);
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el id del auto" }) };
    }

    const current = await getFile(AUTOS_PATH);
    if (!current) {
      return { statusCode: 404, body: JSON.stringify({ error: "Catálogo no encontrado" }) };
    }

    const autos = JSON.parse(current.content);
    const nuevos = autos.filter((a) => a.id !== id);

    if (nuevos.length === autos.length) {
      return { statusCode: 404, body: JSON.stringify({ error: "Auto no encontrado" }) };
    }

    await putFile(
      AUTOS_PATH,
      JSON.stringify(nuevos, null, 2),
      `Elimina auto ${id} (por ${user.email})`,
      current.sha
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, body: JSON.stringify({ error: err.message }) };
  }
};
