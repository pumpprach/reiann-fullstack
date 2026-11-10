import type { Program } from "@/core/types";

export interface Faculty {
  id: string;
  nameEn: string;
  nameTh: string;
}

/** Sample data for the demo. Only Computer Science has real curriculum data. */
export const FACULTIES: Faculty[] = [
  { id: "agr", nameEn: "Faculty of Agriculture", nameTh: "คณะเกษตร" },
  { id: "bus", nameEn: "Faculty of Business Administration", nameTh: "คณะบริหารธุรกิจ" },
  { id: "eco", nameEn: "Faculty of Economics", nameTh: "คณะเศรษฐศาสตร์" },
  { id: "eng", nameEn: "Faculty of Engineering", nameTh: "คณะวิศวกรรมศาสตร์" },
  { id: "for", nameEn: "Faculty of Forestry", nameTh: "คณะวนศาสตร์" },
  { id: "hum", nameEn: "Faculty of Humanities", nameTh: "คณะมนุษยศาสตร์" },
  { id: "sci", nameEn: "Faculty of Science", nameTh: "คณะวิทยาศาสตร์" },
  { id: "soc", nameEn: "Faculty of Social Sciences", nameTh: "คณะสังคมศาสตร์" },
];

export type ProgramStatus = "ready" | "in-progress" | "not-ready";

export interface ProgramOption {
  id: string;
  facultyId: string;
  nameEn: string;
  nameTh: string;
  status: ProgramStatus;
}

export const PROGRAM_OPTIONS: ProgramOption[] = [
  { id: "cs-2565", facultyId: "sci", nameEn: "Computer Science", nameTh: "วิทยาการคอมพิวเตอร์", status: "ready" },
  { id: "math", facultyId: "sci", nameEn: "Mathematics", nameTh: "คณิตศาสตร์", status: "in-progress" },
  { id: "stat", facultyId: "sci", nameEn: "Statistics", nameTh: "สถิติ", status: "in-progress" },
  { id: "chem", facultyId: "sci", nameEn: "Chemistry", nameTh: "เคมี", status: "not-ready" },
  { id: "phys", facultyId: "sci", nameEn: "Physics", nameTh: "ฟิสิกส์", status: "not-ready" },
  { id: "bio", facultyId: "sci", nameEn: "Biology", nameTh: "ชีววิทยา", status: "not-ready" },
  { id: "biochem", facultyId: "sci", nameEn: "Biochemistry", nameTh: "ชีวเคมี", status: "not-ready" },
  { id: "micro", facultyId: "sci", nameEn: "Microbiology", nameTh: "จุลชีววิทยา", status: "not-ready" },
  { id: "cpe", facultyId: "eng", nameEn: "Computer Engineering", nameTh: "วิศวกรรมคอมพิวเตอร์", status: "not-ready" },
  { id: "ske", facultyId: "eng", nameEn: "Software and Knowledge Engineering", nameTh: "วิศวกรรมซอฟต์แวร์และความรู้", status: "not-ready" },
  { id: "acc", facultyId: "bus", nameEn: "Accounting", nameTh: "การบัญชี", status: "not-ready" },
  { id: "econ", facultyId: "eco", nameEn: "Economics", nameTh: "เศรษฐศาสตร์", status: "not-ready" },
];

export const CAMPUSES = [
  { id: "bkn", nameEn: "Bang Khen", nameTh: "บางเขน" },
  { id: "kps", nameEn: "Kamphaeng Saen", nameTh: "กำแพงแสน" },
  { id: "src", nameEn: "Sriracha", nameTh: "ศรีราชา" },
];

export const CS_PROGRAM: Program = {
  id: "cs-2565",
  facultyEn: "Faculty of Science",
  facultyTh: "คณะวิทยาศาสตร์",
  nameEn: "Computer Science",
  nameTh: "วิทยาการคอมพิวเตอร์",
  curriculumYear: 2565,
  totalCredits: 124,
  creditTargets: { general: 30, core: 12, required: 58, elective: 18, free: 6 },
  hasPlan: true,
};
