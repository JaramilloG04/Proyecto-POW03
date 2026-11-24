import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema(
  {
    entraId: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    nombre: {
      type: String,
      required: [true, "El nombre completo es obligatorio"],
      trim: true
    },
    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true
    },
    rol: {
      type: String,
      enum: {
        values: ["estudiante", "tutor", "ambos", "admin"],
        message: "El rol debe ser estudiante, tutor, ambos o admin"
      },
      default: "estudiante"
    },
    programa: {
      type: String,
      trim: true,
      default: ""
    },
    institucion: {
      type: String,
      trim: true,
      default: "Universidad Santiago de Cali"
    },
    temasCompartir: {
      type: [String],
      default: []
    },
    temasAprender: {
      type: [String],
      default: []
    },
    biografia: {
      type: String,
      trim: true,
      default: ""
    },
    disponibilidad: {
      type: [String],
      default: []
    },
    bancoHoras: {
      horasOfrecidas: { type: Number, default: 0, min: 0 },
      horasRecibidas: { type: Number, default: 0, min: 0 },
      saldoHoras: { type: Number, default: 2, min: 0 }
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Usuario", usuarioSchema, "usuarios");
