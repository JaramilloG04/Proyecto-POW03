import mongoose from "mongoose";

const tutoriaSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título de la tutoría es obligatorio"],
      trim: true
    },
    area: {
      type: String,
      required: [true, "El área de conocimiento es obligatoria"],
      trim: true
    },
    descripcion: {
      type: String,
      required: [true, "La descripción de la tutoría es obligatoria"],
      trim: true
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El tutor es obligatorio"]
    },
    horario: {
      type: String,
      required: [true, "El horario disponible es obligatorio"],
      trim: true
    },
    modalidad: {
      type: String,
      enum: ["Virtual", "Presencial", "Híbrida"],
      default: "Virtual"
    },
    duracionHoras: {
      type: Number,
      default: 1,
      min: 1,
      max: 4
    },
    cuposDisponibles: {
      type: Number,
      default: 5,
      min: 0
    },
    estado: {
      type: String,
      enum: ["disponible", "agendada", "completada", "cancelada"],
      default: "disponible"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Tutoria", tutoriaSchema, "tutorias");
