# PRD 2: Unvan eşanlamları
> Auto-generated from research findings. DECISION NEEDED items and LOW-confidence sections require your judgment.

## Problem
Jobscan'de unvan eşleşmesi skoru doğrudan etkiliyor ve unvanı tutmayan adaya özet bölümü öneriliyor (it.7). Bizdeki `suggest.ts` `getAdTitle` fonksiyonu unvanı çekirdek kelimelerle arıyor; bu yüzden "Software Engineer" ilanı ile "Software Developer" CV'si eşleşmiyor.

## Kullanıcı hikâyesi
- Aynı rolü farklı bir unvanla yapmış bir aday olarak, yanlış bir "unvanı ekle" önerisi görmek istemiyorum.

## Gereksinimler
- **Must:** Rol kelimesi eşanlam grupları: engineer/developer/geliştirici/mühendis, specialist/uzman, analyst/analist, manager/müdür/yönetici, coordinator/koordinatör. Gruplar dil bilgisi düzeyinde ve genel olmalı; ilana özgü olmamalı.
- **Should:** Kıdem kelimeleri dışarıda bırakılarak karşılaştırma yapılmalı (bu zaten var).

## Kabul kriterleri
- "Senior Software Engineer" ilanı ile "Yazılım Geliştirici" CV'si için unvan önerisi çıkmıyor.
- "Data Analyst" ilanı ile "Marketing Specialist" CV'si için öneri çıkıyor.

## Teknik başlangıç noktaları
- `suggest.ts`: `ROLE_WORDS` ve `getAdTitle`; `titleInResume` karşılaştırmasına bir eşanlam haritası eklenir.

## Riskler ve güven
- HIGH. Risk: "manager" ile "lead" gibi gerçekte farklı rolleri eşanlam sayarak yanlış pozitif üretmek. Gruplar dar tutulmalı.

## Başarı metrikleri
- Öneri metriğinde `title` türünün F1'i.

## Açık sorular
- Kıdem farkı ("Junior" ilan, "Senior" CV) ayrı bir uyarı mı olmalı?
