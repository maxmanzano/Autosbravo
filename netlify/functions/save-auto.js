const { getFile, putFile } = require("./utils/github");
const { requireUser } = require("./utils/auth");

const AUTOS_PATH = "data/autos.json";

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const user = requireUser(context);
    const payload = JSON.parse(event.body);
    const { auto, photoBase64, photoFilename } = payload;

    if (!auto || !auto.marca || !auto.modelo || !auto.precio) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan campos obligatorios (marca, modelo, precio)" }),
      };
    }

    // 1. Si viene una foto nueva, la subimos primero a /fotos
    let fotoPath = auto.foto || null;
    if (photoBase64 && photoFilename) {
      fotoPath = `fotos/${Date.now()}-${photoFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      await putFile(
        fotoPath,
        photoBase64,
        `Agrega foto ${fotoPath} (por ${user.email})`,
        null,
        true // es base64 (imagen)
      );
    }

    // 2. Leemos el catálogo actual
    const current = await getFile(AUTOS_PATH);
    const autos = current ? JSON.parse(current.content) : [];

    // 3. Insertamos o actualizamos el auto
    const isEdit = Boolean(auto.id);
    let autoFinal;

    if (isEdit) {
      const idx = autos.findIndex((a) => a.id === auto.id);
      if (idx === -1) {
        return { statusCode: 404, body: JSON.stringify({ error: "Auto no encontrado" }) };
      }
      autoFinal = { ...autos[idx], ...auto, foto: fotoPath || autos[idx].foto };
      autos[idx] = autoFinal;
    } else {
      autoFinal = {
        ...auto,
        id: `auto-${Date.now()}`,
        foto: fotoPath,
        disponible: auto.disponible !== false,
      };
      autos.push(autoFinal);
    }

    // 4. Guardamos el JSON actualizado en GitHub
    await putFile(
      AUTOS_PATH,
      JSON.stringify(autos, null, 2),
      `${isEdit ? "Edita" : "Agrega"} auto ${autoFinal.marca} ${autoFinal.modelo} (por ${user.email})`,
      current ? current.sha : null
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, auto: autoFinal }),
    };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, body: JSON.stringify({ error: err.message }) };
  }
};
