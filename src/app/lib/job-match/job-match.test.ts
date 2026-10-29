import { extractKeywords } from "lib/job-match/keywords";
import { computeScore, matchKeywords } from "lib/job-match";
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
    // (Python 2 + Docker 0.5) / (Python 2 + SQL 2 + Docker 0.5)
    expect(computeScore(matches)).toBe(56);
    expect(computeScore([])).toBe(0);
  });

  it("detects language", () => {
    expect(detectLang("We are looking for a developer with SQL")).toBe("en");
    expect(
      detectLang("Ekibimize SQL bilgisine sahip bir geliştirici arıyoruz")
    ).toBe("tr");
  });
});
