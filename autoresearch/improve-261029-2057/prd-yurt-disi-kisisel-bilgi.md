# PRD 5: Yurt dışı CV'si için kişisel bilgi kontrolü
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
TR CV geleneğinde doğum tarihi, medeni hal ve askerlik durumu yazılıyor (it.5). ABD ve İngiltere'ye yapılan başvurularda ise bu bilgiler ayrımcılık mevzuatı nedeniyle olumsuz karşılanıyor (it.13). Bu sorun, EN ve TR CV kullanan hedef kullanıcımıza özgü.

## Kullanıcı hikâyesi
- Yurt dışındaki bir ilana EN CV ile başvuran bir aday olarak, CV'mde orada olmaması gereken bilgileri görmek istiyorum.

## Gereksinimler
- **Must:** İlan ya da CV EN olduğunda "Date of Birth", "Marital Status", "Military Service", "Nationality", "Gender" ve bunların TR karşılıkları algılanırsa kaldırma önerisi verilmeli.
- **Should:** TR CV'de bu bilgiler ilk satırları kaplıyorsa "alta taşı ya da kısalt" önerisi.
- **Won't:** Fotoğraf algılama. `textItems` yalnızca metin içeriyor; görsel algılamak pdfjs'te ek iş gerektirir.

## Kabul kriterleri
- Yeni öneri türü (`kind: personal-details`), birim testi ve ilgili senaryo verisi (Adım 3).

## Teknik başlangıç noktaları
- `suggest.ts`; dil bilgisi `langs` içinde zaten mevcut.

## Riskler ve güven
- HIGH (4'ten fazla kaynak). **DECISION NEEDED:** Hedef ülke ilan dilinden çıkarılıyor; ama EN ilan Almanya ya da İsviçre'den olabilir ve orada bu bilgiler normal karşılanıyor. Öneri bu yüzden "ABD/İngiltere için" diye koşullu yazılmalı.
