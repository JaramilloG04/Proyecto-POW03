import "dotenv/config";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import Usuario from "./models/Usuario.js";
import Tutoria from "./models/Tutoria.js";
import Solicitud from "./models/Solicitud.js";

async function leerJSON(ruta) {
  const contenido = await readFile(new URL(ruta, import.meta.url), "utf-8");
  return JSON.parse(contenido);
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
      estudiante: usuarioPorCorreo["juan.jaramillo@usc.edu.co"]._id,
      tutor: usuarioPorCorreo["laura.martinez@usc.edu.co"]._id,
      temaReforzar: "Límites y derivadas",
      mensaje: "¡Hola! Confirmo nuestra tutoría para repasar límites trigonométricos hoy.",
      horasComprometidas: 1,
      estado: "aceptada"
    },
    {
      tutoria: tutoriasInsertadas[1]._id,
      estudiante: usuarioPorCorreo["sofia.rios@usc.edu.co"]._id,
      tutor: usuarioPorCorreo["david.velasco@usc.edu.co"]._id,
      temaReforzar: "Maquetación con Flexbox y Grid",
      mensaje: "Hola David, necesito apoyo con el diseño responsivo de mi proyecto web.",
      horasComprometidas: 1,
      estado: "pendiente"
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
