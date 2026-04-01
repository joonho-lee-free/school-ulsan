// 파일 위치: /school/types.ts

// Calendar schedule item
export type ScheduleObj = {
  발주처: string;
  낙찰기업: string;
  날짜: string;
  품목: string;
  수량: number;
  계약단가: number;
  공급가액: number;
};

// Firestore data for school document
export type DocData = {
  발주처: string;
  사업자등록번호: string;
  사업장주소: string;
  대표전화번호: string;
  낙찰기업: string;
  품목: Array<{
    식품명: string;
    납품: Record<string, { 수량: number; 계약단가: number; 공급가액: number }>;
  }>;
};

// Firestore data for vendor document
export type VendorData = {
  상호명: string;
  대표자: string;
  대표전화번호: string;
  사업자번호?: string;
  사업자등록번호?: string;
  주소: string;
};
