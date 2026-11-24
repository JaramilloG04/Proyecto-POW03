import "dotenv/config";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import Usuario from "./models/Usuario.js";
import Tutoria from "./models/Tutoria.js";
import Solicitud from "./models/Solicitud.js";

async function leerJSON(ruta) {
  const contenido = await readFile(new URL(ruta, import.meta.url), "utf-8");
  return JSON.parse(contenido.replace(/^\uFEFF/, ""));
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado a MongoDB Atlas");

  const usuariosData = await leerJSON("../data/usuarios.json");
  const tutoriasData = await leerJSON("../data/tutorias.json");

  await Solicitud.deleteMany();
  await Tutoria.deleteMany();
  await Usuario.deleteMany();

  const usuarios = await Usuario.insertMany(usuariosData);
  const usuarioPorCorreo = Object.fromEntries(usuarios.map((u) => [u.correo, u]));

  const tutorias = tutoriasData.map(({ tutorCorreo, ...resto }) => ({
    ...resto,
    tutor: usuarioPorCorreo[tutorCorreo]._id
  }));
  const tutoriasInsertadas = await Tutoria.insertMany(tutorias);

  const solicitudesIniciales = [
    {
      tutoria: tutoriasInsertadas[0]._id,
      estudiante: usuarioPorCorreo["camilo03jaramillo@edukt.edu.co"]._id,
      tutor: usuarioPorCorreo["pablo02colonia@edukt.edu.co"]._id,
      temaReforzar: "Límites y derivadas",
      mensaje: "¡Hola Pablo! Confirmo nuestra tutoría para repasar límites hoy.",
      horasComprometidas: 1,
      estado: "aceptada"
    }
  ];

  const solicitudes = await Solicitud.insertMany(solicitudesIniciales);

  console.log(
    `Insertados ${usuarios.length} usuarios, ${tutoriasInsertadas.length} tutorías y ${solicitudes.length} solicitudes en edukt_free`
  );
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Error en el seed:", error.message);
  process.exit(1);
});
