# Stabilite raporu (regression-261029-2203)

- **Base:** `94fb0f2` (Adım 3: holdout v2, tur 2'den hemen önce)
- **Candidate:** `376cc41` (tur 2)
- **Seçim:** `--select full` (tüm jest paketi; affected-test eşleyicisi kullanılmadı)
- **Probe:** kapalı

## Verdict: **STABLE**
HARD boyutlarda yeşilden kırmızıya geçiş yok. SCORE boyutlarının stabilite puanı 100 (eşik 95).

| Boyut | Tier | Sonuç | Alt puan | Ağırlık (yeniden normalize) | Katkı |
|---|---|---|---|---|---|
| functional | HARD | 36/36 regresyona uygun test aday tarafında da geçti; 0 regresyon. 2 yeni test (new-coverage, kapı dışı) | geçti | – | – |
| flakiness | SCORE | 38 test × 3 koşu, her iki tarafta 0 kararsız test | 100 | 0.30/0.50 = 0.60 | 60 |
| resource | SCORE | `out/` 61.185.337 → 61.185.517 B (+180 B, +%0,0003); JS +116 B; sayfa bazında First Load JS değişmedi | 100 | 0.20/0.50 = 0.40 | 40 |
| **Toplam** | | | | | **100** |

UNAVAILABLE (çalıştırılmadı, kapıdan geçmiş sayılmaz):
- api-contract: Dışa açık bir API sözleşmesi yok. Motorun dışa aktarımları yalnızca eval ve testler tarafından kullanılıyor.
- data-migration: Veritabanı yok.
- integration-e2e: E2E paketi yok.
- performance: Bir benchmark komutu yok.
- visual-ui: Snapshot paketi yok. Motor henüz bir arayüze bağlı değil.

## Notlar
- **Kararsızlık tespit gücü:** Her tarafta 3 koşu yapıldı. p=%5 kararsızlığı yakalama olasılığı 1−0,95³ ≈ %14. Kod deterministik ve ağ ya da zaman bağımlılığı yok, bu yüzden risk düşük.
- **Kurulum:** Baz worktree `git worktree add --detach` ile açıldı. `package-lock.json` iki commit arasında aynı olduğu için `node_modules` junction ile paylaşıldı. İşlem sonunda junction kaldırıldı, ardından `git worktree remove` ve `prune` çalıştırıldı.
- **Bilgi amaçlı (kapı değil):** EVAL_SCORE dev için 91.9 → 94.9, holdout v2 için 79.3 → 80.8.
