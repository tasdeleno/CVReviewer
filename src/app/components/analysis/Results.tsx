import { forwardRef, memo } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { Analysis, KeywordMatch } from "lib/job-match";
import type { Importance } from "lib/job-match/keywords";
import type {
  AtsCheck,
  Suggestion,
  SuggestionKind,
  SuggestionSection,
} from "lib/job-match/suggest";
import type { ConditionKind, ConditionTier } from "lib/job-match/conditions";
import type { Resume } from "lib/redux/types";
import { ResumeTable } from "components/ResumeTable";
import { cx } from "lib/cx";

// Everything below renders engine text as plain text nodes: never as HTML

const KIND_TITLE: Record<SuggestionKind, string> = {
  "low-signal": "İlanda az beceri var",
  "missing-skills": "Eksik araçlar",
  "missing-in-experience": "Deneyimde göster",
  "soft-skills": "Kişisel yetkinlikler",
  education: "Eğitim şartı",
  "only-in-skills": "Yalnız beceri listesinde",
  "no-summary": "Özet ekle",
  title: "Hedef unvan",
  "weak-verbs": "Güçlü fiillerle yaz",
  unquantified: "Maddelere sayı ekle",
  "long-bullets": "Maddeleri kısalt",
};

const PRIORITY_TR: Record<Suggestion["priority"], string> = {
  high: "Öncelikli",
  medium: "Önerilen",
  low: "İsteğe bağlı",
};

// "vergi" → "Vergi", but a label with its own casing in the first word stays: iOS, eBay
const capitalize = (text: string) =>
  /^\S*\p{Lu}/u.test(text)
    ? text
    : text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);

// Quoted ad and resume lines keep their own bullet glyph ("- TFRS …"); drop it
const stripBullet = (line: string) => line.replace(/^[-–•*·]\s+/, "");

const SECTION_TR: Record<SuggestionSection, string> = {
  summary: "Özet",
  experience: "İş Deneyimi",
  skills: "Yetenekler",
  education: "Eğitim",
  general: "Genel",
};

const IMPORTANCE_TR: Record<Importance, string> = {
  required: "zorunlu",
  normal: "istenen",
  preferred: "tercih",
};

const CONDITION_TR: Record<ConditionKind, string> = {
  license: "Ehliyet",
  "own-vehicle": "Kendi aracı",
  "work-permit": "Çalışma izni",
  residence: "İkamet",
  travel: "Seyahat",
  shift: "Vardiya",
  military: "Askerlik",
  "criminal-record": "Adli sicil",
  "health-report": "Sağlık raporu",
  gender: "Cinsiyet",
  age: "Yaş",
  disability: "Engellilik",
  marital: "Medeni hâl",
  children: "Çocuk",
  pregnancy: "Hamilelik",
  religion: "Din",
  smoking: "Sigara",
  appearance: "Görünüş",
};

const PROTECTED: ConditionTier[] = ["protected-exception", "protected"];

const IMPORTANCE_ORDER: Importance[] = ["required", "normal", "preferred"];
const byImportance = (a: KeywordMatch, b: KeywordMatch) =>
  IMPORTANCE_ORDER.indexOf(a.importance) -
  IMPORTANCE_ORDER.indexOf(b.importance);

/** State by form, not only by colour: filled = in the resume, empty = missing */
const Mark = ({ on, dashed }: { on: boolean; dashed?: boolean }) => (
  <span
    aria-hidden="true"
    className={cx(
      "inline-block h-3 w-3 shrink-0 border-2 border-current",
      on && "bg-current",
      dashed && "border-dashed"
    )}
  />
);

const SectionHeading = forwardRef<
  HTMLHeadingElement,
  { children: React.ReactNode; note?: string; first?: boolean }
>(({ children, note, first }, ref) => (
  <div
    className={cx(
      "mb-3 flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2",
      !first && "mt-12"
    )}
  >
    <h2
      ref={ref}
      tabIndex={-1}
      className="text-2xl font-bold tracking-tight outline-none"
    >
      {children}
    </h2>
    {note && <span className="text-sm text-muted">{note}</span>}
  </div>
));
SectionHeading.displayName = "SectionHeading";

const Sign = ({
  suggestion,
  number,
  lead,
}: {
  suggestion: Suggestion;
  number: number;
  lead: boolean;
}) => {
  const { kind, section, priority, message, examples, terms } = suggestion;
  const heading = capitalize(
    terms?.length ? terms.join(", ") : KIND_TITLE[kind]
  );
  return (
    <li
      className={cx(
        "grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[2.75rem_1fr_auto]",
        priority === "high" && "bg-sign",
        priority === "medium" && "bg-white",
        // dashed is reserved for low confidence; low priority is a plain rule
        priority === "low" && "border-t-2 border-ink",
        lead && "py-6"
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "flex h-11 w-11 items-center justify-center bg-ink text-lg font-bold tabular-nums",
          priority === "high" ? "text-sign" : "text-white"
        )}
      >
        {number}
      </span>
      <div className="min-w-0">
        <h3
          className={cx(
            "break-words font-bold leading-tight tracking-tight",
            lead ? "text-4xl" : "text-2xl"
          )}
        >
          {heading}
        </h3>
        <p className="mt-1 text-sm font-bold">{PRIORITY_TR[priority]}</p>
        <p className={cx("mt-2 max-w-[70ch]", !lead && "text-sm")}>{message}</p>
        {examples?.length ? (
          <ul className="mt-2 space-y-1">
            {examples.map((example, i) => (
              <li key={i} className="max-w-[70ch] pl-3 -indent-3 text-sm">
                «{stripBullet(example)}»
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="col-start-2 flex items-center gap-2 font-bold sm:col-start-3 sm:row-start-1 sm:self-center">
        <span className="sr-only">Hedef bölüm:</span>
        {SECTION_TR[section]}
        <ArrowRightIcon
          className="h-7 w-7"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </p>
    </li>
  );
};

const TermList = ({ items }: { items: KeywordMatch[] }) => (
  <ul className="divide-y divide-line border-y border-line">
    {items.map((m) => (
      <li
        key={`${m.kind}:${m.label}`}
        className="flex items-baseline gap-3 py-2"
      >
        <span className="self-center">
          <Mark on={m.found} dashed={m.kind === "phrase"} />
        </span>
        <span
          className={cx("min-w-0 flex-1 break-words", !m.found && "font-bold")}
        >
          {m.label}
        </span>
        <span className="shrink-0 text-right text-sm text-muted">
          {m.found
            ? m.sections.join(", ") || "CV'de"
            : IMPORTANCE_TR[m.importance]}
        </span>
      </li>
    ))}
  </ul>
);

const Fold = ({
  summary,
  open,
  children,
}: {
  summary: string;
  open?: boolean;
  children: React.ReactNode;
}) => (
  <details open={open} className="group mt-4 border-t-2 border-ink">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
      {summary}
      <ArrowRightIcon
        className="h-5 w-5 shrink-0 transition-transform group-open:rotate-90"
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </summary>
    <div className="pb-4">{children}</div>
  </details>
);

export const AtsPanel = ({
  ats,
  resume,
  open,
}: {
  ats: AtsCheck[];
  resume: Resume;
  open?: boolean;
}) => {
  const ok = ats.filter((check) => check.ok).length;
  return (
    <Fold
      summary={`ATS okunabilirliği · ${ok} / ${ats.length} kontrol geçti`}
      open={open}
    >
      <ul className="mb-4 space-y-1">
        {ats.map((check, i) => (
          <li
            key={i}
            className={cx(
              "flex items-center gap-3",
              !check.ok && "font-bold text-flag"
            )}
          >
            <Mark on={check.ok} />
            {check.message}
          </li>
        ))}
      </ul>
      <p className="mb-2 text-sm text-muted">
        Bir ATS'nin CV'nden okuyabildikleri. Boş kalan alanlar başvuru formunda
        da boş görünebilir.
      </p>
      <ResumeTable resume={resume} />
    </Fold>
  );
};

/** Memoized: typing in the ad box re-renders the page, not these lists */
export const Results = memo(
  forwardRef<HTMLHeadingElement, { result: Analysis }>(
    ({ result }, headingRef) => {
      const { suggestions, matches, conditions, ignored, ats, resume } = result;
      const skills = matches.filter((m) => m.kind !== "phrase");
      const missing = skills.filter((m) => !m.found).sort(byImportance);
      const found = skills.filter((m) => m.found).sort(byImportance);
      const phrases = matches.filter((m) => m.kind === "phrase");
      return (
        <div>
          <SectionHeading
            ref={headingRef}
            first
            note={`${suggestions.length} adım`}
          >
            Yapılacaklar
          </SectionHeading>
          {suggestions.length ? (
            <ol className="space-y-2.5">
              {suggestions.map((s, i) => (
                <Sign key={i} suggestion={s} number={i + 1} lead={i === 0} />
              ))}
            </ol>
          ) : (
            <p className="bg-white px-5 py-4">
              Bu ilan için önerilecek bir şey bulunamadı.
            </p>
          )}

          {conditions.length > 0 && (
            <>
              <SectionHeading note="Skora girmez">
                İlan koşulları
              </SectionHeading>
              <ul className="divide-y divide-line border-y border-line">
                {conditions.map((c, i) => (
                  <li
                    key={i}
                    className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr_auto] sm:gap-4"
                  >
                    <span className="font-bold">{CONDITION_TR[c.kind]}</span>
                    <span className="text-sm">
                      «{stripBullet(c.text)}»
                      {PROTECTED.includes(c.tier) && (
                        <span className="mt-1 block text-muted">
                          Korunan bir özellik: ilanda olması ayrımcılık
                          sayılabilir.
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      {c.found === undefined ? (
                        "CV'den anlaşılmaz"
                      ) : (
                        <>
                          <Mark on={c.found} />
                          {c.found ? "CV'de var" : "CV'de yok"}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <SectionHeading note={`${found.length} / ${skills.length} CV'de`}>
            İlandaki beceriler
          </SectionHeading>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-bold">Eksik · {missing.length}</h3>
              {missing.length ? (
                <TermList items={missing} />
              ) : (
                <p>Eksik beceri yok.</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-bold">Var · {found.length}</h3>
              {found.length ? (
                <TermList items={found} />
              ) : (
                <p>Eşleşen beceri yok.</p>
              )}
            </div>
          </div>

          {phrases.length > 0 && (
            <Fold summary={`İlanda geçen diğer ifadeler · ${phrases.length}`}>
              <p className="mb-3 max-w-[70ch] text-sm text-muted">
                Sözlükte olmayan, ilandan çıkarılmış ifadeler. Yaklaşık yarısı
                gerçek beceri değil, ilanın kendi anlatımı: yalnız işine
                yarayanları dikkate al.
              </p>
              <TermList items={[...phrases].sort(byImportance)} />
            </Fold>
          )}

          {ignored.length > 0 && (
            <Fold summary={`Analize alınmayan ilan metni · ${ignored.length}`}>
              <p className="mb-3 max-w-[70ch] text-sm text-muted">
                Yasal metin, yan haklar, şirket ve başlık bilgisi beceri
                sayılmadı. Burada bir gereksinim görürsen CV'nde ayrıca kontrol
                et.
              </p>
              <ul className="space-y-1.5">
                {ignored.map((text, i) => (
                  <li
                    key={i}
                    className="max-w-[70ch] text-muted line-through decoration-ink/40"
                  >
                    {text}
                  </li>
                ))}
              </ul>
            </Fold>
          )}

          <AtsPanel ats={ats} resume={resume} />
        </div>
      );
    }
  )
);
Results.displayName = "Results";
