import { Elysia, t } from "elysia";
import { UserService } from "../services/user-service";

export const userRoutes = new Elysia({ prefix: "/api" })
  .post("/users", async ({ body, set }) => {
    try {
      const result = await UserService.registerUser(body);
      return { data: result };
    } catch (error: any) {
      if (error.message === "email sudah terdaftar") {
        set.status = 400;
        return { message: error.message };
      }
      set.status = 500;
      return { message: "Internal server error" };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String(),
      password: t.String({ minLength: 6 }),
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
      email: t.String(),
      password: t.String({ minLength: 6 }),
    })
  })
  .get("/users", async ({ headers, set }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return { message: "token tidak valid" };
    }

    const token = authHeader.substring(7);

    try {
      const user = await UserService.getCurrentUser(token);
      return { data: user };
    } catch (error: any) {
      if (error.message === "token tidak valid") {
        set.status = 401;
        return { message: "token tidak valid" };
      }
      set.status = 500;
      return { message: "Internal server error" };
    }
  })
  .delete("/users/logout", async ({ headers, set }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return { message: "token tidak valid" };
    }

    const token = authHeader.substring(7);

    try {
      await UserService.logoutUser(token);
      return { message: "Logout berhasil" };
    } catch (error: any) {
      if (error.message === "token tidak valid") {
        set.status = 401;
        return { message: "token tidak valid" };
      }
      set.status = 500;
      return { message: "Internal server error" };
    }
  });


