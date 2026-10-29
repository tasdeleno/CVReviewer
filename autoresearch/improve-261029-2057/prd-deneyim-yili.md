# PRD 6: Deneyim yılı şartı (yüzdesel)
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
"En az 3 yıl" ya da "5+ years" gibi şartlar CV'deki toplam süreyle karşılaştırılmıyor (it.11).

**Kullanıcı kararı:** Kontrol evet/hayır olarak değil, **yüzdesel** olarak yapılacak.

## Kullanıcı hikâyesi
- Aday olarak, istenen deneyimin ne kadarını karşıladığımı görmek istiyorum. Örnek: "3 yıl istenmiş, CV'nde yaklaşık 2 yıl görünüyor (%67)".

## Gereksinimler
- **Must:** İlandan yıl şartını ayrıştır. EN kalıplar: "X+ years", "at least X years", "X-Y years". TR kalıplar: "en az X yıl", "X yıl ve üzeri".
- **Must:** CV'deki iş deneyimi tarih aralıklarından toplam süreyi hesapla. "Halen", "Present" ve "Günümüz" bugünün tarihi sayılır; çakışan aralıklar birleştirilir.
- **Must:** Puan = min(1, CV süresi / istenen süre). Bu değer skora tek bir ağırlıklı koşul olarak girer: zorunlu bölümdeyse ağırlık 2, tercih bölümündeyse 0.5. Uyum yüzdesi kullanıcıya gösterilir.
- **Should:** Tarih okunamadığında koşul skora girmemeli ve "süre hesaplanamadı" diye bilgi verilmeli. Sessizce 0 sayılmamalı.

## Kabul kriterleri
- Ayrıştırma ve hesaplama için birim testleri (çakışan aralık, "Halen" ve tarih olmayan durumlar dahil).
- Senaryo verisinde yıl şartı bulunan ilanlar.

## Teknik başlangıç noktaları
- `keywords.ts` (ilan tarafı) ve `resume.workExperiences[].date` (parser).
- `computeScore` sabit ağırlıklı kısmi puanı kabul edecek şekilde genişletilir: `found` boolean yerine 0–1 arası bir oran.

## Riskler ve güven
- MEDIUM. Tarih biçimleri çok çeşitli: "2019 - 2021", "Mar 2019 – Present", "03/2019". **DECISION NEEDED:** Bir rolün belirli bir alandaki deneyim olup olmadığı (örneğin "3 yıl Python deneyimi") metinden çıkarılamaz; bu yüzden toplam iş deneyimi kullanılacak. Bu sınır kullanıcıya açıkça söylenmeli.
