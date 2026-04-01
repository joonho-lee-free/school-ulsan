// ✅ /pages/index.tsx - Vercel 메인 달력 인덱스
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

const today = new Date();
const 기준연월 = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

export default function CalendarIndex() {
  const [data, setData] = useState({});

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "school_index", 기준연월));
      if (snap.exists()) setData(snap.data());
    };
    fetch();
  }, []);

  const 날짜목록 = Object.keys(data).sort();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 {기준연월} 급식 발주 달력</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {날짜목록.map((날짜) => (
          <div key={날짜} className="border rounded p-2 shadow">
            <h2 className="font-semibold text-sm mb-1">{날짜}</h2>
            <ul className="text-xs space-y-1">
              {data[날짜].map((row: string, i: number) => {
                const [학교, 나머지] = row.split(" - ");
                const 문서ID = `${기준연월.replace("-", "").slice(2)}_${학교}`;
                return (
                  <li key={i}>
                    <Link
                      href={`/school/${문서ID}`}
                      className="text-blue-600 hover:underline"
                    >
                      {row}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
