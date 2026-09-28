const ML_API = "https://api.mercadolibre.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { code, redirectUri } = JSON.parse(event.body || "{}");
    if (!code) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el código de autorización" }) };
    }

    const client_id = process.env.ML_CLIENT_ID;
    const client_secret = process.env.ML_CLIENT_SECRET;
    if (!client_id || !client_secret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Faltan ML_CLIENT_ID o ML_CLIENT_SECRET en las variables de entorno de Netlify" }),
      };
    }

    const res = await fetch(`${ML_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id,
        client_secret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
