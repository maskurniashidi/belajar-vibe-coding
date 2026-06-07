import { describe, it, expect, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("User API Integration Tests", () => {
  beforeEach(async () => {
    // Sesudah / Sebelum skenario, hapus datanya terlebih dahulu agar konsisten
    // Hapus sessions dulu karena foreign key references ke users
    await db.delete(sessions);
    await db.delete(users);
  });

  describe("POST /api/users - Registrasi User", () => {
    it("harus berhasil registrasi dengan payload valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json() as any;
      expect(json).toEqual({ data: "OK" });

      // Verifikasi data tersimpan di database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "test@example.com"))
        .limit(1);
      
      expect(dbUser).toBeDefined();
      if (!dbUser) {
        throw new Error("dbUser is undefined");
      }
      expect(dbUser.name).toBe("Test User");
      expect(dbUser.email).toBe("test@example.com");
      // Password harus ter-hash
      expect(dbUser.password).not.toBe("password123");
    });

    it("harus gagal registrasi jika email sudah terdaftar", async () => {
      // Daftarkan user pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 1",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      // Coba daftarkan user kedua dengan email yang sama
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User 2",
            email: "duplicate@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "email sudah terdaftar" });
    });

    it("harus gagal jika format email salah", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "bukan_email",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("harus gagal jika password terlalu pendek (kurang dari 6 karakter)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "short@example.com",
            password: "12345",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("harus gagal jika payload tidak lengkap (tanpa name)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "incomplete@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });
  });

  describe("POST /api/users/login - Login User", () => {
    beforeEach(async () => {
      // Registrasikan user default untuk pengujian login
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            email: "login@example.com",
            password: "password123",
          }),
        })
      );
      expect(response.status).toBe(200);
    });

    it("harus berhasil login dengan email & password yang cocok", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json() as any;
      expect(json.token).toBeDefined();
      expect(typeof json.token).toBe("string");

      // Verifikasi sesi tersimpan di database
      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, json.token))
        .limit(1);
      
      expect(dbSession).toBeDefined();
    });

    it("harus gagal login jika password salah", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
            password: "wrongpassword",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "email atau password salah" });
    });

    it("harus gagal login jika email tidak terdaftar", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "notfound@example.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "email atau password salah" });
    });

    it("harus gagal login jika format payload salah (tanpa password)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "login@example.com",
          }),
        })
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/users - Get Current User", () => {
    let validToken: string;

    beforeEach(async () => {
      // Registrasi user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Profile User",
            email: "profile@example.com",
            password: "password123",
          }),
        })
      );

      // Login untuk dapat token
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "profile@example.com",
            password: "password123",
          }),
        })
      );
      const json = await response.json() as any;
      validToken = json.token;
    });

    it("harus berhasil mengambil profil jika mengirimkan token valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json() as any;
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("Profile User");
      expect(json.data.email).toBe("profile@example.com");
      expect(json.data.id).toBeDefined();
    });

    it("harus gagal mengambil profil jika token tidak valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "GET",
          headers: {
            "Authorization": "Bearer token_ngawur",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "token tidak valid" });
    });

    it("harus gagal mengambil profil jika tidak mengirimkan token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "GET",
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "token tidak valid" });
    });
  });

  describe("DELETE /api/users/logout - Logout User", () => {
    let validToken: string;

    beforeEach(async () => {
      // Registrasi user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Logout User",
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );

      // Login untuk dapat token
      const response = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "logout@example.com",
            password: "password123",
          }),
        })
      );
      const json = await response.json() as any;
      validToken = json.token;
    });

    it("harus berhasil logout dengan token valid dan menghapus sesi", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "Logout berhasil" });

      // Bonus: Uji coba memanggil API Get Current User menggunakan token yang baru saja dilogout
      const profileResponse = await app.handle(
        new Request("http://localhost/api/users", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${validToken}`,
          },
        })
      );
      expect(profileResponse.status).toBe(401);
      const profileJson = await profileResponse.json() as any;
      expect(profileJson).toEqual({ message: "token tidak valid" });
    });

    it("harus gagal logout jika token tidak valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer token_ngawur",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "token tidak valid" });
    });

    it("harus gagal logout jika tidak mengirimkan token", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json() as any;
      expect(json).toEqual({ message: "token tidak valid" });
    });
  });
});
