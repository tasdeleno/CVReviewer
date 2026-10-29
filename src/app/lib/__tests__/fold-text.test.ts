import { foldText } from "lib/fold-text";

test("foldText", () => {
  expect(foldText("İŞ DENEYİMİ")).toEqual("is deneyimi");
  expect(foldText("Eğitim Bilgileri")).toEqual("egitim bilgileri");
  expect(foldText("ÖZET")).toEqual("ozet");
  expect(foldText("SKILLS")).toEqual("skills");
  expect(foldText("Work Experience")).toEqual("work experience");
  expect(foldText("Yetkinlikler & Çalışma")).toEqual("yetkinlikler & calisma");
});
