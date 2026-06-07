# Belajar Vibe Coding (User Management API)

Proyek ini adalah aplikasi API manajemen pengguna sederhana yang dibangun menggunakan runtime **Bun**, framework **ElysiaJS**, dan ORM **Drizzle** yang terhubung ke database **MySQL**. Aplikasi ini menyediakan fitur registrasi, autentikasi berbasis token (session), profil user, dan logout.

---

## 🚀 Teknologi yang Digunakan

- **Runtime**: [Bun](https://bun.sh/) (All-in-one JavaScript runtime & package manager)
- **Framework API**: [ElysiaJS](https://elysiajs.com/) (Framework web berkinerja tinggi yang dioptimalkan untuk Bun)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (ORM bertipe aman & ringan untuk SQL)
- **Database**: [MySQL](https://www.mysql.com/) (Penyimpanan database relasional)
- **Testing**: Bun Test (Test runner bawaan dari Bun)

---

## 🏛️ Arsitektur Aplikasi

Aplikasi ini menggunakan pola arsitektur berlapis (layered architecture) yang terbagi menjadi komponen-komponen berikut:

1. **Entrypoint (`src/index.ts`)**: Titik awal eksekusi aplikasi yang memuat rute dan menjalankan server.
2. **Routes/Controllers (`src/routes/user-route.ts`)**: Mendefinisikan endpoint API, menangani validasi skema payload (menggunakan parser internal Elysia `t`), serta mengarahkan permintaan ke Service Layer.
3. **Service Layer (`src/services/user-service.ts`)**: Berisi logika bisnis inti (hashing password, validasi email unik, pembuatan token UUID, dan pencarian session).
4. **Database & Schema Layer (`src/db/`)**:
   - `schema.ts`: Skema database menggunakan Drizzle ORM.
   - `index.ts`: Inisialisasi pool koneksi MySQL menggunakan `mysql2`.
5. **Middlewares (`src/middlewares/auth-middleware.ts`)**: Middleware autentikasi menggunakan fitur `.derive()` dan `.onError()` Elysia untuk validasi token terpusat.

---

## 📊 Skema Database

Terdapat 2 tabel utama di database `belajar_vibe_coding`:

### 1. Tabel `users`
Menyimpan informasi profil pengguna dan password terenkripsi.
- `id` (bigint, Primary Key, Auto Increment)
- `name` (varchar 255, Not Null)
- `email` (varchar 255, Unique, Not Null)
- `password` (varchar 255, Not Null)
- `created_at` (timestamp, Default: Now)

### 2. Tabel `sessions`
Menyimpan token sesi aktif untuk autentikasi.
- `id` (bigint, Primary Key, Auto Increment)
- `token` (varchar 255, Not Null)
- `user_id` (bigint, Foreign Key references `users.id`)
- `created_at` (timestamp, Default: Now)

---

## 🔌 API yang Tersedia

### 1. Registrasi User
- **Endpoint**: `POST /api/users`
- **Autentikasi**: Public (Tidak butuh token)
- **Payload**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Respons (200 OK)**:
  ```json
  {
    "data": "OK"
  }
  ```

### 2. Login User
- **Endpoint**: `POST /api/users/login`
- **Autentikasi**: Public
- **Payload**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Respons (200 OK)**:
  ```json
  {
    "token": "d3b07384-d113-4956-a5db-2158561858a7"
  }
  ```

### 3. Get Current User Profile
- **Endpoint**: `GET /api/users`
- **Autentikasi**: Protected (Butuh token)
- **Header**: `Authorization: Bearer <token>`
- **Respons (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```

### 4. Logout User
- **Endpoint**: `DELETE /api/users/logout`
- **Autentikasi**: Protected (Butuh token)
- **Header**: `Authorization: Bearer <token>`
- **Respons (200 OK)**:
  ```json
  {
    "message": "Logout berhasil"
  }
  ```

---

## 🛠️ Cara Setup Project

### 1. Prasyarat
Pastikan Anda sudah menginstal **Bun** secara global di mesin Anda. Jika belum, pasang via terminal:
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Instal Dependensi
Jalankan perintah berikut di root folder:
```bash
bun install
```

### 3. Konfigurasi Environment (`.env`)
Salin file konfigurasi contoh `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan sesuaikan koneksi database MySQL Anda:
```env
DATABASE_URL="mysql://username:password@localhost:3306/belajar_vibe_coding"
```

### 4. Migrasi Database
Pastikan database MySQL dengan nama di `.env` (misal: `belajar_vibe_coding`) sudah terbuat. Kemudian jalankan Drizzle Kit untuk melakukan sinkronisasi skema ke database:
```bash
bun x drizzle-kit push
```

---

## 🏃 Cara Menjalankan Aplikasi

### Mode Pengembangan (Watch Mode)
Untuk menjalankan aplikasi secara lokal dengan *hot-reloading* otomatis ketika ada perubahan file:
```bash
bun run dev
```

### Mode Produksi
Untuk menjalankan aplikasi secara normal:
```bash
bun run start
```

Server akan aktif dan berjalan di port `3000` (http://localhost:3000).

---

## 🧪 Cara Menjalankan Unit Test

Pengujian menggunakan fitur bawaan Bun Test. Sebelum menjalankan test, Bun Test akan otomatis mengosongkan data di database uji untuk menjamin konsistensi hasil pengujian.

Untuk menjalankan unit test secara lengkap:
```bash
bun test
```
