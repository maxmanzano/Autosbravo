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
    // auto.fotos = arreglo de rutas ya existentes (tras quitar las que el usuario borró)
    // photosNuevas = arreglo de { data (base64), filename } de fotos nuevas a subir
    const { auto, photosNuevas } = payload;

    if (!auto || !auto.marca || !auto.modelo || !auto.precio) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan campos obligatorios (marca, modelo, precio)" }),
      };
    }

    // 1. Subimos cada foto nueva a /fotos y juntamos las rutas
    const fotosExistentes = Array.isArray(auto.fotos) ? auto.fotos : (auto.foto ? [auto.foto] : []);
    const fotosSubidas = [];

    if (Array.isArray(photosNuevas)) {
      for (const foto of photosNuevas) {
        if (!foto || !foto.data || !foto.filename) continue;
        const rutaFoto = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${foto.filename.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        await putFile(
          rutaFoto,
          foto.data,
          `Agrega foto ${rutaFoto} (por ${user.email})`,
          null,
          true // es base64 (imagen)
        );
        fotosSubidas.push(rutaFoto);
      }
    }

    const fotosFinal = [...fotosExistentes, ...fotosSubidas];

    // 2. Leemos el catálogo actual
    const current = await getFile(AUTOS_PATH);
    const autos = current ? JSON.parse(current.content) : [];

    // 3. Insertamos o actualizamos el auto
    const isEdit = Boolean(auto.id);
    let autoFinal;
    const { fotos: _f, foto: _fo, ...autoSinFotos } = auto;

    if (isEdit) {
      const idx = autos.findIndex((a) => a.id === auto.id);
      if (idx === -1) {
        return { statusCode: 404, body: JSON.stringify({ error: "Auto no encontrado" }) };
      }
      autoFinal = { ...autos[idx], ...autoSinFotos, fotos: fotosFinal, foto: fotosFinal[0] || null };
      autos[idx] = autoFinal;
    } else {
      autoFinal = {
        ...autoSinFotos,
        id: `auto-${Date.now()}`,
        fotos: fotosFinal,
        foto: fotosFinal[0] || null,
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
