# Eval korpusu (sentetik)

CV ile iş ilanı anahtar kelime eşleştirme aracı için **tamamen kurgusal** değerlendirme verisi. Tüm kişi, şirket, e-posta (example.com) ve telefon (555, 07700 900) bilgileri uydurmadır; gerçek kişi/kurum ile ilgisi yoktur.

## İçerik
- Her ilan için 3 CV: `strong`, `medium`, `weak` (çapraz dil çiftleri dahil). CV'ler her zaman yapaydır.
- `dev/` (28 ilan): yazılım, veri, pazarlama, finans, İK, satış, sağlık, lojistik, eğitim (yapay ilanlar, EN + TR), artı temizlik, yemek, spor, İK, yazılım (10 **gerçek** ilan, gerçek ilan denemesinden; kaynakları repo dışındaki deneme klasöründe, `cvreviewer-try/SOURCES.md`).
  - İK ve satış 2026-10-29'a kadar holdout'tu; 6 kez toplam skoruna bakıldığı için dev'e taşındı.
  - Sağlık, lojistik ve eğitim holdout v2'ydi (`autoresearch/scenario-261029-2122/` kenar durumlarıyla); 5 bakıştan sonra, 2026-10-30'da dev'e taşındı.
  - Gerçek ilanların gold'unu motor çıktısını görmemiş bir agent yazdı; dev olduğu için ikinci etiketleyici kullanılmadı.
- `holdout/` (10 ilan, **holdout v3**, 2026-10-30): 10 farklı sektörden **gerçek** ilan, 5 TR + 5 EN, 7 beyaz yaka + 3 mavi yaka. Sektörler: hukuk, satın alma, üretim operatörü, iç mimarlık, çağrı merkezi, inşaat, müşteri destek, perakende, ürün yönetimi, kalite güvence. Hiçbiri dev'de yok. Kaynaklar `holdout/SOURCES.md`.
  - **Kör üretim:** ilanları, 30 CV'yi ve gold'u bir alt agent yazdı. İkinci bir agent (farklı model) gold'u bağımsız etiketledi, uyuşmazlıkları yazar çözdü (45 uyuşmazlığın 22'sinde yazar, 23'ünde ikinci etiketleyici kazandı). Uzlaştırma öncesi uyum: terimler %88–91 eşleşti; önem κ 1.00, var/eksik κ 0.96, öneri κ 0.95, koşul κ 0.96. Rastgele 10 terimlik örnek kullanıcı kontrolü için `cvreviewer-try/v3-sample.md`'de.
  - Motoru geliştiren oturum v3'ün dosyalarını açmadı. **Kirlenme:** agent raporlarında birkaç terim düzeyinde ipucu geçti (ör. hukuk ilanında meslek ruhsatı, bir ilanda ikamet koşulu, "dava takibi"). CV ya da skor ayrıntısı geçmedi.
  - **v3 bir regresyon alarmıdır:** 10 ilanla %90 aralığı ~7 puan genişliğinde. Aralıktan küçük farklar kazanç olarak okunmaz.
- Dizin düzeni iki split'te aynıdır.

## Dosyalar (`<split>/<id>/`)
- `ad.txt`: ilan düz metni.
- `strong.json`, `medium.json`, `weak.json`: open-resume şeması + `lang`, `layout` (`standard` | `two-column` | `no-headings`), `sectionTitles`.
- `gold.json`: `keywords[]` (term, aliases, importance: required|preferred), her CV için `present`/`missing` (terimleri tam olarak böler), `expectedSections` (başlığıyla var olan bölümler; no-headings için `[]`), `expectedSuggestions` (her CV için beklenen öneri türleri, aşağıdaki kılavuza göre), isteğe bağlı `conditions` (ilan koşulları `[{kind}]`; alan yoksa ilanda koşul yok sayılır).

## Öneri etiketleme kılavuzu (`expectedSuggestions`)
Etiket CV JSON'u ve ilan metninden, iyi bir CV danışmanının vereceği öneriye göre konur; **motor çıktısına bakılmaz**. Ölçülen türler:
- `no-summary`: CV'de özet/profil metni yok.
- `title`: CV'de özet var ve ilanın hedef rolü (kıdem kelimeleri ve parantez içi şirket/konum hariç) CV'nin hiçbir yerinde rol olarak geçmiyor. Aynı rolün eşanlamı ya da çevirisi geçiyorsa (Engineer≈Developer, Data engineer≈Veri Mühendisi, Field sales representative≈Saha Satış Temsilcisi, İK≈İnsan Kaynakları) öneri **beklenmez**. Rol olarak değil hedef olarak anılması ("X'e geçmek istiyorum") rol sayılmaz. Özet yoksa bu tür beklenmez (`no-summary` kapsar).
- `weak-verbs`: En az bir deneyim/proje maddesi ne yapıldığını değil yalnız görevi/katılımı söylüyor: "Responsible for", "Helped (with)", "Assisted", "Supported", "Worked on", "sorumluydum", "yardımcı oldum", "destek verdim/oldum", "katıldım", "görev aldım".
- `unquantified`: En az 3 madde var ve yarısından fazlasında hiç sayı yok.
- `long-bullets`: 40 kelimeyi aşan madde var.
- `only-in-skills`: CV'de bulunan bir **zorunlu** gold teriminin tek kanıtı Yetenekler bölümü; özet, unvan ya da maddelerde ne kendisi ne de onu açıkça gösteren somut bir kullanımı var (pandas → Python, HubSpot kaydı → CRM, responsive arayüz → HTML/CSS kanıt sayılır). Ehliyet gibi koşullar beceri değildir, sayılmaz.

Anahtar kelimeden türeyen öneriler (eksik beceri, eksik soft skill, eğitim) var/eksik doğruluğuyla zaten ölçüldüğü için etiketlenmez.

## Önem etiketleme kılavuzu (`keywords[].importance`)
- `preferred`: Terim yalnızca bir tercih bağlamında geçiyor. Tercih bağlamı şunlardır: "ideally", "nice to have", "a plus", "tercihen", "tercih sebebi", ya da "Preferred" veya "Artılar" gibi bir bölüm.
- `required`: Terim görev ya da şart satırlarında en az bir kez nitelemesiz geçiyor. Bu durumda aynı terimin tercih bağlamında da geçmesi sonucu değiştirmez (**zorunlu kazanır**).
- Şirket tanıtımındaki geçişler ("Series B SaaS company") şart sayılmaz.
- **Anahtar kelime sayılmayanlar (gerçek ilanlar, tur 3):** yalnızca şirket tanıtımında, yan haklarda, EEO/çeşitlilik, gizlilik/yasal ya da başvuru prosedürü metninde geçen terimler adaydan istenmiyor, gold'a girmez. Bu metinlerden okunan koşullar (E-Verify → `work-permit`, aşı/sağlık taraması → `health-report`) yine koşuldur.
- Bu kural dış kaynakla doğrulanmış değil, bir konvansiyondur (2026-10-30). Literatürde ve piyasadaki araçlarda çakışma durumu için bir kural bulunamadı.
- Gerçek ilan denemesinden sonra gözden geçirilecek. Tartışmalı etiketler:
  - SAP (en-finance-1): "month-end close in SAP" ve "ERP, ideally SAP". İkinci ifade "ERP zorunlu, SAP tercih" diye de okunabilir.
  - LinkedIn Recruiter (en-hr-1): sorumluluklarda ve "Nice to have" satırında geçiyor.

## Koşul etiketleme kılavuzu (`conditions`)
İlandaki koşullar beceri değildir. Anahtar kelime sayılmaz ve skora girmez. Her koşul bir `kind` ile etiketlenir. Aynı `kind` bir ilanda bir kez yazılır. Türler önem sırasına göre (tier) gruplanır:

| Tier | `kind` | CV'de aranır mı |
|---|---|---|
| 1 `credential` | `license`, `own-vehicle` | evet |
| 2 `logistics` | `work-permit`, `residence`, `travel`, `shift` | yalnız `work-permit` (ikamet, seyahat ve vardiya CV'de kalıpla bulunamaz) |
| 3 `contextual` | `military`, `criminal-record`, `health-report` | hayır |
| 4 `protected-exception` | `gender`, `age`, `disability` | hayır |
| 5 `protected` | `marital`, `children`, `pregnancy`, `religion` | hayır |
| 6 `lifestyle` | `smoking`, `appearance` | hayır |

- **Hukuki dayanak:** 6701 sayılı Kanun md. 3, 6 ve 7, 4857 sayılı İş Kanunu md. 5, KVKK md. 6. UK tarafında Equality Act 2010 md. 4.
- **4 ile 5 arasındaki ayrım bir ürün yargısıdır, hukuki bir ayrım değildir.** Tier 4'teki türler için 6701 md. 7'de açık bir istisna var (zorunlu cinsiyet, orantılı yaş sınırı); tier 5'tekiler için istisna zayıf.
- **Askerlik neden `contextual`:** İşin niteliğine göre sorulabilir. CV'de aranmaz, çünkü kadın adaya "eksik" demek yanlış olur.
- **Birleşik kalıp:** "Erkek adaylar için askerliğini tamamlamış" yalnızca `military` sayılır, ayrıca `gender` değildir.
- **Kapsam dışı:** Yan haklar ("özel sağlık sigortası", "şirket aracı") koşul değildir.
- **Mesaj dili:** Adaya gösterilecek mesajlar arayüz fazında yazılacak. "Ayrımcı olabilir" diliyle yazılacak ve hukuki tavsiye olmadığı belirtilecek.

## Kural
**Holdout motor geliştirme sırasında açılmaz.** Ayarlama/hata ayıklama yalnızca `dev/` üzerinde yapılır; holdout sadece nihai ölçüm içindir.

## Çalıştırma
- `npm run eval`: dev CV'lerini PDF'e çevirir (`scripts/gen-fixtures.mjs`), motoru çalıştırır, `EVAL_SCORE=<0-100>` basar ve `eval/report-dev.md` yazar (ayrıntılı hata listesi). Skorun yanında ilanlar üzerinde bootstrap ile %90 güven aralığı da basılır. Birim ilandır, çünkü bir ilanın üç CV'si aynı anahtar kelimeleri paylaşır. Aralığın dışına çıkmayan farklar kazanç olarak okunmaz.
- `EVAL_SPLIT=holdout npm run eval`: holdout ölçümü. Yalnız tur sonunda; **yalnız toplam skor okunur**, `report-holdout.md` açılmaz.
- `EVAL_DUMP=<dosya> npm run eval`: her CV'nin eşleşmelerini (etiket, önem, kategori, var/yok) JSON'a yazar. Ağırlıkları motoru yeniden çalıştırmadan, dışarıda yeniden skorlamak için kullanılır. Holdout'ta kullanılmaz.
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
- Holdout'a yapılan her bakış "Durum" bölümünde sayılır. Bakış sayısı artınca seçim yanlılığı birikir; birkaç tur sonra yeni bir holdout gerekir.
- Tur sonu reviewer düzeltmeleri motoru değiştirirse dev ve holdout yeniden ölçülür ve sonuç commit mesajına yazılır.

## Durum (2026-10-30)
Ölçüm ya da veri seti her değiştiğinde yeni bir baseline (B0–B7) alındı. Farklı baseline'lardaki skorlar birbiriyle karşılaştırılamaz.

| Aşama | Ne değişti | Dev | Holdout |
|---|---|---|---|
| Tur 1 öncesi | ilk ölçüm | 90.6 | 86.6 (eski) |
| Tur 1 sonu + temizlik | motor | 95.3 | 90.4 (eski) |
| B0 | ölçüm düzeltmesi (gold bağlama) | 96.2 | 90.4 (eski) |
| B1 | metriğe öneri F1 ve önem doğruluğu eklendi | 94.0 | 86.7 (eski) |
| B2 | eski holdout dev'e taşındı, holdout v2 eklendi | 91.9 | 79.3 (v2) |
| Tur 2 sonu | motor (9 değişiklik) | 94.9 | 80.8 (v2) |
| B3 | dev gold'unda önem etiketleri yazılı kurala göre düzeltildi (aday 0) | 94.9 | 80.8 (v2, yeniden ölçülmedi) |
| B4 | ehliyet anahtar kelimeden koşula taşındı, iki dev ilanına koşul satırları eklendi | 94.9 | 80.8 (v2, yeniden ölçülmedi) |
| PRD 1 (koşullar + önem kapsamı) | motor: koşul çıkarımı, cümle/öğe kapsamı, şirket tanıtımı ve şirket satırı | 95.1 | ölçülmedi |
| PRD 1 + ağırlıklar | ağırlıklar 3 / 1 / 0.25, soft ×0.25 (kullanıcının ikili tercihleri) | 95.1 | 82.5 (v2, 5. bakış) |
| B5 | v2 dev'e taşındı (18 ilan), skor %90 güven aralığıyla raporlanıyor | 91.5 (88.7–93.9) | — |
| B6 | 10 gerçek ilan dev'e (28 ilan); holdout v3 (10 gerçek ilan) | 87.3 (84.7–89.8) | 75.6 (71.8–78.8; v3, 1. bakış) |
| **Tur 3** | boilerplate boşaltma, kısaltma/büyük harf yanlış pozitifleri, görünüş koşulu, PDF kelime boşluğu, az sinyal bayrağı | **88.4 (86.0–90.5)** | **76.7 (73.6–79.5; v3, 2. bakış — aralık içinde, regresyon yok)** |

| B7 | çapraz dil CV'leri var/eksik, skor/sıralama ve dile bağlı önerilerden (title, only-in-skills) çıkarıldı; payda 0 bileşen skordan düşer. B6/Tur 3 ile karşılaştırılamaz | 88.4 (85.8–90.6) | — |
| B7-v3 (tur 3 motoru, B7 ölçümü) | holdout v3 yeniden ölçüldü | — | 77.9 (75.0–80.6; v3, 3. bakış) |
| Tur 4 Adım 2 | sözlük dışı ifade çıkarımı (`phrases.ts`), ×0.5 ağırlık, sırasız eşleşme; loop-261030-1427 (87.2 → 88.5). İfade precision 49.1 (hedef 60, tutmuyor) | 88.5 (86.2–90.4), F1 74.3 | 79.0 (77.1–80.9; v3, 4. bakış) |
| **Tur 4** | + korpus madenciliğiyle sözlük (~100 kavram; fitness, idari, satış sahası, TR muhasebe, lojistik, İSG/hijyen), korpusta görülen ifade gürültüsü, "Job Description" başlığı, tireli durak bileşikleri; review: TR isim istisnaları, ReDoS düzeltmesi | **88.6 (86.4–90.7), F1 75.9** | **79.8 (77.8–81.7; v3, 5. bakış, review düzeltmelerinden önce)** |

**Tur 4 (ifade çıkarımı + odak sözlüğü):**
- **Korpus:** 572 gerçek ilan (EN 254: Greenhouse 23 board, SmartRecruiters 9 şirket; TR 318: eleman.net 60 pozisyon sayfası). Odak alanı payı ~%47. Repo dışında `cvreviewer-try/corpus/` (index.tsv: url, kaynak, odak bayrağı). Dev, deneme ve holdout ilanları URL ve metin parçasıyla dışlandı. Sözlük v3'e bakılmadan bu korpustan çıkarıldığı için v3 farkı genelleşmeyi meşru ölçer.
- **Korpusta "yetersiz" ilan oranı** (örnek içi): TR %40.3 → %21.7, EN %8.7 → %3.5. Kalan TR ilanların çoğu gerçekten az beceri isteyen hizmet/mavi yaka ilanları (güvenlik, şoför, kasiyer, çağrı merkezi).
- **Odak denemesi** (`cvreviewer-try/focus/`, dondurulmuş sözlükle 8 yeni ilan, hafif gold motora bakılmadan yazıldı): recall tur 3 motoruyla 36.4 → yeni motorla 70.7 (yanlışlama eşiği +5, geçti); yetersiz 5/8 → 1/8. Göz kontrolünden sonraki iki genel düzeltmeyle 72.7 (artık örnek içi).
- **Ölçüm notları:** B7'den itibaren çapraz dil CV'leri var/eksik, skor/sıralama ve dile bağlı önerilerde ölçülmez. İfade metrikleri ("İfade" satırı) skora girmez. Dev'de "personal training sales" gibi gold terimleri motordaki daha kısa "personal training"e bağlanır; zayıf CV kısa terimi içerince karar "yok ama bulundu" sayılır (başlık düzeltmesindeki dev −0.2'nin kaynağı).

**Tur 3 (gerçek ilan bulguları, TDD):** bulgular `cvreviewer-try/FINDINGS.md`'de, önce/sonra tablosuyla.
- **Boilerplate:** EEO, gizlilik, işe alım prosedürü ve yan hak cümleleri koşul çıkarımından sonra, anahtar kelime için boşaltılıyor (`keywords.ts`, `BOILERPLATE`). Dar ipuçları; tek başına "privacy", "benefits", "KVKK" kullanılmadı. Dev precision 80.3 → 82.9, recall 63.8'de kaldı (gerçek gereksinim yutulmadı).
- **Yanlış pozitifler:** TA, IP, AMER ve büyük harfle yazılmış sıradan kelimeler (PEOPLE …) `NOT_SKILLS`'te; CRO artık büyük/küçük harfe duyarlı ("cross"a uymuyordu).
- **Koşul:** "bakımlı tutulması" (yer) görünüş sayılmıyor; "dış görünüşüne özen" sayılıyor.
- **PDF:** boşluk glifi düşen öğeler arasındaki kelime boşluğu korunuyor ("450kişilik" → "450 kişilik"). Bölüm parse oranı değişmedi.
- **Az sinyal:** 3'ten az sert beceri çıkan ilanda `insufficient` bayrağı, eksik beceri önerisi yerine `low-signal` uyarısı; eval bu ilanların sıralamasını ölçmüyor (sıralama 74/84 → 66/69, 5 ilan çıktı). Dev'deki dağılım 0–2 ya da 4+, eşik arada. 10 deneme ilanının 5'i yetersiz; sebep bu ilanlarda çıkarımın boş olması (sözlük turu).
- **Bilinçli bırakılanlar:** "You're responsive" (bare alias dev CV'lerinde gerçek kullanımı da yakalıyor), Spark (slogan, büyük harfle), uzun "… YOU WILL RECEIVE:" yan hak başlığı (6 kelime sınırı), şirket adı GitLab.

Tur 2 sonundaki dev bileşenleri: çıkarma F1 88.3, var/eksik 468/480, sıralama 36/36, bölüm 121/124, önem 158/160, öneri F1 95.9. Regresyon kapısı (`autoresearch/regression-261029-2203/`) STABLE çıktı.

**B3 (aday 0):** "Önem etiketleme kılavuzu" yazıldı ve dev gold'unda iki etiket buna göre düzeltildi.
- en-sales-1'de SaaS zorunludan tercihe indi. SaaS yalnızca şirket tanıtımında ve "ideally selling SaaS" içinde geçiyor.
- en-hr-1'de LinkedIn Recruiter tercihten zorunluya çıktı. Terim bir sorumluluk satırında geçiyor.

Bileşenler değişmedi: önem 158/160, EVAL_SCORE 94.9. LinkedIn Recruiter doğruya döndü, SaaS yanlışa düştü (motor `normal` veriyor). B2B hâlâ yanlış.

Holdout yeniden ölçülmedi, çünkü ne motor ne de holdout gold'u değişti.

Önceki aday 0 notundaki "SAP yanlış etiketlenmiş" tespiti hatalıydı. SAP sorumluluklarda da nitelemesiz geçiyor ("month-end close in SAP"), bu yüzden kurala göre zorunlu kalıyor.

**B4 (PRD 1 hazırlığı):** "Koşul etiketleme kılavuzu" yazıldı.
- tr-satis-1: "B sınıfı ehliyet" gold anahtar kelimelerinden çıkarıldı ve `conditions`'a taşındı.
- tr-ik-1: yaş, medeni hal, sigara, ikamet ve cinsiyet satırları eklendi.
- en-sales-1: ehliyet ve çalışma izni cümlesi eklendi. Uzun bir cümle olarak yazıldı ki başlık gibi okunmasın.
- Sonuç beklendiği gibi: F1 88.3 → 88.5 (recall 94.1 → 94.7). Motor ehliyeti zaten çıkaramıyordu. Diğer bileşenler aynı kaldı.
- Yeni satırlar fazladan anahtar kelime üretmedi. Bu yüzden koşul metninin süzülmesi dev'de ölçülemiyor, birim testiyle korunuyor.
- Koşul precision/recall satırı motor koşul döndürmeye başladığında rapora eklenecek. Bu satır `EVAL_SCORE`'a girmeyecek.

**PRD 1 (koşullar ve önem kapsamı, TDD):**
- **Koşullar** (`conditions.ts`): Dev'de 10/10 doğru, `EVAL_SCORE` değişmedi.
- **Önem kapsamı:**
  - Yüklem işaretleri ("a plus", "tercih sebebidir") kendi cümlelerine uygulanıyor. Bölme parantez dışında yapılıyor ve kısaltmaları (ör., e.g.) atlıyor.
  - Zarflar ("ideally", "tercihen") kendi öğelerine uygulanıyor; cümlenin başındaysa bütün cümleye.
  - Şirket tanıtımı cümlesi ("X is a … company") ve başlığın altındaki "Şirket - Konum" satırı adaydan bir şey istemiyor.
- **Önceden kayıtlı beklenti tuttu:** önem 158/160 → 160/160 (SaaS ve B2B düzeldi), diğer bileşenler aynı, `EVAL_SCORE` 94.9 → 95.1.
- **Neden döngü değil TDD:** Kurallar tek başına dev'de kazanç göstermiyor ve döngü protokolü kazanç göstermeyen değişikliği geri alıyor. Bu yüzden kurallar birim testleriyle tutuldu. Kalan önem hatası olmadığı için kısa autoresearch döngüsü koşulmadı.

**Ağırlıklar (Faz D):** zorunlu / normal / tercih 2 / 1 / 0.5 → 3 / 1 / 0.25, soft ×0.5 → ×0.25. Sözlük dışı katsayısı ×0.7 değişmedi.
- **Eval ağırlıkları ayırt edemiyor.** `EVAL_DUMP` ile yeniden skorlanan 16 aday setin hepsi sıralamayı 36/36 tutturdu ve strong–medium farkları birbirine yakın çıktı (27–35).
- **Birincil ölçüt kullanıcının 7 ikili tercihi oldu.** Önceden kayıtlı dört set arasında en iyisi mevcut set çıktı (3/7). Cevaplardan türetilen set 7/7 uyuyor, ama bu aynı cevaplardan türetildiği için bağımsız bir doğrulama değil. Kullanıcı bunu bilerek seçti.
- **Cevaplardan çıkan kısıtlar:** bir zorunlu eksik, dört artıdan ve yaklaşık üç normalden ağır; bir normal, iki artıdan ağır; iki soft skill, bir teknik zorunluyu telafi etmiyor.
- Gerçek ilan denemesinde yeniden kontrol edilecek.
- **Holdout v2:** 80.8 → 82.5, dev–holdout farkı 14.1 → 12.6. Bu tek bakış PRD 1'in üç fazının (koşullar, önem kapsamı, ağırlıklar) etkisini birlikte taşıyor. Önem kazancının bir kısmı (yaklaşık 0.3 puan) kazara görülen ALS, SAP ve BLS satırları nedeniyle kirli sayılmalı.

### Ayrıntılar

B0'dan itibaren skorlar öncekilerle doğrudan karşılaştırılamaz: ölçüm değişti (motor değil). Var/eksik doğruluğu dev'de 335/348 → 344/348; çıkarma F1'i aynı.

**B1 (öneri ve önem metrikleri eklendi):** dev 94.0, holdout 86.7 (yalnızca toplam skor okundu, 6. bakış). Yeni formül B0 ile karşılaştırılamaz. Dev'deki bileşenler: öneri F1 82.8 (precision 81.4, recall 84.2), önem doğruluğu 99.1 (115/116).
- Öneri etiketleri iki bağımsız etiketleyiciyle kör yazıldı, 216 kararın 214'ünde uyuştu.
- Uyuşmazlık 1: tr-yazilim-1 strong'da Git yalnızca Yetenekler bölümünde geçiyor; ilk etiketleyici bunu kaçırmış.
- Uyuşmazlık 2: tr-satis-1 medium'da "B2B" sayı değil. Motordaki `/\d/` kuralı B2B'yi sayı sayıyor; bu bir tur 2 adayı.
- Önem metriği yüksek çıkıyor, çünkü veri setinde satır içi tercih işareti olan yalnızca bir gold terimi var. Adım 3'te bu tür senaryolar eklenecek.

**B2 (veri seti yeniden düzenlendi, Adım 3):** dev 91.9 (12 ilan), holdout v2 79.3 (6 yeni sektör ilanı; yalnızca toplam skor okundu, 1. bakış).
- Eski holdout'un dev'e girmesiyle önem doğruluğu 96.3'e düştü (154/160); metrik artık ayırt edici. Öneri F1 79.5, var/eksik 468/480.
- Holdout v2 ile dev arasındaki 12.6 puanlık fark beklenen bir sonuç: sağlık, lojistik ve eğitim terimleri sözlükte yok. Bu fark, motorun genelleşip genelleşmediğinin ölçüsü. Kapatmak için holdout'a özgü sözlük eklemek ezber olur ve yasak.
- Holdout v2 gold'u kör yazıldı. Önemde 95/95, var/eksikte 284/285, önerilerde 107/108 uyum. İki uyuşmazlıkta daha katı okuma seçildi.

**Tur 2 sonu (loop-261029-2136, 10 iterasyon, 9 tutuldu):** dev 91.9 → 94.9, holdout v2 79.3 → 80.8 (yalnızca toplam skor; 2. bakış, review düzeltmelerinden sonraki 3. bakışta da 80.8). Dev kazancının yaklaşık yarısı holdout'a taşındı ve fark 12.6'dan 14.1'e açıldı. Kazançların çoğu öneri kurallarından geldi: zayıf fiil kapsamı, unvan eşanlamları, başlıksız CV'de özet ve madde ayrıştırma, rakamlı kısaltmalar. Holdout farkının asıl kaynağı sektör sözlüğünün eksikliği; bunu kapatmak için ezber yapılmadı. Ayrıntı: `autoresearch/loop-261029-2136/`.

Tur 1'de (10 iterasyon, hepsi keep): özet başlıkları, araç→beceri çıkarımı, EN türetme ekleri, TR tamlama kökleri, kısaltma kara listesi, eşanlamlar, bölüm başlıkları, ekosistem sözlüğü. Sonrasında review ve gerçek ilan denemesiyle yanlış pozitifler temizlendi (dev 95.5 → 95.3 bilinçli takas). Ayrıntı: `autoresearch/loop-261029-1952/`.

Eski holdout'a 6 kez toplam skor olarak bakıldıktan sonra bu set dev'e taşındı. **Holdout v2'ye 5 kez bakıldı:** B2, tur 2 sonu, review düzeltmelerinden sonra, kazara bir 4. bakış ve PRD 1 sonu (son ikisi aşağıda). Hepsinde yalnızca toplam skor okundu, ayrıntılı rapor hiç açılmadı.
- **Kazara 4. bakış (2026-10-30, aday 0 hazırlığı):** `eval/` üzerinde çalıştırılan bir grep, `report-holdout.md`'den üç "Yanlış önem" satırını gösterdi: ALS (gold tercih, motor zorunlu), SAP (gold zorunlu, motor tercih) ve BLS (gold zorunlu, motor tercih).
- Bu üç satır satır içi tercih kuralının (aday 1) holdout'taki hatalarını ele veriyor, yani aday 1 için yanlılık riski taşıyor.
- Bundan sonra grep'ler `eval/dev` ile sınırlandırılmalı.
- **5. bakış (PRD 1 sonu):** yalnızca toplam skor okundu (82.5), rapor açılmadı. Ardından v2 dev'e taşındı.

**Holdout v3 bakışları** (yalnızca toplam skor ve aralık, rapor hiç açılmadı): 1. bakış tur 3 öncesi motorla 75.6 (71.8–78.8); 2. bakış tur 3 sonu 76.7 (73.6–79.5). Fark aralığın içinde: regresyon yok, kazanç olarak okunmaz.

## Sonraki tur adayları (öncelik sırasıyla)
1. **Tur 4'ten kalanlar (bitti; ayrıntı yukarıda "Tur 4"):**
   - **İfade precision'ı %47** (plan hedefi %60). Kullanıcı holdout kazancı nedeniyle kabul etti. Sonraki adım: EN için POS etiketleyici (wink-nlp) ya da ifadeleri skora katmadan ayrı liste göstermek (Faz 4 kararı).
   - **İdari sözlük açığı** (odak göz kontrolü): "managing a complex calendar", "reconcile expenses", "end-to-end travel booking" yakalanmıyor; en-admin ilanı hâlâ yetersiz. Odak ilanına göre ayarlamamak için bilinçli olarak bekletildi.
   - **Kısaltma token gürültüsü:** danışmanlık ilanında BPC, SPO, SLO, APO, LSD gibi ilana özgü kısaltmalar araç sanılıyor.
   - **"ve/and" bölünüyor** (plandan sapma): "ölçme ve değerlendirme" gibi terimler yalnız sözlükle yakalanır.
   - **Tüm CV'de sırasız ifade eşleşmesi** gerçek CV'de yanlış "var" riskini artırabilir; gerçek CV'lerle kontrol edilmeli.
   - **Eval bağlama ayrıntısı:** daha kısa motor terimi daha uzun gold terimine bağlanıyor ("personal training" → "personal training sales"); ölçüm düzeltmesi ayrı bir iş.
   - ~~Girdi uzunluğu sınırı yok~~ (Faz 4'te kapandı): `analyze()` 30.000 karakterden uzun ilan ya da CV metninde `RangeError` fırlatır. 572 ilanlık korpusta en uzun ilan 12,7k; 100k'da çok satırlı girdi 2–3 sn, 30k'da ≤1 sn sürdü.
   - **skipFirst** (typescript review, LOW): girintili ya da numaralı maddede ("1. Track …") baştaki EN fiil atlanmıyor; şimdilik yalnız LEADING_VERBS'teki fiiller yakalanıyor.
2. **Kaçan eşleşmeler (bulgu 6):** "BESYO veya Spor Bilimleri" alternatifi, araç → kategori (SAP HR → HRIS), "Personal Training certification". CV dilinden dil becerisi çıkarmak, aynı dil kararıyla önemini kaybetti.
3. **Ağırlıkların gerçek ilanda kontrolü:** tur 4'ten sonra.
4. ~~Faz 4 (arayüz)~~ bitti (2026-10-31): analiz sayfası, pazarlama ve `/resume-parser` sayfaları silindi (ayrı "ATS Testi" yerine sayfadaki ATS paneli; kullanıcı kararı). Üç zorunluluk karşılandı:
   - `extractJobAd` artık `ignored` döndürür (boilerplate cümleleri, yan haklar gibi atlanan blok satırları, şirket satırı, başlık parantezi); arayüzde "Analize alınmayan ilan metni" olarak üstü çizili gösterilir. Eval etkilenmedi (dev 88.6).
   - Skor yalnız `ScoreCard` bileşeninde ve `insufficient` ile birlikte gösterilir (bileşen kuralı, tip değil).
   - `kind: "phrase"` terimleri "İlanda geçen diğer ifadeler" açılır listesinde, kesikli işaretle ve düşük güven notuyla ayrı.
   - `Suggestion.terms` (isteğe bağlı) arayüz başlığı için eklendi; eval yalnız `kind` okur.
   - Faz 4'ten kalanlar (finish review, bilinçli ertelendi): aynı ilan satırından gelen iki `missing-in-experience` önerisi ("vergi", "vergi beyannamesi") tek tabelada birleşmeli (motor işi). Tasarım tavanı: bölüm piktogramları ve tek bir hareket anı (skorun yerleşmesi ya da tabelaların sırayla açılması) eklenmedi. Düşük öncelikli ("İsteğe bağlı") tabela ekranda hiç görülmedi; kodda 2px üst çizgiyle çiziliyor.
5. **Kalan dev hataları (tur 2 raporu):**
   - Çıkarılamayan satış terimleri: saha satışı, bayi yönetimi, müşteri portföyü yönetimi, teklif hazırlama, pipeline management, discovery calls.
   - Fazladan çıkarılan kelimeler: bölüm adları (Economics, İktisat / İşletme). Gold kuralı bunları anahtar kelime saymıyor, motor ise eğitim önerisi için çıkarıyor; bu bir karar konusu.
   - FP&A Analyst ≈ Financial Analyst unvanı tanınmıyor.
   - ROLE_WORDS'de "partner" yok, bu yüzden "Talent Acquisition Partner" ilanında unvan önerisi hiç çıkmıyor.
   - İma ile kanıtta fazladan `only-in-skills`: blog yazıları → content marketing.
   - **Gold'da ERP eksik:** en-finance-1 ("Experience with an ERP") ve tr-finans-1 ("ERP programlarında tecrübeli") ilanlarında ERP bir şart, ama gold'da yok. Motor ERP'yi çıkarıyor ve bu şu an fazladan sayılıyor.
     - Ayrı bir etiketleme işi, tur dışında yapılmalı.
     - SAP için dış görüşün önerdiği okumayla birlikte ele alınmalı: kategori (ERP) zorunlu, örnek araç (SAP) tercih.
   - "What you'll be doing" başlığı tanınmıyor (`HEADING_PATTERNS`'taki "what you'll do" bu ifadeyi kapsamıyor). Bu yüzden en-hr-1'in sorumluluk satırları ilk bölüm (`intro`) sayılıyor. Şu an sonucu değiştirmiyor (LOW).
6. **Review'dan kalan LOW'lar:**
   - Ölçülmemiş madde kontrolü bitişik birimleri (5GB, 10km, 40hrs) ad sayıyor.
   - Madde yedeği, deneyim bölümü hiç ayrıştırılamadığında madde işaretli beceri ve eğitim satırlarını da madde sayıyor (`suggest.ts`'teki ponytail notu).
   - `titleVariants` en kötü durumda 4096 varyant üretiyor; bu yalnızca 6 kelimelik yapay bir unvanda olur.
   - TR edilgen yapı tespiti yok.
7. **PRD'ler** (`autoresearch/improve-261029-2057/`; uygulama durumu orada `improvement-plan.md`'de): kişisel bilgi kontrolü (PRD 5), deneyim yılı yüzdesi (PRD 6), PDF metin sağlığı (PRD 3) ve eşleşme şeffaflığı (PRD 7) henüz yapılmadı.
8. Bilinen küçük sorunlar (LOW): "Social Profiles" başlığı özet sayılabilir; "digital markets" → digital marketing; "International/Leadership …" ilk satırı unvan sanılabilir.

Kapananlar: gerçek ilan denemesi ve holdout v3 (tur 3); boilerplate, kısaltma yanlış pozitifleri, PDF kelime boşluğu ve az sinyal bayrağı (tur 3); ölçüm düzeltmesi (B0); öneri kalitesi metriği (B1); önem etiketleme kuralı ve dev gold tutarlılığı (B3, eski aday 0); ilan koşulları ve satır içi tercih kapsamı (PRD 1); tur 2'de zayıf fiil kapsamı, unvan eşanlamları ve çevirisi, başlıksız CV'de özet ve madde ayrıştırma, rakamlı kısaltmalar, "Artılar" ve "big plus" işaretleri, tanıtım bloğundaki sektör kelimeleri, -ize türetmesi ve Python ima kuralı.
