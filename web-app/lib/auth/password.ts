import { hash, verify } from "@node-rs/argon2";

// Argon2id (default de @node-rs/argon2) en vez de bcrypt — recomendación
// actual de OWASP por ser memory-hard (más resistente a cracking por
// GPU/ASIC). @node-rs/argon2 distribuye binarios nativos precompilados
// (napi-rs), así que no hace falta toolchain de compilación en la máquina
// donde corre `npm install`.
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain);
}

// Hash dummy para comparar contra él cuando el legajo no existe — así
// `authorize()` siempre corre un verify() de duración similar, sin importar
// si el usuario existe o no, y el tiempo de respuesta no delata cuentas
// válidas (mitigación de user enumeration por timing). Se genera una sola
// vez por proceso (no es la password de ninguna cuenta real) y se cachea,
// para no pagar el costo de un hash() extra en cada intento fallido.
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash(`dummy-${Date.now()}-${Math.random()}`);
  }
  return dummyHashPromise;
}

export async function verifyDummyPassword(plain: string): Promise<boolean> {
  const dummyHash = await getDummyHash();
  return verify(dummyHash, plain).catch(() => false);
}
