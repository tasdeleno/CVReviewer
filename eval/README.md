# Eval korpusu (sentetik)

CV ile iş ilanı anahtar kelime eşleştirme aracı için **tamamen kurgusal** değerlendirme verisi. Tüm kişi, şirket, e-posta (example.com) ve telefon (555, 07700 900) bilgileri uydurmadır; gerçek kişi/kurum ile ilgisi yoktur.

## İçerik
- 18 ilan: 9 sektör × EN + TR. Her ilan için 3 CV: `strong`, `medium`, `weak` (çapraz dil çiftleri dahil).
- `dev/` (12 ilan): yazılım, veri, pazarlama, finans, İK, satış. İK ve satış 2026-10-29'a kadar holdout'tu; 6 kez toplam skoruna bakıldığı için dev'e taşındı.
- `holdout/` (6 ilan, **holdout v2**): sağlık, lojistik, eğitim. Hiç görülmemiş sektörler; `autoresearch/scenario-261029-2122/` kenar durumlarını taşır (Kariyer.net birleşik başlığı, TR demografik şartlar, satır içi tercih, unvan eşanlamı/çevirisi, rakamlı kısaltmalar, cümle ortasında zayıf fiil, 40+ kelimelik madde, kıvrık kesme işaretli ekler). Gold iki bağımsız etiketleyiciyle kör yazıldı. Not: holdout v2'yi motoru geliştiren oturum yazdı; içeriği bilinir, bu yüzden tur sırasında holdout dosyaları ve raporu açılmaz.
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
- Holdout'a yapılan her bakış "Durum" bölümünde sayılır. Bakış sayısı artınca seçim yanlılığı birikir; birkaç tur sonra yeni bir holdout gerekir.
- Tur sonu reviewer düzeltmeleri motoru değiştirirse dev ve holdout yeniden ölçülür ve sonuç commit mesajına yazılır.

## Durum (2026-10-30)
Ölçüm ya da veri seti her değiştiğinde yeni bir baseline (B0–B4) alındı. Farklı baseline'lardaki skorlar birbiriyle karşılaştırılamaz.

| Aşama | Ne değişti | Dev | Holdout |
|---|---|---|---|
| Tur 1 öncesi | ilk ölçüm | 90.6 | 86.6 (eski) |
| Tur 1 sonu + temizlik | motor | 95.3 | 90.4 (eski) |
| B0 | ölçüm düzeltmesi (gold bağlama) | 96.2 | 90.4 (eski) |
| B1 | metriğe öneri F1 ve önem doğruluğu eklendi | 94.0 | 86.7 (eski) |
| B2 | eski holdout dev'e taşındı, holdout v2 eklendi | 91.9 | 79.3 (v2) |
| Tur 2 sonu | motor (9 değişiklik) | 94.9 | 80.8 (v2) |
| B3 | dev gold'unda önem etiketleri yazılı kurala göre düzeltildi (aday 0) | 94.9 | 80.8 (v2, yeniden ölçülmedi) |
| **B4** | ehliyet anahtar kelimeden koşula taşındı, iki dev ilanına koşul satırları eklendi | **94.9** | **80.8 (v2, yeniden ölçülmedi)** |

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

Eski holdout'a 6 kez toplam skor olarak bakıldıktan sonra bu set dev'e taşındı. **Holdout v2'ye 3 kez bakıldı** (B2, tur 2 sonu, review düzeltmelerinden sonra); hepsinde yalnızca toplam skor okundu, ayrıntılı rapor hiç açılmadı.
- **Kazara 4. bakış (2026-10-30, aday 0 hazırlığı):** `eval/` üzerinde çalıştırılan bir grep, `report-holdout.md`'den üç "Yanlış önem" satırını gösterdi: ALS (gold tercih, motor zorunlu), SAP (gold zorunlu, motor tercih) ve BLS (gold zorunlu, motor tercih).
- Bu üç satır satır içi tercih kuralının (aday 1) holdout'taki hatalarını ele veriyor, yani aday 1 için yanlılık riski taşıyor.
- Bundan sonra grep'ler `eval/dev` ile sınırlandırılmalı.

## Sonraki tur adayları (öncelik sırasıyla)
1. **Satır içi tercih kapsamı (PRD 1):** "tercihen", "ideally" ve "a plus" yalnızca ait oldukları öğeyi tercih yapmalı. Örnek: "Google Analytics (tercihen GA4), Search Console…" satırında yalnızca GA4 tercih olmalı.
   - Şu an "ideally" `INLINE_PREFERRED` listesinde (`keywords.ts`) yok.
   - Yalnızca bu işaretin eklenmesi SaaS'ı (en-sales-1) düzeltmez:
     - "Series B SaaS company" ilk satırda `normal` çıkıyor ve birleştirmede en yüksek önem alındığı için sonuç `normal` kalıyor.
     - Tanıtımdaki alan kelimelerini atlayan kural yalnızca başlıklı ilanlarda çalışıyor, en-sales-1'de ise hiç başlık yok.
     - SaaS'ın düzelmesi için başlıksız ilanlarda da tanıtım cümlesinin atlanması gerekiyor. Bu yapılmazsa SaaS bilinen bir açık olarak kalır.
   - Ağırlık `preferred` için 0.5 olduğundan sıralama metriği (36/36) o turda ayrıca izlenmeli.
2. **Sektör genelleşmesi:** Holdout v2 farkı (14.1) büyük ölçüde sözlükte olmayan sağlık, lojistik ve eğitim terimlerinden kaynaklanıyor. Holdout'a bakarak sözlük doldurmak ezber olur. Doğru yol, sözlüğü holdout'u görmeden genel kaynaklardan genişletmek ya da sözlük dışı terimleri (ilandaki kısaltmalar, isim öbekleri) daha iyi çıkarmak.
3. **Kalan dev hataları (tur 2 raporu):**
   - Çıkarılamayan satış terimleri: saha satışı, bayi yönetimi, müşteri portföyü yönetimi, teklif hazırlama, pipeline management, discovery calls.
   - Fazladan çıkarılan kelimeler: bölüm adları (Economics, İktisat / İşletme). Gold kuralı bunları anahtar kelime saymıyor, motor ise eğitim önerisi için çıkarıyor; bu bir karar konusu.
   - FP&A Analyst ≈ Financial Analyst unvanı tanınmıyor.
   - ROLE_WORDS'de "partner" yok, bu yüzden "Talent Acquisition Partner" ilanında unvan önerisi hiç çıkmıyor.
   - İma ile kanıtta fazladan `only-in-skills`: blog yazıları → content marketing.
   - **Gold'da ERP eksik:** en-finance-1 ("Experience with an ERP") ve tr-finans-1 ("ERP programlarında tecrübeli") ilanlarında ERP bir şart, ama gold'da yok. Motor ERP'yi çıkarıyor ve bu şu an fazladan sayılıyor.
     - Ayrı bir etiketleme işi, tur dışında yapılmalı.
     - SAP için dış görüşün önerdiği okumayla birlikte ele alınmalı: kategori (ERP) zorunlu, örnek araç (SAP) tercih.
   - "What you'll be doing" başlığı tanınmıyor (`HEADING_PATTERNS`'taki "what you'll do" bu ifadeyi kapsamıyor). Bu yüzden en-hr-1'in sorumluluk satırları ilk bölüm (`intro`) sayılıyor. Şu an sonucu değiştirmiyor (LOW).
4. **Review'dan kalan LOW'lar:**
   - Ölçülmemiş madde kontrolü bitişik birimleri (5GB, 10km, 40hrs) ad sayıyor.
   - Madde yedeği, deneyim bölümü hiç ayrıştırılamadığında madde işaretli beceri ve eğitim satırlarını da madde sayıyor (`suggest.ts`'teki ponytail notu).
   - `titleVariants` en kötü durumda 4096 varyant üretiyor; bu yalnızca 6 kelimelik yapay bir unvanda olur.
   - TR edilgen yapı tespiti yok.
5. **PRD'ler** (`autoresearch/improve-261029-2057/`; uygulama durumu orada `improvement-plan.md`'de): kişisel bilgi kontrolü (PRD 5), deneyim yılı yüzdesi (PRD 6), PDF metin sağlığı (PRD 3) ve eşleşme şeffaflığı (PRD 7) henüz yapılmadı.
6. Bilinen küçük sorunlar (LOW): "Social Profiles" başlığı özet sayılabilir; "digital markets" → digital marketing; "International/Leadership …" ilk satırı unvan sanılabilir.

Kapananlar: ölçüm düzeltmesi (B0); öneri kalitesi metriği (B1); önem etiketleme kuralı ve dev gold tutarlılığı (B3, eski aday 0); tur 2'de zayıf fiil kapsamı, unvan eşanlamları ve çevirisi, başlıksız CV'de özet ve madde ayrıştırma, rakamlı kısaltmalar, "Artılar" ve "big plus" işaretleri, tanıtım bloğundaki sektör kelimeleri, -ize türetmesi ve Python ima kuralı.
