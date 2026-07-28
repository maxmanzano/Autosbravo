// Verifica que la petición venga de un usuario logueado vía Netlify Identity.
// Netlify decodifica el JWT automáticamente y lo pone en context.clientContext.user
// cuando el front-end manda el header "Authorization: Bearer <token>".

function requireUser(context) {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    const err = new Error("No autorizado. Inicia sesión en el panel.");
    err.statusCode = 401;
    throw err;
  }
  return user;
}

module.exports = { requireUser };
