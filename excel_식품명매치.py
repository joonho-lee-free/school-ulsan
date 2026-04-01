import pandas as pd
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

def merge_contract_price(order_file_path, price_file_path, output_dir):
    # 저장 폴더가 없다면 생성
    output_dir.mkdir(parents=True, exist_ok=True)

    # 계약단가 엑셀 로드 (4번째 줄이 실제 헤더)
    price_df = pd.read_excel(price_file_path, header=3)
    price_df.columns = price_df.columns.astype(str).str.strip()

    # 식품 공통코드명 ↔ ②입찰단가 매핑
    price_map = dict(
        zip(
            price_df["식품 공통코드명"].astype(str).str.strip(),
            price_df["②입찰단가"]
        )
    )

    # 발주서 엑셀 로드 (서식 유지)
    wb = load_workbook(order_file_path)
    ws = wb.active

    # 헤더 행 (NO 기준 탐색)
    header_row = None
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=20), 1):
        if row[0].value == "NO":
            header_row = i
            break
    if header_row is None:
        raise ValueError("❌ 헤더 행을 찾을 수 없습니다 (NO 기준)")

    # 식품명 열 인덱스 탐색
    식품명_col = None
    for cell in ws[header_row]:
        if cell.value and "식품명" in str(cell.value):
            식품명_col = cell.col_idx
            break
    if 식품명_col is None:
        raise ValueError("❌ '식품명' 열을 찾을 수 없습니다.")

    # 계약단가 열 추가 (마지막 열 다음에 삽입)
    last_col = ws.max_column
    계약단가_col = last_col + 1
    ws.cell(row=header_row, column=계약단가_col, value="계약단가")

    # 데이터 행에 계약단가 삽입
    for row in range(header_row + 1, ws.max_row + 1):
        식품명 = ws.cell(row=row, column=식품명_col).value
        if 식품명 and str(식품명).strip().lower() not in ["nan", ""]:
            matched_price = price_map.get(str(식품명).strip(), "")
            ws.cell(row=row, column=계약단가_col, value=matched_price)

    # 출력 파일 이름 변경 (예: 발주서 → 발주서_업로드용)
    output_filename = order_file_path.stem.replace("발주서", "발주서_업로드용") + ".xlsx"
    output_path = output_dir / output_filename

    wb.save(output_path)
    print(f"✅ 저장 완료: {output_path}")
    return output_path

# 예시 실행
if __name__ == "__main__":
    # 경로 설정
    base_dir = Path("C:/school/upload")
    order_file = base_dir / "2505_동항중_발주서_이가에프엔비.xlsx"
    price_file = base_dir / "2505_동항중_계약단가.xlsx"
    output_dir = base_dir / "excel"

    # 병합 실행
    merge_contract_price(order_file, price_file, output_dir)
