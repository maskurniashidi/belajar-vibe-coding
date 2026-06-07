import { Elysia, t } from "elysia";
import { UserService } from "../services/user-service";
import { authMiddleware } from "../middlewares/auth-middleware";


export const userRoutes = new Elysia({ prefix: "/api" })
  .post("/users", async ({ body, set }) => {
    try {
      const result = await UserService.registerUser(body);
      return { data: result };
    } catch (error: any) {
      if (
        error.message === "email sudah terdaftar" ||
        (error.message && error.message.includes("Duplicate entry")) ||
        (error.cause && error.cause.message && error.cause.message.includes("Duplicate entry")) ||
        (error.cause && error.cause.code === "ER_DUP_ENTRY")
      ) {
        set.status = 400;
        return { message: "email sudah terdaftar" };
      }
      set.status = 500;
      return { message: "Internal server error" };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      email: t.String({ format: 'email', maxLength: 255 }),
      password: t.String({ minLength: 6, maxLength: 255 }),
    })
  })
  .post("/users/login", async ({ body, set }) => {
    try {
      const token = await UserService.loginUser(body);
      return { token };
    } catch (error: any) {
      if (error.message === "email atau password salah") {
        set.status = 400;
        return { message: error.message };
      }
      set.status = 500;
      return { message: "Internal server error" };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email', maxLength: 255 }),
      password: t.String({ minLength: 6, maxLength: 255 }),
    })
  })
  .use(authMiddleware)
  .get("/users", ({ user }) => {
    return { data: user };
  })
  .delete("/users/logout", async ({ token }) => {
    await UserService.logoutUser(token);
    return { message: "Logout berhasil" };
  });


