import { useEffect, useRef, useState } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import {
  getHasUsedAppBefore,
  saveStateToLocalStorage,
} from "lib/redux/local-storage";
import { type ShowForm, initialSettings } from "lib/redux/settingsSlice";
import { useRouter } from "next/navigation";
import addPdfSrc from "public/assets/add-pdf.svg";
import Image from "next/image";
import { cx } from "lib/cx";
import { deepClone } from "lib/deep-clone";

// A text resume is well under 1 MB; this only stops accidental huge files
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

const defaultFileState = {
  name: "",
  size: 0,
  fileUrl: "",
};

export const ResumeDropzone = ({
  onFileUrlChange,
  className,
  playgroundView = false,
}: {
  onFileUrlChange: (fileUrl: string) => void;
  className?: string;
  playgroundView?: boolean;
}) => {
  const [file, setFile] = useState(defaultFileState);
  const [isHoveredOnDropzone, setIsHoveredOnDropzone] = useState(false);
  const [fileError, setFileError] = useState("");
  const router = useRouter();
  // The latest object URL, revoked on unmount
  const fileUrlRef = useRef("");
  useEffect(() => () => URL.revokeObjectURL(fileUrlRef.current), []);

  const hasFile = Boolean(file.name);

  // Picking or removing a file swaps the control under the focus: move focus to the
  // control that replaced it, but never on first load
  const focusAfterSwap = useRef(false);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focusAfterSwap.current) return;
    focusAfterSwap.current = false;
    (hasFile ? removeButtonRef : inputRef).current?.focus();
  }, [hasFile]);

  const setFileUrl = (fileUrl: string) => {
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = fileUrl;
    onFileUrlChange(fileUrl);
  };

  // Drop and file picker both land here: a drag of text or a link has no file
  const handleFile = (newFile?: File) => {
    if (!newFile) return;
    if (!/\.pdf$/i.test(newFile.name)) {
      setFileError("Yalnız PDF dosyası yüklenebilir.");
      return;
    }
    if (newFile.size > MAX_PDF_BYTES) {
      setFileError("PDF 10 MB'tan büyük. Daha küçük bir dosya seç.");
      return;
    }
    setFileError("");
    focusAfterSwap.current = true;
    const fileUrl = URL.createObjectURL(newFile);
    setFile({ name: newFile.name, size: newFile.size, fileUrl });
    setFileUrl(fileUrl);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHoveredOnDropzone(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const onRemove = () => {
    focusAfterSwap.current = true;
    setFile(defaultFileState);
    setFileError("");
    setFileUrl("");
  };

  const onImportClick = async () => {
    const resume = await parseResumeFromPdf(file.fileUrl);
    const settings = deepClone(initialSettings);

    // Set formToShow settings based on uploaded resume if users have used the app before
    if (getHasUsedAppBefore()) {
      const sections = Object.keys(settings.formToShow) as ShowForm[];
      const sectionToFormToShow: Record<ShowForm, boolean> = {
        workExperiences: resume.workExperiences.length > 0,
        educations: resume.educations.length > 0,
        projects: resume.projects.length > 0,
        skills: resume.skills.descriptions.length > 0,
        custom: resume.custom.descriptions.length > 0,
      };
      for (const section of sections) {
        settings.formToShow[section] = sectionToFormToShow[section];
      }
    }

    saveStateToLocalStorage({ resume, settings });
    router.push("/resume-builder");
  };

  return (
    <div
      className={cx(
        "flex justify-center border-2 border-dashed px-6",
        isHoveredOnDropzone ? "border-ink bg-sign/30" : "border-muted",
        playgroundView ? "py-6" : "rounded-md py-12",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsHoveredOnDropzone(true);
      }}
      onDragLeave={() => setIsHoveredOnDropzone(false)}
      onDrop={onDrop}
    >
      <div className="space-y-3 text-center">
        {!playgroundView && (
          <Image
            src={addPdfSrc}
            className="mx-auto h-14 w-14"
            alt=""
            aria-hidden="true"
            priority
          />
        )}
        {!hasFile ? (
          <>
            <p className="text-lg font-bold">PDF'i buraya bırak ya da seç</p>
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
              <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Dosya yalnız bu tarayıcıda okunur, hiçbir yere gönderilmez
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="min-w-0 break-all font-bold">
              {file.name} · {getFileSizeString(file.size)}
            </div>
            <button
              ref={removeButtonRef}
              type="button"
              className="p-1 text-muted hover:bg-ink/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              aria-label="Dosyayı kaldır"
              title="Dosyayı kaldır"
              onClick={onRemove}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="pt-2">
          {!hasFile ? (
            <label className="hover:bg-ink/85 inline-block cursor-pointer bg-ink px-6 py-2.5 font-bold text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
              Dosya seç
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".pdf,application/pdf"
                onChange={onInputChange}
              />
            </label>
          ) : (
            <>
              {!playgroundView && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onImportClick}
                >
                  İçe aktar ve devam et <span aria-hidden="true">→</span>
                </button>
              )}
              <p
                className={cx("text-sm text-muted", !playgroundView && "mt-6")}
              >
                Tek sütunlu CV'ler en iyi sonucu verir.
              </p>
            </>
          )}
          {fileError && (
            <p role="alert" className="mt-4 font-bold text-flag">
              {fileError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const getFileSizeString = (fileSizeB: number) => {
  const fileSizeKB = fileSizeB / 1024;
  const fileSizeMB = fileSizeKB / 1024;
  if (fileSizeKB < 1000) {
    return fileSizeKB.toPrecision(3) + " KB";
  } else {
    return fileSizeMB.toPrecision(3) + " MB";
  }
};
