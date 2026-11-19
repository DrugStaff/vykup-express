/* =====================================================================
   Výkup Express — НАЛАШТУВАННЯ САЙТУ
   Тут міняєш контакти й підключаєш Supabase. Більше ніде нічого чіпати не треба.
   ===================================================================== */
window.VE_CONFIG = {
  // Контакти Міхала (показуються на сайті)
  phone: "+420 000 000 000",          // як показувати на сайті
  whatsapp: "420000000000",           // тільки цифри, з кодом країни, без +
  telegram: "vykupexpress",            // username без @
  email: "info@vykupexpress.cz",

  // Дані фірми для сторінки GDPR (назва, IČO, адреса)
  company: "Výkup Express · [název firmy, IČO, adresa]",

  // Supabase. Поки порожньо, сайт працює в ДЕМО-режимі:
  // заявки зберігаються в браузері й видно їх в адмінці на цьому ж пристрої.
  supabaseUrl: "https://qbcbyripfdfneklzakjb.supabase.co",                    // напр. "https://abcd1234.supabase.co"
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiY2J5cmlwZmRmbmVrbHpha2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMDk0NjQsImV4cCI6MjExMDY4NTQ2NH0.sKUg6LtRKKujKBP4Oqtf6L4ME1_OR-73wjYV69UEHbg"                 // "anon public" ключ з Project Settings → API
};
