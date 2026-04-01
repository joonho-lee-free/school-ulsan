import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface DeliveryInfo {
  수량: number;
  계약단가: number;
  공급가액: number;
}

interface ItemData {
  no: string;
  식품명: string;
  단가: number;
  규격: string;
  총량: number;
  속성정보: string;
  납품: Record<string, DeliveryInfo>;
}

interface FirestoreDoc {
  연월: string;
  발주처: string;
  낙찰기업?: string;
  납찰기업?: string;
  품목: ItemData[];
  대표?: string;
  사업자등록번호?: string;
  사업장주소?: string;
  대표전화번호?: string;
}

interface RowData {
  문서ID: string;
  연월: string;
  발주처: string;
  낙찰기업: string;
  NO: string;
  식품명: string;
  규격: string;
  속성정보: string;
  [day: string]: string | number;
  총량: number;
  계약단가: number;
  총계약액: number;
}

const ALLOWED_VENDORS = ["파인컴퍼니", "에스제이컴퍼니"];

const normalizeVendor = (value?: string) => (value || "").trim();

const Schedule: React.FC = () => {
  const router = useRouter();

  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [month, setMonth] = useState<string>(currentMonth);
  const [selectedVendor, setSelectedVendor] = useState<string>("전체");
  const [rows, setRows] = useState<RowData[]>([]);

  const [filters, setFilters] = useState<Record<string, string>>({
    문서ID: "",
    연월: "",
    발주처: "",
    낙찰기업: "",
    NO: "",
    식품명: "",
    규격: "",
    속성정보: "",
  });

  const dayCols = useMemo(
    () => Array.from({ length: 31 }).map((_, idx) => (idx + 1).toString()),
    []
  );

  useEffect(() => {
    if (!router.isReady) return;

    const queryMonth =
      typeof router.query.month === "string" && router.query.month
        ? router.query.month
        : currentMonth;

    const rawVendor =
      typeof router.query.vendor === "string" ? router.query.vendor : "전체";

    const normalizedQueryVendor = normalizeVendor(rawVendor);

    // 울산 사이트는 허용 업체만 선택 가능
    const safeVendor =
      normalizedQueryVendor === "전체"
        ? "전체"
        : ALLOWED_VENDORS.includes(normalizedQueryVendor)
        ? normalizedQueryVendor
        : "전체";

    setMonth(queryMonth);
    setSelectedVendor(safeVendor);
  }, [router.isReady, router.query.month, router.query.vendor]);

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, "school"), where("연월", "==", month));
      const snapshot = await getDocs(q);
      const tempRows: RowData[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FirestoreDoc;
        const docId = docSnap.id;
        const vendor = normalizeVendor(data.낙찰기업 || data.납찰기업);

        // 1차: 울산 사이트 허용 업체만 통과
        if (!ALLOWED_VENDORS.includes(vendor)) return;

        // 2차: 화면 선택 업체가 있으면 그 업체만 통과
        if (selectedVendor !== "전체" && vendor !== selectedVendor) return;

        data.품목?.forEach((item) => {
          const baseRow: RowData = {
            문서ID: docId,
            연월: data.연월,
            발주처: data.발주처,
            낙찰기업: vendor,
            NO: item.no,
            식품명: item.식품명,
            규격: item.규격,
            속성정보: item.속성정보,
            총량: item.총량,
            계약단가: item.단가,
            총계약액: item.총량 * item.단가,
          };

          dayCols.forEach((day) => {
            baseRow[day] = 0;
          });

          Object.entries(item.납품 || {}).forEach(([dateStr, info]) => {
            const parts = dateStr.split("-");
            if (parts.length === 3) {
              const dayNum = parseInt(parts[2], 10).toString();
              if (dayCols.includes(dayNum)) {
                baseRow[dayNum] = info.수량;
              }
            }
          });

          tempRows.push(baseRow);
        });
      });

      setRows(tempRows);
    };

    fetchData();
  }, [month, selectedVendor, dayCols]);

  const handleFilterChange = (col: string, value: string) => {
    setFilters((prev) => ({ ...prev, [col]: value }));
  };

  const filteredRows = rows.filter((r) => {
    return Object.entries(filters).every(([col, val]) => {
      if (!val) return true;
      const cell = r[col] ?? "";
      return String(cell).toLowerCase().includes(val.toLowerCase());
    });
  });

  const handleMonthChange = (value: string) => {
    setMonth(value);
    router.replace(
      {
        pathname: "/scaedule",
        query: {
          month: value,
          vendor: selectedVendor,
        },
      },
      undefined,
      { shallow: true }
    );
  };

  const handleDownload = () => {
    const headers = [
      "문서ID",
      "연월",
      "발주처",
      "낙찰기업",
      "NO",
      "식품명",
      "규격",
      "속성정보",
      ...dayCols,
      "총량",
      "계약단가",
      "총계약액",
    ];

    const data: (string | number)[][] = filteredRows.map((r) => [
      r.문서ID,
      r.연월,
      r.발주처,
      r.낙찰기업,
      r.NO,
      r.식품명,
      r.규격,
      r.속성정보,
      ...dayCols.map((d) =>
        typeof r[d] === "number" && r[d] === 0 ? "" : r[d]
      ),
      r.총량 === 0 ? "" : r.총량,
      r.계약단가 === 0 ? "" : r.계약단가,
      r.총계약액 === 0 ? "" : r.총계약액,
    ]);

    const bom = "\uFEFF";
    const csvContent =
      bom +
      [headers, ...data]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      selectedVendor === "전체"
        ? `${month}-울산발주서.csv`
        : `${month}-${selectedVendor}-울산발주서.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 10, fontSize: "12px" }}>
      <h2 style={{ fontSize: "16px" }}>월별 납품 현황 (문서ID 기준)</h2>

      <div style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 8 }}>
          연월 선택:&nbsp;
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
          >
            {Array.from({ length: 12 }).map((_, idx) => {
              const m = (idx + 1).toString().padStart(2, "0");
              const ym = `2025-${m}`;
              return (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              );
            })}
            {Array.from({ length: 12 }).map((_, idx) => {
              const m = (idx + 1).toString().padStart(2, "0");
              const ym = `2026-${m}`;
              return (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              );
            })}
          </select>
        </label>

        <span style={{ marginRight: 12 }}>
          업체:&nbsp;<strong>{selectedVendor}</strong>
        </span>

        <button
          onClick={handleDownload}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          엑셀 다운로드
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: "12px",
            whiteSpace: "nowrap",
            border: "1px solid #ccc",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#e0e0e0" }}>
              <th style={{ border: "1px solid #ccc" }}>
                문서ID
                <br />
                <input
                  type="text"
                  value={filters.문서ID}
                  onChange={(e) =>
                    handleFilterChange("문서ID", e.target.value)
                  }
                  style={{ width: "80px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                연월
                <br />
                <input
                  type="text"
                  value={filters.연월}
                  onChange={(e) => handleFilterChange("연월", e.target.value)}
                  style={{ width: "60px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                발주처
                <br />
                <input
                  type="text"
                  value={filters.발주처}
                  onChange={(e) => handleFilterChange("발주처", e.target.value)}
                  style={{ width: "100px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                낙찰기업
                <br />
                <input
                  type="text"
                  value={filters.낙찰기업}
                  onChange={(e) =>
                    handleFilterChange("낙찰기업", e.target.value)
                  }
                  style={{ width: "100px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                NO
                <br />
                <input
                  type="text"
                  value={filters.NO}
                  onChange={(e) => handleFilterChange("NO", e.target.value)}
                  style={{ width: "40px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                식품명
                <br />
                <input
                  type="text"
                  value={filters.식품명}
                  onChange={(e) => handleFilterChange("식품명", e.target.value)}
                  style={{ width: "120px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                규격
                <br />
                <input
                  type="text"
                  value={filters.규격}
                  onChange={(e) => handleFilterChange("규격", e.target.value)}
                  style={{ width: "80px", fontSize: "11px" }}
                />
              </th>
              <th style={{ border: "1px solid #ccc" }}>
                속성정보
                <br />
                <input
                  type="text"
                  value={filters.속성정보}
                  onChange={(e) =>
                    handleFilterChange("속성정보", e.target.value)
                  }
                  style={{ width: "100px", fontSize: "11px" }}
                />
              </th>
              {dayCols.map((day) => (
                <th key={day} style={{ border: "1px solid #ccc" }}>
                  {day}일
                </th>
              ))}
              <th style={{ border: "1px solid #ccc" }}>총량</th>
              <th style={{ border: "1px solid #ccc" }}>계약단가</th>
              <th style={{ border: "1px solid #ccc" }}>총계약액</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8 + dayCols.length + 3}
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    border: "1px solid #ccc",
                  }}
                >
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#fafafa" : "#ffffff",
                  }}
                >
                  <td style={{ border: "1px solid #ccc" }}>{r.문서ID}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.연월}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.발주처}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.낙찰기업}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.NO}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.식품명}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.규격}</td>
                  <td style={{ border: "1px solid #ccc" }}>{r.속성정보}</td>
                  {dayCols.map((day) => (
                    <td key={day} style={{ border: "1px solid #ccc" }}>
                      {r[day] ? r[day] : ""}
                    </td>
                  ))}
                  <td style={{ border: "1px solid #ccc" }}>
                    {r.총량 ? r.총량 : ""}
                  </td>
                  <td style={{ border: "1px solid #ccc" }}>
                    {r.계약단가 ? r.계약단가 : ""}
                  </td>
                  <td style={{ border: "1px solid #ccc" }}>
                    {r.총계약액 ? r.총계약액 : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Schedule;