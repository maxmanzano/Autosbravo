// Funciones auxiliares para leer y escribir archivos en el repositorio de GitHub
// usando la API de Contenidos (Contents API). No requiere librerías externas.

const GITHUB_API = "https://api.github.com";

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Falta la variable de entorno GITHUB_TOKEN en Netlify");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoBase() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!owner || !repo) {
    throw new Error("Faltan GITHUB_OWNER o GITHUB_REPO en Netlify");
  }
  return { owner, repo, branch };
}

// Lee un archivo del repo. Devuelve { content (string, ya decodificado), sha } o null si no existe.
async function getFile(path) {
  const { owner, repo, branch } = repoBase();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${branch}`;

  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error leyendo ${path} de GitHub: ${res.status} ${body}`);
  }

  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { content, sha: json.sha };
}

// Crea o actualiza un archivo en el repo.
// contentString: texto plano (para JSON) o base64 (para imágenes, pasar isBase64=true)
async function putFile(path, contentString, message, sha, isBase64 = false) {
  const { owner, repo, branch } = repoBase();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}`;

  const encodedContent = isBase64
    ? contentString
    : Buffer.from(contentString, "utf-8").toString("base64");

  const body = {
    message,
    content: encodedContent,
    branch,
  };
  if (sha) body.sha = sha; // sha requerido si el archivo ya existe (para actualizar)

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Error escribiendo ${path} en GitHub: ${res.status} ${errBody}`);
  }

  return res.json();
}

module.exports = { getFile, putFile };
