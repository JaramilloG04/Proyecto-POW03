import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conectarDB } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware: Habilitar CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware: permite leer el cuerpo de las peticiones en formato JSON
app.use(express.json());

// Servir archivos estáticos de la interfaz Front-End
app.use(express.static(path.join(__dirname, "../../frontend")));

// Ruta de prueba/salud de la API
app.get("/api/health", (req, res) => {
  res.json({ mensaje: "API de EDU-KT Free funcionando" });
});

// Middleware para rutas inexistentes
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
});
