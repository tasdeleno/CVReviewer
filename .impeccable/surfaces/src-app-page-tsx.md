---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

Scope: `/` analiz sayfası (tek sayfa). Visitor mode: Operate. Masaüstü öncelikli, mobil düzgün.
Audience/job: ilana başvurmadan önce CV'sini ilana göre düzeltmek isteyen kişi; ilan metnini yapıştırır, PDF CV'yi bırakır, "Analiz et".
Proof/content: motorun gerçek çıktısı (skor + insufficient, matches, conditions, suggestions, ats, ignored, langs).
Constraints: yeni bağımlılık yok, dış istek yok, düz metin render, skor yalnız ScoreCard'da ve insufficient bayrağıyla.

## Direction contract
THESIS: Sonuç sayfası bir terminal yönlendirmesidir: ne yapacağın numaralı sarı tabelalarda, gidecekleri CV bölümüyle yazılır. Reddedilen: yeşil/kırmızı çip bulutu ve kartlı panel (kategori standardı).
OWN-WORLD: Gün ışığı terminal. Açık taş zemin #eceae4, tabela sarısı #ffcc00 yalnız yön/eylem için, siyah #161616 tipografi ve skor sütunu, beyaz tabela ikincil adımlar için. Open Sans (normal/kalın), cümle düzeni, tabular rakamlar. Köşesiz paneller, 2px siyah çizgiler, ok ikonları. Durum biçimle de okunur: dolu/boş kare, kesikli çerçeve = düşük güven, üstü çizili = yok sayıldı.
STORY: Kullanıcı skoru görür, hemen ardından sıradaki adımı ve hangi CV bölümüne gideceğini anlar; sonra eksik/var terimleri, koşulları, yok sayılan ilan metnini ve ATS okunabilirliğini doğrular.
FIRST VIEWPORT: Üstte ince bar (CVReviewer, gizlilik notu). Analiz sonrası: solda 360px siyah sütun (sticky): sarı daire skor (insufficient ise beyaz, kesikli çerçeve + "az sinyal" levhası), dil etiketi, zorunlu/istenen/tercih/ATS sayıları, "ilanı/CV'yi değiştir". Sağda numaralı tabelalar: yüksek öncelik sarı, orta beyaz, düşük sade; başlık = terimler ya da öneri türü, alt satır mesaj, sağda hedef CV bölümü + ok. Analiz öncesi: aynı ızgarada sağda iki numaralı girdi tabelası (1 İlan metni, 2 CV PDF) ve siyah "Analiz et" düğmesi; solda boş skor dairesi.
FORM: Sarı terminal yönlendirme tabelası, C2 "Aydınlık terminal" (kullanıcı 4 sürümden seçti); challenger wayfinding-cartography-signage-terminal-yellow-wayfinding; seed key 93628956.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
