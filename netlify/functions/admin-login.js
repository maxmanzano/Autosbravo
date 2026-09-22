const { verifyPassword, crearToken } = require("./utils/adminAuth");
const { leerAdmins, buscarPorEmail } = require("./utils/adminStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { email, password } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta email o password" }) };
    }

    const { admins } = await leerAdmins();
    const admin = buscarPorEmail(admins, email);

    if (!admin || admin.activo === false || !verifyPassword(password, admin.passwordHash)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Credenciales inválidas" }) };
    }

    const token = crearToken({ id: admin.id, email: admin.email, role: admin.role });

    return {
      statusCode: 200,
      body: JSON.stringify({ token, info: { email: admin.email, role: admin.role } }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
