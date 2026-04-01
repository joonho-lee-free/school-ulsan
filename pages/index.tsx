
// /pages/index.tsx
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Calendar from "../components/calendar";
import Modal from "../components/modal";
import { ScheduleObj, DocData, VendorData } from "../types";
import { withAuth } from "../utils/withAuth"; // ✅ 이 줄 추가
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parse,
} from "date-fns";

// Excel 다운로드 함수 (Modal에서 사용)
const handleExcelDownload = (modalDate: string, modalDoc: DocData) => {
  const headers = ['품목', '수량', '계약단가', '공급가액'];
  const items = modalDoc.품목.filter((it) => it.납품[modalDate]);
  const dataRows = items.map((it) => {
    const d = it.납품[modalDate];
    return [it.식품명, d.수량, d.계약단가, d.공급가액];
  });
  const bom = '\uFEFF';
  const csvContent = bom + [headers, ...dataRows]
    .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${modalDate}-거래명세표.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

function Index() {
  const now = new Date();
  const defaultYM = format(now, "yyyy-MM");
  const [selectedYM, setSelectedYM] = useState(defaultYM);
  const [selectedVendor, setSelectedVendor] = useState<string>("전체");
  const [calendarData, setCalendarData] = useState<Record<string, ScheduleObj[]>>({});
  const [vendors, setVendors] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDoc, setModalDoc] = useState<DocData | null>(null);
  const [modalVendorDoc, setModalVendorDoc] = useState<VendorData | null>(null);
  const [modalDate, setModalDate] = useState<string>("");

  useEffect(() => {
    const ymCode = selectedYM.replace("-", "").slice(2);
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "school"));
      const temp: Record<string, ScheduleObj[]> = {};
      const vendorSet = new Set<string>();

      for (const docSnap of snap.docs) {
        const id = docSnap.id;
        if (!id.startsWith(ymCode)) continue;
        const data = docSnap.data() as any;
        const school = data.발주처;
        const vendor = data.낙찰기업 || data.납찰기업;
        vendorSet.add(vendor);

        (data.품목 || []).forEach((item: any) => {
          Object.entries(item.납품 || {}).forEach(([date, del]: [string, any]) => {
            if (!temp[date]) temp[date] = [];
            temp[date].push({
              발주처: school,
              낙찰기업: vendor,
              날짜: date,
              품목: item.식품명,
              수량: del.수량 || 0,
              계약단가: del.계약단가 || 0,
              공급가액: del.공급가액 || 0,
            });
          });
        });
      }

      setCalendarData(temp);
      const allVendors = Array.from(vendorSet).sort((a, b) => a.localeCompare(b));
      setVendors(["전체", ...allVendors]);
    };
    fetchData();
  }, [selectedYM]);

  const handleClick = async (school: string, vendor: string, date: string) => {
    setModalDate(date);
    const ymCode = selectedYM.replace("-", "").slice(2);
    const schoolSnap = await getDoc(doc(db, "school", `${ymCode}_${school}`));
    if (schoolSnap.exists()) setModalDoc(schoolSnap.data() as DocData);
    const vendorSnap = await getDoc(doc(db, "school", vendor));
    if (vendorSnap.exists()) setModalVendorDoc(vendorSnap.data() as VendorData);
    setModalOpen(true);
  };

  const year = +selectedYM.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const firstOfMonth = parse(`${selectedYM}-01`, "yyyy-MM-dd", now);
  const start = startOfMonth(firstOfMonth);
  const end = endOfMonth(start);
  const allDays = eachDayOfInterval({ start, end });
  const dow = getDay(firstOfMonth);
  const leadingEmpty = Array(dow).fill(null);

  return (
    <>
      <Head>
        <style>{`
          @page { size: A4; margin: 20mm; }
          @media print {
            html, body { margin:0; padding:0; }
            .no-print { display: none !important; }
            .page-break { page-break-inside: avoid; }
            .modal-overlay { position: static !important; background: none !important; }
            .modal-container { margin-top: 0 !important; }
          }
        `}</style>
      </Head>

      <Calendar
        selectedYM={selectedYM}
        setSelectedYM={setSelectedYM}
        selectedVendor={selectedVendor}
        setSelectedVendor={setSelectedVendor}
        calendarData={calendarData}
        vendors={vendors}
        onItemClick={handleClick}
      />

      {modalOpen && modalDoc && modalVendorDoc && (
        <Modal
          modalDate={modalDate}
          modalDoc={modalDoc}
          modalVendorDoc={modalVendorDoc}
          onClose={() => setModalOpen(false)}
          handleExcelDownload={() => handleExcelDownload(modalDate, modalDoc!)}
        />
      )}
    </>
  );
}

export default withAuth(Index); // ✅ 로그인 보호 적용