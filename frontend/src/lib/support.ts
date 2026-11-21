export type InquiryRecord = {
  id: string;
  createdAt: string;
  category: string;
  email: string;
  title: string;
  message: string;
};

export type ReportRecord = {
  id: string;
  createdAt: string;
  reason: string;
  reportedUserId: string;
  productId: string;
  chatRoomId: string;
  content: string;
};

const INQUIRIES_KEY = "reown-inquiries";
const REPORTS_KEY = "reown-reports";

const readRecords = <T>(key: string): T[] => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
};

const writeRecord = <T>(key: string, record: T): void => {
  window.localStorage.setItem(key, JSON.stringify([...readRecords<T>(key), record]));
};

export const addInquiry = (record: InquiryRecord): void =>
  writeRecord(INQUIRIES_KEY, record);

export const addReport = (record: ReportRecord): void =>
  writeRecord(REPORTS_KEY, record);

export const getInquiries = (): InquiryRecord[] =>
  readRecords<InquiryRecord>(INQUIRIES_KEY);

export const getReports = (): ReportRecord[] =>
  readRecords<ReportRecord>(REPORTS_KEY);
