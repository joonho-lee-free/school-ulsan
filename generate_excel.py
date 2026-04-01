// ✅ /pages/school/[docId].tsx - 학교별 발주 전체보기
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { getDoc, doc } from "firebase/firestore";

export default function SchoolDocPage() {
  const router = useRouter();
  const { docId } = router.query;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!docId) return;
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "school", docId));
      if (snap.exists()) setData(snap.data());
    };
    fetchData();
  }, [docId]);

  if (!data) return <div className="p-4">불러오는 중...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{docId} 전체 발주 리스트</h1>
      <table className="w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-1">No</th>
            <th className="border p-1">식품명</th>
            <th className="border p-1">규격</th>
            <th className="border p-1">단가</th>
            <th className="border p-1">납품일</th>
            <th className="border p-1">수량</th>
            <th className="border p-1">금액</th>
          </tr>
        </thead>
        <tbody>
          {data.품목?.map((item, idx) => {
            const 납품리스트 = Object.entries(item.납품 || {});
            return 납품리스트.map(([날짜, 값], i) => (
              <tr key={`${idx}-${i}`} className="text-center">
                <td className="border p-1">{i === 0 ? item.no : ""}</td>
                <td className="border p-1">{i === 0 ? item.식품명 : ""}</td>
                <td className="border p-1">{i === 0 ? item.규격 : ""}</td>
                <td className="border p-1">{i === 0 ? item.단가?.toLocaleString() : ""}</td>
                <td className="border p-1">{날짜}</td>
                <td className="border p-1">{값.수량}</td>
                <td className="border p-1">{값.금액?.toLocaleString()}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
