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
      <body>
        <TopNavBar />
        {children}
      </body>
    </html>
  );
}
