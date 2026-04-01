import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import datetime
import fitz
import re

def extract_school_info_from_pdf_text(text: str, pdf_name: str):
    info = {}
    lines = text.replace("\uFFFD", "").replace("�", "").splitlines()
    lines = [line.strip() for line in lines if line.strip()]

    def find_pattern(pattern):
        for line in lines:
            match = re.search(pattern, line)
            if match:
                return match.group(1).strip()
        return ""

    def extract_address():
        text_joined = " ".join(lines)
        text_joined = re.sub(r"[^\w가-힣0-9\s\-()]", " ", text_joined)
        match = re.search(r"(부산광역시.*?학교)", text_joined)
        return match.group(1).strip() if match else ""

    info["대표"] = "학교장"
    info["사업자등록번호"] = find_pattern(r"([0-9]{3}-[0-9]{2}-[0-9]{5})")
    info["사업장주소"] = extract_address()
    info["대표전화번호"] = find_pattern(r"(0\d{1,2}-\d{3,4}-\d{4})")

    print(f"✔ PDF 추출 성공: {pdf_name} → {len([v for v in info.values() if v])}개 필드 → {info}")
    return info

def load_pdf_info_map(pdf_dir: Path):
    info_map = {}
    for pdf in pdf_dir.glob("*학교정보.pdf"):
        key = "_".join(pdf.stem.split("_")[:2])
        try:
            doc = fitz.open(pdf)
            text = "".join(page.get_text() for page in doc)
            info = extract_school_info_from_pdf_text(text, pdf.name)
            if info:
                info_map[key] = info
        except Exception as e:
            print(f"❌ PDF 열기 오류: {pdf.name} | {e}")
    return info_map

def is_날짜필드(h):
    try:
        return 1 <= float(str(h).strip()) <= 12.31
    except:
        return False

def safe_parse_date(raw, 연월):
    try:
        if isinstance(raw, (float, int)):
            m = str(int(raw)).zfill(2)
            d = str(int(round((raw - int(raw)) * 100))).zfill(2)
        else:
            raw = str(raw).replace("월", ".").replace("일", "").replace(" ", "").strip()
            parts = raw.replace("..", ".").split(".")
            if len(parts) == 2:
                m, d = parts
                m = m.zfill(2)
                d = d.zfill(2)
            else:
                return None
        return f"{연월[:4]}-{m}-{d}"
    except:
        return None

cred = credentials.Certificate("C:/school/key/firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

base_dir = Path("C:/school/upload")
excel_dir = base_dir / "excel"
pdf_info_map = load_pdf_info_map(excel_dir)

print(f"\n=== 🏁 발주서 + 학교정보 업로드 시작: {datetime.datetime.now()} ===\n")

for file_path in excel_dir.glob("*_업로드용.xlsx"):
    try:
        print(f"\n📄 엑셀 처리 중: {file_path.name}")
        parts = file_path.stem.split("_")
        연월_raw, 발주처, _, 낙찰기업 = parts[:4]
        연월 = f"20{연월_raw[:2]}-{연월_raw[2:]}"
        문서ID = f"{연월_raw}_{발주처}"
        pdf_key = 문서ID

        df = pd.read_excel(file_path, header=None)
        header_idx = df[df.iloc[:, 0].astype(str).str.contains("NO", na=False)].index[0]
        header = df.iloc[header_idx].tolist()
        data = df.iloc[header_idx + 1:].copy()
        data.columns = header

        식품명열 = [c for c in data.columns if "식품명" in str(c)][0]
        날짜_idx = [i for i, h in enumerate(header) if is_날짜필드(h)]
        날짜_이름 = [header[i] for i in 날짜_idx]

        품목목록 = []
        for _, row in data.iterrows():
            if pd.isnull(row[식품명열]):
                continue
            식품명 = str(row[식품명열]).strip()
            try:
                raw_price = row.get("계약단가", 0)
                단가 = float(str(raw_price).replace(",", "").strip())
                if 단가 < 1000:
                    단가 *= 1000
            except:
                단가 = 0.0

            총수량 = 0.0
            납품 = {}
            for i, 날짜 in zip(날짜_idx, 날짜_이름):
                try:
                    수량 = float(str(row[i]).strip())
                    if 수량 > 0:
                        full_date = safe_parse_date(날짜, 연월)
                        if full_date:
                            납품[full_date] = {
                                "수량": 수량,
                                "계약단가": 단가,
                                "공급가액": round(수량 * 단가)
                            }
                            총수량 += 수량
                except:
                    continue

            if 납품:
                품목목록.append({
                    "no": str(row["NO"]).strip(),
                    "식품명": 식품명,
                    "단가": 단가,
                    "규격": str(row.get("규격/단위", "")).strip(),
                    "총량": round(총수량, 2),
                    "속성정보": str(row.get("속성정보", "")).strip(),
                    "납품": 납품
                })

        if not 품목목록:
            print(f"⚠️ 품목 없음 → 스킵됨")
            continue

        저장데이터 = {
            "연월": 연월,
            "발주처": 발주처,
            "낙찰기업": 낙찰기업,
            "품목": firestore.ArrayUnion(품목목록)
        }

        if pdf_key in pdf_info_map:
            저장데이터.update(pdf_info_map[pdf_key])

        doc_ref = db.collection("school").document(문서ID)
        doc_ref.set(저장데이터, merge=True)

        print(f"✅ 업로드 완료: {문서ID} ({len(품목목록)}개 품목)")

    except Exception as e:
        print(f"❌ 오류: {file_path.name} | {e}")

print(f"\n🎉 모든 업로드 작업 완료!")
input("⏎ Enter 키를 눌러 종료합니다.")
