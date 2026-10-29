# PRD 4: Satır düzeyi yazım kontrolleri (EN+TR)
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
Resume Worded, Jobscan'den farkını satır düzeyindeki geri bildirimle yaratıyor: Impact, Brevity ve Style kategorileri (it.2, it.6). Bizde zayıf fiil, ölçülmemiş madde ve uzun madde kontrolleri var. Edilgen yapı, şahıs zamiri, klişe ve fiil tekrarı kontrolleri yok.

## Kullanıcı hikâyesi
- Aday olarak, hangi maddemin neden zayıf olduğunu tek tek görmek istiyorum.

## Gereksinimler
- **Must:** Şahıs zamiri kontrolü (EN: "I, my, me"; TR: madde başında "Ben").
- **Must:** Aynı fiille başlayan madde sayısı 3'ü geçerse uyarı.
- **Should:** EN edilgen yapı ("was/were + -ed") ve klişe listesi ("team player", "hard-working", "results-driven"; TR: "takım oyuncusu", "çalışkan").
- **Won't:** Yapay zekâ ile yeniden yazma (ICP kapısında elendi).

## Kabul kriterleri
- Her kural için yeni bir öneri türü (`kind`) ve birim testi.
- 36 eval CV'sinde öneri metriği düşmüyor.

## Teknik başlangıç noktaları
- `suggest.ts` içindeki `WEAK_START_EN` ve `WEAK_END_TR` desenleri aynı yaklaşımla genişletilir.

## Riskler ve güven
- HIGH. Türkçe edilgen yapı ("-ıldı", "-ildi") tespiti ek çakışmaları yüzünden zor, bu yüzden TR edilgen kontrolü bu kapsamda yok.

## Başarı metrikleri
- Yeni öneri türlerinin eval'deki F1 değeri (gold'a eklendikten sonra).
