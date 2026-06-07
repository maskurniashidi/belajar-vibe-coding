import { db } from "../db";
import { users } from "../db/schema";
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
}
