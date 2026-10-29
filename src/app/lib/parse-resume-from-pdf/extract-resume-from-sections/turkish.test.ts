import {
  matchOnlyLetterSpaceOrPeriod,
  matchPhone,
  matchCityAndState,
} from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-profile";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { getSectionLinesByKeywords } from "lib/parse-resume-from-pdf/extract-resume-from-sections/lib/get-section-lines";
import { DATE_FEATURE_SETS } from "lib/parse-resume-from-pdf/extract-resume-from-sections/lib/common-features";
import type { Lines, TextItem } from "lib/parse-resume-from-pdf/types";

const makeTextItem = (text: string, fontName = "Arial") =>
  ({ text, fontName } as TextItem);

describe("Turkish resume support - ", () => {
  it("Name with Turkish letters", () => {
    expect(matchOnlyLetterSpaceOrPeriod(makeTextItem("Gökçe Şahin"))![0]).toBe(
      "Gökçe Şahin"
    );
  });

  it("Turkish phone formats", () => {
    expect(matchPhone(makeTextItem("+90 (532) 123 45 67"))![0]).toBe(
      "+90 (532) 123 45 67"
    );
    expect(matchPhone(makeTextItem("0532 123 45 67"))![0]).toBe(
      "0532 123 45 67"
    );
    // Intentional change: country code is now kept for US numbers too
    expect(matchPhone(makeTextItem("+1 (123) 456-7890"))![0]).toBe(
      "+1 (123) 456-7890"
    );
    expect(matchPhone(makeTextItem("2019 - 2021"))).toBeFalsy();
  });

  it("Turkish months match whole words only", () => {
    const [hasYear, hasMonth] = DATE_FEATURE_SETS.map(([fn]) => fn);
    expect(hasMonth(makeTextItem("Mart 2021 - Halen"))).toBeTruthy();
    expect(hasMonth(makeTextItem("Martin Marietta"))).toBeFalsy();
    expect(hasYear(makeTextItem("Mart 2021"))).toBeTruthy();
  });

  it("Turkish location", () => {
    expect(matchCityAndState(makeTextItem("İstanbul, Türkiye"))![0]).toBe(
      "İstanbul, Türkiye"
    );
  });

  it("Groups lines under Turkish section titles", () => {
    const lines: Lines = [
      [makeTextItem("Gökçe Şahin", "Arial-BoldMT")],
      [makeTextItem("gokce@example.com")],
      [makeTextItem("İŞ DENEYİMİ", "Arial-BoldMT")], // bold + uppercase
      [makeTextItem("Yazılım Mühendisi")],
      [makeTextItem("Eğitim")], // fallback: keyword match, not bold
      [makeTextItem("Boğaziçi Üniversitesi")],
    ];
    const sections = groupLinesIntoSections(lines);
    expect(Object.keys(sections)).toEqual(["profile", "İŞ DENEYİMİ", "Eğitim"]);
    expect(getSectionLinesByKeywords(sections, ["deneyim"])[0][0].text).toBe(
      "Yazılım Mühendisi"
    );
    expect(getSectionLinesByKeywords(sections, ["egitim"])[0][0].text).toBe(
      "Boğaziçi Üniversitesi"
    );
  });

  it("Turkish stems do not turn English words into section titles", () => {
    const lines: Lines = [
      [makeTextItem("Jane Doe", "Arial-BoldMT")],
      [makeTextItem("jane@example.com")],
      [makeTextItem("SKILLS", "Arial-BoldMT")],
      [makeTextItem("Modules")], // contains "odul"
      [makeTextItem("Çalışma Geçmişi")], // Turkish fallback title
      [makeTextItem("Acme")],
    ];
    expect(Object.keys(groupLinesIntoSections(lines))).toEqual([
      "profile",
      "SKILLS",
      "Çalışma Geçmişi",
    ]);
  });
});

describe("Phone formats - ", () => {
  it("UK and other 9-15 digit numbers", () => {
    expect(matchPhone(makeTextItem("+44 7700 900123"))![0]).toBe(
      "+44 7700 900123"
    );
    expect(matchPhone(makeTextItem("10001"))).toBeFalsy();
  });
});

describe("Phone false positives - ", () => {
  it("postcode + year and slices of long numbers are not phones", () => {
    expect(matchPhone(makeTextItem("Kadıköy 34710 2019"))).toBeFalsy();
    expect(matchPhone(makeTextItem("1.200.000.000 TL"))).toBeFalsy();
  });
});

describe("Phone after a non-phone number - ", () => {
  it("skips postcodes/emails with digits and finds the phone", () => {
    expect(
      matchPhone(makeTextItem("Ankara 06100 | +90 532 123 45 67"))![0]
    ).toBe("+90 532 123 45 67");
    expect(
      matchPhone(makeTextItem("ali1990@example.com 0532 123 45 67"))![0]
    ).toBe("0532 123 45 67");
  });
});
