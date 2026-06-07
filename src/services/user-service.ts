import { db } from "../db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export class UserService {
  /**
   * Mendaftarkan user baru ke dalam database.
   * 1. Cek keunikan email.
   * 2. Hash password menggunakan Bun.password.
   * 3. Simpan data user ke database.
   */
  static async registerUser(data: typeof users.$inferInsert) {
    // 1. Cek keunikan email
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      throw new Error("email sudah terdaftar");
    }

    // 2. Hash password menggunakan Bun.password (menggunakan bcrypt secara default)
    const hashedPassword = await Bun.password.hash(data.password);

    // 3. Simpan data user
    await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    return "OK";
  }

  /**
   * Mengautentikasi user dan menghasilkan token sesi baru.
   */
  static async loginUser(data: Pick<typeof users.$inferInsert, "email" | "password">) {
    // 1. Cari user berdasarkan email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user) {
      throw new Error("email atau password salah");
    }

    // 2. Verifikasi password dengan Bun.password.verify
    const isPasswordValid = await Bun.password.verify(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error("email atau password salah");
    }

    // 3. Buat token UUID baru
    const token = crypto.randomUUID();

    // 4. Simpan ke tabel sessions
    await db.insert(sessions).values({
      token,
      userId: user.id,
    });

    return token;
  }
}

