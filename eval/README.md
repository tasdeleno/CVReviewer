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
