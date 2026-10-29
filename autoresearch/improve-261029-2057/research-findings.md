# Araştırma bulguları (improve-261029-2057)

Her bulgunun kaynakları ve iterasyon ayrıntısı `results.tsv` dosyasında (sütunlar `|` ile ayrılıyor). Kaynakların çoğu satıcı ve kariyer blogu; bağımsız bir araştırma bulunamadı. Güven etiketleri yalnızca kaynak sayısını gösteriyor, kaynak kalitesini değil.

| it | Kategori | Bulgu | Önerilen mekanizma | Güven | Kodla karşılaştırma |
|---|---|---|---|---|---|
| 1 | ICP | Literal eşleştirme birebir ifadeye ve skoru kovalamaya itiyor | Eşleşen formu göster, skor açıklaması | HIGH | Motor eşanlam ve ek eşleşmesini yapıyor ama eşleşen formu vermiyor (PRD 7) |
| 2 | Rakip | Rakipler ücretli ya da sınırlı; Jobscan anahtar kelime odaklı | Ücretsiz, yerel tarama ve satır düzeyi kontroller | MEDIUM | Konumlandırma bulgusu |
| 3 | UX | Zorunlu ile tercih ayrımı net değil | Doğru önem tespiti ve sıralama | MEDIUM | Önem var, ama satır içi "tercihen" kapsamı hatalı (PRD 1) |
| 4 | ICP | Çok sütun, tablo, metin kutusu ve üst bilgi ayrıştırmayı bozuyor | Ek ATS kontrolleri | HIGH | Yalnızca çok sütun ve metinsiz PDF algılanıyor |
| 5 | ICP | TR CV'lerinde kişisel bilgi fazla yer kaplıyor | Kısalt ya da alta taşı | MEDIUM | Yok (PRD 5) |
| 6 | Rakip | Resume Worded satır düzeyi kontrolleri (edilgen, zamir, klişe, tekrar) | EN+TR kurallar | HIGH | Zayıf fiil, ölçüm ve uzunluk kontrolleri var; diğerleri yok (PRD 4) |
| 7 | Rakip | Jobscan'de unvan eşleşmesi skora giriyor; ölçülebilir sonuç sayısı ayrı | Unvan eşanlamları | HIGH | Unvan önerisi var, eşanlam yok (PRD 2) |
| 8 | ICP | TR ilanlarında demografik şartlar beceriyle karışık | Ayrı "koşullar" listesi | MEDIUM | Yok (PRD 1) |
| 9 | ICP | Canva PDF'lerinde harf aralığı ve ligatür bozulması | Metin sağlığı kontrolü | HIGH | Yok (PRD 3) |
| 10 | UX | Anahtar kelime doldurma güveni zedeliyor | Tekrar ve yığın uyarısı | MEDIUM | Yok (nice-to-have) |
| 11 | Rakip | Deneyim yılı şartı kontrol edilmiyor | Yüzdesel süre puanı | MEDIUM | Yok (PRD 6) |
| 12 | UX | Bağlamsız beceri zayıf kanıt (uzantı) | only-in-skills, soft skill için kanıt önerisi | MEDIUM | only-in-skills önerisi var |
| 13 | ICP | Yurt dışı EN CV'de doğum tarihi, medeni hal ve askerlik olumsuz | Algıla ve kaldırmayı öner | HIGH | Yok (PRD 5) |
| 14 | UX | Konum okunamazsa konum filtrelerine takılabiliyor (uzantı) | Konum kontrolü | LOW | İsim, e-posta ve telefon kontrolü var; konum kontrolü yok |
