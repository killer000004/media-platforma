# TAFU Iqtisodiyot Fakulteti — Talabalar bazasi

Excel fayldan (`Iqtisodiyot Fakulteti.xlsx`) SQLite bazasiga o'tkazilgan, login/parol bilan
himoyalangan talabalar ma'lumotlari sayti. Admin ma'lumotlarni ko'radi va o'zgartiradi,
oddiy foydalanuvchi (`user`) faqat ko'ra oladi.

## Lokal ishga tushirish

```bash
npm install
copy .env.example .env    # SESSION_SECRET ni o'zgartiring
npm start
```

Server birinchi marta ishga tushganda:
- `data/app.db` SQLite bazasi avtomatik yaratiladi
- `admin`/`admin123` va `user`/`user123` boshlang'ich hisoblari yaratiladi
- Excel fayldan barcha talabalar va rasmlar avtomatik import qilinadi

`http://localhost:3000` manzilida ochiladi.

**Ishga tushgach darhol parollarni o'zgartiring** (Admin sifatida kiring → foydalanuvchilar
bo'limidan, yoki `.env` faylida `ADMIN_PASSWORD` / `USER_PASSWORD` o'rnatib qayta ishga tushiring).

## Render.com'da bepul deploy qilish

1. Bu repo'ni GitHub'ga push qiling.
2. [render.com](https://render.com) da ro'yxatdan o'ting, "New +" → "Blueprint" tanlang va shu repo'ni ulang (`render.yaml` avtomatik topiladi).
3. `ADMIN_PASSWORD` va `USER_PASSWORD` environment o'zgaruvchilarini Render panelida qo'lda kiriting (xavfsizlik uchun git'ga yozilmagan).
4. Deploy tugagach, Render bergan `https://...onrender.com` manzili — saytingiz shu.

Bepul tarif serverni ishlatilmasa "uxlatib qo'yadi" — birinchi so'rov 30-60 soniya sekinroq
ochilishi mumkin, keyingilari tez ishlaydi.

## Texnik tuzilma

- `src/server.js` — Express server, sessiya asosidagi autentifikatsiya
- `src/db.js` — SQLite sxema (Node.js ichki `node:sqlite` moduli, qo'shimcha kompilyatsiya kerak emas)
- `src/routes/` — login, talabalar CRUD, foydalanuvchilarni boshqarish API'lari
- `scripts/migrate.js` — Excel → SQLite import (server birinchi marta ishga tushganda avtomatik chaqiriladi)
- `public/` — frontend (`index.html`, `login.html`, `css/js`)

## Rollar

- **admin** — barcha ma'lumotlarni ko'radi, qo'shadi, o'zgartiradi, o'chiradi; foydalanuvchilarni boshqaradi
- **user** — faqat ko'radi, hech narsani o'zgartira olmaydi
