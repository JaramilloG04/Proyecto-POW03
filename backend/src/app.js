import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conectarDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import tutoriasRoutes from "./routes/tutorias.routes.js";
import solicitudesRoutes from "./routes/solicitudes.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend")));

app.get("/api/health", (req, res) => {
  res.json({ mensaje: "API de EDU-KT Free funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tutorias", tutoriasRoutes);
app.use("/api/solicitudes", solicitudesRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") return res.status(400).json({ mensaje: "El cuerpo JSON no es válido" });
  if (error.type === "entity.too.large") return res.status(413).json({ mensaje: "El cuerpo de la solicitud es demasiado grande" });
  console.error("Error interno:", error);
  return res.status(500).json({ mensaje: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
});
