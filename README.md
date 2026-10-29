# CVReviewer

[OpenResume](https://github.com/xitanggg/open-resume) fork'u: CV'yi (PDF) yapıştırılan iş ilanına göre
skorlar, ilandaki anahtar kelimelerden CV'de olanları/eksikleri gösterir ve bölüm bölüm öneri verir.
İlan ve CV İngilizce veya Türkçe olabilir (karışık da). Her şey tarayıcıda çalışır; sunucu, yapay zekâ
veya üçüncü taraf istek yoktur.

- Motor: `src/app/lib/job-match/` (anahtar kelime çıkarma, eşleştirme, skor; `suggest.ts` bölüm bölüm
  öneriler ve ATS kontrolleri), parser'a Türkçe desteği eklendi.
- Deneme: `node scripts/gen-fixtures.mjs <klasör>/cvs` ile CV JSON'larını PDF'e çevir, sonra
  `TRY_DIR=<klasör> npm run try` → `<klasör>/ads/*.txt` × `<klasör>/cvs/*.pdf` için skor matrisi ve
  ayrıntılı rapor (`<klasör>/report.md`). Skorlanmaz, gerçek ilan/CV denemek içindir. Gerçek CV
  kullanıyorsan klasörü repo dışında seç; rapor ve PDF'ler yanlışlıkla commit'e girmesin.
- Doğrulama: `npm run eval` — sentetik CV/ilan veri setiyle (`eval/`, bkz. `eval/README.md`) motoru ölçer,
  `EVAL_SCORE` basar. Holdout seti için `EVAL_SPLIT=holdout npm run eval` (yalnız tur sonunda).
- Motor iyileştirme turları: autoresearch döngüsüyle (ölç → değiştir → tut/at). Protokol, güncel skorlar
  ve sonraki tur adayları `eval/README.md`'de; tur kayıtları `autoresearch/loop-*/`.
- Lisans: AGPL-3.0 (upstream ile aynı). Ağ üzerinden kullananlara değiştirilmiş kaynak sunulmalıdır.

### Durum (2026-10-29)
- Tamam: statik export + gizlilik (analytics yok), Türkçe parser, eşleştirme motoru, öneri + ATS modülü,
  sentetik eval (18 ilan; metrik öneri F1 ve önem doğruluğunu da ölçüyor), autoresearch turu 1 ve 2,
  improve araştırması (7 PRD, `autoresearch/improve-261029-2057/`), gerçek ilan denemesi. 38 birim testi.
- Skor (tur 2 sonu): dev 94.9, holdout v2 80.8. Holdout v2'deki sağlık, lojistik ve eğitim ilanları hiç
  görülmemiş sektörler; aradaki fark sözlük eksikliğinden kaynaklanıyor. Ayrıntı ve sonraki adaylar `eval/README.md`'de.
- Sırada: önce dev gold'undaki "ideally" tutarsızlığının düzeltilmesi (ayrı commit), sonra PRD'lerden seçilenler,
  ardından arayüz (Faz 4: Türkçe analiz sayfası; mesajlar yalnız metin olarak render edilir, `dangerouslySetInnerHTML` yok).
- Henüz arayüz yok: motor yalnız `npm run eval` / `npm run try` ve testlerle çalıştırılıyor.

Aşağısı upstream'in orijinal README'sidir.

---

# OpenResume

OpenResume is a powerful open-source resume builder and resume parser.

The goal of OpenResume is to provide everyone with free access to a modern professional resume design and enable anyone to apply for jobs with confidence.

Official site: [https://open-resume.com](https://open-resume.com)

## ⚒️ Resume Builder

OpenResume's resume builder allows user to create a modern professional resume easily.

![Resume Builder Demo](https://i.ibb.co/jzcrrt8/resume-builder-demo-optimize.gif)

It has 5 Core Features:
| <div style="width:285px">**Feature**</div> | **Description** |
|---|---|
| **1. Real Time UI Update** | The resume PDF is updated in real time as you enter your resume information, so you can easily see the final output. |
| **2. Modern Professional Resume Design** | The resume PDF is a modern professional design that adheres to U.S. best practices and is ATS friendly to top ATS platforms such as Greenhouse and Lever. It automatically formats fonts, sizes, margins, bullet points to ensure consistency and avoid human errors. |
| **3. Privacy Focus** | The app only runs locally on your browser, meaning no sign up is required and no data ever leaves your browser, so it gives you peace of mind on your personal data. (Fun fact: Running only locally means the app still works even if you disconnect the internet.) |
| **4. Import From Existing Resume PDF** | If you already have an existing resume PDF, you have the option to import it directly, so you can update your resume design to a modern professional design in literally a few seconds. |
| **5. Successful Track Record** | OpenResume users have landed interviews and offers from top companies, such as Dropbox, Google, Meta to name a few. It has been proven to work and liken by recruiters and hiring managers. |

## 🔍 Resume Parser

OpenResume’s second component is the resume parser. For those who have an existing resume, the resume parser can help test and confirm its ATS readability.

![Resume Parser Demo](https://i.ibb.co/JvSVwNk/resume-parser-demo-optimize.gif)

You can learn more about the resume parser algorithm in the ["Resume Parser Algorithm Deep Dive" section](https://open-resume.com/resume-parser).

## 📚 Tech Stack

| <div style="width:140px">**Category**</div> | <div style="width:100px">**Choice**</div> | **Descriptions** |
|---|---|---|
| **Language** | [TypeScript](https://github.com/microsoft/TypeScript) | TypeScript is JavaScript with static type checking and helps catch many silly bugs at code time. |
| **UI Library** | [React](https://github.com/facebook/react) | React’s declarative syntax and component-based architecture make it simple to develop reactive reusable components. |
| **State Management** | [Redux Toolkit](https://github.com/reduxjs/redux-toolkit) | Redux toolkit reduces the boilerplate to set up and update a central redux store, which is used in managing the complex resume state. |
| **CSS Framework** | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Tailwind speeds up development by providing helpful css utilities and removing the need to context switch between tsx and css files. |
| **Web Framework** | [NextJS 13](https://github.com/vercel/next.js) | Next.js supports static site generation and helps build efficient React webpages that support SEO. |
| **PDF Reader** | [PDF.js](https://github.com/mozilla/pdf.js) | PDF.js reads content from PDF files and is used by the resume parser at its first step to read a resume PDF’s content. |
| **PDF Renderer** | [React-pdf](https://github.com/diegomura/react-pdf) | React-pdf creates PDF files and is used by the resume builder to create a downloadable PDF file. |

## 📁 Project Structure

OpenResume is created with the NextJS web framework and follows its project structure. The source code can be found in `src/app`. There are a total of 4 page routes as shown in the table below. (Code path is relative to `src/app`)

| <div style="width:115px">**Page Route**</div> | **Code Path** | **Description** |
|---|---|---|
| / | /page.tsx | Home page that contains hero, auto typing resume, steps, testimonials, logo cloud, etc |
| /resume-import | /resume-import/page.tsx | Resume import page, where you can choose to import data from an existing resume PDF. The main component used is `ResumeDropzone` (`/components/ResumeDropzone.tsx`) |
| /resume-builder | /resume-builder/page.tsx | Resume builder page to build and download a resume PDF. The main components used are `ResumeForm` (`/components/ResumeForm`) and `Resume` (`/components/Resume`) |
| /resume-parser | /resume-parser/page.tsx | Resume parser page to test a resume’s AST readability. The main library util used is `parseResumeFromPdf` (`/lib/parse-resume-from-pdf`) |

## 💻 Local Development

### Method 1: npm

1. Download the repo `git clone https://github.com/xitanggg/open-resume.git`
2. Change the directory `cd open-resume`
3. Install the dependency `npm install`
4. Start a development server `npm run dev`
5. Open your browser and visit [http://localhost:3000](http://localhost:3000) to see OpenResume live

### Method 2: Docker

1. Download the repo `git clone https://github.com/xitanggg/open-resume.git`
2. Change the directory `cd open-resume`
3. Build the container `docker build -t open-resume .`
4. Start the container `docker run -p 3000:3000 open-resume`
5. Open your browser and visit [http://localhost:3000](http://localhost:3000) to see OpenResume live
