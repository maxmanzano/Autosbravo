const { hashPassword, validarPassword } = require("./utils/adminAuth");
const { leerAdmins, guardarAdmins, buscarPorEmail, contarOwners } = require("./utils/adminStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { email, password, setupToken } = JSON.parse(event.body || "{}");

    if (!setupToken || setupToken !== process.env.SETUP_TOKEN) {
      return { statusCode: 403, body: JSON.stringify({ error: "Token de configuración inválido" }) };
    }
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta email o password" }) };
    }
    if (!validarPassword(password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "La contraseña debe tener mínimo 8 caracteres y al menos un número" }),
      };
    }

    const { admins, sha } = await leerAdmins();

    if (contarOwners(admins) > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "Ya existe un owner. Da de alta nuevos administradores desde el panel, no por aquí.",
        }),
      };
    }
    if (buscarPorEmail(admins, email)) {
      return { statusCode: 409, body: JSON.stringify({ error: "Admin ya existe con ese email" }) };
    }

    const nuevo = {
      id: `admin-${Date.now()}`,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: "owner",
      activo: true,
      creadoEn: new Date().toISOString(),
    };
    admins.push(nuevo);

    await guardarAdmins(admins, `Crea al primer owner (${nuevo.email})`, sha);

    return { statusCode: 200, body: JSON.stringify({ ok: true, message: "Owner creado. Ya puedes iniciar sesión." }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
