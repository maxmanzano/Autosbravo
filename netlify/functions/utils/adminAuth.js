// Sistema de autenticación propio para reemplazar Netlify Identity (cuyos
// correos de invitación/recuperación fallaban). Usa solo el módulo "crypto"
// nativo de Node — no requiere instalar ningún paquete npm, así que Netlify
// no necesita correr "npm install" para las funciones (igual que hasta ahora).

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Contraseñas: scrypt (nativo de Node, tan seguro como bcrypt para este caso)
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const hashIntento = crypto.scryptSync(password, salt, 64).toString("hex");
  const bufA = Buffer.from(hash, "hex");
  const bufB = Buffer.from(hashIntento, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function validarPassword(password) {
  return typeof password === "string" && password.length >= 8 && /\d/.test(password);
}

// ---------------------------------------------------------------------------
// Tokens de sesión: HMAC-SHA256 firmado con ADMIN_JWT_SECRET (variable de
// entorno). Formato: base64url(payload).base64url(firma). Expiran en 12h.
// ---------------------------------------------------------------------------
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

function b64urlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function b64urlDecode(str) {
  return JSON.parse(Buffer.from(str, "base64url").toString("utf-8"));
}

function firmar(payloadB64) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno ADMIN_JWT_SECRET en Netlify");
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function crearToken({ id, email, role }) {
  const payload = { id, email, role, exp: Date.now() + DURACION_MS };
  const payloadB64 = b64urlEncode(payload);
  const firma = firmar(payloadB64);
  return `${payloadB64}.${firma}`;
}

function verificarToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, firma] = token.split(".");
  const firmaEsperada = firmar(payloadB64);
  const bufA = Buffer.from(firma || "");
  const bufB = Buffer.from(firmaEsperada);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;

  const payload = b64urlDecode(payloadB64);
  if (payload.exp < Date.now()) return null;
  return payload; // { id, email, role, exp }
}

function tokenDesdeHeader(event) {
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  validarPassword,
  crearToken,
  verificarToken,
  tokenDesdeHeader,
};
