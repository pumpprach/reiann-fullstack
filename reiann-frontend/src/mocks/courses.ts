import type { Course } from "@/core/types";
import { GE_COURSES } from "./ge-courses";

/** Sample of the CS 2565 curriculum used by the demo (not the full list). */
export const COURSES: Course[] = [
  // ศึกษาทั่วไป
  { code: "01355101", nameEn: "English for Everyday Life", nameTh: "ภาษาอังกฤษในชีวิตประจำวัน", credits: 3, creditPattern: "3(3-0-6)", category: "general" },
  { code: "01355107", nameEn: "Essential English Writing Skills", nameTh: "ทักษะการเขียนภาษาอังกฤษที่จำเป็น", credits: 3, creditPattern: "3(3-0-6)", category: "general" },
  { code: "01361101", nameEn: "Introductory Thai Usage", nameTh: "การใช้ภาษาไทยเบื้องต้น", credits: 3, creditPattern: "3(3-0-6)", category: "general" },
  { code: "01401201", nameEn: "Plants for Value of Life Creation", nameTh: "พืชเพื่อการสร้างคุณค่าชีวิต", credits: 3, creditPattern: "3(3-0-6)", category: "general" },
  { code: "01999111", nameEn: "Kasetsart Creating Knowledge of the Land", nameTh: "ศาสตร์แห่งแผ่นดิน", credits: 2, creditPattern: "2(2-0-4)", category: "general" },
  { code: "01175168", nameEn: "Badminton for Health", nameTh: "แบดมินตันเพื่อสุขภาพ", credits: 1, creditPattern: "1(0-2-1)", category: "general", gradingMode: "su" },
  { code: "01387101", nameEn: "The Art of Living with Others", nameTh: "ศิลปะการใช้ชีวิตร่วมกับผู้อื่น", credits: 3, creditPattern: "3(3-0-6)", category: "general" },
  { code: "01421201", nameEn: "Radiation, Life and Environment", nameTh: "รังสีกับชีวิตและสิ่งแวดล้อม", credits: 2, creditPattern: "2(2-0-4)", category: "general" },
  { code: "01371111", nameEn: "Information Media for Learning", nameTh: "สื่อสารสนเทศเพื่อการเรียนรู้", credits: 1, creditPattern: "1(1-0-2)", category: "general" },
  // วิชาแกน
  { code: "01417111", nameEn: "Calculus I", nameTh: "แคลคูลัส I", credits: 3, creditPattern: "3(3-0-6)", category: "core" },
  { code: "01417112", nameEn: "Calculus II", nameTh: "แคลคูลัส II", credits: 3, creditPattern: "3(3-0-6)", category: "core" },
  { code: "01417322", nameEn: "Introduction to Linear Algebra", nameTh: "พีชคณิตเชิงเส้นเบื้องต้น", credits: 3, creditPattern: "3(3-0-6)", category: "core" },
  { code: "01418132", nameEn: "Fundamentals of Computing", nameTh: "หลักมูลของการคณนา", credits: 3, creditPattern: "3(3-0-6)", category: "core" },
  // เฉพาะบังคับ
  { code: "01418111", nameEn: "Introduction to Computer Science", nameTh: "วิทยาการคอมพิวเตอร์เบื้องต้น", credits: 2, creditPattern: "2(2-0-4)", category: "required" },
  { code: "01418112", nameEn: "Fundamental Programming Concepts", nameTh: "แนวคิดการเขียนโปรแกรมเบื้องต้น", credits: 3, creditPattern: "3(2-3-6)", category: "required" },
  { code: "01418113", nameEn: "Computer Programming", nameTh: "การเขียนโปรแกรมคอมพิวเตอร์", credits: 3, creditPattern: "3(2-3-6)", category: "required" },
  { code: "01418141", nameEn: "Intellectual Properties and Professional Ethics", nameTh: "ทรัพย์สินทางปัญญาและจรรยาบรรณวิชาชีพ", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418211", nameEn: "Software Construction", nameTh: "การสร้างซอฟต์แวร์", credits: 3, creditPattern: "3(2-3-6)", category: "required" },
  { code: "01418221", nameEn: "Fundamentals of Database Systems", nameTh: "ระบบฐานข้อมูลเบื้องต้น", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418231", nameEn: "Data Structures and Algorithms", nameTh: "โครงสร้างข้อมูลและขั้นตอนวิธี", credits: 3, creditPattern: "3(2-3-6)", category: "required" },
  { code: "01418232", nameEn: "Algorithm Design and Analysis", nameTh: "การออกแบบและวิเคราะห์ขั้นตอนวิธี", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418233", nameEn: "Computer Architecture", nameTh: "สถาปัตยกรรมคอมพิวเตอร์", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418236", nameEn: "Operating Systems", nameTh: "ระบบปฏิบัติการ", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418261", nameEn: "Fundamentals of Artificial Intelligence", nameTh: "หลักพื้นฐานของปัญญาประดิษฐ์", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418321", nameEn: "System Analysis and Design", nameTh: "การวิเคราะห์และการออกแบบระบบ", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418331", nameEn: "Theory of Computation", nameTh: "ทฤษฎีการคณนา", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418332", nameEn: "Information System Security", nameTh: "ความมั่นคงในระบบสารสนเทศ", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418351", nameEn: "Computer Networks and Cloud Computing Principles", nameTh: "หลักการเครือข่ายคอมพิวเตอร์และการประมวลผลคลาวด์", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  { code: "01418390", nameEn: "Cooperative Education Preparation", nameTh: "การเตรียมความพร้อมสหกิจศึกษา", credits: 1, creditPattern: "1(1-0-2)", category: "required" },
  { code: "01418490", nameEn: "Cooperative Education", nameTh: "สหกิจศึกษา", credits: 6, creditPattern: "6(0-18-0)", category: "required", gradingMode: "su" },
  { code: "01418497", nameEn: "Seminar", nameTh: "สัมมนา", credits: 1, creditPattern: "1(1-0-2)", category: "required" },
  { code: "01418499", nameEn: "Computer Science Project", nameTh: "โครงงานวิทยาการคอมพิวเตอร์", credits: 3, creditPattern: "3(0-6-3)", category: "required" },
  { code: "01418371", nameEn: "Project Management and Digital Startup", nameTh: "การบริหารโครงการและสตาร์ทอัพดิจิทัล", credits: 3, creditPattern: "3(3-0-6)", category: "required" },
  // เฉพาะเลือก
  { code: "01418235", nameEn: "Unix Operating System and Shell Programming", nameTh: "ระบบปฏิบัติการยูนิกซ์และการเขียนโปรแกรมเชลล์", credits: 3, creditPattern: "3(2-3-6)", category: "elective" },
  { code: "01418363", nameEn: "Natural Language Processing", nameTh: "การประมวลผลภาษาธรรมชาติ", credits: 3, creditPattern: "3(3-0-6)", category: "elective" },
  { code: "01418223", nameEn: "Data Science and Application Programs", nameTh: "วิทยาการข้อมูลและโปรแกรมประยุกต์", credits: 3, creditPattern: "3(2-2-5)", category: "elective" },
  { code: "01418322", nameEn: "Introduction to Data Science", nameTh: "วิทยาการข้อมูลเบื้องต้น", credits: 3, creditPattern: "3(2-2-5)", category: "elective" },
  { code: "01418323", nameEn: "Data Quality Management", nameTh: "การจัดการคุณภาพข้อมูล", credits: 3, creditPattern: "3(3-0-6)", category: "elective" },
  { code: "01418325", nameEn: "Data Visualization", nameTh: "ข้อมูลจินตทัศน์", credits: 3, creditPattern: "3(2-2-5)", category: "elective" },
  { code: "01418344", nameEn: "Mobile Application Development", nameTh: "การพัฒนาแอปพลิเคชันบนอุปกรณ์เคลื่อนที่", credits: 3, creditPattern: "3(2-2-5)", category: "elective" },
  { code: "01418362", nameEn: "Introduction to Machine Learning", nameTh: "การเรียนรู้ของเครื่องเบื้องต้น", credits: 3, creditPattern: "3(2-2-5)", category: "elective" },
  // เลือกเสรี (ไม่อยู่ในหลักสูตร)
  { code: "01255101", nameEn: "Man and Sea", nameTh: "มนุษย์กับทะเล", credits: 3, creditPattern: "3(3-0-6)", category: "free" },
];

/** Curriculum sample plus the GE catalog. Curriculum entries win when a code is in both. */
export const CATALOG: Course[] = [...COURSES, ...GE_COURSES.filter((g) => !COURSES.some((c) => c.code === g.code))];

export const COURSE_BY_CODE = new Map(CATALOG.map((c) => [c.code, c]));

export function findCourse(code: string): Course | undefined {
  return COURSE_BY_CODE.get(code);
}

/** Courses the curriculum plans for year 2, second semester. */
export const PLAN_NEXT_TERM = ["01418221", "01418232", "01418236"];

/** Codes in the student's own curriculum (scope "My curriculum" on Course Search). */
export const CURRICULUM_CODES = new Set(COURSES.filter((c) => c.category !== "free").map((c) => c.code));
