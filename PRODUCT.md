# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Kullanıcının kendisi (spor/antrenörlük) ve yakın çevresi; beyaz yaka işlere (idari, pazarlama/satış, finans, yönetim, danışmanlık) başvuran biri dahil. Meslekler her türde olabilir; araç belli bir sektöre bağlı değil. Bir ilana başvurmadan önce, masaüstü ya da dizüstünde, ilanı tarayıcıdan kopyalayıp CV dosyasıyla birlikte çalışırlar. Mobil düzgün çalışmalı, öncelik masaüstü.

## Product Purpose
İlan metni yapıştırılır, CV (PDF) yüklenir. Araç ilana göre bir uyum skoru, ilandaki anahtar kelimelerden CV'de olanları ve eksikleri, ilan koşullarını (ehliyet, askerlik vb., skora girmez) ve CV'nin bölümlerine göre öneriler verir. Ayrıca CV'nin bir ATS tarafından nasıl okunduğunu gösterir. Başarı: kullanıcı başvurmadan önce CV'sinde neyi, hangi bölüme ekleyeceğini bilir.

## Positioning
Yapay zekâ kullanmaz; tüm işlem tarayıcıda yapılır, CV ve ilan hiçbir sunucuya gitmez. Kurallar ve sözlük açık, ölçülmüş ve EN/TR simetriktir (sentetik ve gerçek ilanlarla eval: dev 88.6).

## Operating Context
- İlan ve CV her zaman aynı dilde: İngilizce ya da Türkçe. Arayüz yalnız Türkçe.
- İlan girişi şimdilik yalnız metin (kopyala-yapıştır). İlan linkinden yükleme istendi ama tarayıcı başka sitelerin sayfasını okuyamadığı için sonraki faza aday.
- CV yalnız PDF, tek sütunlu CV'ler en iyi sonucu verir.

## Capabilities and Constraints
- Skor 0–100, ağırlıklı kapsama (zorunlu 3, istenen 1, tercih 0,25; sosyal beceri ×0,25). İlanda üçten az beceri varsa `insufficient` bayrağı: skor bayraksız gösterilmez.
- Sözlük dışı ifadeler (`kind: "phrase"`) daha belirsiz (precision ~%47); sözlük becerilerinden ayrı, düşük öncelikli listelenir.
- Motorun yok saydığı ilan metni (boilerplate, yan haklar, şirket satırı) kullanıcıya gösterilir; sessiz veri kaybı yok.
- Girdi sınırı: ilan ve CV metni 30 000 karakter; PDF 10 MB ve 10 sayfa.
- Statik site (Next 13.4 `output: "export"`, Tailwind 3.3), yeni bağımlılık yok, dış istek yok, mesajlar yalnız metin olarak render edilir.
- CV oluşturucu (`/resume-builder`, `/resume-import`, upstream'den İngilizce) menüde yok, kodu ileride kullanılmak üzere duruyor.

## Brand Commitments
Ad: CVReviewer. OpenResume (AGPL-3.0) fork'u; lisans notu altbilgide.

## Evidence on Hand
Gerçek kullanıcı yorumu, müşteri ya da istatistik yok; uydurulmamalı. Örnek veri: `eval/dev/*` (sentetik CV'ler, sentetik ve gerçek ilanlar).

## Product Principles
- Analiz ve öneri önce gelir; CV üretmek isteğe bağlı. İlk bakışta skor görünür (kullanıcı tercihi: daire skor), hemen ardından "neyi nereye eklemeli".
- Belirsizliği gizleme: yetersiz sinyal, düşük güvenli ifadeler ve yok sayılan metin açıkça işaretlenir.
- Gizlilik varsayılan: hiçbir veri cihazdan çıkmaz.
