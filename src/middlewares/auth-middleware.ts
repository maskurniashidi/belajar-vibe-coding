import { Elysia } from "elysia";
import { UserService } from "../services/user-service";

export const authMiddleware = new Elysia()
  .derive({ as: 'scoped' }, async ({ headers }) => {
    const authHeader = headers["authorization"];
    
    // Jika header tidak valid, lemparkan error agar ditangkap oleh onError
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("token tidak valid");
    }
    
    const token = authHeader.substring(7);
    
    // Mengambil user. Jika token salah, UserService akan melempar error "token tidak valid"
    const user = await UserService.getCurrentUser(token);
    
    // Mengirim data ini ke route handler berikutnya
    return { user, token };
  })
  .onError({ as: 'scoped' }, ({ error, set }) => {
    // Penanganan error terpusat untuk masalah autentikasi
    if (error instanceof Error && error.message === "token tidak valid") {
      set.status = 401;
      return { message: "token tidak valid" };
    }

    // Biarkan Elysia menangani validation error (misal jika ada input schema validation di masa depan)
    if ('code' in error && error.code === 'VALIDATION') {
      return;
    }

    // Penanganan error internal server error (500)
    set.status = 500;
    return { message: "Internal server error" };
  });
