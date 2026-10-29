# Autoresearch döngü özeti (loop-261029-2136, tur 2)

- **Hedef:** ilan-CV eşleştirme ve öneri motorunun doğruluğu. Metrik EVAL_SCORE (yüksek iyi). B1'den itibaren öneri F1 ve önem doğruluğu da metriğe dahil. 10 iterasyon yapıldı; guard `npx jest --ci`.
- **Protokol sapması (önceki turdaki gibi):** İterasyon başına commit yerine scratchpad'de snapshot tutuldu. Tutulan değişiklikler tur sonunda tek commit olarak, reviewer zinciriyle girildi.
- **Sonuç:** 9 iterasyon tutuldu, 1 atıldı. Dev 91.9 → 94.9 (+3.0, %3.3).
- **Holdout v2** (tur boyunca açılmadı, yalnızca toplam skor okundu): 79.3 → 80.8 (+1.5).
- **Genelleşme:** Dev kazancının yaklaşık %50'si holdout'a taşındı ve dev–holdout farkı 12.6'dan 14.1'e açıldı. Kazançların çoğu öneri kurallarından geldi: zayıf fiil, unvan eşanlamları, ayrıştırma ve madde yedeği. Bu kurallar dil ve biçim düzeyinde genel. Holdout'taki farkın asıl kaynağı ise yeni sektör terimlerinin sözlükte olmaması, ve bunu kapatacak hiçbir ekleme bilinçli olarak yapılmadı.

## En etkili 3 değişiklik
1. it.3 (+0.7): Madde işaretiyle başlayan satırlar ve parantezsiz telefon numaraları artık özet sayılmıyor (başlıksız CV'ler, "Career History" başlığı).
2. it.4 (+0.6): Deneyim bölümü tanınmadığında madde işaretli satırlar madde olarak kullanılıyor.
3. it.1 (+0.5): Zayıf fiil kapsamı genişledi: EN "was/help/assist/support" biçimleri, TR "sorumluydum" ve "destek verdim" cümle içinde de yakalanıyor.

## Checkpoint'ler
- **it.1–3:** 91.9 → 93.5, yukarı.
- **it.4–6:** 93.5 → 94.1, yukarı. it.6 atıldı: only-in-skills'i normal önemdeki becerilere genişletmek precision'ı recall'dan fazla düşürdü.
- **it.7–10:** 94.1 → 94.9, yavaşlıyor (iterasyon başına +0.1–0.3).

## Ölçüm bulgusu (tur dışı, ayrı düzeltilecek)
"Ideally" etiketlemesinde dev ve holdout gold'ları birbiriyle tutarsız:
- Dev gold'unda en-finance-1 "ERP, ideally SAP" → SAP **zorunlu**; en-sales-1 "ideally selling SaaS" → SaaS **zorunlu**.
- Holdout v2 gold'unda ise "ALS ideally" → **tercih**.

Öğe düzeyinde "ideally" kuralı bu yüzden dev'de ceza alıyor. Bu durum PRD 1'in (satır içi tercih kapsamı) önünü tıkıyor. Önce dev gold'u kılavuza göre düzeltilmeli (ayrı commit, yeni baseline), sonra kural denenmeli.

## Review sonrası (commit 376cc41)
typescript-reviewer'ın bulgularına göre yapılan düzeltmeler skorları değiştirmedi: dev 94.9, holdout v2 80.8 (3. bakış, yalnızca toplam skor).
- **HIGH:** titleVariants ilanın kendi kelimesini düşürüyordu; "Engineering Manager" kendisiyle eşleşmiyordu.
- **MEDIUM:** Sayı regex'i "10k" ifadesinde geri izliyordu. Birim listesiyle çözüldü.
- **MEDIUM:** Madde yedeği yalnızca hiç iş deneyimi ayrıştırılamadığında çalışacak şekilde daraltıldı.

Sonrasında yapılan regresyon kapısı (`autoresearch/regression-261029-2203/`) STABLE çıktı.
