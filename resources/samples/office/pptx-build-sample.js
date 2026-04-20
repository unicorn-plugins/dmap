/*
 * pptx-build-sample.js
 * --------------------
 * DMAP 표준 PPT 빌드 샘플 (pptx-build-guide.md 6절 검증 규칙 11항 준수)
 *
 * 실행: node pptx-build-sample.js
 * 산출물: ./sample.pptx (16:9, 4 슬라이드 — 패턴 A/D/E + 마스터)
 *
 * 사전: npm install pptxgenjs
 */

const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────
// 가이드 6-1. 최소 폰트 크기 강제 (12pt)
// ─────────────────────────────────────────────────────────
const MIN_FONT = 12;
const fs12 = (size) => {
  if (size < MIN_FONT) {
    throw new Error(`fontSize ${size} < ${MIN_FONT}pt 금지! (가이드 6-1 위반)`);
  }
  return size;
};

// ─────────────────────────────────────────────────────────
// 컬러 팔레트 (가이드 1절)
// ─────────────────────────────────────────────────────────
const C = {
  primary: "1F4E79",
  primaryLight: "2E75B6",
  accent: "5B9BD5",
  bg: "FFFFFF",
  text: "212121",
  subText: "595959",
  muted: "BFBFBF",
  highlight: "FFF2CC",
  white: "FFFFFF",
};

// ─────────────────────────────────────────────────────────
// 가이드 6-4. 슬라이드 크기 정의 (defineLayout CUSTOM 16:9)
// ─────────────────────────────────────────────────────────
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// ─────────────────────────────────────────────────────────
// 마스터 슬라이드 (푸터·페이지번호)
// ─────────────────────────────────────────────────────────
function defineMaster(pptx) {
  pptx.defineSlideMaster({
    title: "DMAP_MASTER",
    background: { color: C.bg },
    objects: [
      {
        line: {
          x: 0.5, y: SLIDE_H - 0.5, w: SLIDE_W - 1.0, h: 0,
          line: { color: C.muted, width: 0.5 },
        },
      },
      {
        text: {
          text: "DMAP Sample · Confidential",
          options: {
            x: 0.5, y: SLIDE_H - 0.4, w: 6, h: 0.3,
            fontFace: "Pretendard", fontSize: fs12(12),
            color: C.subText, align: "left", valign: "middle",
          },
        },
      },
      {
        text: {
          text: "",
          options: {
            x: SLIDE_W - 1.5, y: SLIDE_H - 0.4, w: 1, h: 0.3,
            fontFace: "Pretendard", fontSize: fs12(12),
            color: C.subText, align: "right", valign: "middle",
          },
        },
        placeholder: {
          options: {
            name: "page_num", type: "body",
            x: SLIDE_W - 1.5, y: SLIDE_H - 0.4, w: 1, h: 0.3,
          },
          text: "{slide-num}",
        },
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────
// 가이드 6-5. async function createSlideXX(pptx) 패턴
// ─────────────────────────────────────────────────────────

// 패턴 A: 타이틀
async function createSlide01(pptx) {
  const slide = pptx.addSlide({ masterName: "DMAP_MASTER" });

  // 가이드 6-3. Shape 사용 — pptx.shapes.RECTANGLE
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: { color: C.primary },
  });

  slide.addText("DMAP Office Sample", {
    x: 1, y: 2.5, w: SLIDE_W - 2, h: 1.0,
    fontFace: "Pretendard", fontSize: fs12(44),
    bold: true, color: C.white, align: "center", valign: "middle",
  });

  slide.addText("pptx-build-guide.md 6절 검증 규칙 11항 준수 예제", {
    x: 1, y: 3.7, w: SLIDE_W - 2, h: 0.6,
    fontFace: "Pretendard", fontSize: fs12(18),
    color: C.highlight, align: "center", valign: "middle",
  });

  slide.addText("DMAP · 2026", {
    x: 1, y: 5.5, w: SLIDE_W - 2, h: 0.4,
    fontFace: "Pretendard", fontSize: fs12(14),
    color: C.muted, align: "center",
  });
}

// 패턴 D: 테이블
async function createSlide02(pptx) {
  const slide = pptx.addSlide({ masterName: "DMAP_MASTER" });

  slide.addText("표 패턴 (D) — slide.addTable() 사용", {
    x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.6,
    fontFace: "Pretendard", fontSize: fs12(24),
    bold: true, color: C.primary,
  });

  // 가이드 6-6. addTable 강제 (수동 셀 그리기 금지)
  const headerStyle = {
    bold: true, color: C.white, fill: { color: C.primary },
    align: "center", valign: "middle", fontSize: fs12(14), fontFace: "Pretendard",
  };
  const cellStyle = {
    color: C.text, fontFace: "Pretendard", fontSize: fs12(13),
    valign: "middle", margin: 0.05,
  };

  const rows = [
    [
      { text: "분기", options: headerStyle },
      { text: "매출", options: headerStyle },
      { text: "비용", options: headerStyle },
      { text: "이익", options: headerStyle },
    ],
    [
      { text: "1Q", options: { ...cellStyle, align: "center" } },
      { text: "100", options: { ...cellStyle, align: "right" } },
      { text: "60", options: { ...cellStyle, align: "right" } },
      { text: "40", options: { ...cellStyle, align: "right", bold: true } },
    ],
    [
      { text: "2Q", options: { ...cellStyle, align: "center" } },
      { text: "120", options: { ...cellStyle, align: "right" } },
      { text: "70", options: { ...cellStyle, align: "right" } },
      { text: "50", options: { ...cellStyle, align: "right", bold: true } },
    ],
    [
      { text: "3Q", options: { ...cellStyle, align: "center" } },
      { text: "150", options: { ...cellStyle, align: "right" } },
      { text: "80", options: { ...cellStyle, align: "right" } },
      { text: "70", options: { ...cellStyle, align: "right", bold: true } },
    ],
  ];

  slide.addTable(rows, {
    x: 0.8, y: 1.4, w: SLIDE_W - 1.6, h: 4.2,
    rowH: 0.7,
    colW: [2.5, 3.0, 3.0, 3.5],
    border: { type: "solid", color: C.muted, pt: 0.5 },
  });

  slide.addText("출처: 예시 데이터 (가이드 6-6 addTable 강제 준수)", {
    x: 0.5, y: 6.3, w: SLIDE_W - 1, h: 0.4,
    fontFace: "Pretendard", fontSize: fs12(12),
    color: C.subText, italic: true,
  });
}

// 패턴 E: 카드 그리드 (3열)
async function createSlide03(pptx) {
  const slide = pptx.addSlide({ masterName: "DMAP_MASTER" });

  slide.addText("카드 그리드 패턴 (E)", {
    x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.6,
    fontFace: "Pretendard", fontSize: fs12(24),
    bold: true, color: C.primary,
  });

  const cards = [
    { title: "검증된 패턴", body: "courseware 프로젝트에서 504KB pptx 정상 생성으로 검증된 빌드 흐름" },
    { title: "런타임 호환", body: "Node.js만 있으면 동작. Cursor/Cowork 등 모든 환경에서 동일 결과" },
    { title: "외부 의존 없음", body: "anthropic-skills 등 외부 변환 스킬 의존 0. Write+Bash만 사용" },
  ];

  const cardW = 3.8;
  const cardH = 4.0;
  const gap = 0.4;
  const startX = (SLIDE_W - (cardW * 3 + gap * 2)) / 2;
  const startY = 1.5;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);

    // 카드 배경 (가이드 6-3. ROUNDED_RECTANGLE)
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: startY, w: cardW, h: cardH,
      fill: { color: "F5F5F5" },
      line: { color: C.muted, width: 0.5 },
      rectRadius: 0.1,
    });

    // 카드 헤더 바
    slide.addShape(pptx.shapes.RECTANGLE, {
      x, y: startY, w: cardW, h: 0.7,
      fill: { color: C.accent }, line: { color: C.accent },
    });

    slide.addText(card.title, {
      x: x + 0.2, y: startY + 0.05, w: cardW - 0.4, h: 0.6,
      fontFace: "Pretendard", fontSize: fs12(16),
      bold: true, color: C.white, align: "center", valign: "middle",
    });

    slide.addText(card.body, {
      x: x + 0.3, y: startY + 1.0, w: cardW - 0.6, h: cardH - 1.2,
      fontFace: "Pretendard", fontSize: fs12(13),
      color: C.text, align: "left", valign: "top",
    });
  });
}

// 정리 슬라이드
async function createSlide04(pptx) {
  const slide = pptx.addSlide({ masterName: "DMAP_MASTER" });

  slide.addText("정리 — 검증 규칙 11항 통과", {
    x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.6,
    fontFace: "Pretendard", fontSize: fs12(24),
    bold: true, color: C.primary,
  });

  // 하이라이트 박스
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.5, y: 2.5, w: SLIDE_W - 3, h: 2.5,
    fill: { color: C.highlight }, line: { color: C.primaryLight, width: 1 },
    rectRadius: 0.15,
  });

  slide.addText(
    [
      { text: "✓ ", options: { color: C.primary, bold: true } },
      { text: "fs12 헬퍼·CUSTOM 레이아웃·async 슬라이드 함수\n" },
      { text: "✓ ", options: { color: C.primary, bold: true } },
      { text: "addTable 강제·Pretendard 폰트·main().catch 진입점\n" },
      { text: "✓ ", options: { color: C.primary, bold: true } },
      { text: "RECTANGLE/ROUNDED_RECTANGLE Shape API 준수\n" },
      { text: "✓ ", options: { color: C.primary, bold: true } },
      { text: "마스터 슬라이드·푸터·페이지번호 일관 적용" },
    ],
    {
      x: 1.8, y: 2.7, w: SLIDE_W - 3.6, h: 2.1,
      fontFace: "Pretendard", fontSize: fs12(15),
      color: C.text, align: "left", valign: "middle", lineSpacing: 28,
    }
  );
}

// ─────────────────────────────────────────────────────────
// 가이드 6-9. main().catch 진입점
// ─────────────────────────────────────────────────────────
async function main() {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "CUSTOM", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "CUSTOM";

  defineMaster(pptx);

  await createSlide01(pptx);
  await createSlide02(pptx);
  await createSlide03(pptx);
  await createSlide04(pptx);

  const outPath = path.resolve(__dirname, "sample.pptx");
  await pptx.writeFile({ fileName: outPath });

  // 가이드 6-10. 자가 검증
  const stat = fs.statSync(outPath);
  if (stat.size === 0) throw new Error("산출물 0바이트");
  console.log(`[OK] saved: ${outPath} (${stat.size.toLocaleString()} bytes)`);
}

main().catch((e) => {
  console.error("[ERROR]", e.message);
  process.exit(1);
});
