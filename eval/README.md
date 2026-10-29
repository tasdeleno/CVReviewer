# Eval korpusu (sentetik)

CV ile iş ilanı anahtar kelime eşleştirme aracı için **tamamen kurgusal** değerlendirme verisi. Tüm kişi, şirket, e-posta (example.com) ve telefon (555) bilgileri uydurmadır; gerçek kişi/kurum ile ilgisi yoktur.

## İçerik
- 12 ilan: 6 sektör (yazılım, veri, pazarlama, finans, İK, satış) x EN + TR.
- Her ilan için 3 CV: `strong`, `medium`, `weak` (çapraz dil çiftleri dahil).
- `dev/` (8 ilan) ve `holdout/` (4 ilan: en-hr-1, tr-ik-1, en-sales-1, tr-satis-1). Dizin düzeni aynıdır.

## Dosyalar (`<split>/<id>/`)
- `ad.txt`: ilan düz metni.
- `strong.json`, `medium.json`, `weak.json`: open-resume şeması + `lang`, `layout` (`standard` | `two-column` | `no-headings`), `sectionTitles`.
- `gold.json`: `keywords[]` (term, aliases, importance: required|preferred), her CV için `present`/`missing` (terimleri tam olarak böler), `expectedSections` (başlığıyla var olan bölümler; no-headings için `[]`).

## Kural
**Holdout motor geliştirme sırasında açılmaz.** Ayarlama/hata ayıklama yalnızca `dev/` üzerinde yapılır; holdout sadece nihai ölçüm içindir.

## Çalıştırma
- `npm run eval`: dev CV'lerini PDF'e çevirir (`scripts/gen-fixtures.mjs`), motoru çalıştırır, `EVAL_SCORE=<0-100>` basar ve `eval/report-dev.md` yazar (ayrıntılı hata listesi).
- `EVAL_SPLIT=holdout npm run eval`: holdout ölçümü. Yalnız tur sonunda; **yalnız toplam skor okunur**, `report-holdout.md` açılmaz.
- `npx jest --ci`: birim testleri (guard). Her değişiklikte hepsi geçmeli.
- `TRY_DIR=<repo dışı klasör> npm run try`: gerçek ilan/CV denemesi (skorlanmaz), bkz. kök README.

## Metrik
`EVAL_SCORE = 100 × (0.35·F1 + 0.35·var/eksik doğruluğu + 0.2·sıralama + 0.1·bölüm parse oranı)`
- F1: ilandan çıkarılan anahtar kelimeler ile gold `keywords` (alias'lar dahil).
- Var/eksik doğruluğu: motorun çıkardığı gold kelimeler için CV'de var/yok kararı.
- Sıralama: aynı ilanda skor(strong) > skor(medium) > skor(weak) çiftlerinin oranı.
- Bölüm parse oranı: `expectedSections` içinden parser'ın okuyabildikleri.

## Autoresearch tur protokolü
Klasik döngü: `/autoresearch Metric: EVAL_SCORE (higher is better) Verify: npm run eval Guard: npx jest --ci Scope: src/app/lib/job-match/**, src/app/lib/parse-resume-from-pdf/** Iterations: N --evals`
- Kapsam dışı: `eval/dev/**`, `eval/holdout/**`, `eval/run-eval.ts`, `scripts/gen-fixtures.mjs`. Döngü etiketleri ya da ölçümü değiştirip skoru şişiremez.
- Her iterasyon **tek** değişiklik; iyileşmezse geri al. İterasyon başına commit yok (proje kuralı: her commit'ten önce reviewer). Tutulan durumun kopyası scratchpad'e alınır, geri dönüş oradan yapılır; tur sonunda tek commit + reviewer zinciri.
- Kurallar dilbilimsel/alan bilgisi olarak **genel** olmalı; dev'e özgü ezber (tek bir CV'deki ifadeyi eşleştirmek) yasak. Sözlük eklemeleri en çok ezber riski taşır.
- Tur sonu: holdout toplam skoru + dev–holdout farkı raporlanır. Fark açılıyorsa ezber var demektir.
- Ölçüm kodunda hata bulunursa tur sırasında düzeltilmez; tur sonrası ayrı commit'le düzeltilip yeniden baseline alınır.
- Kayıtlar: `autoresearch/loop-<YYMMDD-HHMM>/` (`results.tsv`, `evals-summary.md`, `handoff.json`). Yeni tur önce son turun kayıtlarını okur.

## Durum (2026-10-29)
| | Baseline | Tur 1 sonu | Şu an |
|---|---|---|---|
| Dev | 90.6 | 95.5 | 95.3 |
| Holdout | 86.6 | 89.9 | 90.4 |

Tur 1'de (10 iterasyon, hepsi keep): özet başlıkları, araç→beceri çıkarımı, EN türetme ekleri, TR tamlama kökleri, kısaltma kara listesi, eşanlamlar, bölüm başlıkları, ekosistem sözlüğü. Sonrasında review ve gerçek ilan denemesiyle yanlış pozitifler temizlendi (dev 95.5 → 95.3 bilinçli takas). Ayrıntı: `autoresearch/loop-261029-1952/`.

Holdout'a bugüne kadar 4 kez **toplam skor** olarak bakıldı (ayrıntısına hiç bakılmadı). Tekrarlı bakış hafif seçim yanlılığı yaratır; birkaç tur daha sonra yeni bir holdout seti üretmek gerekebilir.

## Sonraki tur adayları (öncelik sırasıyla)
1. **Önce ölçüm düzeltmesi (döngü dışı, ayrı commit):** `run-eval.ts` `isSameKeyword` gevşek. Gold alias'ı başka bir becerinin adını içerince ("VBA" → alias "Excel macros" → Excel) gold yanlış anahtar kelimeye bağlanıyor. Ayrıca bir gold birden çok anahtar kelimeye denk gelince ("CPA/ACCA" → CPA ve ACCA) yalnız ilki değerlendiriliyor; "herhangi biri bulunduysa var" olmalı. Kalan "yok ama bulundu" hatalarının çoğu bu. Düzeltip yeni baseline al.
2. Satır içi "tercihen/preferably" kapsamı: işaret yalnız ait olduğu öğeyi değil tüm satırı "tercih" yapıyor ("Google Analytics (tercihen GA4), Search Console…").
3. Unvan eşanlamları: "Engineer" ↔ "Developer", "Uzman" ↔ "Specialist" (öneri modülündeki unvan kontrolü).
4. Öneri kalitesi eval'de ölçülmüyor: gold'a beklenen zayıf maddeler / eksik bölümler eklenip metriğe katılabilir.
5. Dev–holdout farkını kapatmak için sözlük eklemelerini sınırlı tut; gerekirse veri setini yeni sektörlerle (sağlık, lojistik, eğitim) genişlet.
6. Bilinen küçük sorunlar (LOW): "Social Profiles" başlığı özet sayılabilir; "digital markets" → digital marketing; "International/Leadership …" ilk satırı unvan sanılabilir.
