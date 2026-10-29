import { extractConditions, extractKeywords } from "lib/job-match/keywords";
import { checkConditions } from "lib/job-match/conditions";
import { computeScore, matchKeywords } from "lib/job-match";
import { suggest } from "lib/job-match/suggest";
import { initialResumeState } from "lib/redux/resumeSlice";
import {
  detectLang,
  hasPhrase,
  toPhrase,
  toTokenizedText,
} from "lib/job-match/text";

const keywordsOf = (ad: string) =>
  Object.fromEntries(extractKeywords(ad).map((k) => [k.label, k.importance]));

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
