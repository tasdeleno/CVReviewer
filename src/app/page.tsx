"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import {
  readPdf,
  MAX_PDF_PAGES,
  PdfTooLongError,
} from "lib/parse-resume-from-pdf/read-pdf";
import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import {
  analyze,
  resumeLength,
  InputTooLongError,
  MAX_INPUT_CHARS,
  type Analysis,
} from "lib/job-match";
import { checkAts } from "lib/job-match/suggest";
import { ResumeDropzone } from "components/ResumeDropzone";
import { ScoreCard } from "components/analysis/ScoreCard";
import { AtsPanel, Results } from "components/analysis/Results";
import { cx } from "lib/cx";

// Fewer characters than this and the PDF is most likely a scan with no text layer
const MIN_RESUME_CHARS = 50;
const formatCount = (n: number) => n.toLocaleString("tr-TR");

const pdfErrorMessage = (error: unknown) => {
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException") {
    return "PDF şifreli. Şifresiz bir kopyasını yükle.";
  }
  if (error instanceof PdfTooLongError) {
    return `PDF ${MAX_PDF_PAGES} sayfadan uzun. CV'nin kendisini yükle.`;
  }
  // Corrupt file, worker load failure or a parser bug: keep the cause for debugging
  console.error(error);
  return "PDF okunamadı; dosya bozuk olabilir. Başka bir PDF dene.";
};

export default function Analyze() {
  const [adText, setAdText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [textItems, setTextItems] = useState<TextItems | null>(null);
  const [reading, setReading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [analyzedAd, setAnalyzedAd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [editing, setEditing] = useState(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  // The resume the deferred analysis must still match when it runs
  const textItemsRef = useRef(textItems);
  textItemsRef.current = textItems;

  // Read the PDF; a newer file (or removing it) cancels a read still in flight
  useEffect(() => {
    setTextItems(null);
    setResult(null);
    setPdfError("");
    setAnalyzeError("");
    if (!fileUrl) return;
    let cancelled = false;
    setReading(true);
    readPdf(fileUrl)
      .then((items) => {
        if (cancelled) return;
        const length = resumeLength(items);
        if (length < MIN_RESUME_CHARS) {
          setPdfError(
            "Bu PDF'ten metin çıkmadı; taranmış bir görüntü olabilir. Metin seçilebilen bir PDF yükle."
          );
        } else if (length > MAX_INPUT_CHARS) {
          setPdfError(
            `CV metni ${formatCount(
              MAX_INPUT_CHARS
            )} karakterden uzun. CV'nin kendisini yükle.`
          );
        } else {
          setTextItems(items);
        }
      })
      .catch((error) => {
        if (!cancelled) setPdfError(pdfErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setReading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Without an ad (or before analysis) the ATS check still works on the resume alone
  const atsOnly = useMemo(() => {
    if (!textItems) return null;
    const lines = groupTextItemsIntoLines(textItems);
    const resume = extractResumeFromSections(groupLinesIntoSections(lines));
    return { resume, ats: checkAts(textItems, resume) };
  }, [textItems]);

  useEffect(() => {
    if (result) resultsHeading.current?.focus();
  }, [result]);

  const adTooLong = adText.length > MAX_INPUT_CHARS;
  const blocker = !adText.trim()
    ? "İlan metnini yapıştır."
    : adTooLong
    ? `İlan ${formatCount(
        MAX_INPUT_CHARS
      )} karakterden uzun; yalnız ilanın kendisini yapıştır.`
    : reading
    ? "CV okunuyor…"
    : !textItems
    ? "CV'ni PDF olarak ekle."
    : "";

  const onAnalyze = () => {
    if (blocker || !textItems) return;
    setAnalyzing(true);
    setAnalyzeError("");
    // Let "Analiz ediliyor…" paint before the synchronous analysis runs.
    // ponytail: main thread; move to a Worker if inputs near the cap take over ~1 s
    setTimeout(() => {
      try {
        // The CV was replaced or removed before this ran: its result is stale
        if (textItemsRef.current !== textItems) return;
        setResult(analyze(adText, textItems));
        setAnalyzedAd(adText);
        setEditing(false);
      } catch (error) {
        const tooLong = error instanceof InputTooLongError;
        setAnalyzeError(
          tooLong
            ? `İlan ya da CV ${formatCount(MAX_INPUT_CHARS)} karakterden uzun.`
            : "Analiz sırasında beklenmeyen bir hata oldu. Sayfayı yenileyip tekrar dene."
        );
        if (!tooLong) console.error(error);
      } finally {
        setAnalyzing(false);
      }
    }, 0);
  };

  const showInputs = !result || editing;
  const adChanged = Boolean(result) && adText !== analyzedAd;

  return (
    <main className="px-4 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[22.5rem_1fr]">
        {/* On phones the empty score waits below the inputs; with a result it leads */}
        <aside
          className={cx(
            "self-start bg-ink p-8 text-white lg:sticky lg:top-6",
            !result && "order-last lg:order-none"
          )}
        >
          {/* The score is shown only through ScoreCard, together with `insufficient` */}
          <ScoreCard result={result} />
          {result && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              aria-controls="inputs"
              className="mt-6 w-full border-2 border-white px-4 py-2.5 font-bold hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign"
            >
              {editing ? "Girdileri gizle" : "İlanı ya da CV'yi değiştir"}
            </button>
          )}
        </aside>

        <div className="min-w-0">
          {/* With a result the score answers the question: keep the h1 for screen readers only */}
          <h1
            className={cx(
              "mb-6 text-4xl font-bold tracking-tight sm:text-5xl",
              Boolean(result) && !editing && "sr-only"
            )}
          >
            CV'n bu ilana ne kadar uyuyor?
          </h1>
          {/* One status region, always mounted, so screen readers announce changes */}
          <p role="status" className="sr-only">
            {analyzing ? "Analiz ediliyor…" : reading ? "CV okunuyor…" : ""}
          </p>
          {/* Kept mounted while hidden: the dropzone owns the file and its object URL */}
          <section id="inputs" hidden={!showInputs} aria-label="Girdiler">
            <ol className="space-y-2.5">
              <li className="bg-sign p-5">
                <label htmlFor="ad" className="mb-3 flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center bg-ink text-lg font-bold text-sign"
                  >
                    1
                  </span>
                  <span className="text-2xl font-bold tracking-tight">
                    İlan metni
                  </span>
                </label>
                <textarea
                  id="ad"
                  value={adText}
                  onChange={(e) => setAdText(e.target.value)}
                  rows={10}
                  placeholder="İlanın tamamını buraya yapıştır: başlık, sorumluluklar, aranan nitelikler…"
                  aria-describedby="ad-count"
                  className="block w-full resize-y border-2 border-ink bg-white p-3 placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                />
                <p
                  id="ad-count"
                  className={cx(
                    "mt-2 text-sm tabular-nums",
                    adTooLong && "font-bold text-flag"
                  )}
                >
                  {formatCount(adText.length)} / {formatCount(MAX_INPUT_CHARS)}{" "}
                  karakter
                  {adTooLong && " · çok uzun"}
                </p>
              </li>
              <li className="bg-sign p-5">
                <p className="mb-3 flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center bg-ink text-lg font-bold text-sign"
                  >
                    2
                  </span>
                  <span className="text-2xl font-bold tracking-tight">
                    CV (PDF)
                  </span>
                </p>
                <ResumeDropzone
                  onFileUrlChange={setFileUrl}
                  playgroundView
                  className="bg-white"
                />
                {reading && (
                  <p className="mt-2 text-sm font-bold" aria-hidden="true">
                    CV okunuyor…
                  </p>
                )}
                {pdfError && (
                  <p
                    role="alert"
                    className="mt-3 bg-white px-3 py-2 font-bold text-flag"
                  >
                    {pdfError}
                  </p>
                )}
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={Boolean(blocker) || analyzing}
                aria-describedby={blocker ? "blocker" : undefined}
                className="hover:bg-ink/85 flex items-center gap-3 bg-ink px-7 py-4 text-xl font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/40"
              >
                {analyzing
                  ? "Analiz ediliyor…"
                  : result
                  ? "Yeniden analiz et"
                  : "Analiz et"}
                <ArrowRightIcon
                  className="h-6 w-6 text-sign"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </button>
              {blocker && (
                <p id="blocker" className="text-muted">
                  {blocker}
                </p>
              )}
              {adChanged && !blocker && (
                <p className="font-bold">
                  İlan değişti: sonuçları güncellemek için yeniden analiz et.
                </p>
              )}
            </div>
            {analyzeError && (
              <p
                role="alert"
                className="mt-3 bg-white px-3 py-2 font-bold text-flag"
              >
                {analyzeError}
              </p>
            )}
            {!result && atsOnly && (
              <div className="mt-10">
                <p className="max-w-[70ch] text-muted">
                  İlan olmadan da CV'nin bir ATS tarafından nasıl okunduğunu
                  görebilirsin:
                </p>
                <AtsPanel ats={atsOnly.ats} resume={atsOnly.resume} open />
              </div>
            )}
          </section>

          {result && <Results ref={resultsHeading} result={result} />}
        </div>
      </div>
    </main>
  );
}
