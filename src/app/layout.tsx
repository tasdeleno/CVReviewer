import "globals.css";
import { TopNavBar } from "components/TopNavBar";

export const metadata = {
  title: "CVReviewer - İlana Göre CV Değerlendirme",
  description:
    "CV'nizi iş ilanına göre skorlayın, eksik anahtar kelimeleri görün ve bölüm bölüm öneriler alın. Tüm işlem tarayıcınızda yapılır.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-ground font-sign text-ink">
        <TopNavBar />
        {children}
        <footer className="px-4 pb-8 pt-16 text-sm text-muted lg:px-12">
          CVReviewer,{" "}
          <a
            className="underline underline-offset-2 hover:text-ink"
            href="https://github.com/xitanggg/open-resume"
          >
            OpenResume
          </a>{" "}
          tabanlıdır ve AGPL-3.0 lisansıyla dağıtılır.{" "}
          {/* AGPL §13: every user of the hosted site can get the source */}
          <a
            className="underline underline-offset-2 hover:text-ink"
            href="https://github.com/tasdeleno/CVReviewer"
          >
            Kaynak kodu
          </a>
        </footer>
      </body>
    </html>
  );
}
