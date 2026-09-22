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
      return { statusCode: 403, body: JSON.stringify({ error: "Solo un owner puede crear administradores" }) };
    }

    const { email, password, role } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta email o password" }) };
    }
    if (!validarPassword(password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "La contraseña debe tener mínimo 8 caracteres y al menos un número" }),
      };
    }
    if (role && !["owner", "operador"].includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Rol inválido" }) };
    }
    if (buscarPorEmail(admins, email)) {
      return { statusCode: 409, body: JSON.stringify({ error: "Admin ya existe con ese email" }) };
    }

    const nuevo = {
      id: `admin-${Date.now()}`,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: role || "operador",
      activo: true,
      creadoEn: new Date().toISOString(),
      creadoPor: yo.email,
    };
    admins.push(nuevo);

    await guardarAdmins(admins, `Crea admin ${nuevo.email} (por ${yo.email})`, sha);

    const { passwordHash, ...nuevoSinPassword } = nuevo;
    return { statusCode: 200, body: JSON.stringify({ ok: true, admin: nuevoSinPassword }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
