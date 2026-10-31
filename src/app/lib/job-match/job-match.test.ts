import {
  extractConditions,
  extractJobAd,
  extractKeywords,
  isInsufficient,
} from "lib/job-match/keywords";
import { checkConditions } from "lib/job-match/conditions";
import {
  InputTooLongError,
  MAX_INPUT_CHARS,
  analyze,
  computeScore,
  matchKeywords,
} from "lib/job-match";
import { suggest } from "lib/job-match/suggest";
import { SKILLS, getSkillLabel } from "lib/job-match/dictionary";
import { foldText } from "lib/fold-text";
import { initialResumeState } from "lib/redux/resumeSlice";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import {
  detectLang,
  hasPhrase,
  toPhrase,
  toTokenizedText,
} from "lib/job-match/text";

// Dictionary and token keywords; phrases have their own tests
const keywordsOf = (ad: string) =>
  Object.fromEntries(
    extractKeywords(ad)
      .filter((k) => k.kind !== "phrase")
      .map((k) => [k.label, k.importance])
  );
const phrasesOf = (ad: string) =>
  Object.fromEntries(
    extractKeywords(ad)
      .filter((k) => k.kind === "phrase")
      .map((k) => [k.label, k.importance])
  );

const has = (text: string, form: string) =>
  hasPhrase(toTokenizedText(text), toPhrase(form));

describe("job-match - keyword extraction", () => {
  it("'Heading: content' lines keep their content", () => {
    expect(keywordsOf("Requirements: Python, SQL, AWS")).toEqual({
      Python: "required",
      SQL: "required",
      AWS: "required",
    });
  });

  it("content lines that mention skills are not headings", () => {
    expect(keywordsOf("Strong Python and SQL skills\nDocker")).toEqual({
      Python: "normal",
      SQL: "normal",
      Docker: "normal",
    });
    expect(keywordsOf("Kubernetes experience is a plus\nPython")).toEqual({
      Kubernetes: "preferred",
      Python: "normal",
    });
  });

  it("headings set the block of following lines", () => {
    expect(
      keywordsOf(
        "Aranan Nitelikler\n- Python\nTercih Sebebi\n- Docker\nYan Haklar\n- SQL"
      )
    ).toEqual({ Python: "required", Docker: "preferred" });
  });

  it("mixed inline markers fall back to normal", () => {
    expect(keywordsOf("Python required, Java preferred")).toEqual({
      Python: "normal",
      Java: "normal",
    });
  });

  it("ignores years and all-caps noise", () => {
    expect(keywordsOf("5+ years of experience with Python")).toEqual({
      Python: "normal",
    });
    expect(keywordsOf("NOT REMOTE, FULL TIME ASAP")).toEqual({});
    // ...but all-caps acronym lists keep their unknown acronyms
    expect(keywordsOf("Requirements: MQTT, UART")).toEqual({
      MQTT: "required",
      UART: "required",
    });
  });

  it("'a plus' sentences are not headings", () => {
    expect(keywordsOf("Remote work is a plus\nPython")).toEqual({
      Python: "normal",
    });
  });
});

describe("job-match - matching", () => {
  it("inflected forms", () => {
    expect(has("Python'da veri analizi", "Python")).toBe(true);
    expect(has("Built REST APIs", "API")).toBe(true);
    expect(has("makine öğrenmesinde 3 yıl", "makine öğrenmesi")).toBe(true);
    expect(has("Pazarlamada uzman", "pazarlama")).toBe(true);
    // Proper nouns with one attached Turkish suffix (no apostrophe)
    expect(has("Pythonda 5 yıl", "Python")).toBe(true);
    expect(has("Dockerla çalıştım", "Docker")).toBe(true);
  });

  it("no false positives from suffixes or substrings", () => {
    expect(has("I know SQLite", "SQL")).toBe(false);
    expect(has("Took a taxi", "tax")).toBe(false);
    expect(has("JavaScript developer", "Java")).toBe(false);
    expect(has("We react to issues", "=React")).toBe(false);
    expect(has("Built React apps", "=React")).toBe(true);
  });

  it("derivations and implications without false positives", () => {
    expect(has("Communicating insights to leadership", "communication")).toBe(
      true
    );
    expect(has("Wrote unit tests", "unit testing")).toBe(true);
    expect(keywordsOf("We value teamwork and our values")).toEqual({
      teamwork: "normal",
    });
    const found = (ad: string, resumeText: string) =>
      matchKeywords(extractKeywords(ad), [
        { section: "experience", text: resumeText },
      ])[0].found;
    expect(found("CI/CD experience", "Set up Jenkins pipelines")).toBe(true);
    // "web servisi" must not be stemmed down to "serv" and match "server"
    expect(found("Web servisi geliştirme", "Configured the web server")).toBe(
      false
    );
    expect(found("Web servisi geliştirme", "Web servislerini yazdım")).toBe(
      true
    );
    expect(found("AWS experience", "Wrote lambda functions in Python")).toBe(
      false
    );
    expect(found("Communication skills", "Presented with an award")).toBe(
      false
    );
    expect(
      found("Communication skills", "Presented findings to the board")
    ).toBe(true);
  });

  it("bilingual skills match across languages", () => {
    const [ml] = extractKeywords("Experience with machine learning");
    const [teamwork] = extractKeywords("Takım çalışmasına yatkın");
    const resume = [{ section: "skills", text: "ML, teamwork" }];
    expect(matchKeywords([ml, teamwork], resume).map((m) => m.found)).toEqual([
      true,
      true,
    ]);
  });

  it("score is a weighted percentage", () => {
    const matches = matchKeywords(
      extractKeywords("Requirements: Python, SQL\nNice to have: Docker"),
      [{ section: "skills", text: "Python, Docker" }]
    );
    // (Python 3 + Docker 0.25) / (Python 3 + SQL 3 + Docker 0.25)
    expect(computeScore(matches)).toBe(52);
    expect(computeScore([])).toBe(0);
  });

  it("finding one more keyword never lowers the score", () => {
    const matches = matchKeywords(
      extractKeywords(
        "Requirements: Python, SQL, communication skills\nNice to have: Docker, MQTT\nYou will build REST APIs"
      ),
      []
    );
    expect(matches.length).toBeGreaterThan(3);
    for (let i = 0; i < matches.length; i++) {
      for (let j = 0; j < matches.length; j++) {
        const some = matches.map((m, k) => ({ ...m, found: k < i }));
        const more = some.map((m, k) => (k === j ? { ...m, found: true } : m));
        expect(computeScore(more)).toBeGreaterThanOrEqual(computeScore(some));
      }
    }
  });

  it("detects language", () => {
    expect(detectLang("We are looking for a developer with SQL")).toBe("en");
    expect(
      detectLang("Ekibimize SQL bilgisine sahip bir geliştirici arıyoruz")
    ).toBe("tr");
  });
});

describe("job-match - findings from real ads", () => {
  it("labels keywords with the ad's own wording", () => {
    // first line is the title, whose parentheses are dropped
    expect(
      keywordsOf("Mali İşler Uzmanı\nLOGO (Tiger-Bordro) kullanabilen")
    ).toEqual({
      "LOGO Tiger": "normal",
      Bordro: "normal",
    });
  });

  it("degrees listed together are alternatives", () => {
    const [degree] = extractKeywords(
      "İktisat veya İşletme bölümlerinden mezun"
    );
    expect(degree.label).toBe("İktisat / İşletme");
    expect(
      matchKeywords(
        [degree],
        [{ section: "EĞİTİM", text: "İktisat Lisans" }]
      )[0].found
    ).toBe(true);
  });

  it("no keywords from parts of matched skills or the title's company name", () => {
    expect(keywordsOf("MS Office programlarını kullanabilen")).toEqual({
      "MS Office": "normal",
    });
    expect(
      keywordsOf("Data Analyst (Weekday AI, Bengaluru)\nSQL required")
    ).toEqual({ SQL: "required" });
  });

  it("records every resume section a keyword appears in", () => {
    const [sap] = matchKeywords(extractKeywords("SAP"), [
      { section: "BECERİLER", text: "SAP FI, Excel" },
      { section: "DENEYİM", text: "SAP FI modülünde fatura girişi" },
    ]);
    expect(sap.sections).toEqual(["BECERİLER", "DENEYİM"]);
  });
});

describe("job-match - review findings on suggestions", () => {
  it("a sentence-like first line keeps its parentheses", () => {
    expect(
      keywordsOf(
        "We are looking for a data analyst (SQL, Python, Tableau) to join our team."
      )
    ).toEqual({ SQL: "normal", Python: "normal", Tableau: "normal" });
  });

  it("a degree level and its fields are separate requirements", () => {
    const keywords = extractKeywords(
      "Data Analyst\nRequirements:\nBachelor's degree in Economics or Mathematics"
    );
    expect(keywords.map((k) => k.label).sort()).toEqual([
      "Economics / Mathematics",
      "bachelor's degree",
    ]);
  });
});

describe("job-match - suggestion kinds", () => {
  it("a resume with weak, unquantified bullets and no summary yields these kinds", () => {
    const resume = {
      ...initialResumeState,
      profile: { ...initialResumeState.profile, summary: "" },
      workExperiences: [
        {
          ...initialResumeState.workExperiences[0],
          descriptions: [
            "Responsible for weekly reports",
            "Helped the sales team",
            "Worked on data cleaning",
          ],
        },
      ],
    };
    const ad = "Data Analyst\nRequirements:\n- SQL\n- Python";
    const matches = matchKeywords(extractKeywords(ad), [
      { section: "SKILLS", text: "SQL" },
    ]);
    const kinds = suggest({
      jobAd: ad,
      matches,
      resume,
      resumeText: "SQL",
      langs: { ad: "en", resume: "en" },
    }).map((s) => s.kind);
    expect(kinds.sort()).toEqual(
      [
        "missing-skills",
        "no-summary",
        "only-in-skills",
        "unquantified",
        "weak-verbs",
      ].sort()
    );
  });
});

describe("job-match - title and quantity rules", () => {
  const kindsFor = (ad: string, summary: string, bullets: string[]) =>
    suggest({
      jobAd: ad,
      matches: [],
      resume: {
        ...initialResumeState,
        profile: { ...initialResumeState.profile, summary },
        workExperiences: [
          { ...initialResumeState.workExperiences[0], descriptions: bullets },
        ],
      },
      resumeText: [summary, ...bullets].join("\n"),
      langs: { ad: "en", resume: "en" },
    }).map((s) => s.kind);

  it("a title counts in its own words, a synonym or a translation", () => {
    expect(
      kindsFor("Engineering Manager", "Engineering Manager, 10 years", [])
    ).not.toContain("title");
    expect(
      kindsFor("Veri Mühendisi", "Data engineer with 6 years", [])
    ).not.toContain("title");
    expect(
      kindsFor("Digital Marketing Manager", "Head of Digital Marketing", [])
    ).not.toContain("title");
    expect(kindsFor("Data Analyst", "Marketing specialist", [])).toContain(
      "title"
    );
  });

  it("units make a quantity, digits inside names don't", () => {
    const quantified = [
      "Grew users to 10k",
      "Cut latency to 20ms",
      "Grew traffic 3x",
    ];
    expect(kindsFor("Data Analyst", "Data analyst", quantified)).not.toContain(
      "unquantified"
    );
    const names = ["Ran B2B deals", "Set up GA4", "Managed 3PL partners"];
    expect(kindsFor("Data Analyst", "Data analyst", names)).toContain(
      "unquantified"
    );
  });
});

describe("job-match - ad conditions", () => {
  const kindsOf = (ad: string) => extractConditions(ad).map((c) => c.kind);

  it("finds conditions of every tier, in Turkish and English", () => {
    expect(
      kindsOf("- B sınıfı ehliyete sahip ve seyahat engeli bulunmayan")
    ).toEqual(["license", "travel"]);
    expect(
      kindsOf("A full UK driving licence and the right to work in the UK")
    ).toEqual(["license", "work-permit"]);
    expect(kindsOf("- 25-35 yaş arası, bekar ve sigara kullanmayan")).toEqual([
      "age",
      "marital",
      "smoking",
    ]);
    expect(kindsOf("Female applicants only, must be a non-smoker")).toEqual([
      "gender",
      "smoking",
    ]);
    expect(kindsOf("Adli sicil kaydı temiz, iyi görünümlü")).toEqual([
      "criminal-record",
      "appearance",
    ]);
  });

  it("military service for male candidates is not also a gender condition", () => {
    expect(
      kindsOf("- Erkek adaylar için askerlik hizmetini tamamlamış")
    ).toEqual(["military"]);
    // k softens to ğ before a vowel: "askerliğini"
    expect(
      kindsOf("Erkek adaylar için askerliğini tamamlamış, 25-40 yaş arası")
    ).toEqual(["military", "age"]);
    expect(kindsOf("- Marmaris'te ikamet eden bayan adaylar")).toEqual([
      "residence",
      "gender",
    ]);
  });

  it("gender and marital status are different tiers", () => {
    expect(
      extractConditions("Bekar bayan aday").map((c) => [c.kind, c.tier])
    ).toEqual([
      ["gender", "protected-exception"],
      ["marital", "protected"],
    ]);
  });

  it("condition text yields no keywords", () => {
    expect(keywordsOf("Requirements: SRC belgesi, Excel")).toEqual({
      Excel: "required",
    });
    expect(keywordsOf("25-35 yaş arası, Python bilen")).toEqual({
      Python: "normal",
    });
  });

  it("benefits and look-alike skills are not conditions", () => {
    for (const ad of [
      "Nice to have: LinkedIn Recruiter license experience",
      "Özel sağlık sigortası, şirket aracı ve yakıt desteği",
      "Experience with smoking cessation programmes",
      "Seyahat acentesi deneyimi",
      "Sponsorship for professional exams",
      "Competitive salary and an attractive bonus",
      "Able to lift up to 25 kg",
      "Çocuk gelişimi bölümü mezunu",
      // review findings: banking DBS, legal bars, job titles, equal-opportunity statements
      "DBS, çek ve senet takibi",
      "Yurt dışı çıkışına engeli bulunmayan",
      "Erkek kuaför",
      "We consider all applicants regardless of age, gender or marital status",
      "Kadın adayların başvurularını teşvik ediyoruz",
      "Bayan giyim mağazasında satış deneyimi",
    ]) {
      expect(kindsOf(ad)).toEqual([]);
    }
    expect(kindsOf("Yan Haklar\n- Şirket aracı ve ehliyet desteği")).toEqual(
      []
    );
  });

  it("only checkable conditions are looked up in the resume", () => {
    const conditions = extractConditions(
      "B sınıfı ehliyet sahibi, askerlik hizmetini tamamlamış"
    );
    expect(
      checkConditions(conditions, "Full driving license (class B)").map((c) => [
        c.kind,
        c.found,
      ])
    ).toEqual([
      ["license", true],
      ["military", undefined],
    ]);
    expect(checkConditions(conditions, "Python, SQL")[0].found).toBe(false);
    expect(
      checkConditions(extractConditions("SRC 4 belgesi"), "SRC 4 Belgesi")[0]
        .found
    ).toBe(true);
  });

  it("emoji bullets, inflections and job-title forms", () => {
    // "✔️" carries a variation selector that foldText drops
    expect(kindsOf("✔️ B sınıfı ehliyet, Excel")).toEqual(["license"]);
    expect(keywordsOf("✔️ B sınıfı ehliyet, Excel")).toEqual({
      Excel: "normal",
    });
    expect(kindsOf("Kendi araca sahip")).toEqual(["own-vehicle"]);
    expect(kindsOf("Bayan satış danışmanı aranıyor")).toEqual(["gender"]);
    expect(kindsOf("Enhanced DBS check required")).toEqual(["criminal-record"]);
    // an equal-opportunity sentence hides only itself, not the requirement next to it
    expect(
      kindsOf("Regardless of location, a valid UK driving licence is required")
    ).toEqual(["license"]);
    expect(
      kindsOf(
        "We are an equal opportunity employer. Candidates must hold a driving licence."
      )
    ).toEqual(["license"]);
  });
});

describe("job-match - importance scope", () => {
  it("a predicate marker reaches its sentence, a list included", () => {
    expect(
      keywordsOf(
        "Python and SQL are required. Docker, Kubernetes or Terraform is a plus."
      )
    ).toEqual({
      Python: "required",
      SQL: "required",
      Docker: "preferred",
      Kubernetes: "preferred",
      Terraform: "preferred",
    });
  });

  it("abbreviations and parentheses don't end a sentence", () => {
    expect(
      keywordsOf(
        "Excel bilgisi beklenir. Bir CRM aracında (ör. HubSpot) çalışmış olmak artı olarak değerlendirilir."
      )
    ).toMatchObject({
      Excel: "normal",
      CRM: "preferred",
      HubSpot: "preferred",
    });
  });

  it("an adverb inside a sentence reaches its own item only", () => {
    expect(keywordsOf("Experience with an ERP, ideally SAP")).toEqual({
      ERP: "normal",
      SAP: "preferred",
    });
    // a second line: on a short first line (the title) parentheses are dropped
    expect(
      keywordsOf("Analyst\nSQL (tercihen PostgreSQL), Python")
    ).toMatchObject({
      SQL: "normal",
      PostgreSQL: "preferred",
      Python: "normal",
    });
    expect(keywordsOf("Python experience; Docker ideally")).toEqual({
      Python: "normal",
      Docker: "preferred",
    });
  });

  it("an adverb opening a sentence reaches all of it", () => {
    expect(keywordsOf("Tercihen Python, SQL bilgisi")).toEqual({
      Python: "preferred",
      SQL: "preferred",
    });
  });

  it("the strongest mention wins", () => {
    expect(
      keywordsOf("Requirements\n- SAP experience\n- An ERP, ideally SAP")
    ).toMatchObject({ SAP: "required" });
  });

  it("a condition's own marker stays with the condition", () => {
    expect(keywordsOf("Python and SQL, travel required")).toEqual({
      Python: "normal",
      SQL: "normal",
    });
    expect(
      keywordsOf("Python bilgisi avantajdır, B sınıfı ehliyet zorunludur")
    ).toEqual({ Python: "preferred" });
  });

  it("review findings: adverb and must, abbreviations, unclosed parentheses", () => {
    expect(keywordsOf("Ideally you know Python, but SQL is a must.")).toEqual({
      Python: "preferred",
      SQL: "required",
    });
    expect(
      keywordsOf("Experience with Python, SQL, etc. Java is a plus.")
    ).toEqual({ Python: "normal", SQL: "normal", Java: "preferred" });
    expect(keywordsOf("Python is a plus (ör. Django. Java required.")).toEqual({
      Python: "preferred",
      Django: "preferred",
      Java: "required",
    });
  });

  it("only employer descriptions in the intro are skipped, and skill lists stay", () => {
    expect(
      keywordsOf(
        "Business Analyst\nYou are a business analyst with banking experience."
      )
    ).toMatchObject({ banking: "normal" });
    expect(
      keywordsOf("Requirements\n- We are a bank looking for fintech experience")
    ).toMatchObject({ fintech: "required" });
    expect(
      keywordsOf("Backend Developer\nPython | Django | PostgreSQL\nDocker")
    ).toMatchObject({
      Python: "normal",
      Django: "normal",
      PostgreSQL: "normal",
    });
    expect(keywordsOf("Data Analyst\nSQL - 3 years\nPython")).toMatchObject({
      SQL: "normal",
    });
  });

  it("company descriptions and the company line ask nothing of the candidate", () => {
    // no headings: the description sentence is skipped, the requirement is not
    expect(
      keywordsOf(
        "Account Executive\nStackwell is a Series B SaaS company. You will sell to operations teams, ideally selling SaaS."
      )
    ).toMatchObject({ SaaS: "preferred" });
    expect(
      keywordsOf(
        "Account Executive\nLumen Software (B2B SaaS) - Berlin or Remote\nRequirements\n- SEO"
      )
    ).toEqual({ SEO: "required" });
  });
});

describe("job-match - real-ad trial findings (tur 3)", () => {
  it("legal, benefits and hiring-procedure sentences ask nothing of the candidate", () => {
    // unheaded, right after the requirements: they used to become required keywords
    const ad = [
      "Requirements",
      "- Python, SQL",
      "- Equity Compensation & Employee Stock Purchase Plan",
      "GitLab is proud to be an equal opportunity workplace. See also GitLab's EEO Policy.",
      "Please note that external platforms may use automated tools, including artificial intelligence, for candidate screening.",
      "Our Talent Acquisition team can help answer any questions during the recruiting process.",
      "Naked Farmer participates in E-Verify to confirm employment eligibility.",
      "Kişisel verileriniz KVKK aydınlatma metni kapsamında işlenir.",
    ].join("\n");
    expect(keywordsOf(ad)).toEqual({ Python: "required", SQL: "required" });
  });

  it("ordinary requirement wording near the markers stays", () => {
    expect(
      keywordsOf(
        "Requirements\n- Experience with GANs (generator/discriminator), PyTorch\n- Python, SQL, regardless of industry"
      )
    ).toMatchObject({ PyTorch: "required", Python: "required" });
  });

  it("the same words still count when the ad asks for them", () => {
    expect(
      keywordsOf(
        "Requirements\n- Experience with compensation and benefits administration\n- Knowledge of privacy regulations (GDPR)"
      )
    ).toMatchObject({
      "compensation and benefits": "required",
      GDPR: "required",
    });
  });

  it("legal text still yields its conditions", () => {
    expect(
      extractConditions(
        "Requirements\n- SQL\nWe participate in E-Verify. You must be authorized to work in the US."
      ).map((c) => c.kind)
    ).toEqual(["work-permit"]);
  });

  // ponytail: "You're responsive" still matches responsive design; dev resumes write
  // "responsive arayüzler", so the bare alias stays until a trait/skill rule exists
  it("common capitalised words and region codes are not skills", () => {
    const keywords = keywordsOf(
      "Requirements\n- Partner with TA and Payroll\n- We believe in exemplary PEOPLE experiences\n- Teams across EMEA, AMER and India"
    );
    expect(keywords).not.toHaveProperty("TA");
    expect(keywords).not.toHaveProperty("PEOPLE");
    expect(keywords).not.toHaveProperty("AMER");
    // the CRO alias used to match "cross" as an inflected form
    expect(
      keywordsOf("Requirements\n- Partner cross-functionally with Finance")
    ).not.toHaveProperty("conversion rate optimization");
  });

  it("an ad with too few hard skills is flagged and gets no missing-skill advice", () => {
    // the cook ad of the trial: one soft skill only, an HR resume scored 100 on it
    const cook = extractKeywords(
      "Aşçı\nGENEL NİTELİKLER\nHijyen kurallarına dikkat eden\nTakım çalışmasına yatkın"
    );
    expect(isInsufficient(cook)).toBe(true);
    expect(
      isInsufficient(extractKeywords("Requirements: Python, SQL, Docker"))
    ).toBe(false);
    const kinds = suggest({
      jobAd: "Requirements: teamwork",
      matches: matchKeywords(extractKeywords("Requirements: teamwork"), []),
      resume: initialResumeState,
      resumeText: "",
      langs: { ad: "en", resume: "en" },
      insufficient: true,
    }).map((s) => s.kind);
    expect(kinds).toContain("low-signal");
    expect(kinds).not.toContain("soft-skills");
  });

  it("a gap left for a dropped space glyph keeps the words apart", () => {
    const item = (text: string, x: number, width: number) => ({
      text,
      x,
      width,
      y: 0,
      height: 10,
      fontName: "Roboto",
      hasEOL: false,
    });
    // "• 450" | "kişilik": 2.5 gap (a space); "Bor" | "dro": no gap (a noise split)
    const [line] = groupTextItemsIntoLines([
      item("• 450", 36, 22.7),
      item("kişilik fabrikada", 61.2, 80),
      item("Bor", 141.2, 15),
      item("dro", 156.2, 15),
    ]);
    expect(line.map((t) => t.text)).toEqual(["• 450 kişilik fabrikadaBordro"]);
    // a letter-spaced heading, one glyph per item, still reads as one word
    const [heading] = groupTextItemsIntoLines(
      Array.from("EXPERIENCE", (c, i) => item(c, 36 + i * 9, 6))
    );
    expect(heading.map((t) => t.text)).toEqual(["EXPERIENCE"]);
  });

  it("'bakımlı' about a place is not an appearance condition, about a person it is", () => {
    const kinds = (ad: string) => extractConditions(ad).map((c) => c.kind);
    expect(
      kinds("Yeşil alanların temiz ve bakımlı tutulmasını sağlamak")
    ).toEqual([]);
    expect(kinds("Bakımlı ve güler yüzlü")).toEqual(["appearance"]);
    expect(kinds("Temiz ve bakımlı olması")).toEqual(["appearance"]);
    expect(
      kinds("Dış görünüşüne ve kişisel bakımına özen gösteren, dinamik")
    ).toEqual(["appearance"]);
  });
});

describe("job-match - phrases outside the dictionary (tur 4)", () => {
  it("strips the qualifiers around a phrase and splits two phrases at 've'", () => {
    expect(
      phrasesOf(
        "Nitelikler\n- Mekanik ventilatör takibi ve hasta bakımı konusunda deneyimli"
      )
    ).toEqual({
      "Mekanik ventilatör takibi": "normal",
      "hasta bakımı": "normal",
    });
    expect(
      phrasesOf(
        "Requirements\n- Experience in acute care, ideally on a surgical ward\n- Experience with discharge planning"
      )
    ).toEqual({
      "acute care": "normal",
      "surgical ward": "preferred",
      "discharge planning": "normal",
    });
  });

  it("'ve'/'and' end a phrase; single words left over are dropped", () => {
    // joining across them made mostly noise ("physiotherapists and families")
    expect(phrasesOf("Nitelikler\n- Ölçme ve değerlendirme bilgisi")).toEqual(
      {}
    );
    expect(
      phrasesOf("Requirements\n- Knowledge of discharge planning and control")
    ).toEqual({ "discharge planning": "normal" });
  });

  it("turns an infinitive into a noun and drops light verbs and verb forms", () => {
    expect(phrasesOf("Görevler\n- Teklif hazırlamak")).toEqual({
      "Teklif hazırlama": "normal",
    });
    // a genitive left without its head ("istemlerinin uygulanması") is no phrase
    expect(
      phrasesOf("Görevler\n- Doktor istemlerinin zamanında uygulanması")
    ).toEqual({});
    expect(
      phrasesOf(
        "Görevler\n- Antrenman programları hazırlamak ve gelişimlerini izlemek"
      )
    ).toEqual({
      "Antrenman programları hazırlama": "normal",
      "gelişimlerini izleme": "normal",
    });
    expect(phrasesOf("Görevler\n- Raporlama yapmak")).toEqual({});
    expect(
      phrasesOf("What you'll do\n- Administer medications safely")
    ).toEqual({});
  });

  it("drops generic, numeric, trait and dictionary-covered words", () => {
    expect(
      phrasesOf(
        "Requirements\n- 3+ years of experience\n- Strong communication skills\n- Dynamic team player"
      )
    ).toEqual({});
    // "HBYS" is a tool token: it ends a phrase
    expect(phrasesOf("Görevler\n- Hasta kabulü HBYS üzerinden")).toEqual({
      "Hasta kabulü": "normal",
    });
    // plural + possessive + accusative is a verb's object, not a skill
    expect(
      phrasesOf("Nitelikler\n- Hemşirelik kayıtlarını HBYS üzerinde tutabilen")
    ).toEqual({});
  });

  it("takes no phrase from boilerplate, conditions, intro prose or the title", () => {
    expect(
      phrasesOf(
        "Customer Service Representative\nWe are a fast growing retail company in sunny Leeds.\nRequirements\n- Valid driving licence\n- We are an equal opportunity employer regardless of race or gender"
      )
    ).toEqual({});
    // Without headings only bulleted lines count
    expect(
      phrasesOf(
        "Staff Nurse\nNorthgate is a teaching hospital with modern surgical wards"
      )
    ).toEqual({});
    expect(
      phrasesOf(
        "Northgate is a teaching hospital\n- Wound care and patient safety"
      )
    ).toEqual({ "Wound care": "normal", "patient safety": "normal" });
  });

  it("a phrase is required only with an explicit marker, not from its block", () => {
    expect(phrasesOf("Requirements\n- Wound care is a must")).toEqual({
      "Wound care": "required",
    });
  });

  it("matches the inflected forms a resume writes", () => {
    const [phrase] = extractKeywords(
      "Görevler\n- Hasta bakımında deneyimli"
    ).filter((k) => k.kind === "phrase");
    const found = (text: string) =>
      matchKeywords([phrase], [{ section: "experience", text }])[0].found;
    expect(found("Yoğun bakımda hasta bakımı ve takibi")).toBe(true);
    expect(found("Hasta bakım planları hazırladım")).toBe(true);
    expect(found("Hasta kabulü yaptım")).toBe(false);
    const [en] = extractKeywords("Requirements\n- Patient assessments").filter(
      (k) => k.kind === "phrase"
    );
    expect(
      matchKeywords(
        [en],
        [{ section: "experience", text: "Ran a patient assessment" }]
      )[0].found
    ).toBe(true);
  });

  it("phrases don't make an ad sufficient and go to experience advice", () => {
    const keywords = extractKeywords(
      "Requirements\n- Wound care\n- Discharge planning\n- Surgical ward experience"
    );
    expect(keywords.filter((k) => k.kind === "phrase")).toHaveLength(3);
    expect(isInsufficient(keywords)).toBe(true);
    const kinds = suggest({
      jobAd: "Requirements\n- Wound care",
      matches: matchKeywords(extractKeywords("Requirements\n- Wound care"), []),
      resume: initialResumeState,
      resumeText: "",
      langs: { ad: "en", resume: "en" },
    }).map((s) => s.kind);
    expect(kinds).toContain("missing-in-experience");
    expect(kinds).not.toContain("missing-skills");
  });

  it("Turkish nouns that look like verb or case forms stay in phrases", () => {
    // -mali, -mek, dative -ne/-ya and genitive -ün patterns would drop these
    expect(phrasesOf("Görevler\n- Mali tablo analizi")).toEqual({
      "Mali tablo analizi": "normal",
    });
    expect(phrasesOf("Görevler\n- Toplu yemek servisi")).toEqual({
      "Toplu yemek servisi": "normal",
    });
    expect(phrasesOf("Görevler\n- Makine bakımı ve medya planlama")).toEqual({
      "Makine bakımı": "normal",
      "medya planlama": "normal",
    });
    expect(
      phrasesOf(
        "Görevler\n- Kozmetik ürün, günlük protein ve kimya laboratuvarı"
      )
    ).toEqual({
      "Kozmetik ürün": "normal",
      "günlük protein": "normal",
      "kimya laboratuvarı": "normal",
    });
    // the exemption is for the bare noun only: "ürünün" still lost its head
    expect(phrasesOf("Görevler\n- Kozmetik ürünün geliştirilmesi")).toEqual({});
  });

  it("English verb forms end a phrase; -ing nouns and 'staffing' do not", () => {
    // "applied"/"identified" are past forms of stop verbs; "carries" the -s form
    expect(
      phrasesOf(
        "Requirements\n- Applied risk scoring, identified fraud patterns"
      )
    ).toEqual({ "risk scoring": "normal", "fraud patterns": "normal" });
    expect(
      phrasesOf(
        "Requirements\n- Branding guidelines, advertising campaigns, retail staffing"
      )
    ).toEqual({
      "Branding guidelines": "normal",
      "advertising campaigns": "normal",
      "retail staffing": "normal",
    });
    // a person head is still dropped, also as "leading"
    expect(phrasesOf("Requirements\n- Store staff, team leading")).toEqual({});
  });

  it("hyphenated stop compounds break a phrase, fast even on one huge token", () => {
    expect(
      phrasesOf("What you'll do\n- Support high-profile offsite events")
    ).toEqual({ "offsite events": "normal" });
    const start = Date.now();
    extractKeywords(`Requirements\n- ${"a".repeat(100000)}`);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("the dictionary has no form in two lines and a label in every line", () => {
    const owner = new Map<string, number>();
    const clashes: string[] = [];
    SKILLS.forEach((skill, i) => {
      for (const form of Array.from(
        new Set([...skill.en, ...skill.tr].map(foldText))
      )) {
        if (owner.has(form) && owner.get(form) !== i) clashes.push(form);
        owner.set(form, i);
      }
      expect(getSkillLabel(skill, "en")).toBeTruthy();
      expect(getSkillLabel(skill, "tr")).toBeTruthy();
    });
    expect(clashes).toEqual([]);
  });

  it("caps the phrases of one ad", () => {
    const lines = Array.from(
      { length: 80 },
      (_, i) =>
        `- Alpha${String.fromCharCode(
          97 + (i % 26),
          97 + Math.floor(i / 26)
        )} omega`
    );
    expect(
      Object.keys(phrasesOf(`Requirements\n${lines.join("\n")}`))
    ).toHaveLength(60);
  });
});

describe("job-match - ignored ad text and input limit (Faz 4)", () => {
  it("lists boilerplate sentences and title parentheses it left out", () => {
    const { ignored, keywords } = extractJobAd(
      "Data Analyst (SQL, Python)\nRequirements\n- Excel. We are an equal opportunity employer."
    );
    expect(ignored).toEqual([
      "SQL, Python",
      "We are an equal opportunity employer.",
    ]);
    expect(keywords.map((k) => k.label)).toEqual(["Excel"]);
  });

  it("lists lines under a skipped heading, once each", () => {
    const { ignored } = extractJobAd(
      "Requirements\n- Excel\nBenefits: Private health insurance\n- Ehliyet zorunlu\n- Ehliyet zorunlu"
    );
    expect(ignored).toEqual(["Private health insurance", "- Ehliyet zorunlu"]);
  });

  it("refuses input past the limit instead of truncating it", () => {
    // The UI tells "too long" apart from engine bugs by this class
    expect(() => analyze("a".repeat(MAX_INPUT_CHARS + 1), [])).toThrow(
      InputTooLongError
    );
    expect(() => analyze("Requirements: Excel", [])).not.toThrow();
  });
});
