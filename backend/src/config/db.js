import mongoose from "mongoose";

export async function conectarDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("La variable de entorno MONGODB_URI no está definida");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error.message);
    process.exit(1);
  }
}
