# PRD 3: PDF metin çıkarma sağlığı
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
Tasarım araçlarıyla (Canva, Figma) hazırlanan PDF'lerde metin harf aralıklı çıkabiliyor ("D a t a  A n a l y s t"), ligatürler bozulabiliyor (fi/fl yerine boş ya da özel karakter) ve süs madde işaretleri okunmayabiliyor (it.4, it.9). Bu durumda motor hiçbir şeyi eşleştiremiyor ve kullanıcı yalnızca düşük bir skor görüyor; nedenini öğrenemiyor. Mevcut `checkAts` yalnızca hiç metin olmamasını ve çok sütunlu düzeni algılıyor.

## Kullanıcı hikâyesi
- Canva'da CV hazırlamış bir aday olarak, skorum PDF okunamadığı için düşükse bunu açıkça görmek istiyorum.

## Gereksinimler
- **Must:** Harf aralıklı kelime oranını ölçen bir kontrol: tek harflik token'ların bütün token'lara oranı belirli bir eşiği aşarsa uyarı.
- **Must:** Bozuk karakter oranını ölçen bir kontrol: U+FFFD, özel kullanım alanı (Private Use Area) ve kontrol karakterleri.
- **Should:** Uyarı mesajı, kullanıcıya kopyala-yapıştır testini önermeli.

## Kabul kriterleri
- Harf aralıklı ya da bozuk karakterli sentetik metin parçaları için birim testi; normal CV'lerde yanlış alarm yok (eval'deki 36 CV ile kontrol edilir).

## Teknik başlangıç noktaları
- `suggest.ts`: `checkAts` içine `textItems` üzerinde iki oran hesabı eklenir.

## Riskler ve güven
- HIGH. Eşikler veriyle ayarlanmalı. Gerçek bir Canva PDF örneği yok. **DECISION NEEDED:** Gerçek bir Canva PDF'i mi temin edelim, yoksa sentetik bir `textItems` fixture'ı mı kullanalım?

## Başarı metrikleri
- 36 eval CV'sinde yanlış alarm 0.
- Sentetik bozuk örneklerde yakalama oranı %100.
