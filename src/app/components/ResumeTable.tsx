import { Fragment } from "react";
import type { Resume } from "lib/redux/types";
import { initialEducation, initialWorkExperience } from "lib/redux/resumeSlice";
import { deepClone } from "lib/deep-clone";
import { cx } from "lib/cx";

const TableRowHeader = ({ children }: { children: React.ReactNode }) => (
  <tr className="bg-ink text-white">
    <th className="px-3 py-1.5 font-bold" colSpan={2}>
      {children}
    </th>
  </tr>
);

const TableRow = ({
  label,
  value,
}: {
  label: string;
  value: string | string[];
}) => {
  const empty = typeof value === "string" ? !value.trim() : !value.length;
  return (
    <tr className="border-t border-line">
      <th className="w-32 px-3 py-2 font-bold sm:w-36" scope="row">
        {label}
      </th>
      <td className={cx("break-words px-3 py-2", empty && "text-muted")}>
        {empty
          ? "okunamadı"
          : typeof value === "string"
          ? value
          : value.map((x, idx) => (
              <Fragment key={idx}>
                • {x}
                <br />
              </Fragment>
            ))}
      </td>
    </tr>
  );
};

/** What the parser read from the resume: what an ATS would see */
export const ResumeTable = ({ resume }: { resume: Resume }) => {
  const educations =
    resume.educations.length === 0
      ? [deepClone(initialEducation)]
      : resume.educations;
  const workExperiences =
    resume.workExperiences.length === 0
      ? [deepClone(initialWorkExperience)]
      : resume.workExperiences;
  const skills = [...resume.skills.descriptions];
  const featuredSkills = resume.skills.featuredSkills
    .filter((item) => item.skill.trim())
    .map((item) => item.skill)
    .join(", ")
    .trim();
  if (featuredSkills) {
    skills.unshift(featuredSkills);
  }
  return (
    // table-fixed + break-words: a long URL or e-mail must wrap, not widen the page
    <table className="w-full table-fixed border-2 border-ink bg-white text-left align-top text-sm">
      {/* Fixed layout takes widths from here: the first row is a colSpan header */}
      <colgroup>
        <col className="w-32 sm:w-36" />
        <col />
      </colgroup>
      <tbody>
        <TableRowHeader>Profil</TableRowHeader>
        <TableRow label="Ad" value={resume.profile.name} />
        <TableRow label="E-posta" value={resume.profile.email} />
        <TableRow label="Telefon" value={resume.profile.phone} />
        <TableRow label="Konum" value={resume.profile.location} />
        <TableRow label="Bağlantı" value={resume.profile.url} />
        <TableRow label="Özet" value={resume.profile.summary} />
        <TableRowHeader>Eğitim</TableRowHeader>
        {educations.map((education, idx) => (
          <Fragment key={idx}>
            <TableRow label="Okul" value={education.school} />
            <TableRow label="Derece" value={education.degree} />
            <TableRow label="Not ortalaması" value={education.gpa} />
            <TableRow label="Tarih" value={education.date} />
            <TableRow label="Açıklamalar" value={education.descriptions} />
          </Fragment>
        ))}
        <TableRowHeader>İş deneyimi</TableRowHeader>
        {workExperiences.map((workExperience, idx) => (
          <Fragment key={idx}>
            <TableRow label="Şirket" value={workExperience.company} />
            <TableRow label="Unvan" value={workExperience.jobTitle} />
            <TableRow label="Tarih" value={workExperience.date} />
            <TableRow label="Maddeler" value={workExperience.descriptions} />
          </Fragment>
        ))}
        {resume.projects.length > 0 && (
          <TableRowHeader>Projeler</TableRowHeader>
        )}
        {resume.projects.map((project, idx) => (
          <Fragment key={idx}>
            <TableRow label="Proje" value={project.project} />
            <TableRow label="Tarih" value={project.date} />
            <TableRow label="Maddeler" value={project.descriptions} />
          </Fragment>
        ))}
        <TableRowHeader>Beceriler</TableRowHeader>
        <TableRow label="Beceriler" value={skills} />
      </tbody>
    </table>
  );
};
