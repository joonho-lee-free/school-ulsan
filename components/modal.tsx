// /school/components/Modal.tsx
import React from "react";
import { DocData, VendorData } from "../types";

// Modal에 필요한 props 정의
interface ModalProps {
  modalDate: string;
  modalDoc: DocData;
  modalVendorDoc: VendorData;
  onClose: () => void;
  handleExcelDownload: () => void;
}

const Modal: React.FC<ModalProps> = ({
  modalDate,
  modalDoc,
  modalVendorDoc,
  onClose,
  handleExcelDownload,
}) => {
  return (
    <div className="modal-overlay fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="modal-container bg-white w-full max-w-screen-md p-6 rounded shadow-lg relative page-break">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black no-print"
          onClick={onClose}
        >
          닫기
        </button>
        <h2 className="text-left text-xl font-bold mb-4">거래명세표 ({modalDate})</h2>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <strong>공급받는자:</strong> {modalDoc.발주처}
            <p>사업자등록번호: {modalDoc.사업자등록번호}</p>
            <p>주소: {modalDoc.사업장주소}</p>
            <p>대표전화: {modalDoc.대표전화번호}</p>
          </div>
          <div>
            <strong>공급하는자:</strong> {modalVendorDoc.상호명}
            <p>대표자: {modalVendorDoc.대표자}</p>
            <p>
              사업자등록번호: 
              {modalVendorDoc.사업자번호 || modalVendorDoc.사업자등록번호}
            </p>
            <p>대표전화: {modalVendorDoc.대표전화번호}</p>
            <p>주소: {modalVendorDoc.주소}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm mb-4">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">품목</th>
              <th className="border px-2 py-1 text-left">수량</th>
              <th className="border px-2 py-1 text-left">계약단가</th>
              <th className="border px-2 py-1 text-left">공급가액</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const items = modalDoc.품목.filter((it) => it.납품[modalDate]);
              const unique = Array.from(
                new Map(items.map((it) => [it.식품명, it])).values()
              );
              return unique.map((it, idx) => {
                const d = it.납품[modalDate];
                return (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-left">{it.식품명}</td>
                    <td className="border px-2 py-1 text-left">{d.수량}</td>
                    <td className="border px-2 py-1 text-left">{d.계약단가}</td>
                    <td className="border px-2 py-1 text-left">{d.공급가액}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border px-2 py-1 text-left font-bold">
                합계
              </td>
              <td className="border px-2 py-1 text-left font-bold">
                {modalDoc.품목
                  .filter((it) => it.납품[modalDate])
                  .reduce((sum, it) => {
                    const d = it.납품[modalDate];
                    return sum + (d.공급가액 || 0);
                  }, 0)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-start no-print">
          <button
            onClick={handleExcelDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Excel 다운로드
          </button>

          {/* 인쇄하기 버튼 추가 */}
          <button
            onClick={() => window.print()}  // 인쇄 대화상자 열기
            className="px-4 py-2 bg-gray-500 text-white rounded cursor-pointer ml-4"
          >
            인쇄하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
