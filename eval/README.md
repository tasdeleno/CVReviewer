# Eval korpusu (sentetik)

CV ile iş ilanı anahtar kelime eşleştirme aracı için **tamamen kurgusal** değerlendirme verisi. Tüm kişi, şirket, e-posta (example.com) ve telefon (555) bilgileri uydurmadır; gerçek kişi/kurum ile ilgisi yoktur.

## İçerik
- 12 ilan: 6 sektör (yazılım, veri, pazarlama, finans, İK, satış) x EN + TR.
- Her ilan için 3 CV: `strong`, `medium`, `weak` (çapraz dil çiftleri dahil).
- `dev/` (8 ilan) ve `holdout/` (4 ilan: en-hr-1, tr-ik-1, en-sales-1, tr-satis-1). Dizin düzeni aynıdır.

## Dosyalar (`<split>/<id>/`)
- `ad.txt`: ilan düz metni.
- `strong.json`, `medium.json`, `weak.json`: open-resume şeması + `lang`, `layout` (`standard` | `two-column` | `no-headings`), `sectionTitles`.
- `gold.json`: `keywords[]` (term, aliases, importance: required|preferred), her CV için `present`/`missing` (terimleri tam olarak böler), `expectedSections` (başlığıyla var olan bölümler; no-headings için `[]`), `expectedSuggestions` (her CV için beklenen öneri türleri, aşağıdaki kılavuza göre).

## Öneri etiketleme kılavuzu (`expectedSuggestions`)
Etiket CV JSON'u ve ilan metninden, iyi bir CV danışmanının vereceği öneriye göre konur; **motor çıktısına bakılmaz**. Ölçülen türler:
- `no-summary`: CV'de özet/profil metni yok.
- `title`: CV'de özet var ve ilanın hedef rolü (kıdem kelimeleri ve parantez içi şirket/konum hariç) CV'nin hiçbir yerinde rol olarak geçmiyor. Aynı rolün eşanlamı ya da çevirisi geçiyorsa (Engineer≈Developer, Data engineer≈Veri Mühendisi, Field sales representative≈Saha Satış Temsilcisi, İK≈İnsan Kaynakları) öneri **beklenmez**. Rol olarak değil hedef olarak anılması ("X'e geçmek istiyorum") rol sayılmaz. Özet yoksa bu tür beklenmez (`no-summary` kapsar).
- `weak-verbs`: En az bir deneyim/proje maddesi ne yapıldığını değil yalnız görevi/katılımı söylüyor: "Responsible for", "Helped (with)", "Assisted", "Supported", "Worked on", "sorumluydum", "yardımcı oldum", "destek verdim/oldum", "katıldım", "görev aldım".
- `unquantified`: En az 3 madde var ve yarısından fazlasında hiç sayı yok.
- `long-bullets`: 40 kelimeyi aşan madde var.
- `only-in-skills`: CV'de bulunan bir **zorunlu** gold teriminin tek kanıtı Yetenekler bölümü; özet, unvan ya da maddelerde ne kendisi ne de onu açıkça gösteren somut bir kullanımı var (pandas → Python, HubSpot kaydı → CRM, responsive arayüz → HTML/CSS kanıt sayılır). Ehliyet gibi koşullar beceri değildir, sayılmaz.

Anahtar kelimeden türeyen öneriler (eksik beceri, eksik soft skill, eğitim) var/eksik doğruluğuyla zaten ölçüldüğü için etiketlenmez.

## Kural
**Holdout motor geliştirme sırasında açılmaz.** Ayarlama/hata ayıklama yalnızca `dev/` üzerinde yapılır; holdout sadece nihai ölçüm içindir.

## Çalıştırma
- `npm run eval`: dev CV'lerini PDF'e çevirir (`scripts/gen-fixtures.mjs`), motoru çalıştırır, `EVAL_SCORE=<0-100>` basar ve `eval/report-dev.md` yazar (ayrıntılı hata listesi).
- `EVAL_SPLIT=holdout npm run eval`: holdout ölçümü. Yalnız tur sonunda; **yalnız toplam skor okunur**, `report-holdout.md` açılmaz.
- `npx jest --ci`: birim testleri (guard). Her değişiklikte hepsi geçmeli.
- `TRY_DIR=<repo dışı klasör> npm run try`: gerçek ilan/CV denemesi (skorlanmaz), bkz. kök README.

## Metrik
`EVAL_SCORE = 100 × (0.30·F1 + 0.30·var/eksik doğruluğu + 0.10·sıralama + 0.05·bölüm parse oranı + 0.10·önem doğruluğu + 0.15·öneri F1)`
- F1: ilandan çıkarılan anahtar kelimeler ile gold `keywords` (alias'lar dahil).
- Var/eksik doğruluğu: motorun çıkardığı gold kelimeler için CV'de var/yok kararı.
- Sıralama: aynı ilanda skor(strong) > skor(medium) > skor(weak) çiftlerinin oranı.
- Bölüm parse oranı: `expectedSections` içinden parser'ın okuyabildikleri.
- Önem doğruluğu: motorun çıkardığı gold kelimelerde tercih/tercih değil kararı gold `importance` ile aynı mı (motorun "normal"ı tercih değil sayılır).
- Öneri F1: motorun öneri türleri (`Suggestion.kind`) ile `expectedSuggestions` (CV başına, mikro).
- Ağırlıklar Adım 2'de (2026-10-29) değişti: sıralama ve bölüm parse ~%100'de doyduğu için düşürüldü. Bu tarihten önceki skorlarla karşılaştırılamaz.

## Autoresearch tur protokolü
Klasik döngü: `/autoresearch Metric: EVAL_SCORE (higher is better) Verify: npm run eval Guard: npx jest --ci Scope: src/app/lib/job-match/**, src/app/lib/parse-resume-from-pdf/** Iterations: N --evals`
- Kapsam dışı: `eval/dev/**`, `eval/holdout/**`, `eval/run-eval.ts`, `scripts/gen-fixtures.mjs`. Döngü etiketleri ya da ölçümü değiştirip skoru şişiremez.
- Her iterasyon **tek** değişiklik; iyileşmezse geri al. İterasyon başına commit yok (proje kuralı: her commit'ten önce reviewer). Tutulan durumun kopyası scratchpad'e alınır, geri dönüş oradan yapılır; tur sonunda tek commit + reviewer zinciri.
- Kurallar dilbilimsel/alan bilgisi olarak **genel** olmalı; dev'e özgü ezber (tek bir CV'deki ifadeyi eşleştirmek) yasak. Sözlük eklemeleri en çok ezber riski taşır.
- Tur sonu: holdout toplam skoru + dev–holdout farkı raporlanır. Fark açılıyorsa ezber var demektir.
- Ölçüm kodunda hata bulunursa tur sırasında düzeltilmez; tur sonrası ayrı commit'le düzeltilip yeniden baseline alınır.
- Kayıtlar: `autoresearch/loop-<YYMMDD-HHMM>/` (`results.tsv`, `evals-summary.md`, `handoff.json`). Yeni tur önce son turun kayıtlarını okur.

## Durum (2026-10-29)
| | Baseline | Tur 1 sonu | Tur 1 + temizlik | Ölçüm düzeltmesi (B0) |
|---|---|---|---|---|
| Dev | 90.6 | 95.5 | 95.3 | 96.2 |
| Holdout | 86.6 | 89.9 | 90.4 | 90.4 |

B0'dan itibaren skorlar öncekilerle doğrudan karşılaştırılamaz: ölçüm değişti (motor değil). Var/eksik doğruluğu dev'de 335/348 → 344/348; çıkarma F1'i aynı.

**B1 (öneri ve önem metrikleri eklendi):** dev 94.0, holdout 86.7 (yalnızca toplam skor okundu, 6. bakış). Yeni formül B0 ile karşılaştırılamaz. Dev'deki bileşenler: öneri F1 82.8 (precision 81.4, recall 84.2), önem doğruluğu 99.1 (115/116).
- Öneri etiketleri iki bağımsız etiketleyiciyle kör yazıldı, 216 kararın 214'ünde uyuştu.
- Uyuşmazlık 1: tr-yazilim-1 strong'da Git yalnızca Yetenekler bölümünde geçiyor; ilk etiketleyici bunu kaçırmış.
- Uyuşmazlık 2: tr-satis-1 medium'da "B2B" sayı değil. Motordaki `/\d/` kuralı B2B'yi sayı sayıyor; bu bir tur 2 adayı.
- Önem metriği yüksek çıkıyor, çünkü veri setinde satır içi tercih işareti olan yalnızca bir gold terimi var. Adım 3'te bu tür senaryolar eklenecek.

Tur 1'de (10 iterasyon, hepsi keep): özet başlıkları, araç→beceri çıkarımı, EN türetme ekleri, TR tamlama kökleri, kısaltma kara listesi, eşanlamlar, bölüm başlıkları, ekosistem sözlüğü. Sonrasında review ve gerçek ilan denemesiyle yanlış pozitifler temizlendi (dev 95.5 → 95.3 bilinçli takas). Ayrıntı: `autoresearch/loop-261029-1952/`.

Holdout'a bugüne kadar 5 kez **toplam skor** olarak bakıldı (ayrıntısına hiç bakılmadı). Tekrarlı bakış hafif seçim yanlılığı yaratır; birkaç tur daha sonra yeni bir holdout seti üretmek gerekebilir.

## Sonraki tur adayları (öncelik sırasıyla)
1. ~~Önce ölçüm düzeltmesi~~ (yapıldı, B0): motor kelimesi önce adını tam taşıdığı gold'a bağlanır, yoksa içinde geçtiği gold'a ("Leadership" → "team leadership"), böylece "Excel" artık VBA'nın "Excel macros" alias'ına bağlanmıyor. Bir gold birden çok motor kelimesine denk gelirse herhangi biri bulunduysa "var". Gold'da present+missing terimleri tam bölmüyorsa eval hata verir.
2. Öneri hataları (B1 raporu): unvan eşanlamı ve çevirisi (FP&A Analyst, Head of Digital Marketing, Frontend developer≈Geliştirici, Data engineer≈Veri Mühendisi) yüzünden fazladan `title` önerisi çıkıyor. "Supported" ve "destek verdim" gibi zayıf fiiller kaçıyor; cümle ortasındaki "sorumluydum" da kaçıyor. Ima ile kanıtlanan beceriler (pandas → Python) ve ehliyet için fazladan `only-in-skills` önerisi çıkıyor. Ölçülmemiş madde kontrolünde B2B ve GA4 sayı sayılıyor. Başlıksız CV'de özet ve maddeler ayrıştırılamıyor.
3. Satır içi "tercihen/preferably" kapsamı: işaret yalnız ait olduğu öğeyi değil tüm satırı "tercih" yapıyor ("Google Analytics (tercihen GA4), Search Console…").
4. ~~Öneri kalitesi eval'de ölçülmüyor~~ (yapıldı, B1).
5. Dev–holdout farkını kapatmak için sözlük eklemelerini sınırlı tut; gerekirse veri setini yeni sektörlerle (sağlık, lojistik, eğitim) genişlet.
6. Bilinen küçük sorunlar (LOW): "Social Profiles" başlığı özet sayılabilir; "digital markets" → digital marketing; "International/Leadership …" ilk satırı unvan sanılabilir.
