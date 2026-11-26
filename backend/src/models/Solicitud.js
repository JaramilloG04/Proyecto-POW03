import mongoose from "mongoose";

const solicitudSchema = new mongoose.Schema(
  {
    tutoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutoria",
      required: [true, "La tutoría solicitada es obligatoria"]
    },
    estudiante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El estudiante solicitante es obligatorio"]
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El tutor destinatario es obligatorio"]
    },
    temaReforzar: {
      type: String,
      required: [true, "El tema que deseas reforzar es obligatorio"],
      trim: true
    },
    mensaje: {
      type: String,
      required: [true, "El mensaje para el tutor es obligatorio"],
      minlength: [10, "El mensaje debe tener al menos 10 caracteres"],
      trim: true
    },
    horasComprometidas: {
      type: Number,
      default: 1,
      min: 1
    },
    estado: {
      type: String,
      enum: ["pendiente", "aceptada", "completada", "rechazada"],
      default: "pendiente"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Solicitud", solicitudSchema, "solicitudes");
