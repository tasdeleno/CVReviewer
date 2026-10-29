import { toPhrase, type Phrase } from "lib/job-match/text";

export type SkillCategory =
  | "tech" // programming languages, frameworks, platforms
  | "tool" // software products
  | "method" // methodologies, practices
  | "domain" // domain knowledge
  | "soft" // soft skills
  | "cert" // certificates, licenses
  | "lang" // spoken languages
  | "edu"; // degrees

export interface SkillEntry {
  category: SkillCategory;
  en: string[]; // English surface forms; en[0] is the display label
  tr: string[]; // Turkish surface forms; tr[0] is the display label (falls back to en[0])
  phrases: Phrase[]; // all forms, tokenized for matching
}

/**
 * Bilingual skill dictionary: "category|english, forms|türkçe, formlar".
 * Every form of one line is treated as the same skill, so a Turkish ad keyword can match
 * an English resume and vice versa. Forms are matched on folded tokens with inflection
 * suffixes (see findPhrase), so list base forms only. A "=" prefix marks a form that is
 * also a common word ("=React", "=Excel") and must match case-sensitively.
 */
// prettier-ignore
const RAW = `
tech|Python
tech|Java
tech|JavaScript, JS, ECMAScript
tech|TypeScript, =TS
tech|C#, csharp
tech|C++, cpp
tech|=Go, Golang
tech|=Rust
tech|Kotlin
tech|=Swift
tech|PHP
tech|Ruby, Ruby on Rails, Rails
tech|Scala
tech|R programming, RStudio
tech|SQL, structured query language
tech|NoSQL
tech|HTML, HTML5
tech|CSS, CSS3, Sass, SCSS
tech|=React, React.js, ReactJS
tech|Next.js, NextJS
tech|Angular
tech|Vue, Vue.js, VueJS
tech|Node.js, NodeJS, =Node
tech|Express.js, ExpressJS
tech|Django
tech|Flask
tech|FastAPI
tech|Spring Boot, Spring Framework
tech|.NET, dotnet, ASP.NET, .NET Core
tech|Laravel
tech|GraphQL
tech|REST API, RESTful, REST, RESTful API, web API|web servisi
tech|microservices, microservice architecture|mikroservis, mikroservis mimarisi
tech|PostgreSQL, Postgres
tech|MySQL
tech|MS SQL, SQL Server, MSSQL
tech|Oracle Database, Oracle DB, PL/SQL
tech|MongoDB
tech|Redis
tech|Elasticsearch
tech|Kafka, Apache Kafka
tech|RabbitMQ
tech|Docker, containerization, containers|konteyner
tech|Kubernetes, K8s
tech|AWS, Amazon Web Services
tech|Azure, Microsoft Azure
tech|GCP, Google Cloud, Google Cloud Platform
tech|cloud, cloud computing|bulut, bulut bilişim
tech|Terraform, infrastructure as code, IaC
tech|Linux, Unix
tech|Git, GitHub, GitLab, Bitbucket, version control|versiyon kontrol, sürüm kontrol
tech|CI/CD, continuous integration, continuous delivery, continuous deployment|sürekli entegrasyon
tech|Jenkins
tech|GitHub Actions
tech|unit testing, unit tests, test automation, automated testing|birim test, test otomasyonu, otomasyon testi
tech|Jest
tech|Selenium
tech|Cypress
tech|Pandas
tech|NumPy
tech|scikit-learn, sklearn
tech|TensorFlow
tech|PyTorch
tech|=Spark, Apache Spark, PySpark
tech|Hadoop
tech|Airflow, Apache Airflow
tech|dbt
tech|Snowflake
tech|BigQuery
tech|Databricks
tech|ETL, ELT, data pipeline, data pipelines|veri hattı, veri boru hattı
tech|data warehouse, data warehousing|veri ambarı
tech|machine learning, ML|makine öğrenmesi, makine öğrenimi
tech|deep learning|derin öğrenme
tech|NLP, natural language processing|doğal dil işleme
tech|computer vision|bilgisayarlı görü
tech|LLM, large language models, generative AI, GenAI|büyük dil modelleri, üretken yapay zeka
tech|artificial intelligence, AI|yapay zeka
tech|statistics, statistical analysis|istatistik, istatistiksel analiz
tech|A/B testing, AB testing, split testing|A/B testi
tech|data visualization|veri görselleştirme
tech|data modeling, data modelling|veri modelleme
tech|data analysis, data analytics|veri analizi, veri analitiği
tech|big data|büyük veri
tech|predictive modeling, forecasting|tahminleme, tahmin modelleri
tech|mobile development, iOS, Android|mobil uygulama, mobil geliştirme
tech|Flutter
tech|React Native
tech|cybersecurity, information security|siber güvenlik, bilgi güvenliği
tech|networking, TCP/IP|ağ yönetimi
tech|VBA, macros|makro
tool|=Excel, MS Excel, Microsoft Excel, spreadsheets|ileri düzey Excel
tool|pivot tables, pivot table|pivot tablo
tool|VLOOKUP, XLOOKUP
tool|PowerPoint, MS PowerPoint
tool|MS Office, Microsoft Office, Office 365, Microsoft 365
tool|MS Word, Microsoft Word
tool|Google Workspace, Google Sheets, G Suite
tool|Power BI, PowerBI
tool|Tableau
tool|Looker, Looker Studio, Google Data Studio, Data Studio
tool|Qlik, QlikView, Qlik Sense
tool|Jira
tool|Confluence
tool|Trello, Asana, Monday.com
tool|=Slack
tool|Figma
tool|Adobe Photoshop, Photoshop
tool|Adobe Illustrator, Illustrator
tool|Adobe Creative Suite, Adobe Creative Cloud
tool|Canva
tool|SAP, SAP ERP, SAP FI, SAP CO, SAP HANA, S/4HANA
tool|ERP, ERP systems|ERP sistemleri, kurumsal kaynak planlama
tool|Oracle ERP, Oracle NetSuite, NetSuite
tool|Logo Tiger, Netsis
tool|Salesforce
tool|HubSpot
tool|CRM, CRM systems, customer relationship management|müşteri ilişkileri yönetimi
tool|Zoho
tool|Google Analytics, GA4
tool|Google Ads, AdWords
tool|Meta Ads, Facebook Ads, Instagram Ads
tool|LinkedIn Ads
tool|Google Tag Manager, GTM
tool|SEMrush, Ahrefs
tool|Mailchimp, Klaviyo
tool|WordPress
tool|Shopify
tool|Workday
tool|SuccessFactors, SAP SuccessFactors
tool|ATS, applicant tracking system|aday takip sistemi
tool|LinkedIn Recruiter
tool|HRIS, HR information system|İK bilgi sistemi
tool|Bloomberg, Bloomberg Terminal
tool|QuickBooks, Xero
tool|AutoCAD
tool|SPSS
tool|Stata
tool|MATLAB
method|Agile, agile methodology|çevik, çevik metodoloji
method|Scrum
method|Kanban
method|Waterfall|şelale
method|DevOps
method|TDD, test-driven development
method|code review, code reviews|kod inceleme
method|OOP, object-oriented programming|nesne yönelimli programlama
method|design patterns|tasarım desenleri
method|system design, software architecture|sistem tasarımı, yazılım mimarisi
method|project management|proje yönetimi
method|product management|ürün yönetimi
method|stakeholder management|paydaş yönetimi
method|change management|değişim yönetimi
method|process improvement, process optimization|süreç iyileştirme, süreç geliştirme, süreç optimizasyonu
method|=Lean, Six Sigma, Lean Six Sigma|yalın üretim, altı sigma
method|KPI, KPIs, key performance indicators|performans göstergeleri, anahtar performans göstergeleri
method|OKR, OKRs
method|reporting|raporlama
method|dashboard, dashboards|gösterge paneli
method|budgeting, budget|bütçe, bütçeleme
method|financial forecasting|finansal tahmin
method|requirements analysis, business analysis|gereksinim analizi, iş analizi
method|user research, UX research|kullanıcı araştırması
method|UX, user experience|kullanıcı deneyimi
method|UI, user interface|kullanıcı arayüzü
method|wireframing, prototyping|prototipleme
method|SEO, search engine optimization|arama motoru optimizasyonu
method|SEM, search engine marketing|arama motoru pazarlaması
method|PPC, pay-per-click, paid search
method|content marketing|içerik pazarlaması
method|content creation, copywriting|içerik üretimi, metin yazarlığı
method|social media, social media management, social media marketing|sosyal medya, sosyal medya yönetimi, sosyal medya pazarlaması
method|email marketing|e-posta pazarlaması
method|digital marketing, online marketing|dijital pazarlama
method|performance marketing, paid media, paid social|performans pazarlama
method|growth marketing, growth hacking|büyüme pazarlaması
method|marketing automation|pazarlama otomasyonu
method|brand management, branding|marka yönetimi, markalaşma
method|market research|pazar araştırması
method|competitor analysis, competitive analysis|rakip analizi
method|campaign management|kampanya yönetimi
method|conversion rate optimization, CRO|dönüşüm oranı optimizasyonu
method|influencer marketing|influencer pazarlaması
method|lead generation|potansiyel müşteri yaratma
method|B2B
method|B2C
method|account management, key account management|müşteri yönetimi, kilit müşteri yönetimi
method|business development|iş geliştirme
method|sales pipeline, pipeline management|satış hunisi
method|cold calling, prospecting|soğuk arama
method|negotiation|müzakere, pazarlık
method|closing deals|satış kapama
method|customer success|müşteri başarısı
method|customer service, customer support|müşteri hizmetleri, müşteri desteği
method|sales targets, quota|satış hedefleri, kota
method|recruitment, recruiting, talent acquisition, hiring|işe alım, yetenek kazanımı
method|sourcing, candidate sourcing|aday bulma
method|interviewing, competency-based interviews|mülakat, yetkinlik bazlı mülakat
method|onboarding|oryantasyon, işe alışma
method|employer branding|işveren markası
method|performance management|performans yönetimi
method|compensation and benefits, compensation, payroll|ücret ve yan haklar, ücretlendirme, bordro
method|employee relations|çalışan ilişkileri
method|employee engagement|çalışan bağlılığı
method|training and development, learning and development, L&D|eğitim ve gelişim
method|talent management|yetenek yönetimi
method|organizational development|organizasyonel gelişim
method|HR analytics, people analytics|İK analitiği
method|financial analysis|finansal analiz
method|financial modeling, financial modelling|finansal modelleme
method|financial reporting, financial statements|finansal raporlama, mali tablolar
method|accounting, bookkeeping|muhasebe
method|general ledger|genel muhasebe, büyük defter
method|accounts payable, accounts receivable|borç hesapları, alacak hesapları, cari hesap
method|reconciliation, account reconciliation|mutabakat
method|month-end close|ay sonu kapanış
method|audit, auditing, internal audit|denetim, iç denetim
method|tax, taxation|vergi, vergilendirme
method|cost accounting, cost control|maliyet muhasebesi, maliyet kontrolü
method|cash flow, cash management|nakit akışı, nakit yönetimi
method|treasury|hazine
method|risk management|risk yönetimi
method|credit analysis, credit risk|kredi analizi, kredi riski
method|valuation, DCF|değerleme
method|variance analysis|sapma analizi
method|FP&A, financial planning and analysis|finansal planlama ve analiz
method|supply chain|tedarik zinciri
method|procurement, purchasing|satın alma
method|logistics|lojistik
method|inventory management|stok yönetimi, envanter yönetimi
domain|IFRS, International Financial Reporting Standards|UFRS, TFRS
domain|US GAAP, GAAP
domain|tax procedure law|Vergi Usul Kanunu, VUK
domain|consolidation|konsolidasyon
domain|e-commerce, ecommerce|e-ticaret
domain|fintech
domain|SaaS
domain|banking|bankacılık
domain|insurance|sigortacılık
domain|retail|perakende
domain|FMCG|hızlı tüketim
domain|labor law, employment law|iş hukuku, iş kanunu
domain|GDPR, data privacy|KVKK, kişisel verilerin korunması
domain|compliance, regulatory compliance|mevzuat uyumu
soft|communication, communication skills|iletişim, iletişim becerileri
soft|teamwork, team player, collaboration|takım çalışması, ekip çalışması, iş birliği, işbirliği
soft|leadership|liderlik
soft|problem solving, problem-solving|problem çözme
soft|analytical thinking, analytical skills|analitik düşünme
soft|critical thinking|eleştirel düşünme
soft|attention to detail, detail-oriented|detaylara dikkat, detay odaklı
soft|time management|zaman yönetimi
soft|presentation skills|sunum becerileri
soft|customer focus, customer-oriented|müşteri odaklı
soft|result-oriented, results-driven|sonuç odaklı
soft|self-motivated, proactive|proaktif
soft|adaptability, flexibility|uyum sağlama, esneklik
soft|creativity|yaratıcılık
soft|mentoring, coaching|mentorluk, koçluk
soft|multitasking|çoklu görev
soft|ownership|sahiplenme
soft|interpersonal skills|kişilerarası ilişkiler
soft|persuasion|ikna
cert|CPA, Certified Public Accountant|SMMM, YMM
cert|ACCA
cert|CFA
cert|PMP
cert|CSM, Certified ScrumMaster
cert|AWS Certified
cert|SHRM, SHRM-CP, CIPD
lang|English|İngilizce
lang|German|Almanca
lang|French|Fransızca
lang|Spanish|İspanyolca
lang|Arabic|Arapça
lang|Russian|Rusça
lang|Turkish|Türkçe
edu|bachelor's degree, bachelor, BSc, BA|lisans derecesi
edu|master's degree, MSc, MBA|yüksek lisans
edu|PhD, doctorate|doktora
edu|computer science, computer engineering|bilgisayar mühendisliği, bilgisayar bilimleri
edu|software engineering|yazılım mühendisliği
edu|industrial engineering|endüstri mühendisliği
edu|economics|ekonomi, iktisat
edu|business administration|işletme
edu|mathematics|matematik
edu|psychology|psikoloji
`;

const splitForms = (forms: string | undefined) =>
  (forms ?? "")
    .split(",")
    .map((form) => form.trim())
    .filter(Boolean);

export const SKILLS: SkillEntry[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [category, en, tr] = line.split("|");
    const enForms = splitForms(en);
    const trForms = splitForms(tr);
    const stripMarker = (form: string) => form.replace(/^=/, "");
    return {
      category: category as SkillCategory,
      en: enForms.map(stripMarker),
      tr: trForms.map(stripMarker),
      phrases: [...enForms, ...trForms]
        .map(toPhrase)
        .filter((phrase) => phrase.tokens.length > 0),
    };
  });

export const getSkillLabel = (skill: SkillEntry, lang: "en" | "tr") =>
  (lang === "tr" && skill.tr[0]) || skill.en[0];
