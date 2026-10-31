---
name: CVReviewer
description: İlana göre CV değerlendirme; sonuç bir terminal yönlendirmesi gibi okunur.
colors:
  ground: "#eceae4"
  sign: "#ffcc00"
  ink: "#161616"
  white: "#ffffff"
  line: "#d6d3cb"
  muted: "#5c5c58"
  flag: "#a3200f"
typography:
  score:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "6.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  display:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 2rem
    letterSpacing: "-0.025em"
  body:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5rem
  label:
    fontFamily: "OpenSans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25rem
rounded:
  none: "0px"
  full: "9999px"
spacing:
  stack: "10px"
  sign-y: "16px"
  sign-x: "20px"
  column: "32px"
  section: "48px"
  page-x-mobile: "16px"
  page-x-desktop: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "16px 28px"
  button-primary-disabled:
    backgroundColor: "#16161666"
    textColor: "{colors.white}"
  button-file:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "10px 24px"
  button-column-outline:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  sign-high:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
  sign-medium:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
  sign-low:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
  sign-number:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sign}"
    rounded: "{rounded.none}"
    size: "44px"
  score-disk:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    typography: "{typography.score}"
    rounded: "{rounded.full}"
    size: "224px"
  score-column:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "32px"
    width: "360px"
  input-textarea:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px"
  alert-error:
    backgroundColor: "{colors.white}"
    textColor: "{colors.flag}"
    typography: "{typography.label}"
    padding: "8px 12px"
---

# Design System: CVReviewer

## Overview

**Creative North Star: "Aydınlık terminal"**

Sonuç sayfası bir havalimanı terminalindeki yönlendirme tabelası gibi okunur: açık taş renginde bir zemin, solda siyah bir skor sütunu, sağda numaralı tabelalar. Her tabela ne yapılacağını söyler ve sağ kenarında gidilecek CV bölümünü bir okla gösterir. Sistem gün ışığı altında okunmak üzere kuruludur; derinlik, gölge ya da yuvarlatılmış kart yoktur. Hiyerarşi yalnız renk alanı (sarı, beyaz, sade), kalın tipografi ve 2px siyah çizgilerle kurulur.

Yoğunluk bir operasyon ekranınınkidir: kullanıcı skoru görür, hemen ardından sıradaki adımı okur, sonra eksik ve var terimleri, ilan koşullarını, yok sayılan ilan metnini ve ATS okunabilirliğini doğrular. Tek yazı ailesi (Open Sans, normal ve kalın) cümle düzeninde kullanılır; rakamlar her yerde tabulardır. Durum yalnız renkle taşınmaz, biçimle de okunur: dolu kare, boş kare, kesikli kare, üstü çizili metin.

Kapsam: bu sistem `/` analiz sayfasını ve onun bileşenlerini (`ScoreCard`, `Results`, `ResumeDropzone`'un `playgroundView` görünümü, `ResumeTable`, `TopNavBar`, kök `layout`) tanımlar. OpenResume'dan kalan `/resume-builder` ve `/resume-import` sayfaları hâlâ eski OpenResume stillerini (mor-mavi degrade `.btn-primary`, yuvarlatılmış köşeler) kullanır ve bu sistemin dışındadır; oradaki değerler buradaki kurallara örnek alınmaz.

Reddedilen: yeşil/kırmızı çip bulutu ve kartlı panel düzeni (kategori standardı).

**Key Characteristics:**
- Köşesiz düz alanlar; tek istisna skor dairesi.
- Sarı yalnız yön, eylem ve yüksek öncelik için.
- 2px siyah çizgi yapı taşıdır; 1px taş rengi çizgi liste ayırıcıdır.
- Numaralı tabelalar: siyah kare içinde numara, sağda hedef bölüm ve ok.
- Durum biçimle de kodlanır (kare dolu/boş/kesikli, üstü çizili).

## Colors

Açık taş zemin üzerinde siyah tipografi; tek vurgu rengi tabela sarısıdır, kırmızı yalnız hata içindir.

### Primary
- **Tabela Sarısı** (`sign`): Yön ve eylem rengi. Girdi tabelaları (1 İlan metni, 2 CV PDF), yüksek öncelikli öneri tabelaları, skor dairesi, "az sinyal" levhası, siyah sütundaki sayaç değerleri, siyah zemindeki numara rakamları ve "Analiz et" düğmesindeki ok. Metin seçimi (`::selection`) de sarıdır.

### Neutral
- **Terminal Siyahı** (`ink`): Tüm metin, skor sütunu, birincil düğme, numara kareleri, 2px yapı çizgileri, tablo başlık satırları.
- **Tabela Beyazı** (`white`): Orta öncelikli tabelalar, metin kutusu ve bırakma alanı zemini, hata levhaları, ATS tablosu zemini.
- **Taş Zemin** (`ground`): Sayfa zemini.
- **Taş Çizgi** (`line`): Terim listelerinde, koşul listesinde ve tablo satırlarında 1px ayırıcı.
- **Sönük Metin** (`muted`): Yardımcı açıklamalar, bölüm notları ("Skora girmez", "3 adım"), placeholder, yok sayılan ilan metni, "okunamadı" boş değerleri. Taş zemin ve beyaz üzerinde kullanılır; sarı üzerinde kullanılmaz.
- **Uyarı Kırmızısı** (`flag`): Yalnız hata: PDF okunamadı, dosya reddedildi, analiz hatası, karakter sınırı aşıldı, geçmeyen ATS kontrolü. Her zaman kalın metin olarak, beyaz ya da taş zemin üzerinde.

Siyah sütunun içinde ikincil tonlar saydamlıkla üretilir: ayırıcılar beyazın %20'si, ikincil metin %75'i, boş durum %40'ı. Birincil düğmenin hover'ı siyahın %85'i, devre dışı hâli %40'ıdır.

### Named Rules
**The Yön Sarısı Rule.** Sarı yalnız yön/eylem ve yüksek öncelikli tabelalar içindir. Süsleme, vurgu çizgisi ya da başarı rengi olarak kullanılmaz. Orta öncelik beyaz, düşük öncelik sade kalır.

**The Tek Kırmızı Rule.** `flag` yalnız hata uyarısıdır (`role="alert"` ya da başarısız kontrol). Eksik bir beceri hata değildir: eksik terimler kırmızı değil, kalın ve boş kareyle gösterilir.

## Typography

**Display Font:** Open Sans (with system-ui, sans-serif)
**Body Font:** Open Sans (with system-ui, sans-serif)

**Character:** Tek aile, iki ağırlık (normal ve kalın), self-hosted (`public/fonts`). Tabela dili: kalın, sıkı aralıklı başlıklar, cümle düzeni, büyük harf yok.

### Hierarchy
- **Score** (kalın, 6.5rem, satır yüksekliği 1, -0.04em, tabular): Yalnız skor dairesindeki sayı.
- **Display** (kalın, mobilde 2.25rem, sm üstünde 3rem, sıkı aralık): Sayfanın tek h1'i; sonuç varken yalnız ekran okuyucuya kalır.
- **Headline** (kalın, 2.25rem, sıkı aralık): Yalnız ilk (lider) öneri tabelasının başlığı.
- **Title** (kalın, 1.5rem, sıkı aralık): Bölüm başlıkları, diğer tabela başlıkları, girdi tabelası başlıkları. Birincil düğme 1.25rem kalın, açılır bölüm başlığı 1.125rem kalın.
- **Body** (normal, 1rem): Mesajlar ve liste öğeleri; uzun satırlar en fazla 70ch.
- **Label** (kalın ya da normal, 0.875rem): Öncelik etiketi ("Öncelikli"), sayaçlar, bölüm notları, alıntılar, tablo içeriği.

### Named Rules
**The Tabular Rakam Rule.** Skor, sayaçlar, numaralar ve karakter sayacı her zaman `tabular-nums` ile dizilir.

**The Başlık Üstü Boş Rule.** Başlığın üstünde etiket (kicker/eyebrow) yoktur. Öncelik etiketi başlığın altında durur; bölüm notu başlık satırının sağına hizalanır.

## Layout

Masaüstünde iki sütunlu ızgara: solda 360px (22.5rem) siyah skor sütunu, `lg` üstünde sticky (üstten 24px); sağda esnek içerik sütunu, aralarında 32px. Sayfa yan boşluğu mobilde 16px, `lg` üstünde 48px. Üst bar 3.5rem yüksekliğinde, zeminle aynı renkte, çizgisiz.

Tabelalar dikeyde 10px aralıkla istiflenir; iç boşluk 16px x 20px, lider tabelada dikey 24px. Bölümler arası 48px. Tabela içi ızgara: 44px numara sütunu, esnek içerik, sağda hedef bölüm; mobilde hedef bölüm içeriğin altına iner. Beceri listeleri `md` üstünde iki sütundur (Eksik / Var).

Mobilde ızgara tek sütundur: analiz öncesi boş skor dairesi girdilerin altına iner, sonuç varken skor sütunu başa gelir.

## Elevation & Depth

Sistem tamamen düzdür: gölge yoktur. Derinlik yerine renk alanı ve çizgi kullanılır: siyah sütun, sarı ve beyaz tabela alanları, 2px siyah üst/alt çizgiler. Tek hareket açılır bölüm okunun 90° dönmesidir.

### Named Rules
**The Gölgesiz Tabela Rule.** Hiçbir yüzey gölge ya da yükselti almaz; ayrım renk alanı ve 2px çizgiyle yapılır.

## Shapes

Köşeler sıfırdır: tabelalar, düğmeler, metin kutusu, numara kareleri, durum kareleri, tablo. Tek yuvarlak biçim 224px skor dairesidir. Çizgi dili iki kalınlıktadır: yapı için 2px siyah (bölüm başlığı alt çizgisi, düşük öncelik ve açılır bölüm üst çizgisi, metin kutusu, ATS tablosu), liste ayırıcı olarak 1px taş çizgi. Kesikli çizgi sonuç içeriğinde düşük güven demektir: kesikli kare (sözlük dışı ifade) ve kesikli skor dairesi (az sinyal). Bırakma alanının 2px kesikli çerçevesi dosya bırakma alanı alışkanlığıdır.

### Named Rules
**The Biçimle Durum Rule.** Durum rengin yanında biçimle de taşınır: dolu kare = CV'de var, boş kare = eksik, kesikli kare/çerçeve = düşük güven, üstü çizili = analize alınmadı. Renk tek başına durum taşımaz.

## Components

### Buttons
Ağır, köşesiz, kararlı.
- **Shape:** Köşesiz (0px).
- **Primary:** Siyah zemin, beyaz kalın metin (1.25rem), 16px x 28px; sağında sarı ok ikonu. Tek ana eylem: "Analiz et".
- **Hover / Focus:** Hover siyahın %85'i; focus 2px siyah outline, 2px offset. Devre dışı siyahın %40'ı ve engel nedeni yanında sönük metinle yazılır.
- **Dosya seç:** Siyah zemin, beyaz kalın, 10px x 24px.
- **Sütun düğmesi:** Siyah sütunda 2px beyaz çerçeve, tam genişlik; hover beyaz zemin siyah metin; focus outline sarı.
- **İkon düğmesi:** Dosyayı kaldır; sönük ikon, hover siyahın %10'u zemin.

### Cards / Containers
- **Corner Style:** Köşesiz.
- **Background:** Sarı (yüksek öncelik, girdi tabelaları), beyaz (orta öncelik, boş durum), zemin (düşük öncelik).
- **Shadow Strategy:** Yok (bkz. Elevation & Depth).
- **Border:** Beyaz ve sarı tabelalarda çerçeve yok. Düşük öncelikli tabela yalnız 2px siyah üst çizgi taşır.
- **Internal Padding:** 16px x 20px.

### Inputs / Fields
- **Style:** Beyaz zemin, 2px siyah çerçeve, köşesiz, 12px iç boşluk, dikey boyutlanır; altında tabular karakter sayacı.
- **Focus:** 2px siyah outline, 2px offset.
- **Error / Disabled:** Sınır aşılınca sayaç kalın kırmızı; hata mesajı beyaz levhada kalın kırmızı.
- **Bırakma alanı:** Beyaz zemin, 2px kesikli sönük çerçeve; sürüklerken çerçeve siyah, zemin sarının %30'u.

### Navigation
Üst bar: solda kalın "CVReviewer" (1.125rem, sıkı aralık), sağda kilit ikonlu sönük gizlilik notu; mobilde kısa metin. Footer sönük 0.875rem, altı çizili bağlantı.

### Öneri Tabelası (Sign)
Sistemin imza bileşeni. Solda 44px siyah kare içinde numara (yüksek öncelikte sarı, diğerlerinde beyaz rakam), ortada başlık (terimler ya da öneri türü), altında kalın öncelik etiketi, mesaj ve «» içinde alıntılar; sağda kalın hedef CV bölümü ve 28px ok. İlk tabela lider: başlık 2.25rem, mesaj 1rem.

### Skor Sütunu (ScoreCard)
Siyah sütunda 224px sarı daire ve siyah skor. Az sinyalde daire kesikli 4px sarı çerçeveye ve beyaz rakama döner, altında sarı "az sinyal" levhası çıkar. Altında beyazın %20'si çizgilerle ayrılmış sayaç listesi (değerler kalın sarı). Dil farkı notu 2px sarı çerçeveyle verilir. Skor yalnız burada, `insufficient` bayrağıyla birlikte gösterilir.

### Durum Karesi (Mark)
12px kare, 2px `currentColor` çerçeve; dolu, boş ya da kesikli.

### Açılır Bölüm (Fold)
2px siyah üst çizgi, 1.125rem kalın başlık, sağda açılınca 90° dönen ok.

## Do's and Don'ts

### Do:
- **Do** sarıyı (`sign`) yalnız yön, eylem ve yüksek öncelikli tabelalarda kullan.
- **Do** durumu biçimle de kodla: dolu kare var, boş kare eksik, kesikli düşük güven, üstü çizili yok sayıldı.
- **Do** düşük öncelikli tabelayı yalnız 2px siyah üst çizgiyle ayır.
- **Do** her eylem tabelasına hedef CV bölümünü ve oku sağ kenarda yaz.
- **Do** rakamları `tabular-nums` ile diz, uzun metni 70ch ile sınırla.

### Don't:
- **Don't** kırmızıyı (`flag`) hata uyarısı dışında kullanma; eksik beceri hata değildir.
- **Don't** beyaz ya da sarı tabelaya kart çerçevesi koyma.
- **Don't** düşük önceliği kesikli çerçeveyle gösterme; kesikli düşük güvene ayrılmıştır.
- **Don't** başlığın üstüne kicker/eyebrow etiket koyma.
- **Don't** gölge, yuvarlatılmış köşe ya da yeşil/kırmızı çip bulutu kullanma.
- **Don't** `/resume-builder` ve `/resume-import` sayfalarındaki OpenResume stillerini (`.btn-primary` degradesi, `--theme-purple`, `--theme-blue`) bu sisteme taşıma.
