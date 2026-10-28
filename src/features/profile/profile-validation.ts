export type EditableProfile = {
  nombre: string;
  telefono: string;
  descripcion: string;
};

const avatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 2 * 1024 * 1024;

export function validateEditableProfile(profile: EditableProfile): string | null {
  const name = profile.nombre.trim();
  if (!name) return "Escribe tu nombre.";
  if (name.length > 120) return "El nombre no puede superar los 120 caracteres.";

  const phone = profile.telefono.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (phone.length < 7 || phone.length > 25 || !/^[+0-9() -]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      return "Ingresa un teléfono válido de 7 a 15 dígitos.";
    }
  }

  if (profile.descripcion.trim().length > 280) return "La descripción no puede superar los 280 caracteres.";
  return null;
}

export function validateAvatarFile(file: File): string | null {
  if (!avatarTypes.has(file.type)) return "La foto debe ser JPEG, PNG o WebP.";
  if (file.size === 0 || file.size > maxAvatarBytes) return "La foto debe pesar más de 0 y como máximo 2 MB.";
  return null;
}

export async function validateAvatarSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
