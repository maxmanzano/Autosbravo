const { getFile, putFile } = require("./github");

const ADMINS_PATH = "data/admins.json";

async function leerAdmins() {
  const current = await getFile(ADMINS_PATH);
  const admins = current ? JSON.parse(current.content) : [];
  return { admins, sha: current ? current.sha : null };
}

async function guardarAdmins(admins, mensaje, sha) {
  await putFile(ADMINS_PATH, JSON.stringify(admins, null, 2), mensaje, sha);
}

function buscarPorEmail(admins, email) {
  return admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase().trim()) || null;
}

function contarOwners(admins) {
  return admins.filter((a) => a.role === "owner" && a.activo !== false).length;
}

module.exports = { leerAdmins, guardarAdmins, buscarPorEmail, contarOwners };
