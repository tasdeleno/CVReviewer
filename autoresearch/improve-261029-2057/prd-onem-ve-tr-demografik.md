# PRD 1: Zorunlu/tercih ayrımının doğruluğu ve TR demografik şartlar
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
Skor, ilandaki her koşulu önemine göre ağırlıklandırıyor (`keywords.ts`: zorunlu 2, normal 1, tercih 0.5; soft skill ×0.5; sözlük dışı terim ×0.7). Önem, ilanın yapısından çıkarılıyor: koşulun hangi başlık altında olduğu ("Aranan Nitelikler" mi "Artı Olarak" mı) ve satır içi işaretler ("şart", "tercihen", "preferably").

Bu yaklaşımın iki zayıf noktası var:
- Satır içindeki "tercihen" kelimesi yalnızca ait olduğu öğeyi değil, tüm satırı "tercih" yapıyor.
- TR ilanlarındaki yaş, cinsiyet, askerlik ve medeni hal şartları becerilerle karışık yazılıyor (it.8). Bunlar ya yanlış anahtar kelime olarak sayılıyor ya da hiç gösterilmiyor.

Gold'da her terimin önemi (`importance`) zaten etiketli, ama eval bu önemin doğru çıkarılıp çıkarılmadığını **ölçmüyor**.

## Kullanıcı hikâyeleri
- Aday olarak, eksiklerimin hangilerinin zorunlu, hangilerinin artı olduğunu doğru görmek istiyorum; zamanımı zorunlulara ayırabilmeliyim.
- TR ilanına bakan aday olarak, "askerliğini tamamlamış" gibi bir şartın beceri listesinde değil, ayrı bir "ilan koşulu" olarak görünmesini istiyorum.

## Gereksinimler
- **Must:** Satır içi tercih işaretinin kapsamı yalnızca ait olduğu öğe olmalı ("Google Analytics (tercihen GA4), Search Console" → yalnızca GA4 tercih sayılır).
- **Must:** Demografik şartlar (yaş, cinsiyet, askerlik, medeni hal, ehliyet sınıfı) anahtar kelime sayılmamalı; `analyze` sonucunda ayrı bir `conditions[]` listesi olarak dönmeli. Skora girmemeli.
- **Should:** Eval'e önem doğruluğu eklenmeli: gold'daki `importance` ile motorun çıkardığı önem karşılaştırılmalı.
- **Could:** Önem için ek sinyaller: terim ilan unvanında geçiyor mu, ilanda kaç kez tekrarlanıyor.

## Kabul kriterleri
- Satır içi "tercihen" için birim testi.
- TR demografik şartlar `matches` içinde değil `conditions` içinde dönüyor.
- Önem doğruluğu eval raporunda görünüyor.

## Teknik başlangıç noktaları
- `keywords.ts`: `getImportance` fonksiyonunu satır yerine öğe (virgül ya da parantez) düzeyinde çalıştır.
- Demografik şartlar için ayrı bir desen listesi kullan; `NOT_SKILLS` mantığına benziyor.

## Riskler ve güven
- MEDIUM. Ağırlık sayıları (2 / 1 / 0.5) gerçek işe alım verisiyle kalibre edilmedi; el ile konmuş sezgisel değerler.
- Eval yalnızca strong > medium > weak sıralamasını kontrol ediyor; bu sıralamayı birçok farklı ağırlık seti de geçebilir. **DECISION NEEDED:** Ağırlıkları gerçek ilan ve CV denemeleriyle mi ayarlayalım, yoksa sabit mi bırakalım?

## Başarı metrikleri
- Önem doğruluğu ≥ %90.
- Gerçek TR ilanlarında demografik şartların beceri olarak sayılmaması.

## Açık sorular
- Demografik şart kullanıcıya nasıl gösterilmeli? Yalnız bilgi olarak mı, "CV'nde belirtilmemiş" uyarısıyla mı?
