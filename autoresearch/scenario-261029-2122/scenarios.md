# Senaryolar (scenario-261029-2122)

Kapsam: EN/TR iş ilanı ile PDF CV'nin analizi. Yalnızca Data, Validation, Happy path ve UX boyutları kullanıldı; diğer 8 boyut bu yerel metin motoru için anlamsız olduğu için kapsam dışı bırakıldı. Ayrıntılar `scenario-results.tsv` dosyasında.

## Data
- **high:** Rakam içeren kısaltmalar (B2B, GA4, 3PL, HTML5, ISO 9001) ölçülmemiş madde kuralını yanıltıyor.
- **high:** Kıvrık kesme işareti (’) ile yazılmış ekler ("SAP’ta", "Excel’de").
- **high:** Yeni sektörlerin sözlüğü eksik. Sağlık (BLS/ALS, EMR, yoğun bakım/ICU), lojistik (WMS, SAP EWM, Incoterms, 3PL) ve eğitim (QTS/PGCE, pedagojik formasyon, CEFR, safeguarding/SEN) terimleri yok.
- **high (uzantı):** Başlıksız CV'de özet ve maddeler ayrıştırılamıyor.
- **medium:** Bölü ile birleşik terimler: BLS/ALS, TMS/WMS.
- **medium:** TR ay adlarıyla yazılmış tarihler ve "Halen", "present", en-dash gibi biçimler.
- **medium:** Süs madde işaretleri (▪, ➢, –) ve "1)" biçiminde numaralı maddeler.
- **medium (uzantı):** Karışık dilli CV: TR başlıklar, EN maddeler.

## Validation
- **high:** Kariyer.net tarzı birleşik başlık: "Genel Nitelikler ve İş Tanımı".
- **high:** TR demografik şartlar (askerlik, yaş, cinsiyet). Bunlar gold'da anahtar kelime olarak yer almaz.
- **high:** Satır içi tercih öğe düzeyinde çalışmalı: "SAP EWM (tercihen)", "Power BI a plus", "ideally with ICU experience".
- **medium:** Deneyim yılı ifadeleri anahtar kelime üretmemeli.
- **low (uzantı):** Başlıksız, düzyazı biçiminde ilan.

## Happy path
- **medium:** Çapraz dil: TR ilan ile EN CV, EN ilan ile TR CV.
- **low:** Yeni sektörde standart, güçlü (strong) CV.

## UX
- **high:** Unvan eşanlamı ya da çevirisi (Staff Nurse≈Registered Nurse, Logistics Specialist≈Lojistik Uzmanı). Bu durumlarda `title` önerisi beklenmez.
- **high:** Cümle ortasında zayıf fiil ("…sorumluydum ve raporladım", "I was responsible for").
- **high:** 40 kelimeyi aşan madde. Mevcut gold'da hiç pozitif örneği yok.
- **medium:** Yurt dışına başvuran TR adayın EN CV'sinde kişisel bilgiler (PRD 5 için veri).
- **medium:** İma ile kanıt: EPIC → EMR, Salesforce → CRM.
- **medium (uzantı):** Özetin bir rol değil hedef söylemesi ("…geçmek istiyorum"), bu durumda `title` beklenir.
- **low (uzantı):** Soft skill'lerin yalnızca sıfat listesi olarak yazılması.

## Veri setine dağıtım (holdout v2: 6 ilan × 3 CV)
| İlan | Taşıdığı senaryolar |
|---|---|
| tr-saglik-1 Yoğun Bakım Hemşiresi | Birleşik Kariyer.net başlığı, demografik şartlar, "(tercihen) sertifika", "en az 2 yıl". CV'ler: strong iki sütunlu TR, medium EN "ICU Nurse" (çapraz dil ve unvan çevirisi), weak başlıksız |
| en-health-1 Registered Nurse | "ideally", BLS/ALS, EMR. CV'ler: strong "Staff Nurse" (unvan eşanlamı) ve 40 kelimeyi aşan madde, medium TR adayın kişisel bilgili EN CV'si, weak bakım asistanı (cümle ortasında zayıf fiil) |
| tr-lojistik-1 Lojistik Uzmanı | WMS, "SAP EWM (tercihen)", Incoterms, askerlik ve ehliyet, "3+ yıl". CV'ler: strong kıvrık kesme işaretli ekler, medium EN "Logistics Specialist" (unvan çevirisi), weak "sorumluydum ve…" (cümle ortası) |
| en-logistics-1 Supply Chain Analyst | "Power BI a plus", "5+ years", S&OP. CV'ler: strong 40 kelimeyi aşan madde, medium B2B/3PL rakamlı kısaltmalar (ölçülmemiş madde), weak özetsiz |
| tr-egitim-1 İngilizce Öğretmeni | Pedagojik formasyon, CEFR, "tercihen CELTA". CV'ler: strong karışık dil (TR başlık, EN madde), medium özet hedef söylüyor, weak başlıksız |
| en-education-1 Primary School Teacher | QTS/PGCE, safeguarding, SEN, "Google Classroom ideally". CV'ler: strong "Year 4 Class Teacher" (unvan eşanlamı), medium süs madde işaretleri ve TR ay adlı tarihler, weak ima ile kanıt |
