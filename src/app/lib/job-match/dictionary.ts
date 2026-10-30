import { toPhrase, type Phrase } from "lib/job-match/text";

export type SkillCategory =
  | "tech" // programming languages, frameworks, platforms
  | "tool" // software products
  | "method" // methodologies, practices
  | "domain" // domain knowledge
  | "soft" // soft skills
  | "cert" // certificates, licenses
  | "lang" // spoken languages
  | "edu" // fields of study
  | "degree"; // degree levels

export interface SkillEntry {
  category: SkillCategory;
  en: string[]; // English surface forms; en[0] is the display label
  tr: string[]; // Turkish surface forms; tr[0] is the display label (falls back to en[0])
  phrases: Phrase[]; // all forms, tokenized for matching
  impliedBy: Phrase[]; // tools/practices whose presence shows this skill (see IMPLIED_BY)
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
tech|feature engineering|özellik mühendisliği
tech|model deployment, MLOps, model serving|model dağıtımı
tech|MLflow
tech|responsive design, responsive|responsive tasarım, duyarlı tasarım
tech|web performance, Core Web Vitals, Lighthouse, performance optimization|web performansı, performans optimizasyonu
tech|Redux
tech|Storybook
tech|Webpack, Vite
tech|Tailwind, Tailwind CSS
tech|accessibility, WCAG, a11y|erişilebilirlik
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
tool|Logo Tiger, Logo Go, Logo Yazılım, Netsis
domain|e-invoice, e-ledger|e-Fatura, e-Defter, e-Arşiv, e-İrsaliye, e-dönüşüm
tool|Salesforce
tool|HubSpot
tool|CRM, CRM systems, customer relationship management|müşteri ilişkileri yönetimi
tool|Zoho
tool|Google Analytics, GA4
tool|Google Ads, AdWords
tool|Meta Ads, Facebook Ads, Instagram Ads
tool|LinkedIn Ads
tool|Google Tag Manager, Tag Manager, GTM
tool|Google Search Console, Search Console
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
method|reporting|raporlama, raporlar, rapor hazırlama
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
method|conversion rate optimization, =CRO|dönüşüm oranı optimizasyonu
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
soft|attention to detail, detail-oriented, meticulous|detaylara dikkat, detay odaklı, titiz, detaycı, özenli
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
degree|bachelor's degree, bachelor, BSc, BA|lisans derecesi, lisans mezunu, =Lisans
degree|master's degree, MSc, MBA|yüksek lisans
degree|PhD, doctorate|doktora
edu|computer science, computer engineering|bilgisayar mühendisliği, bilgisayar bilimleri
edu|software engineering|yazılım mühendisliği
edu|industrial engineering|endüstri mühendisliği
edu|economics|ekonomi, iktisat
edu|business administration|işletme
edu|mathematics|matematik
edu|psychology|psikoloji
`;

/**
 * "Skill label: forms that imply it". A resume that says "set up Jenkins pipelines" has
 * CI/CD experience even without the word, the way a recruiter would read it. The implication
 * only counts on the resume side; an ad asking for Jenkins still asks for Jenkins.
 */
// prettier-ignore
const IMPLIED_BY: Record<string, string> = {
  "CI/CD": "Jenkins, GitHub Actions, GitLab CI, CircleCI, Azure DevOps, Travis CI",
  "unit testing": "Jest, Mocha tests, JUnit, pytest, NUnit, xUnit, Vitest, test coverage",
  "Agile": "=Scrum, Kanban, sprint planning, sprint reviews|sprint planlama",
  "data visualization": "Tableau, Power BI, Looker, matplotlib, seaborn, D3.js, Plotly, dashboard",
  "data analysis": "data analyst, analysed data, analyzed data|veri analisti",
  "machine learning": "scikit-learn, TensorFlow, PyTorch, XGBoost, deep learning, predictive model",
  "cloud": "AWS, Azure, GCP, Google Cloud",
  "data modeling": "star schema, snowflake schema, dimensional modeling, data model, data models|veri modeli, boyutsal modelleme",
  "SQL": "PostgreSQL, MySQL, SQL Server, T-SQL, PL/SQL, BigQuery, Snowflake",
  // Python-only libraries: using them is using Python
  "Python": "pandas, NumPy, PySpark, scikit-learn, PyTorch, Django, Flask, FastAPI, pytest",
  "code review": "pull request reviews, PR reviews, reviewed pull requests",
  "CRM": "Salesforce, HubSpot, Zoho, Dynamics 365",
  "ERP": "SAP, Oracle ERP, NetSuite, Logo Tiger, Netsis, Microsoft Dynamics",
  "MS Office": "=Excel, MS Excel, PowerPoint, MS Word",
  "email marketing": "Mailchimp, Klaviyo, newsletter, newsletters|e-bülten",
  "content creation": "product copy, ad copy, campaign copy, marketing copy, taglines|reklam metni, reklam metinleri",
  // Cloud product families
  "AWS": "S3, EC2, AWS Lambda, Redshift, DynamoDB, CloudFormation, EKS, SageMaker",
  "Azure": "Azure DevOps, Azure Functions, Azure Synapse, AKS, Cosmos DB",
  "GCP": "BigQuery, Cloud Run, GKE, Dataflow, Pub/Sub, Vertex AI, Cloud Functions",
  // Statements are what financial reporting produces
  "financial reporting": "balance sheet, income statement, P&L, profit and loss, cash flow statement|bilanço, gelir tablosu, nakit akış tablosu",
  // Presenting to an audience is evidence of communication skills
  "communication": "presented to, presenting to, presented findings, presented results, presentations to|sunum yaptım, sunumlar yaptım",
};

/**
 * Turkish compounds drop the possessive ending when they modify another noun:
 * "e-posta pazarlaması" but "e-posta pazarlama araçları", "risk yönetimi" but
 * "risk yönetim süreçleri". So multi-word Turkish forms are matched by the stem of their
 * last word, which still matches the possessive form via the suffix rules.
 */
const toTurkishCompoundStems = (form: string): string[] => {
  const words = form.split(" ");
  if (words.length < 2) return [form];
  const last = words[words.length - 1];
  // Spelling alone can't tell "servis-i" from "pazarlama-sı" (both end in "si"), so both
  // candidate stems are kept as variants. One ending is stripped, never two ("serv").
  // No lookbehind: it is a parse error on Safari < 16.4 and would break the whole bundle.
  const stems = [
    last.replace(/(?:ları|leri|sı|si|su|sü)$/, ""),
    last.replace(/([^aeıioöuü])[ıiuü]$/, "$1"),
  ].filter((stem) => stem !== last && stem.length >= 4); // "büyük veri" keeps "veri"
  return [
    form,
    ...Array.from(new Set(stems)).map((stem) =>
      [...words.slice(0, -1), stem].join(" ")
    ),
  ];
};

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
      phrases: [...enForms, ...trForms.flatMap(toTurkishCompoundStems)]
        .map(toPhrase)
        .filter((phrase) => phrase.tokens.length > 0),
      impliedBy: splitForms(
        (IMPLIED_BY[stripMarker(enForms[0] ?? "")] ?? "").replace("|", ",")
      ).map(toPhrase),
    };
  });

export const getSkillLabel = (skill: SkillEntry, lang: "en" | "tr") =>
  (lang === "tr" && skill.tr[0]) || skill.en[0];
