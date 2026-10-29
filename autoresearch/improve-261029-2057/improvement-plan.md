# Improvement plan: CV-ilan uyum analizi ve öneri kalitesi

ICP: İlanına göre CV'sini uyarlamak isteyen, EN veya TR CV kullanan iş arayanlar (Türkiye'de ya da yurt dışında başvuranlar). Gizliliğe önem veriyorlar; ücretsiz ve yerel çalışan bir araç istiyorlar.

## ICP kapısı
Araç tarayıcıda, yapay zekâ olmadan, sunucusuz ve üçüncü taraf isteği olmadan çalışmak zorunda. Bu yüzden şunlar elendi:
- Yapay zekâ ile madde yeniden yazma ve tek tıkla uyarlama (Huntr, Teal)
- İnsanlı CV incelemesi ve mülakat simülasyonu (Careerflow karşılaştırması)
- İş başvuru takibi (Teal): hedefin dışında

Kalan bütün bulgular yerel kural ya da sözlük ile yapılabilir.

## Must-have (ikili karşılaştırmayla sıralandı)
| # | Özellik | Güven | Gerekçe |
|---|---|---|---|
| 1 | **Zorunlu/tercih ayrımının doğruluğu ve TR demografik şartlar** | MEDIUM | Kullanıcılar zorunlu ile tercih edilen nitelikleri ayırt edemiyor (it.3). TR ilanlarında yaş, cinsiyet, askerlik ve medeni hal şartları becerilerle karışık yazılıyor (it.8). Bu sorun her analizin anahtar kelime listesini bozuyor; satır içi "tercihen" kapsam hatası da buraya giriyor. |
| 2 | **Unvan eşanlamları** | HIGH | Jobscan'de unvan eşleşmesi skoru doğrudan etkiliyor (it.7). Bizde unvan önerisi var ama "Engineer" ile "Developer"ı eşleştiremiyor. Ucuz bir değişiklik ve hem eval'i hem öneriyi düzeltiyor. |
| 3 | **PDF metin çıkarma sağlığı** | HIGH | Canva ve benzeri tasarım araçlarından çıkan PDF'lerde harf aralıklı kelimeler, bozuk ligatürler ve süs madde işaretleri sessizce okunamıyor (it.4, it.9). Bu durumda bütün eşleşme yanlış çıkıyor ama kullanıcı nedenini görmüyor. Mevcut ATS kontrolleri bunu kapsamıyor. |
| 4 | **Satır düzeyi yazım kontrolleri (EN+TR)** | HIGH | Resume Worded'ın öne çıktığı alan bu (it.2, it.6): edilgen yapı, şahıs zamiri ("I", "ben"), klişe ve tekrar eden fiil. Elimizde zayıf fiil, ölçülmemiş madde ve uzun madde kontrolleri zaten var; bunlar onların doğal uzantısı. |
| 5 | **Yurt dışı CV'si için kişisel bilgi kontrolü** | HIGH | TR alışkanlığıyla EN CV'ye doğum tarihi, medeni hal ve askerlik bilgisi konuyor; ABD ve İngiltere'de bu olumsuz karşılanıyor (it.13). Kontrol yalnızca metinden yapılıyor ve EN/TR kullanıcıya özgü bir fark yaratıyor. Fotoğraf metinden algılanamıyor. |
| 6 | **Deneyim yılı şartı** | MEDIUM | "En az 3 yıl" ya da "5+ years" şartı CV'deki toplam süreyle karşılaştırılmıyor (it.11). İlandan yıl şartı ayrıştırılıp iş deneyimi tarihlerinden toplam süre hesaplanmalı; orta karmaşıklıkta bir iş. |
| 7 | **Eşleşmenin nasıl bulunduğunu gösterme ve skor açıklaması** | HIGH | Literal eşleştirme kullanıcıyı birebir ifadeye ve anahtar kelime doldurmaya itiyor (it.1, it.10). Motorda yalnızca eşleşen formun açığa çıkarılması gerekiyor; işin geri kalanı arayüz (Faz 4). |

## Nice-to-have
- Anahtar kelime doldurma uyarısı: aynı terimin aşırı tekrarı ya da bağlamsız uzun beceri listesi (it.10, MEDIUM)
- Ölçülebilir sonuç sayısı ve CV uzunluğu kontrolü (it.7, MEDIUM)
- Soft skill'lerin maddelerde kanıtlanması önerisi (it.12, MEDIUM)
- Konum (şehir) okunamadığında uyarı (it.14, LOW)

## Moonshot
- "Başvurmalı mıyım?" kararı: yalnızca zorunlu niteliklere göre eşik ve açıklama

## Eval'e girdiler
**(a) Öneri metriği (Adım 2).** Mevcut ve ölçülebilir öneri türleri metriğe girecek: `no-summary`, `title`, `weak-verbs`, `unquantified`, `long-bullets`, `only-in-skills`. Yeni türler (`personal-details`, `passive-voice`, `experience-years`, `extraction-health`) uygulandıkça metriğe eklenecek. Bu plan kapsamında yalnızca hangi önerinin değerli olduğunu bilmek için kullanılıyorlar.

**(b) Senaryo tohumları (Adım 3):**
- Kariyer.net tarzı başlıklar ("Genel Nitelikler", "İş Tanımı")
- Demografik şartlar ("askerliğini tamamlamış", yaş aralığı)
- Satır içi "tercihen"
- Yıl şartı ("en az 3 yıl", "5+ years")
- Yurt dışına EN başvuru yapan ama kişisel bilgileri TR alışkanlığıyla yazan CV
- Unvan eşanlamı (ilanda "Engineer", CV'de "Developer")
- İki sütun, başlıksız ve karışık dil
