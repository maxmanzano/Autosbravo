const { requireUser } = require("./utils/auth");

const ML_API = "https://api.mercadolibre.com";

// Los access tokens de MercadoLibre expiran cada 6 horas, así que en cada
// llamada pedimos uno nuevo usando el refresh_token (que sí es de larga duración).
async function getAccessToken() {
  const client_id = process.env.ML_CLIENT_ID;
  const client_secret = process.env.ML_CLIENT_SECRET;
  const refresh_token = process.env.ML_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      "Faltan ML_CLIENT_ID, ML_CLIENT_SECRET o ML_REFRESH_TOKEN en Netlify"
    );
  }

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id,
      client_secret,
      refresh_token,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error obteniendo access token de MercadoLibre: ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Traduce nuestro objeto "auto" al formato que espera el endpoint /items de MercadoLibre.
// OJO: los campos de category_id y attribute IDs dependen del sitio (MLM, MCO, etc.)
// y deben ajustarse según la categoría real de vehículos usados de tu país.
function buildMercadoLibreItem(auto) {
  return {
    title: `${auto.marca} ${auto.modelo} ${auto.anio}`.slice(0, 60),
    category_id: process.env.ML_CATEGORY_ID_AUTOS, // ej. MLM1744 para "Autos y Camionetas" en México
    price: auto.precio,
    currency_id: process.env.ML_CURRENCY_ID || "MXN",
    available_quantity: 1,
    buying_mode: "classified", // los vehículos usados se publican como "clasificados"
    condition: "used",
    listing_type_id: process.env.ML_LISTING_TYPE || "gold",
    pictures: auto.foto_url_publica ? [{ source: auto.foto_url_publica }] : [],
    attributes: [
      { id: "BRAND", value_name: auto.marca },
      { id: "MODEL", value_name: auto.modelo },
      { id: "VEHICLE_YEAR", value_name: String(auto.anio) },
      { id: "KILOMETERS", value_name: String(auto.kilometraje) },
    ],
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    requireUser(context);
    const { auto } = JSON.parse(event.body);

    if (!auto.foto_url_publica) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "MercadoLibre requiere una URL pública de la foto (no un archivo local). " +
            "Usa la URL final del sitio publicado (ej. https://tudominio.com/fotos/xxx.jpg).",
        }),
      };
    }

    const accessToken = await getAccessToken();
    const item = buildMercadoLibreItem(auto);

    const isUpdate = Boolean(auto.ml_item_id);
    const url = isUpdate
      ? `${ML_API}/items/${auto.ml_item_id}`
      : `${ML_API}/items`;

    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });

    const resultado = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: resultado }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, ml_item_id: resultado.id, ml_permalink: resultado.permalink }),
    };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, body: JSON.stringify({ error: err.message }) };
  }
};
