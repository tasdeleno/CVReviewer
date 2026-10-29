# PRD 7: Eşleşme şeffaflığı ve skor açıklaması
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
Literal eşleştirme kullanıcıyı ilandaki ifadeyi birebir kopyalamaya ve anahtar kelime doldurmaya itiyor (it.1, it.10). Motorumuz eşanlam, çeviri ve ek eşleşmelerini zaten yapıyor, ama bir terimin **hangi formla** bulunduğunu dışarıya vermiyor.

## Kullanıcı hikâyesi
- Aday olarak, "Bordro" teriminin CV'mde "Payroll" olarak bulunduğunu görmek istiyorum; böylece gereksiz yere tekrar eklemem.

## Gereksinimler
- **Must (motor):** `KeywordMatch` sonucuna, CV'de bulunan form (`matchedForm`) ve eşleşme türü (`exact`, `inflection`, `translation`, `implied`) eklenir.
- **Must (arayüz, Faz 4):** Skorun nasıl hesaplandığının açıklaması: koşul ağırlıkları ve "bu bir ATS skoru değildir, %100 hedeflenmemeli" notu.
- **Should:** Anahtar kelime doldurma uyarısı (nice-to-have bulgusundan).

## Kabul kriterleri
- `matchedForm` için birim testi; eval davranışı değişmiyor.

## Teknik başlangıç noktaları
- `index.ts`: `matchKeywords` içinde `findPhraseSpan` zaten metindeki formu döndürüyor; yalnızca bu bilginin sonuca taşınması gerekiyor.

## Riskler ve güven
- HIGH. İşin büyük bölümü arayüz (Faz 4); motordaki kısmı küçük.
