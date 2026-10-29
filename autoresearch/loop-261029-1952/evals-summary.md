# Autoresearch döngü özeti (loop-261029-1952)

- Hedef: ilan-CV eşleştirme motoru doğruluğu (EVAL_SCORE, yüksek iyi), 10 iterasyon, guard `npx jest --ci`.
- Sapma: iterasyon commit'leri yerine scratchpad snapshot (CLAUDE.md: her commit öncesi reviewer zorunlu);
  tutulan değişiklikler tek commit olarak reviewer zinciriyle girildi.
- Sonuç: 10/10 keep, 0 discard. Dev 90.6 → 95.5 (+4.9, %5.4). Holdout (döngüde hiç açılmadı) 86.6 → 89.9 (+3.3).
- Genelleşme: dev kazancının ~%67'si holdout'a taşındı; dev-holdout farkı 4.0 → 5.6 (hafif ezber, büyük kısmı it.10 sözlük eklemeleri).

## En etkili 3 değişiklik
1. it.2 araç→uygulama çıkarımı (IMPLIED_BY) +1.3
2. it.10 ekosistem sözlüğü +1.0 (dev'e en çok yaslanan değişiklik)
3. it.6 ima bilgisi (bulut ürünleri, finansal tablolar, sunum→iletişim) +0.6

## Checkpoint'ler
- it.1-3: 90.6 → 92.9, yukarı
- it.4-6: 92.9 → 93.9, yukarı
- it.7-9: 93.9 → 94.5, yavaşlıyor (iterasyon başı +0.1–0.3)

## Bilinen ölçüm sorunu (sonraki tura)
eval/run-eval.ts `isSameKeyword` gevşek: gold alias içinde başka bir becerinin adı geçince ("Excel macros" → Excel)
gold yanlış anahtar kelimeye bağlanıyor; "VBA/IFRS/KDV/CPA" hatalarının çoğu bu artefakt. Düzeltilip yeniden baseline alınmalı.
