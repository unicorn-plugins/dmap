/**
 * DMAP 학술 논문 생성기
 * 완전한 ~17페이지 학술 논문을 .docx로 생성
 * "선언형 멀티에이전트 오케스트레이션: 마크다운과 YAML을 통한
 *  Clean Architecture 원칙의 LLM 에이전트 시스템 적용"
 */

const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType, WidthType,
  PageBreak, Footer, PageNumber, NumberFormat, convertInchesToTwip,
  Tab, TabStopType, LevelFormat, TableLayoutType, VerticalAlign,
  ExternalHyperlink, Header,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Constants ───────────────────────────────────────────────────────────────
const FONT = "Arial";
const PT = (n) => n * 2; // half-points
const TITLE_SIZE = PT(28);
const AUTHOR_SIZE = PT(14);
const ABSTRACT_SIZE = PT(11);
const BODY_SIZE = PT(12);
const H1_SIZE = PT(16);
const H2_SIZE = PT(14);
const H3_SIZE = PT(12);
const HEADER_BG = "D5E8F0";
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const TABLE_BORDERS = {
  top: THIN_BORDER, bottom: THIN_BORDER,
  left: THIN_BORDER, right: THIN_BORDER,
};
const INCH = convertInchesToTwip(1);
const PAGE_WIDTH_TWIPS = convertInchesToTwip(6.5); // 8.5 - 2*1 margins

// ─── Helper functions ────────────────────────────────────────────────────────

function p(text, opts = {}) {
  const {
    bold, italic, size, font, alignment, spacing, indent,
    heading, color, underline, superscript, break: brk,
  } = opts;
  const runOpts = {
    text,
    font: font || FONT,
    size: size || BODY_SIZE,
    bold: bold || false,
    italics: italic || false,
    color: color || "000000",
    underline: underline ? {} : undefined,
    superScript: superscript || false,
    break: brk,
  };
  const paraOpts = {
    children: [new TextRun(runOpts)],
    alignment: alignment || AlignmentType.JUSTIFIED,
    spacing: spacing || { after: 120, line: 276 },
    indent: indent,
    heading: heading,
  };
  return new Paragraph(paraOpts);
}

function runs(segments, opts = {}) {
  const { alignment, spacing, indent, heading, bullet } = opts;
  const children = segments.map((seg) => {
    if (typeof seg === "string") {
      return new TextRun({ text: seg, font: FONT, size: BODY_SIZE });
    }
    return new TextRun({
      text: seg.text,
      font: seg.font || FONT,
      size: seg.size || BODY_SIZE,
      bold: seg.bold || false,
      italics: seg.italic || false,
      color: seg.color || "000000",
      superScript: seg.superscript || false,
    });
  });
  const paraOpts = {
    children,
    alignment: alignment || AlignmentType.JUSTIFIED,
    spacing: spacing || { after: 120, line: 276 },
    indent,
    heading,
    bullet,
  };
  return new Paragraph(paraOpts);
}

function emptyLine() {
  return new Paragraph({ children: [], spacing: { after: 60 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function h1(number, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${number}. ${title}`, font: FONT, size: H1_SIZE, bold: true })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200, line: 276 },
    alignment: AlignmentType.LEFT,
  });
}

function h2(number, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${number} ${title}`, font: FONT, size: H2_SIZE, bold: true })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160, line: 276 },
    alignment: AlignmentType.LEFT,
  });
}

function h3(number, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${number} ${title}`, font: FONT, size: H3_SIZE, bold: true, italics: true })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120, line: 276 },
    alignment: AlignmentType.LEFT,
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
    bullet: { level },
    spacing: { after: 60, line: 276 },
    alignment: AlignmentType.LEFT,
  });
}

function bulletRuns(segments, level = 0) {
  const children = segments.map((seg) => {
    if (typeof seg === "string") return new TextRun({ text: seg, font: FONT, size: BODY_SIZE });
    return new TextRun({ text: seg.text, font: seg.font || FONT, size: seg.size || BODY_SIZE, bold: seg.bold || false, italics: seg.italic || false });
  });
  return new Paragraph({ children, bullet: { level }, spacing: { after: 60, line: 276 }, alignment: AlignmentType.LEFT });
}

function figPlaceholder(num, description) {
  return new Paragraph({
    children: [new TextRun({ text: `[FIGURE ${num}: ${description}]`, font: FONT, size: BODY_SIZE, bold: true, italics: true, color: "555555" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER },
  });
}

// ─── Image paths ─────────────────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, "images");
const FIGURE_MAP = {
  1: { file: "fig_architecture.png", title: "5계층 아키텍처", width: 500, height: 350 },
  2: { file: "fig_tier_model.png", title: "4-Tier 에이전트 모델", width: 500, height: 370 },
  3: { file: "fig_agent_package.png", title: "에이전트 패키지 구조", width: 500, height: 340 },
  4: { file: "fig_gateway.png", title: "Gateway 매핑", width: 500, height: 360 },
  5: { file: "fig_activation.png", title: "3계층 활성화 구조", width: 500, height: 330 },
};

function figImage(num, captionText) {
  const fig = FIGURE_MAP[num];
  const imagePath = path.join(IMAGES_DIR, fig.file);
  const imageData = fs.readFileSync(imagePath);
  const imgParagraph = new Paragraph({
    children: [
      new ImageRun({
        data: imageData,
        transformation: { width: fig.width, height: fig.height },
        type: "png",
        altText: {
          title: fig.title,
          description: captionText,
          name: fig.file,
        },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
  });
  const captionParagraph = new Paragraph({
    children: [new TextRun({ text: `그림 ${num}: ${captionText}`, font: FONT, size: PT(10), italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
  return [imgParagraph, captionParagraph];
}

function tableCaption(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: PT(10), bold: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
  });
}

function makeCell(text, opts = {}) {
  const { bold, header, width, alignment: cellAlign, colspan } = opts;
  const shade = header
    ? { type: ShadingType.CLEAR, color: "auto", fill: HEADER_BG }
    : undefined;
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: text || "", font: FONT, size: PT(10), bold: bold || header || false })],
      alignment: cellAlign || AlignmentType.LEFT,
      spacing: { after: 40 },
    })],
    shading: shade,
    borders: TABLE_BORDERS,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: colspan,
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    children: headers.map((h, i) => makeCell(h, { header: true, width: colWidths[i] })),
    tableHeader: true,
  });
  const dataRows = rows.map((row) => new TableRow({
    children: row.map((cell, i) => makeCell(cell, { width: colWidths[i] })),
  }));
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    layout: TableLayoutType.FIXED,
  });
}

// sup helper for citation
function cite(num) {
  return new TextRun({ text: ` [${num}]`, font: FONT, size: PT(10), superScript: true });
}

// ─── CONTENT SECTIONS ────────────────────────────────────────────────────────

function titleSection() {
  return [
    emptyLine(),
    emptyLine(),
    new Paragraph({
      children: [new TextRun({ text: "선언형 멀티에이전트 오케스트레이션:", font: FONT, size: TITLE_SIZE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "마크다운과 YAML을 통한 Clean Architecture 원칙의", font: FONT, size: TITLE_SIZE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "LLM 에이전트 시스템 적용", font: FONT, size: TITLE_SIZE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "유니콘주식회사 연구팀", font: FONT, size: AUTHOR_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "contact@unicorn.co.kr", font: FONT, size: PT(11), italics: true, color: "444444" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];
}

function abstractSection() {
  return [
    p("초록", { bold: true, size: H2_SIZE, alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
    new Paragraph({
      children: [new TextRun({
        text: "LLM 기반 멀티에이전트 시스템은 2023년 이후 급격히 성장하였으며, AutoGen, CrewAI, LangGraph, MetaGPT 등의 프레임워크가 점점 더 정교한 에이전트 협업을 가능하게 함. 그러나 이들 프레임워크는 근본적인 구조적 한계를 공유함: 필수적인 코드 종속성(Python 또는 TypeScript SDK), 긴밀한 런타임 결합, 오케스트레이션과 실행 간 역할 혼재, 불충분한 추상화 계층, 제한적인 도메인 적용 범위. 본 논문은 DMAP(Declarative Multi-Agent Plugin)을 제안하며, 이는 Clean Architecture 원칙을 마크다운과 YAML만으로\u2014프로그래밍 코드 없이\u2014LLM 에이전트 시스템에 체계적으로 적용하는 런타임 중립적 플러그인 아키텍처임.",
        font: FONT, size: ABSTRACT_SIZE,
      })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80, line: 276 },
      indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "DMAP은 네 가지 주요 기여를 제시함: (1) AGENT.md(WHY와 HOW 프롬프트), agentcard.yaml(WHO, WHAT, WHEN 메타데이터), tools.yaml(추상 도구 인터페이스)로 구성된 선언형 에이전트 명세 표준으로, 파일 간 정보 중복을 금지하는 엄격한 경계 원칙을 포함함; (2) 위임 경로(Input\u2192Skills\u2192Agents\u2192Gateway\u2192Runtime)와 직결 경로(Input\u2192Skills\u2192Gateway\u2192Runtime)를 갖춘 5계층 아키텍처를 통한 Loosely Coupling, High Cohesion, Dependency Inversion의 AI 에이전트 오케스트레이션 체계적 적용으로, YAGNI 원칙을 준수함; (3) Gateway의 runtime-mapping.yaml을 통해 런타임 중립적 추상 선언을 구체적 구현에 매핑하는 4-Tier 에이전트 모델(HEAVY, HIGH, MEDIUM, LOW)로, 에이전트 정의 수정 없이 Claude Code, Codex CLI, Gemini CLI 간 이식성을 확보함; (4) 운영 배포된 두 플러그인을 통한 실증적 검증: OMC(39개 스킬, 35개 에이전트, 횡단 관심사로서 Hook을 사용하는 오케스트레이션 플러그인)와 Abra(AI 에이전트 개발 워크플로우를 위한 비즈니스 도메인 플러그인). 본 접근법은 비개발자도 정교한 에이전트 시스템을 정의할 수 있으며, 진정한 런타임 이식성을 달성하고, 엄격한 관심사 분리를 유지함을 입증하여\u2014검증된 소프트웨어 공학 원칙이 선언형 명세만으로 AI 에이전트 아키텍처에 효과적으로 이식될 수 있음을 확립함.",
        font: FONT, size: ABSTRACT_SIZE,
      })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80, line: 276 },
      indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
    }),
    emptyLine(),
    new Paragraph({
      children: [
        new TextRun({ text: "키워드: ", font: FONT, size: ABSTRACT_SIZE, bold: true }),
        new TextRun({ text: "멀티에이전트 시스템, LLM 오케스트레이션, Clean Architecture, 선언형 명세, 플러그인 아키텍처, 런타임 이식성", font: FONT, size: ABSTRACT_SIZE, italics: true }),
      ],
      indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
      spacing: { after: 200 },
    }),
    pageBreak(),
  ];
}

function introductionSection() {
  return [
    h1("1", "서론"),

    p("인공지능 분야는 자연어 이해, 추론, 코드 생성에서 뛰어난 역량을 보인 대규모 언어 모델(LLM)에 의해 근본적으로 재편됨. 2023년 이후 멀티에이전트 시스템\u2014다수의 LLM 기반 에이전트가 협력하여 단일 에이전트의 역량을 초과하는 복잡한 작업을 수행하는 아키텍처\u2014이 폭발적으로 성장함. 이러한 진화는 단일 프롬프트 엔지니어링에서 분산형, 역할 특화 에이전트 오케스트레이션으로의 패러다임 전환을 의미함."),

    p("멀티에이전트 조정 문제를 해결하기 위해 여러 주요 프레임워크가 등장함. Microsoft의 AutoGen [1]은 에이전트 간 통신을 위한 대화 기반 프로토콜을 도입함. CrewAI [2]는 순차적 및 계층적 프로세스 모델을 갖춘 역할 기반 에이전트 팀을 대중화함. LangGraph [3]는 LangChain을 기반으로 에이전트 워크플로우를 조건부 엣지가 있는 방향 그래프로 공식화함. MetaGPT [4]는 소프트웨어 개발 팀에 표준 운영 절차(SOP)를 적용하였고, ChatDev [5]는 통신하는 에이전트들로 소프트웨어 회사 전체를 시뮬레이션함. 각 프레임워크는 해당 분야에 의미 있는 발전을 기여하였으며, 멀티에이전트 접근법의 실행 가능성과 유용성을 총체적으로 입증함."),

    p("이러한 발전에도 불구하고, 기존 프레임워크들은 더 넓은 채택과 장기적 지속가능성을 제약하는 다섯 가지 근본적인 구조적 한계를 공유함:"),

    runs([{ text: "코드 종속성.", bold: true }, " 모든 주요 프레임워크는 Python 또는 TypeScript SDK를 통한 에이전트 정의를 요구함. 이는 에이전트 행동을 정의하는 데 필요한 도메인 지식을 보유하지만 프로그래밍 기술이 없는 도메인 전문가\u2014교육자, 비즈니스 분석가, 프로젝트 관리자\u2014에게 극복 불가능한 진입 장벽을 형성함. 현재의 패러다임은 대상 도메인이 프로그래밍과 무관하더라도 멀티에이전트 시스템 설계를 소프트웨어 개발자에게 사실상 제한함."]),

    runs([{ text: "런타임 결합.", bold: true }, " 에이전트 정의가 특정 프레임워크 API에 강하게 결합됨. CrewAI 에이전트는 AutoGen 런타임에서 실행 불가하며, LangGraph 워크플로우는 MetaGPT로 이식 불가함. 이러한 결합은 프레임워크 채택이 일방통행임을 의미하여\u2014프레임워크가 더 이상 사용되지 않거나 더 우수한 런타임이 등장해도 조직은 에이전트 정의를 이전할 수 없음."]),

    runs([{ text: "역할 혼재.", bold: true }, " 대부분의 프레임워크는 오케스트레이션(어떤 에이전트가 어떤 작업을 처리할지 결정)과 실행(실제 작업 수행)의 구분을 모호하게 함. 에이전트가 조정자와 작업자의 이중 역할을 빈번히 수행하여, 관심사 분리 원칙을 위반하고 시스템 확장 시 유지보수 문제를 야기함."]),

    runs([{ text: "추상화 부족.", bold: true }, " 도구 바인딩, 모델 선택, 운영 매개변수가 일반적으로 에이전트 정의 내에 하드코딩됨. 조직이 LLM 제공자를 변경하거나 도구 구현을 교체해야 할 때, 변경 사항이 모든 에이전트 정의에 전파되어야 하며\u2014이는 시스템 복잡도에 비례하여 선형으로 증가하는 유지보수 부담임."]),

    runs([{ text: "도메인 한정.", bold: true }, " 기존 프레임워크의 대다수는 암묵적 또는 명시적으로 소프트웨어 개발 작업에 최적화됨. 저장소 접근, 코드 실행 환경, 테스트 러너 등의 아키텍처 가정은 교육 커리큘럼 설계, 비즈니스 프로세스 자동화, 콘텐츠 제작 워크플로우 등의 도메인에 적합하지 않음."]),

    p("이러한 한계는 부수적인 구현 세부사항이 아니라 에이전트 시스템이 코드를 통해 명령적으로 정의되어야 한다는 공통된 아키텍처 가정의 결과임. 본 논문은 이 가정에 직접적으로 도전함."),

    runs([{ text: "연구 질문. ", bold: true, italic: true }, "검증된 소프트웨어 공학 원칙\u2014특히 Clean Architecture의 Loosely Coupling, High Cohesion, Dependency Inversion\u2014을 코드 작성 없이 마크다운과 YAML의 선언형 명세만으로 LLM 에이전트 시스템에 체계적으로 적용할 수 있는가?"]),

    p("본 연구는 이 질문에 긍정적으로 답하며, Clean Architecture [6] 원칙을 LLM 에이전트 오케스트레이션 영역에 이식하는 런타임 중립적 플러그인 아키텍처인 DMAP(Declarative Multi-Agent Plugin)을 제안함. 본 연구의 기여는 네 가지임:"),

    bulletRuns([{ text: "기여 1: ", bold: true }, "AGENT.md(프롬프트), agentcard.yaml(메타데이터), tools.yaml(추상 도구 인터페이스)를 사용하는 선언형 에이전트 명세 표준으로, 파일 간 정보 중복을 방지하는 엄격한 경계 원칙을 포함함."]),
    bulletRuns([{ text: "기여 2: ", bold: true }, "위임(LLM 추론 작업용)과 직결(절차적 작업용)의 두 가지 실행 경로를 갖춘 5계층 아키텍처로, Loosely Coupling, High Cohesion, Dependency Inversion, YAGNI 원칙을 에이전트 오케스트레이션에 체계적으로 적용함."]),
    bulletRuns([{ text: "기여 3: ", bold: true }, "Gateway의 runtime-mapping.yaml을 통해 런타임 중립적 추상 선언을 구체적 구현에 매핑하는 4-Tier 에이전트 모델(HEAVY/HIGH/MEDIUM/LOW)로, 이종 LLM 런타임 간 진정한 이식성을 실현함."]),
    bulletRuns([{ text: "기여 4: ", bold: true }, "운영 배포된 두 플러그인을 통한 실증적 검증: OMC(오케스트레이션, 39개 스킬, 35개 에이전트)와 Abra(비즈니스 도메인, AI 에이전트 개발 워크플로우)로, 접근법의 표현력과 실용적 적용 가능성을 모두 입증함."]),

    p("본 논문의 나머지 구성은 다음과 같음. 2장에서는 멀티에이전트 프레임워크의 관련 연구를 조사함. 3장에서는 DMAP 아키텍처를 제시함. 4장에서는 설계 원칙과 검증된 소프트웨어 공학 개념과의 대응을 상세히 기술함. 5장에서는 스킬 유형, 에이전트 패키지, 위임 표기법, Gateway 메커니즘을 포함한 구현을 서술함. 6장에서는 사례 연구를 제시함. 7장에서는 비교 평가를 제공함. 8장에서는 한계점과 향후 연구 방향을 논의하며, 9장에서 결론을 맺음."),

    pageBreak(),
  ];
}

function relatedWorkSection() {
  return [
    h1("2", "관련 연구"),

    p("본 장에서는 2023년 이후 등장한 주요 멀티에이전트 프레임워크를 조사하고, 아키텍처 접근법을 분석하며, 본 연구의 동기가 되는 공통 구조적 패턴을 식별함."),

    h2("2.1", "LangChain과 LangGraph"),
    p("LangChain [7]은 LLM 애플리케이션을 위한 조합 가능한 도구 체인 개념을 개척하여, 프롬프트, 메모리, 도구 통합에 대한 추상화를 제공함. 프롬프트, 체인, 에이전트, 도구를 별개의 컴포넌트로 분리하는 모듈형 설계는 LLM 애플리케이션에서 아키텍처 규율에 대한 초기 시도를 대표함. LangGraph [3]는 에이전트가 노드이고 전환이 조건부 엣지인 상태 기반 그래프 워크플로우를 도입하여 이 기반을 크게 확장함. 이 그래프 추상화는 순환(반복적 개선 허용), 영속성(상호작용 간 상태 유지), 인간 개입 패턴(승인 게이트 활성화), 조건부 분기(에이전트 출력 기반 라우팅) 등의 중요한 역량을 가능하게 함."),

    p("이러한 발전에도 불구하고, LangGraph는 근본적으로 코드 중심적임. 에이전트 행동, 그래프 구조, 도구 바인딩, 상태 관리 로직이 모두 Python 코드로 표현되어야 함. 일반적인 LangGraph 에이전트는 StateGraph 객체 정의, Python 함수로 노드 추가, 조건부 로직으로 엣지 구성, 그래프 컴파일을 프로그래밍 방식으로 수행해야 함. 이는 에이전트 정의와 LangChain/LangGraph SDK 간의 긴밀한 결합을 생성함. 그래프 추상화는 워크플로우 시각화에 강력하지만, 런타임 이식성이나 비개발자 접근성에 대한 더 넓은 문제는 해결하지 못함. 또한 LangGraph의 상태 관리 모델은 특정 계산 패러다임을 가정하여, 사전 정의된 그래프 토폴로지보다 동적 에이전트 스폰을 요구하는 오케스트레이션 패턴에는 적합하지 않을 수 있음."),

    h2("2.2", "CrewAI"),
    p("CrewAI [2]는 정의된 역할, 목표, 배경 스토리를 가진 에이전트 \"크루\"라는 직관적인 비유를 도입하여, 멀티에이전트 협업의 개념 모델을 더 접근 가능하게 함. 순차적 및 계층적 프로세스 모델은 명확한 오케스트레이션 패턴을 제공하며, 위임 기능의 추가로 에이전트가 팀원에게 작업을 넘길 수 있음. CrewAI의 일부 매개변수에 대한 YAML 기반 구성은 선언적 사고를 암시하지만, 핵심 에이전트 로직, 도구 할당, 워크플로우 정의는 여전히 Python 객체로 남아 있음."),

    p("그러나 CrewAI는 단일 Python 클래스 정의에서 에이전트 정체성(에이전트가 누구인가)과 에이전트 행동(어떻게 동작하는가)을 혼재시킴. 메타데이터(역할, 티어, 제약)와 행동 프롬프트(워크플로우, 목표, 검증)를 분리하는 메커니즘이 없음. 도구 할당은 코드 수준 바인딩으로\u2014검색 도구 교체 시 에이전트의 Python 생성자 수정이 필요함. 또한 CrewAI의 위임 모델은 암묵적임: 에이전트가 명시적 핸드오프 선언 대신 런타임 LLM 결정에 기반하여 위임하므로, 위임 경로의 예측이나 감사가 어려움. 프레임워크는 티어별 에이전트 변형(예: 간단한 작업을 위한 동일 역할의 저비용 버전)이나 공식적인 에스컬레이션 메커니즘을 지원하지 않음."),

    h2("2.3", "AutoGen"),
    p("Microsoft의 AutoGen [1]은 멀티에이전트 상호작용을 대화 프로토콜로 모델링하는 독특한 접근법을 취함. 명시적 워크플로우를 정의하는 대신, AutoGen은 에이전트 간 구조화된 메시지 교환에서 복잡한 행동이 나타나도록 함. 프레임워크의 중첩 대화 패턴은 정교한 상호작용 토폴로지를 가능하게 함: 에이전트가 하위 대화를 생성하고, 관리자 에이전트가 중재하는 그룹 채팅에 참여하며, 다른 하위 작업을 위한 별도 대화 스레드를 유지할 수 있음. 특히 GroupChatManager 패턴은 공유 목표를 중심으로 다수의 에이전트를 조정하는 유연한 메커니즘을 제공함."),

    p("AutoGen의 대화 중심 설계는 토론 시뮬레이션, 협업 글쓰기, 자문 시스템 등 대화 중심 애플리케이션에 적합함. 그러나 에이전트가 대화보다 구조화된 산출물을 생산해야 하는 작업 지향 워크플로우에서는 상당한 복잡성을 도입함. 대화 관리의 오버헤드\u2014메시지 라우팅, 순서 관리, 대화 종료 조건\u2014는 토큰 비용과 개념적 복잡성을 모두 증가시킴. 다른 프레임워크와 마찬가지로, AutoGen은 에이전트 정의에 Python을 요구하며, 대화 프로토콜(AssistantAgent, UserProxyAgent, GroupChat)이 AutoGen 런타임에 특화되어 에이전트 정의의 이식이 불가함. AutoGen은 또한 공식적인 티어 시스템이나 비용 최적화 메커니즘이 없으며, 대화 내 모든 에이전트가 작업 복잡도에 관계없이 동일한 기본 LLM 모델을 사용함."),

    h2("2.4", "MetaGPT"),
    p("MetaGPT [4]는 멀티에이전트 소프트웨어 개발에 표준 운영 절차(SOP)를 적용하여, Product Manager, Architect, Project Manager, Engineer 등의 역할을 다른 에이전트에 할당함. 핵심 혁신은 구조화된 출력임: 에이전트가 잘 정의된 산출물(PRD 문서, 시스템 설계, API 명세, 코드 파일)을 생산하여 후속 에이전트의 입력으로 사용하는 산출물 매개 파이프라인을 생성함. 이 접근법은 역할 간 구조화된 핸드오프가 표준인 실제 조직 패턴과 강하게 공명함."),

    p("MetaGPT의 SOP 기반 접근법은 DMAP이 옹호하는 관심사 분리를 향한 진전을 대표함: 역할에 정의된 책임과 특정 산출물 유형이 있음. 그러나 구현은 MetaGPT Python 프레임워크에 강하게 결합된 상태로 남아 있음. 역할은 Role 기본 클래스를 상속하는 Python 클래스로 정의되고, 액션은 run() 메서드가 있는 Python 클래스이며, SOP는 Python 로직으로 인코딩됨. 또한 MetaGPT는 소프트웨어 개발 워크플로우에 특화되어 있으며, 역할 정의, 산출물 유형, 파이프라인 단계가 모두 소프트웨어 공학 맥락을 가정함. MetaGPT를 비소프트웨어 도메인(교육, 비즈니스 프로세스, 콘텐츠 제작)에 적용하려면 단순한 구성 변경이 아닌 역할 계층과 산출물 파이프라인의 근본적 재구성이 필요함."),

    h2("2.5", "ChatDev"),
    p("ChatDev [5]는 조직 비유를 더 확장하여 CEO, CTO, CPO, 프로그래머, 리뷰어, 테스터 에이전트가 채팅 기반 협업에 참여하는 소프트웨어 회사 전체를 시뮬레이션함. 설계, 코딩, 테스트, 문서화의 단계별 개발 프로세스는 실제 소프트웨어 회사 워크플로우를 반영함. ChatDev는 \"채팅 체인\" 개념을 도입하여, 각 단계 내에서 에이전트 쌍이 구조화된 대화를 통해 협력하고 한 단계의 출력이 다음 단계로 전달됨."),

    p("ChatDev의 조직 시뮬레이션은 창의적이며 코드 생성 작업에서 인상적인 결과를 산출하지만, 아키텍처가 본질적으로 제한됨. 프레임워크는 고정된 도메인(소프트웨어 개발), 고정된 상호작용 패턴(쌍별 채팅), 고정된 조직 구조(CEO-프로그래머 계층)를 가정함. ChatDev를 다른 도메인으로 일반화하려면 새로운 역할 정의뿐만 아니라 근본적으로 다른 조직 모델이 필요함. 또한 ChatDev의 에이전트 역할은 프레임워크의 Python 코드베이스에 하드코딩되어 있으며, 채팅 체인 구조는 프레임워크의 실행 엔진에 강하게 결합된 JSON 구성 파일로 정의됨."),

    h2("2.6", "기타 주목할 접근법"),
    p("상세 조사한 다섯 가지 프레임워크 외에 몇 가지 추가 프로젝트가 언급할 가치가 있음. ReAct 패러다임 [20]은 LLM 에이전트에서 추론과 행동의 교차 배치가 추론만 또는 행동만의 접근법보다 작업 성능을 향상시킴을 입증함. Toolformer [22]는 언어 모델이 외부 도구를 자율적으로 사용하는 법을 학습할 수 있음을 보임. Generative Agents [23]는 메모리와 반성 역량을 갖춘 에이전트 아키텍처를 통해 인간 행동의 사실적 시뮬레이션을 탐구함. 이러한 연구들은 개별 에이전트 역량에 대한 이해를 발전시키지만, DMAP이 대상으로 하는 멀티에이전트 오케스트레이션, 런타임 이식성, 선언형 명세의 아키텍처 질문은 다루지 않음."),

    p("LLM 에이전트 개발의 더 넓은 추세는 단일 에이전트 프롬프트 엔지니어링(2022)에서 도구 증강 에이전트(2023)를 거쳐 멀티에이전트 협업 시스템(2024\u20132025)으로의 진행을 보여줌. 각 단계는 에이전트 시스템의 복잡성을 증가시켰으나 이에 상응하는 아키텍처 규율의 증가는 없었음. DMAP은 검증된 소프트웨어 공학 원칙을 이 진화의 최신 단계에 적용하여 이 격차를 해소함."),

    h2("2.7", "광범위한 맥락: 에이전트 아키텍처 서베이"),
    p("여러 포괄적 서베이 [12, 13]가 LLM 기반 에이전트 시스템의 급속한 진화를 정리함. Xi 등 [12]은 LLM 에이전트의 세 가지 기본 구성요소\u2014두뇌(LLM 추론), 인지(입력 처리), 행동(도구 사용)\u2014를 식별하고, 자율성, 협업, 전문화 차원에 따라 에이전트 아키텍처를 분류함. Wang 등 [13]은 자율 에이전트 아키텍처를 조사하고 계획, 메모리 관리, 멀티에이전트 조정을 포함한 주요 과제를 식별함. 두 서베이 모두 해당 분야의 코드 기반 에이전트 정의에 대한 의존과 선언형, 런타임 중립적 대안의 부재를 암묵적으로 확인함."),

    p("소프트웨어 공학 관점에서, 본 연구가 적용하는 원칙\u2014Clean Architecture [6], Dependency Inversion [11], 관심사 분리 [9], Aspect-Oriented Programming [15]\u2014은 전통적 소프트웨어 시스템에서 수십 년간 검증됨. 본 연구의 기여는 새로운 원칙을 제안하는 것이 아니라 근본적으로 다른 도메인\u2014프로그래밍 코드가 아닌 자연어 명세를 통한 AI 에이전트 오케스트레이션\u2014에 대한 체계적 적용 가능성을 입증하는 데 있음."),

    h2("2.8", "공통 한계 분석"),
    p("체계적 비교를 통해 조사된 모든 프레임워크에 걸쳐 다섯 가지 반복되는 한계가 드러남:"),

    tableCaption("표 1: 멀티에이전트 프레임워크 비교 분석"),
    makeTable(
      ["차원", "LangGraph", "CrewAI", "AutoGen", "MetaGPT", "ChatDev"],
      [
        ["에이전트 정의", "Python 코드", "Python 코드", "Python 코드", "Python 코드", "Python 코드"],
        ["오케스트레이션", "그래프 코드", "순차/\n계층적", "대화\n프로토콜", "SOP 코드", "채팅 단계"],
        ["런타임 바인딩", "LangChain SDK", "CrewAI SDK", "AutoGen SDK", "MetaGPT SDK", "ChatDev SDK"],
        ["도구 추상화", "Tool 클래스", "Tool 데코레이터", "Function call", "Tool 클래스", "Tool 클래스"],
        ["티어 관리", "없음", "없음", "없음", "없음", "없음"],
        ["핸드오프/에스컬레이션", "조건부\n엣지", "위임\n키워드", "없음", "없음", "없음"],
        ["도메인 범위", "범용", "범용", "범용", "소프트웨어\n개발", "소프트웨어\n개발"],
        ["비개발자 접근", "불가", "불가", "불가", "불가", "불가"],
        ["이식성", "낮음", "낮음", "낮음", "낮음", "낮음"],
      ],
      [1600, 950, 950, 950, 950, 950],
    ),
    emptyLine(),

    p("비코드 에이전트 정의, 런타임 독립성, 적절한 관심사 분리, 도구 추상화, 도메인 범용성의 다섯 가지 차원을 동시에 해결하는 프레임워크의 부재는 현재 분야에서의 명확한 격차를 식별함. DMAP은 근본적으로 다른 각도에서 문제에 접근하여 이 격차를 해소함: 검증된 소프트웨어 공학 원칙에 기반한 선언형 명세."),

    pageBreak(),
  ];
}

function architectureSection() {
  return [
    h1("3", "아키텍처"),

    p("DMAP의 아키텍처는 Robert C. Martin의 Clean Architecture [6]에서 차용한 핵심 원칙을 중심으로 설계됨: 의존성은 구체적 인프라에서 추상적 비즈니스 규칙 방향으로, 내부를 향해야 함. LLM 에이전트 시스템의 맥락에서, 이는 에이전트 정의(\"비즈니스 규칙\")가 특정 런타임, 도구, 모델(\"인프라\")로부터 독립적으로 유지되는 계층 구조로 번역됨. 본 장에서는 아키텍처 설계를 상세히 제시함."),

    h2("3.1", "5계층 구조"),
    p("DMAP은 플러그인을 각각 명확히 정의된 책임을 가진 다섯 개의 별개 계층으로 조직함:"),

    runs([{ text: "계층 1: 입력(Input).", bold: true }, " 명령, 자연어 요청 또는 프로그래밍 트리거를 수신하는 사용자 상호작용 계층. 이 계층은 완전히 런타임 의존적이며 입력 형식에 대한 가정을 하지 않음."]),
    runs([{ text: "계층 2: Controller + Use Case (Skills).", bold: true }, " 스킬은 Clean Architecture의 Controller와 Use Case 계층에 유사한 이중 역할을 수행함. 컨트롤러로서 진입점(예: 슬래시 명령)을 제공함. 유스케이스로서 오케스트레이션 워크플로우\u2014라우팅 결정, 에이전트 위임 순서, 완료 조건\u2014를 정의함. 스킬은 마크다운으로 작성되며, 런타임에 라우팅과 오케스트레이션 방법을 지시하는 프롬프트를 포함함."]),
    runs([{ text: "계층 3: Service (Agents).", bold: true }, " 에이전트는 실제 작업을 수행하는 도메인 전문가임. 각 에이전트는 AGENT.md(행동 프롬프트), agentcard.yaml(정체성 및 역량 메타데이터), tools.yaml(추상 도구 인터페이스)의 세 파일로 정의되는 자율적 단위임. 에이전트는 스킬로부터 위임된 작업을 수신하여 결과를 생산함. 라우팅이나 오케스트레이션에는 관여하지 않음."]),
    runs([{ text: "계층 4: Gateway.", bold: true }, " 추상 선언과 구체적 구현을 연결하는 인프라 계층. Gateway는 install.yaml(도구 설치 매니페스트)과 runtime-mapping.yaml(티어-모델 매핑, 추상-구체 도구 매핑, 액션 매핑)을 포함함. 이 계층은 런타임 특화 정보를 포함하는 유일한 컴포넌트임."]),
    runs([{ text: "계층 5: Runtime.", bold: true }, " Gateway 매핑을 해석하고, 프롬프트를 조립하며, 에이전트를 스폰하고, 도구 실행을 관리하는 실행 환경(예: Claude Code, Codex CLI, Gemini CLI). 런타임은 플러그인 외부에 있으며 완전히 교체 가능함."]),

    emptyLine(),
    ...figImage(1, "Input, Skills, Agents, Gateway, Runtime 계층과 단방향 의존 흐름을 보여주는 DMAP의 5계층 아키텍처"),
    emptyLine(),

    p("핵심 아키텍처 제약은 단방향 호출 흐름임: 스킬이 에이전트를 호출할 수 있고, 에이전트가 Gateway에 접근할 수 있지만, 역방향 의존은 금지됨. 에이전트는 스킬을 호출하지 않으며, Gateway는 에이전트를 직접 트리거하지 않음. 이 제약은 각 계층이 연쇄적 변경 없이 독립적으로 수정될 수 있도록 보장함."),

    h2("3.2", "두 가지 실행 경로"),
    p("DMAP은 작업의 성격에 따라 아키텍처를 통과하는 두 가지 별개의 실행 경로를 정의함:"),

    runs([{ text: "위임 경로: ", bold: true }, "Input \u2192 Skills (Controller) \u2192 Agents (Service) \u2192 Gateway \u2192 Runtime. 이 경로는 작업이 LLM 추론, 창의적 문제 해결 또는 자율적 의사결정을 요구할 때 사용됨. Core 스킬, Planning 스킬, Orchestrator 스킬이 이 경로를 따르며, 실질적 작업을 전문화된 에이전트에 위임함."]),

    runs([{ text: "직결 경로: ", bold: true }, "Input \u2192 Skills (Controller) \u2192 Gateway \u2192 Runtime. 이 경로는 에이전트 계층을 완전히 우회하며, 설치 스크립트, 구성 설정, 유틸리티 작업 등의 절차적이고 결정론적인 작업에 사용됨. Setup 스킬과 Utility 스킬이 이 경로를 따름."]),

    p("직결 경로는 Extreme Programming [8]의 YAGNI(You Ain't Gonna Need It) 원칙을 구현함: 작업이 LLM 추론을 요구하지 않는다면, 에이전트 계층을 강제로 경유시키는 것은 불필요한 복잡성과 토큰 소비를 도입함. 이 이중 경로 설계는 실용적 효율성을 유지하면서 아키텍처 무결성을 보장함."),

    p("경로 선택은 런타임 결정이 아닌 스킬 유형에 의해 결정됨. Core, Planning, Orchestrator 스킬은 작업이 본질적으로 LLM 추론(요구사항 분석, 아키텍처 결정, 다단계 워크플로우 조율)을 요구하므로 항상 위임 경로를 따름. Setup과 Utility 스킬은 작업이 절차적(도구 설치, 구성 확인, 상태 파일 관리)이므로 항상 직결 경로를 따름. 이 컴파일 시점 결정은 모호성을 제거하고 예측 가능한 리소스 소비를 보장함."),

    p("중요한 결과로, 두 경로가 동일한 Gateway 계층을 공유함. 에이전트가 위임 경로를 통해 도구를 요청하든, Utility 스킬이 직결 경로를 통해 동일한 도구를 요청하든, Gateway는 도구 참조를 동일하게 해석함. 이 공유 인프라 계층은 중복을 방지하고 실행 경로 간 일관성을 보장함."),

    h2("3.3", "횡단 관심사로서의 Hook"),
    p("소프트웨어 공학에서 횡단 관심사(cross-cutting concerns)는 다수의 아키텍처 계층에 걸치는 행동으로\u2014로깅, 보안, 트랜잭션 관리가 전형적인 예임. Aspect-Oriented Programming(AOP) [15]은 정의된 조인 포인트에서 실행을 가로채는 애스펙트를 통해 이를 해결하여, 횡단 로직을 비즈니스 로직과 별도로 모듈화할 수 있게 함."),

    p("DMAP은 모든 아키텍처 계층에 걸쳐 이벤트를 가로채는 Hook을 통해 이 패턴을 채택함. DMAP은 에이전트 생명주기의 주요 조인 포인트에 대응하는 8가지 Hook 이벤트 유형을 정의함:"),

    bulletRuns([{ text: "UserPromptSubmit: ", bold: true }, "라우팅 전 사용자 입력을 가로채어 입력 변환, 컨텍스트 주입 또는 접근 제어를 가능하게 함."]),
    bulletRuns([{ text: "SessionStart: ", bold: true }, "새 세션이 시작될 때 발생하여 세션 범위 상태 초기화 및 구성 로딩을 가능하게 함."]),
    bulletRuns([{ text: "PreToolUse / PostToolUse: ", bold: true }, "도구 호출을 감싸서 도구 수준 감사, 접근 제어, 결과 변환을 가능하게 함."]),
    bulletRuns([{ text: "SubAgentStart / SubAgentEnd: ", bold: true }, "에이전트 스폰을 감싸서 프롬프트 보강, 성능 모니터링, 결과 검증을 가능하게 함."]),
    bulletRuns([{ text: "Stop: ", bold: true }, "세션 종료 시 발생하여 정리 및 상태 영속화를 가능하게 함."]),
    bulletRuns([{ text: "Notification: ", bold: true }, "시스템 알림 시 발생하여 커스텀 알림 및 로깅 행동을 가능하게 함."]),

    p("결정적으로, Hook에는 DMAP을 일반적인 AOP 프레임워크와 구별하는 제한이 있음: Hook은 전체 에이전트 생태계를 관리하는 것이 주요 목적인 오케스트레이션 플러그인에만 배타적으로 예약됨. 일반 도메인 플러그인은 Hook 사용이 금지됨(MUST NOT 규칙 #5). 이 제한은 다수의 도메인 플러그인이 동일한 이벤트를 가로채려 시도할 경우 Hook의 횡단적 특성이 플러그인 간 의도치 않은 간섭을 생성할 수 있기 때문에 존재함. Hook을 오케스트레이션 플러그인으로 제한함으로써, DMAP은 횡단 행동이 중앙에서 관리되고 예측 가능하도록 보장함."),

    h2("3.4", "4-Tier 에이전트 모델"),
    p("DMAP은 에이전트 정의를 수정하지 않고 비용-역량 트레이드오프를 가능하게 하는 계층형 에이전트 모델을 도입함:"),

    tableCaption("표 2: 4-Tier 에이전트 모델"),
    makeTable(
      ["티어", "특성", "대표 LLM", "적합 작업", "에스컬레이션"],
      [
        ["HEAVY", "최대 역량 +\n대규모 예산", "Opus (대규모\n토큰/시간)", "장시간 추론,\n멀티파일 작업", "\u2014"],
        ["HIGH", "최고 역량,\n고비용", "Opus", "복잡한 의사결정,\n심층 분석", "\u2014"],
        ["MEDIUM", "비용과 역량의\n균형", "Sonnet", "기능 구현,\n일반 분석", "\u2014"],
        ["LOW", "빠르고 저비용", "Haiku", "단순 조회,\n기본 수정", "상위 티어로\n보고"],
      ],
      [1100, 1400, 1200, 1400, 1200],
    ),
    emptyLine(),

    p("티어 선언은 추상화임: 에이전트가 agentcard.yaml에서 tier: HIGH를 선언하되 HIGH에 어떤 모델이 대응하는지는 명시하지 않음. Gateway의 runtime-mapping.yaml이 구체적 매핑을 제공함(예: 한 환경에서 HIGH \u2192 claude-opus-4-6, 다른 환경에서 HIGH \u2192 gpt-4o). 이 간접 참조가 DMAP이 런타임 이식성을 달성하는 메커니즘임\u2014대상 LLM 제공자 변경 시 Gateway 구성만 수정하면 되며, 에이전트 정의는 변경 불필요함."),

    p("에스컬레이션 메커니즘은 하위 티어 에이전트가 자신의 역량 임계값을 초과하는 작업을 인식하고 상위로 보고하여, 동일 에이전트 역할의 상위 티어 변형에 위임을 트리거하도록 함. 이는 IT 서비스 관리의 L1/L2/L3 지원 구조를 반영함."),

    emptyLine(),
    ...figImage(2, "HEAVY, HIGH, MEDIUM, LOW 티어와 에스컬레이션 화살표, runtime-mapping.yaml을 통한 구체적 LLM 모델 연결을 보여주는 4-Tier 에이전트 모델"),
    emptyLine(),

    h2("3.5", "3계층 활성화 구조"),
    p("플러그인 시스템에서 미묘하지만 중요한 아키텍처 과제는 활성화 부트스트래핑 문제임: 활성화 조건이 스킬 자체 내부에 정의되어 있다면, 런타임이 주어진 사용자 요청에 어떤 스킬을 활성화해야 하는지 어떻게 알 수 있는가? 모든 스킬을 로드하여 조건을 확인하는 것은 비용이 지나치게 높음."),

    p("DMAP은 3계층 활성화 구조를 통해 이를 해결함:"),

    runs([{ text: "계층 A: 런타임 상주 파일.", bold: true }, " 항상 로드되는 영속적 구성 파일(예: CLAUDE.md). 이 파일은 요청 패턴을 플러그인 스킬에 매핑하는 라우팅 테이블을 포함함. 경량이며 오케스트레이션 로직을 포함하지 않음."]),
    runs([{ text: "계층 B: Core 스킬.", bold: true }, " 라우팅 테이블이 매칭될 때 온디맨드로 로드됨. Core 스킬은 실제 오케스트레이션 로직을 포함함: runtime-mapping.yaml 읽기, 스폰할 에이전트 결정, 위임 워크플로우 관리."]),
    runs([{ text: "계층 C: 에이전트.", bold: true }, " Core 스킬에 의해 필요에 따라 스폰됨. 에이전트는 정의된 경계 내에서 자율적으로 실행하고 결과를 반환함."]),

    p("Setup 스킬은 플러그인 설치 시 Core 스킬의 활성화 조건을 런타임 상주 파일에 등록하는 역할을 담당함. 이는 부트스트랩 관심사(어떤 스킬이 어떤 요청을 처리하는지 아는 것)를 오케스트레이션 관심사(스킬이 어떻게 처리하는지)로부터 분리하여, 그렇지 않으면 발생할 순환 의존을 차단함."),

    emptyLine(),
    ...figImage(5, "런타임 상주 파일(라우팅 테이블) \u2192 Core 스킬(오케스트레이션) \u2192 에이전트(실행)를 보여주는 3계층 활성화 구조, Setup 스킬이 설치 시 라우팅 항목 등록"),
    emptyLine(),

    pageBreak(),
  ];
}

function designPrinciplesSection() {
  return [
    h1("4", "설계 원칙"),

    p("DMAP의 아키텍처는 즉흥적 구성이 아니라 검증된 소프트웨어 공학 원칙을 LLM 에이전트 시스템이라는 새로운 영역에 의도적으로 적용한 것임. 본 장에서는 각 원칙을 DMAP 내에서의 구체적 실현에 매핑하여, 전통적 소프트웨어 아키텍처와 AI 에이전트 아키텍처 간의 격차가 신중한 설계를 통해 연결될 수 있음을 입증함."),

    h2("4.1", "Loosely Coupling"),
    p("전통적 소프트웨어 공학에서 느슨한 결합은 인터페이스와 의존성 주입을 통해 달성됨\u2014컴포넌트가 구체적 구현이 아닌 계약을 통해 상호작용함. DMAP은 병렬적 메커니즘을 통해 느슨한 결합을 달성함: 에이전트 패키지의 추상 선언이 Gateway 매핑을 통해서만 구체적 구현에 연결됨."),

    p("도구 추상화를 예로 들면: 에이전트가 tools.yaml에서 code_search 역량의 필요성을 선언하되 어떤 도구가 이를 제공하는지는 명시하지 않음. Gateway의 tool_mapping 섹션이 이를 구체적 도구로 해석함(예: 코드 환경에서 lsp_workspace_symbols, 또는 단순한 런타임에서 grep 기반 폴백). 이 분리는 도구 구현이 에이전트 파일 수정 없이 교체, 업그레이드 또는 다른 환경에 적응될 수 있음을 의미함."),

    p("마찬가지로, 티어 추상화는 에이전트를 특정 LLM 모델로부터 분리함. tier: HIGH로 운영되는 에이전트는 현재 런타임이 HIGH에 매핑하는 어떤 모델이든 사용함\u2014한 환경에서 Claude Opus, 다른 환경에서 GPT-4o, 또는 로컬 호스팅 모델까지. 에이전트의 행동 정의는 모든 환경에서 변경되지 않음."),

    h2("4.2", "High Cohesion"),
    p("DMAP의 각 컴포넌트는 단일하고 명확하게 정의된 책임을 가짐:"),

    bulletRuns([{ text: "스킬(Skills) ", bold: true }, "은 라우팅과 오케스트레이션에만 전적으로 책임짐\u2014어떤 에이전트가 요청을 처리하는지, 어떤 컨텍스트를 제공하는지, 다단계 워크플로우를 어떻게 순서화하는지 결정함. 스킬은 애플리케이션 수준의 작업을 직접 수행하지 않음."]),
    bulletRuns([{ text: "에이전트(Agents) ", bold: true }, "는 선언된 역량 내에서 자율적 작업 실행에만 전적으로 책임짐. 에이전트는 라우팅 결정을 내리거나 다른 에이전트를 조정하지 않음."]),
    bulletRuns([{ text: "Gateway ", bold: true }, "는 추상 선언을 구체적 구현으로 연결하는 것에만 전적으로 책임짐. Gateway 파일은 행동 로직을 포함하지 않음."]),

    p("이 엄격한 분리는 DMAP의 MUST NOT 규칙을 통해 강제됨: 스킬은 애플리케이션 코드를 작성해서는 안 됨; 에이전트는 라우팅이나 오케스트레이션을 수행해서는 안 됨; Gateway는 프롬프트 내용을 포함해서는 안 됨. 이 제약은 각 컴포넌트가 독립적으로 작성, 테스트, 유지보수될 수 있도록 보장함."),

    h2("4.3", "Dependency Inversion"),
    p("Dependency Inversion Principle(DIP) [6]은 상위 수준 모듈이 추상화에 의존해야 하며 하위 수준 세부사항에 의존해서는 안 되고, 세부사항이 추상화에 의존해야 한다고 명시함. DMAP은 이 원칙을 다음과 같이 실현함:"),

    bulletItem("상위 계층(스킬과 에이전트)은 추상화에 의존함: 티어 이름(HIGH, MEDIUM), 추상 도구 이름(code_search, file_read), 역할 선언."),
    bulletItem("하위 계층(Gateway와 Runtime)이 구체적 구현을 제공함: 특정 모델명(claude-opus-4-6), 특정 도구 인스턴스(lsp_workspace_symbols), 실행 메커니즘."),

    p("역전은 의존 방향에서 명확함: 에이전트 정의는 런타임 특화 아티팩트를 임포트하거나 참조하지 않음. 대신, 런타임이 에이전트 선언을 읽고 Gateway 매핑에 대해 해석함. 이 역전된 의존 흐름이 런타임 이식성을 가능하게 하는 것임\u2014DMAP 플러그인은 모든 호환 런타임이 해석할 수 있는 순수 선언임."),

    h2("4.4", "YAGNI와 직결 경로"),
    p("Extreme Programming [8]의 YAGNI(You Ain't Gonna Need It) 원칙은 현재 필요하지 않은 기능 구현을 경고함. DMAP에서 이는 직결 실행 경로로 나타남: Setup과 Utility 스킬이 에이전트 계층을 거치지 않고 Gateway 도구에 직접 접근함."),

    p("예를 들어, 플러그인 설치 스크립트는 결정론적 단계(MCP 서버 설치, 라우팅 항목 등록)를 실행해야 함. 이러한 스크립트를 에이전트를 통해 강제하는 것은\u2014LLM 추론, 토큰 소비, 잠재적 비결정성을 수반하므로\u2014YAGNI를 위반함. 직결 경로는 아키텍처 일관성을 유지하면서 이 불필요한 간접 참조를 제거함."),

    h2("4.5", "추가 설계 포인트"),
    p("핵심 Clean Architecture 원칙 외에도, DMAP은 LLM 에이전트 오케스트레이션의 도메인 특화 과제를 해결하는 여러 추가 설계 포인트를 포함함:"),

    tableCaption("표 3: DMAP 설계 포인트와 소프트웨어 공학 대응 개념"),
    makeTable(
      ["#", "설계 포인트", "설명", "SE 대응 개념"],
      [
        ["1", "런타임 중립성", "추상 티어/도구 선언을\n어떤 런타임이든 해석", "Dependency Inversion\nPrinciple"],
        ["2", "3계층 활성화", "라우팅 테이블 \u2192 Core 스킬 \u2192 에이전트\n순환 부트스트랩 의존 차단", "Layered Architecture"],
        ["3", "프롬프트 깊이\n차등화", "라우팅/분기 = 상세 프롬프트;\n에이전트 위임 = 최소(WHAT만)", "Interface Segregation"],
        ["4", "위임 표기법", "에이전트: 5항목(TASK, OUTCOME,\nMUST/MUST NOT, CONTEXT);\n스킬: 3항목(INTENT, ARGS, RETURN)", "Command Pattern"],
        ["5", "에스컬레이션", "LOW 티어가 한계 인식,\n상위 티어로 보고", "L1\u2192L2\u2192L3 지원"],
        ["6", "Install/Setup\n분리", "install.yaml (WHAT) / Setup 스킬\n(HOW) / Runtime (DO)", "CQRS"],
        ["7", "핸드오프 선언", "agentcard.yaml: target + when +\nreason으로 역할 경계 명시", "Service Contract"],
        ["8", "액션 카테고리\n추상화", "file_write 선언 \u2192\n런타임이 Write, Edit로 매핑", "Adapter Pattern"],
        ["9", "에이전트 패키지\n경계", "AGENT.md (WHY+HOW) vs\nagentcard.yaml (WHO+WHAT+WHEN)\n\u2014 중복 금지", "Separation of\nConcerns"],
        ["10", "직결 경로 (YAGNI)", "Setup/Utility 스킬이 에이전트\n계층 생략 \u2192 Gateway 직접 접근", "YAGNI (XP)"],
        ["11", "프롬프트 조립\n순서", "공통 정적 \u2192 에이전트별\n정적 \u2192 동적", "Cache Optimization"],
      ],
      [400, 1400, 2300, 1500],
    ),
    emptyLine(),

    p("설계 포인트 3(프롬프트 깊이 차등화)은 특별한 주의를 기울일 필요가 있음. 스킬이 런타임에 라우팅 로직을 지시할 때, 프롬프트는 상세하고 규범적임\u2014정확한 조건, 폴백 행동, 엣지 케이스를 명시함. 그러나 스킬이 에이전트에 위임할 때, 프롬프트는 의도적으로 최소화됨: 무엇을(WHAT) 해야 하는지(작업)는 명시하지만 어떻게(HOW) 할지는 명시하지 않음. HOW는 에이전트의 자율적 책임이며, AGENT.md에 인코딩됨. 이 차등화는 호출자가 사용하지 않는 메서드에 의존하도록 강제되어서는 안 된다는 Interface Segregation Principle을 반영함."),

    p("설계 포인트 11(프롬프트 조립 순서)은 실용적 최적화 관심사를 다룸. prefix 캐싱을 지원하는 LLM 런타임(예: Anthropic의 프롬프트 캐싱)은 호출 간 동일하게 유지되는 프롬프트 프리픽스의 재처리를 회피할 수 있음. DMAP의 3단계 조립 순서\u2014공통 정적 콘텐츠 먼저, 그 다음 에이전트별 정적 콘텐츠, 그 다음 동적 작업 지시\u2014는 가장 재사용 가능한 콘텐츠를 조립된 프롬프트의 시작에 배치하여 캐시 적중률을 극대화함."),

    h2("4.6", "선언형-명령형 경계"),
    p("DMAP의 근본적 설계 결정은 선언형 명세와 명령형 실행 사이의 경계를 어디에 그을지임. DMAP은 이 경계를 Gateway 계층에 배치함: Gateway 위의 모든 것(스킬, 에이전트)은 순수하게 선언적(마크다운과 YAML)이며, Gateway 이하의 모든 것(도구 구현, 런타임 로직)은 코드를 포함할 수 있음."),

    p("이 경계 배치는 의도적임. 선언형 명세는 WHAT(목표, 제약, 관계, 워크플로우)을 표현하는 데 탁월하지만 HOW(알고리즘, 상태 머신, 복잡한 조건부 로직)에는 어려움이 있음. 경계를 인프라 계층에 배치함으로써, DMAP은 도메인 특화 복잡성을 커스텀 도구\u2014코드를 포함할 수 있는\u2014에 캡슐화하면서 에이전트 아키텍처 자체는 코드 프리로 유지할 수 있음. 이 실용적 타협은 인프라 수준에서의 명령형 로직의 실제적 필요를 인정하면서 선언형 명세의 이점(접근성, 이식성, 가독성)을 보존함."),

    p("커스텀 도구 탈출 해치는 핵심 원칙에 의해 지배됨: 커스텀 도구는 tools.yaml에서 추상적으로 선언되고 runtime-mapping.yaml에서 구체적으로 매핑됨. 에이전트는 커스텀 도구의 구현을 직접 참조하거나 의존하지 않으며, 추상 인터페이스와만 상호작용함. 이는 커스텀 도구가 다른 언어로 재구현되거나, MCP 서버로 교체되거나, 수동 프로세스로 대체될 수 있음을 의미하며\u2014모두 이를 사용하는 에이전트의 수정 없이 가능함."),

    h2("4.7", "전통적 아키텍처 매핑과의 비교"),
    p("DMAP의 설계와 검증된 소프트웨어 공학 개념 간의 매핑을 요약하기 위해, 포괄적인 대응 테이블을 제시함:"),

    tableCaption("표 3b: Clean Architecture의 DMAP 컴포넌트 매핑"),
    makeTable(
      ["Clean Architecture\n개념", "전통적 소프트웨어\n실현", "DMAP 실현"],
      [
        ["Entity\n(비즈니스 규칙)", "도메인 객체,\n비즈니스 로직 클래스", "에이전트 행동 정의\n(AGENT.md: 목표, 워크플로우)"],
        ["Use Case\n(애플리케이션 규칙)", "서비스 클래스,\n유스케이스 인터랙터", "스킬 오케스트레이션 프롬프트\n(SKILL.md: 라우팅, 위임)"],
        ["Interface Adapter\n(컨트롤러)", "REST 컨트롤러,\nCLI 핸들러", "명령 진입점,\n슬래시 명령 정의"],
        ["Framework &\nDriver", "데이터베이스 드라이버,\n웹 프레임워크, UI", "Gateway (runtime-mapping.yaml),\nRuntime (Claude Code 등)"],
        ["Dependency Rule\n(내부 방향만)", "내부 계층의 인터페이스,\n외부의 구현", "에이전트/스킬의 추상 선언,\nGateway에만 구체적 매핑"],
      ],
      [1700, 1800, 2400],
    ),
    emptyLine(),

    p("이 매핑은 DMAP이 Clean Architecture에서 단순히 영감을 받은 것이 아니라 원칙의 체계적 적응임을 입증함. Clean Architecture의 모든 주요 개념은 DMAP에서 직접적 대응물을 가지며, 명령형이 아닌 선언형 수단으로 실현됨."),

    pageBreak(),
  ];
}

function implementationSection() {
  return [
    h1("5", "구현"),

    p("본 장에서는 스킬 유형, 에이전트 패키지 구조, 위임 표기법, Gateway 메커니즘, 네임스페이스 규약을 포함한 DMAP의 구체적 구현 아티팩트를 상세히 기술함."),

    h2("5.1", "스킬 유형"),
    p("DMAP은 실행 경로(위임 또는 직결)와 기능적 역할에 따라 분류되는 5가지 스킬 유형을 정의함:"),

    tableCaption("표 4: 스킬 유형 분류"),
    makeTable(
      ["스킬 유형", "경로", "필수", "수량 제한", "책임"],
      [
        ["Core", "위임", "예", "플러그인당 1개", "요청 라우팅, 에이전트\n디스패치, 주 오케스트레이션"],
        ["Setup", "직결", "예", "제한 없음", "플러그인 설치, 환경\n구성, 라우팅 등록"],
        ["Planning", "위임", "아니오", "제한 없음", "전략 기획, 요구사항\n수집, 아키텍처 결정"],
        ["Orchestrator", "위임", "아니오", "제한 없음", "다단계 워크플로우 조율,\n에이전트 팀 관리"],
        ["Utility", "직결", "아니오", "제한 없음", "보조 기능, 진단,\n상태 관리"],
      ],
      [1200, 1100, 900, 1000, 2100],
    ),
    emptyLine(),

    p("플러그인당 정확히 하나의 Core 스킬과 최소 하나의 Setup 스킬의 필수 포함은 모든 플러그인이 자체 활성화 및 자체 설치되도록 보장함. Core 스킬은 플러그인의 주요 진입점으로서, 사용자 의도를 적절한 에이전트나 다른 스킬에 매핑하는 라우팅 로직을 포함함. Setup 스킬은 설치 관심사를 처리함: MCP 서버 등록, 도구 구성, Core 스킬의 활성화 조건을 런타임 라우팅 테이블에 작성."),

    p("위임 경로 스킬(Core, Planning, Orchestrator)은 엄격한 제약을 준수함: 라우팅과 오케스트레이션만 수행하고 애플리케이션 수준 작업을 직접 실행하지 않음. 이는 DMAP 명세의 MUST 규칙 #4와 MUST NOT 규칙 #1임. 직결 경로 스킬(Setup, Utility)은 반대로 에이전트 중재 없이 Gateway 도구를 직접 호출할 수 있음."),

    h2("5.2", "에이전트 패키지 구조"),
    p("각 에이전트는 최대 5개의 아티팩트를 포함하는 디렉토리에 캡슐화됨:"),

    p("agents/{agent-name}/", { bold: true, font: "Courier New", size: PT(11), alignment: AlignmentType.LEFT }),
    bulletItem("AGENT.md [필수] \u2014 WHY (목표) + HOW (워크플로우, 출력 형식, 검증)"),
    bulletItem("agentcard.yaml [필수] \u2014 WHO (정체성) + WHAT (역량, 제약) + WHEN (핸드오프)"),
    bulletItem("tools.yaml [선택] \u2014 추상 도구 인터페이스 선언"),
    bulletItem("references/ [선택] \u2014 도메인 특화 지식, 가이드라인"),
    bulletItem("templates/ [선택] \u2014 출력 형식 템플릿"),

    emptyLine(),
    ...figImage(3, "AGENT.md (WHY+HOW), agentcard.yaml (WHO+WHAT+WHEN), tools.yaml와 {tool:name} 표기법을 보여주는 에이전트 패키지 구조, 경계 원칙 화살표로 연결"),
    emptyLine(),

    h3("5.2.1", "AGENT.md: 행동 명세"),
    p("AGENT.md는 에이전트의 목표와 운영 절차를 정의하는 프롬프트 주입 가능 파일임. 규정된 구조를 따름:"),

    bulletRuns([{ text: "Frontmatter: ", bold: true }, "파일 최상단의 YAML 메타데이터 블록(name, version)."]),
    bulletRuns([{ text: "목표: ", bold: true }, "에이전트의 미션 선언\u2014달성하기 위해 존재하는 바."]),
    bulletRuns([{ text: "참조: ", bold: true }, "references/ 디렉토리의 도메인 지식에 대한 포인터."]),
    bulletRuns([{ text: "워크플로우: ", bold: true }, "에이전트가 따르는 단계별 운영 절차."]),
    bulletRuns([{ text: "출력 형식: ", bold: true }, "에이전트 산출물의 기대 구조와 형식."]),
    bulletRuns([{ text: "검증: ", bold: true }, "에이전트가 출력 품질을 자체 평가하기 위한 기준."]),

    p("결정적으로, AGENT.md는 모델명, 구체적 도구명 또는 운영 제약을 포함해서는 안 됨. 모델과 도구 참조는 추상 표기법을 사용함: lsp_workspace_symbols가 아닌 {tool:code_search}. 이는 MUST 규칙 #7임."),

    h3("5.2.2", "agentcard.yaml: 정체성 및 역량 선언"),
    p("agentcard.yaml 파일은 런타임 소비를 위한 기계 판독 가능 메타데이터를 제공함:"),

    bulletRuns([{ text: "name, version: ", bold: true }, "네임스페이스 해석을 위한 에이전트 식별자와 버전."]),
    bulletRuns([{ text: "tier: ", bold: true }, "HEAVY, HIGH, MEDIUM, LOW 중 하나(MUST 규칙 #3)."]),
    bulletRuns([{ text: "capabilities.role: ", bold: true }, "에이전트의 기능적 역할 설명."]),
    bulletRuns([{ text: "capabilities.identity: ", bold: true }, "에이전트 행동 경계를 제약하는 is/is_not 선언."]),
    bulletRuns([{ text: "capabilities.restrictions: ", bold: true }, "action_mapping을 통해 매핑되는 forbidden_actions 목록(예: file_write)."]),
    bulletRuns([{ text: "handoff: ", bold: true }, "에이전트가 다른 에이전트에 작업을 이전해야 하는 시점을 명시하는 {target, when, reason} 선언 배열."]),
    bulletRuns([{ text: "escalation: ", bold: true }, "하위 티어 에이전트가 상위 티어 변형으로 에스컬레이션하는 조건."]),

    p("AGENT.md와 agentcard.yaml 간의 경계 원칙은 엄격함: 어떤 정보도 두 파일 모두에 나타나서는 안 됨(MUST NOT 규칙 #6). AGENT.md는 WHY와 HOW를 소유하고; agentcard.yaml은 WHO, WHAT, WHEN을 소유함. 이는 한 파일의 변경이 다른 파일과 모순을 생성하는 유지보수 동기화 문제를 방지함."),

    h3("5.2.3", "tools.yaml: 추상 도구 인터페이스"),
    p("tools.yaml 파일은 에이전트가 요구하는 추상 도구 역량을 구체적 구현 명시 없이 선언함:"),

    p("각 도구 선언은 name({tool:name} 표기법에 사용되는 추상 식별자), description(자연어 목적), input(기대 매개변수 스키마), output(기대 반환 스키마)을 포함함. Gateway의 tool_mapping 섹션이 이 추상 이름을 구체적 도구 인스턴스로 해석하며, lsp(Language Server Protocol 도구), mcp(Model Context Protocol 서버), custom(도메인 특화 구현)의 세 가지 도구 유형을 지원함. 내장 도구(Read, Write, Bash)는 런타임에 의해 암묵적으로 처리되며 tool_mapping에서 제외됨."),

    h2("5.3", "위임 표기법"),
    p("DMAP은 간결성을 유지하면서 완전성을 보장하기 위해 위임 시 전달되는 정보를 표준화함:"),

    runs([{ text: "에이전트 위임 (5항목): ", bold: true }, "스킬이 에이전트에 위임할 때 제공함: TASK(달성할 것), EXPECTED OUTCOME(성공 기준), MUST DO(필수 행동), MUST NOT DO(금지 행동), CONTEXT(관련 배경 정보)."]),

    runs([{ text: "스킬 위임 (3항목): ", bold: true }, "스킬이 다른 스킬을 호출할 때 제공함: INTENT(호출 목적), ARGS(입력 매개변수), RETURN(기대 반환값 구조)."]),

    p("두 표기법 간의 비대칭은 근본적 설계 결정을 반영함: 에이전트 위임은 에이전트가 자율적이므로 더 많은 컨텍스트를 요구함\u2014위임된 범위 내에서 독립적 결정을 내림. 스킬 위임은 스킬이 절차적이므로 더 구조화됨\u2014예측 가능한 인터페이스로 정의된 워크플로우를 따름."),

    h2("5.4", "Gateway: 추상-구체 매핑"),
    p("Gateway 계층은 추상화 격차를 함께 연결하는 두 파일로 구성됨:"),

    runs([{ text: "install.yaml: ", bold: true }, "플러그인이 요구하는 구체적 도구를 유형별로 조직하여 선언함: mcp_servers(외부 도구 서버), lsp_servers(코드 분석 도구), custom_tools(도메인 특화 유틸리티). 이 파일은 데이터임\u2014무엇을(WHAT) 설치해야 하는지 기술함."]),

    runs([{ text: "runtime-mapping.yaml: ", bold: true }, "런타임이 에이전트 스폰 시 참조하는 세 가지 매핑 영역을 제공함:"]),

    bulletRuns([{ text: "tier_mapping: ", bold: true }, "추상 티어(HEAVY/HIGH/MEDIUM/LOW)를 구체적 LLM 모델 식별자에 매핑함. 특정 에이전트가 해당 티어 수준에서 비표준 모델을 요구하는 경우를 위한 기본 매핑과 에이전트별 오버라이드를 모두 지원함."]),
    bulletRuns([{ text: "tool_mapping: ", bold: true }, "추상 도구 이름(tools.yaml 출처)을 구체적 도구 인스턴스에 매핑함. 각 매핑은 도구 유형(lsp/mcp/custom)과 구체적 도구 식별자를 명시함. lsp, mcp, custom 유형만 매핑되며, 내장 도구는 제외됨."]),
    bulletRuns([{ text: "action_mapping: ", bold: true }, "추상 금지 액션 카테고리(agentcard.yaml의 forbidden_actions 출처)를 런타임이 에이전트에서 보류해야 하는 구체적 도구명에 매핑함."]),

    emptyLine(),
    ...figImage(4, "agentcard.yaml(tier, forbidden_actions)과 tools.yaml(추상 도구)이 runtime-mapping.yaml을 통해 구체적 LLM 모델과 도구 인스턴스에 연결되는 Gateway 매핑 흐름"),
    emptyLine(),

    p("install.yaml(무엇을 설치), Setup 스킬(어떻게 설치), Runtime(설치 수행)의 3자 분리는 CQRS 패턴을 적용함: 필요 리소스의 선언이 이를 획득하는 절차로부터 분리됨."),

    h2("5.5", "프롬프트 조립"),
    p("위임 경로 스킬이 에이전트를 스폰할 때, 런타임은 prefix 캐시 최적화를 위해 순서화된 3단계로 완전한 프롬프트를 조립함:"),

    bulletRuns([{ text: "1단계 \u2014 공통 정적: ", bold: true }, "모든 에이전트에 걸쳐 공유되는 runtime-mapping.yaml 콘텐츠. 이 콘텐츠는 플러그인 내 모든 에이전트 호출에 동일하므로, LLM 캐싱이 가장 효과적인 프롬프트 프리픽스를 차지함."]),
    bulletRuns([{ text: "2단계 \u2014 에이전트별 정적: ", bold: true }, "에이전트의 세 파일: AGENT.md, agentcard.yaml, tools.yaml. 이 콘텐츠는 주어진 에이전트에 대해 모든 호출에 걸쳐 상수이므로, 동일 에이전트가 반복 호출될 때 캐시 적중을 가능하게 함."]),
    bulletRuns([{ text: "3단계 \u2014 동적: ", bold: true }, "작업 특화 위임 콘텐츠(에이전트를 위한 5항목 위임). 매 호출마다 변경되며, 캐시 미적중이 예상되는 프롬프트 접미사를 차지함."]),

    p("이 순서는 MUST 규칙 #8이며 프롬프트 prefix 캐싱을 지원하는 현대 LLM 런타임(예: Anthropic의 cache_control)을 위한 의도적 최적화를 대표함. 경험적으로, 이는 반복적 에이전트 호출에서 토큰 소비를 80\u201390% 감소시킬 수 있음."),

    h2("5.6", "플러그인 디렉토리 구조와 네임스페이스"),
    p("완전한 DMAP 플러그인은 아키텍처 계층을 반영하는 표준화된 디렉토리 구조를 따름:"),

    tableCaption("표 4b: 플러그인 디렉토리 구조"),
    makeTable(
      ["디렉토리", "계층", "내용"],
      [
        [".claude-plugin/", "메타데이터", "plugin.json (검색 매니페스트),\nmarketplace.json (배포 메타데이터)"],
        ["skills/", "Controller +\nUse Case", "스킬 디렉토리, 각각 활성화 조건과\n워크플로우 프롬프트가 있는 SKILL.md 포함"],
        ["agents/", "Service", "에이전트 패키지, 각각 AGENT.md,\nagentcard.yaml, tools.yaml, references/, templates/ 포함"],
        ["gateway/", "Infrastructure", "install.yaml (도구 매니페스트),\nruntime-mapping.yaml (3영역 매핑)"],
        ["commands/", "Input", "스킬로 라우팅하는\n슬래시 명령 진입점"],
        ["hooks/", "Cross-cutting", "이벤트 핸들러 (오케스트레이션 플러그인 전용);\n일반 플러그인에서는 생략"],
      ],
      [1400, 1100, 3800],
    ),
    emptyLine(),

    p("네임스페이스 규약은 다수의 플러그인이 런타임에 공존할 때 충돌을 방지하기 위해 콜론으로 구분된 식별자를 사용함. 스킬은 {plugin}:{skill-dir-name}(예: abra:dsl-generate)으로 참조됨. 에이전트 정규화 이름(FQN)은 세 부분을 사용함: {plugin}:{directory-name}:{frontmatter-name}(예: abra:dsl-architect:dsl-architect). 에이전트의 세 부분 FQN은 디렉토리 이름이 에이전트의 frontmatter에 선언된 이름과 다른 경우를 수용하여, 파일시스템 수준과 논리적 수준 모두에서의 식별을 제공함."),

    p("모든 플러그인은 .claude-plugin/plugin.json(런타임 검색 매니페스트)과 .claude-plugin/marketplace.json(배포 메타데이터)을 포함해야 함. 이는 MUST 규칙 #1이며, 모든 플러그인이 표준화된 메커니즘을 통해 검색 가능하고 배포 가능하도록 보장함. plugin.json 파일은 플러그인의 이름, 버전, 진입점, 의존성 선언을 포함함. marketplace.json 파일은 플러그인 마켓플레이스 목록을 위한 설명, 저자, 라이선스, 호환성 정보 등의 배포 메타데이터를 포함함."),

    h2("5.7", "명세 규칙: MUST와 MUST NOT"),
    p("DMAP은 8개의 MUST 규칙(필수 요구사항)과 6개의 MUST NOT 규칙(금지 패턴)을 통해 아키텍처 제약을 성문화함. 이 규칙들은 플러그인 작성자와 런타임 간의 강제 가능한 계약으로, DMAP 준수 플러그인이 3장과 4장에서 기술된 아키텍처 속성을 유지하도록 보장함."),

    tableCaption("표 4c: MUST 규칙 (필수 요구사항)"),
    makeTable(
      ["#", "규칙", "근거"],
      [
        ["M1", "모든 플러그인은 plugin.json과\nmarketplace.json 포함", "런타임 검색 및\n배포 표준화"],
        ["M2", "모든 에이전트 = AGENT.md +\nagentcard.yaml 쌍", "프롬프트/메타데이터 분리\n(경계 원칙)"],
        ["M3", "tier는 HEAVY / HIGH /\nMEDIUM / LOW만 가능", "4-Tier 런타임 매핑\n표준화"],
        ["M4", "위임 스킬: 라우팅과 오케스트레이션만;\n직결 스킬: Gateway 접근 허용", "관심사 분리 +\nYAGNI 원칙"],
        ["M5", "추상 선언(tools.yaml)과\n구체 매핑(runtime-mapping.yaml)\n분리", "Dependency Inversion\nPrinciple"],
        ["M6", "Setup 스킬과 Core 스킬 필수;\n플러그인당 Core 스킬 1개", "자체 설치 및\n자체 활성화 플러그인"],
        ["M7", "AGENT.md에 도구 명세 금지;\ntools.yaml과 {tool:name} 사용", "프롬프트/도구 분리;\n런타임 중립성"],
        ["M8", "프롬프트 조립 순서: 공통 정적\n\u2192 에이전트별 정적 \u2192 동적", "Prefix 캐시 최적화"],
      ],
      [400, 2600, 2000],
    ),
    emptyLine(),

    tableCaption("표 4d: MUST NOT 규칙 (금지 패턴)"),
    makeTable(
      ["#", "규칙", "근거"],
      [
        ["MN1", "스킬이 애플리케이션 코드를\n직접 작성 금지", "에이전트의 역할;\n스킬 역할 침범 방지"],
        ["MN2", "에이전트가 라우팅이나\n오케스트레이션 수행 금지", "스킬의 역할;\n에이전트 역할 침범 방지"],
        ["MN3", "AGENT.md에 모델명이나\n도구명 하드코딩 금지", "런타임 중립성;\n이식성"],
        ["MN4", "agentcard.yaml에\n프롬프트 내용 포함 금지", "기계 판독용 데이터에\n프롬프트 혼재 금지"],
        ["MN5", "일반 플러그인에서\nHook 사용 금지", "오케스트레이션 플러그인\n전용; 캡슐화"],
        ["MN6", "AGENT.md와 agentcard.yaml 간\n정보 중복 금지", "경계 원칙;\n유지보수 일관성"],
      ],
      [500, 2500, 2000],
    ),
    emptyLine(),

    p("이 규칙들은 단순한 권고가 아니라 위반 시 DMAP이 보장하도록 설계된 아키텍처 속성을 훼손할 구조적 제약임. 예를 들어, M5 위반(에이전트 파일에 도구 참조 하드코딩)은 런타임 이식성을 제거함. MN2 위반(에이전트가 라우팅 수행 허용)은 오케스트레이션과 실행 간의 분리를 깨뜨려, 기존 프레임워크에서 식별된 역할 혼재 문제를 재도입함. 규칙들은 총체적으로 특정 플러그인의 도메인이나 복잡도에 관계없이 Loosely Coupling, High Cohesion, Dependency Inversion 속성이 유지되도록 보장함."),

    pageBreak(),
  ];
}

function caseStudySection() {
  return [
    h1("6", "사례 연구"),

    p("DMAP의 표현력과 실용적 적용 가능성을 검증하기 위해, 플러그인 설계 공간의 서로 다른 지점을 대표하는 두 개의 운영 배포 플러그인을 제시함: 오케스트레이션 플러그인(OMC)과 비즈니스 도메인 플러그인(Abra)."),

    h2("6.1", "OMC: 오케스트레이션 플러그인"),
    p("Oh-My-ClaudeCode(OMC)는 소프트웨어 개발 생산성을 위한 멀티에이전트 생태계를 관리하는 대규모 오케스트레이션 플러그인임. 오케스트레이션 플러그인으로서 Hook(횡단 관심사) 사용이 허용되는 유일한 플러그인 유형이며, 모든 아키텍처 계층에 걸쳐 에이전트 행동을 가로채고 보강하는 능력을 가짐."),

    tableCaption("표 5: OMC 플러그인 정량적 프로필"),
    makeTable(
      ["컴포넌트", "수량", "세부사항"],
      [
        ["스킬", "39", "Core: 1, Setup: 1, Planning: 5, Orchestrator: 22, Utility: 10"],
        ["에이전트", "35", "12개 도메인 \u00D7 최대 4개 티어 (HEAVY/HIGH/MEDIUM/LOW)"],
        ["에이전트 도메인", "12", "분석, 실행, 탐색, 연구, 프론트엔드,\n문서, 시각, 기획, 비평, 테스트, 보안, 데이터 과학"],
        ["Hook 이벤트", "8", "UserPromptSubmit, SessionStart, PreToolUse,\nPostToolUse, SubAgentStart, SubAgentEnd, Stop, Notification"],
        ["MCP 도구", "15", "LSP: 12, AST: 2, Python REPL: 1"],
        ["Gateway 매핑", "3영역", "tier_mapping (4 티어), tool_mapping (15 도구),\naction_mapping (금지 액션)"],
      ],
      [1400, 800, 4100],
    ),
    emptyLine(),

    p("OMC의 에이전트 티어 분포는 4-Tier 모델의 실제 활용을 입증함: Architect, Executor, Explorer 등의 도메인 역할이 각각 LOW, MEDIUM, HIGH, 때로는 HEAVY 변형을 가짐. Core 스킬의 라우팅 로직은 작업 복잡도를 고려하여 적절한 티어를 선택하며, 비용 효율을 위해 하위 티어를 기본으로 하고 작업 복잡도가 정당화할 때만 에스컬레이션함."),

    p("OMC의 Hook 시스템은 AOP 애스펙트 계층으로 동작함. 예를 들어, SubAgentStart Hook은 현재 세션 상태에 기반하여 어떤 에이전트의 프롬프트에든 추가 컨텍스트를 주입할 수 있으며\u2014개별 에이전트 정의를 수정하지 않고 워크플로우 연속성을 제공함. PreToolUse Hook은 도구 수준 접근 제어와 감사를 가능하게 함. 이러한 횡단 행동은 Hook이 없는 아키텍처에서는 모든 에이전트의 수정을 요구하며, 오케스트레이션 플러그인을 위한 AOP 패턴의 가치를 입증함."),

    p("핵심 관찰: OMC의 35개 에이전트와 39개 스킬은 전적으로 마크다운과 YAML 파일을 통해 정의됨. 에이전트 정의에 Python이나 TypeScript 코드가 관여하지 않음. 존재하는 유일한 코드는 커스텀 도구(예: Python REPL 통합)에 있으며, 이는 Gateway 계층에 적절히 격리된 인프라 관심사임."),

    tableCaption("표 5b: OMC 에이전트 도메인별 티어 분포"),
    makeTable(
      ["도메인", "LOW", "MEDIUM", "HIGH", "HEAVY", "합계"],
      [
        ["분석 (Architect)", "1", "1", "1", "\u2014", "3"],
        ["실행 (Executor)", "1", "1", "1", "\u2014", "3"],
        ["탐색 (Explorer)", "1", "1", "1", "\u2014", "3"],
        ["연구 (Researcher)", "1", "1", "\u2014", "\u2014", "2"],
        ["프론트엔드 (Designer)", "1", "1", "1", "\u2014", "3"],
        ["문서 (Writer)", "1", "\u2014", "\u2014", "\u2014", "1"],
        ["시각 (Vision)", "\u2014", "1", "\u2014", "\u2014", "1"],
        ["기획 (Planner)", "\u2014", "\u2014", "1", "\u2014", "1"],
        ["비평 (Critic)", "\u2014", "\u2014", "1", "\u2014", "1"],
        ["테스트 (QA)", "\u2014", "1", "1", "\u2014", "2"],
        ["보안 (Security)", "1", "\u2014", "1", "\u2014", "2"],
        ["데이터 과학 (Scientist)", "1", "1", "1", "\u2014", "3"],
        ["빌드 (Build-Fixer)", "1", "1", "\u2014", "\u2014", "2"],
        ["TDD (TDD-Guide)", "1", "1", "\u2014", "\u2014", "2"],
        ["코드 리뷰", "1", "\u2014", "1", "\u2014", "2"],
        ["기타", "\u2014", "\u2014", "\u2014", "4", "4"],
      ],
      [1500, 700, 800, 700, 700, 700],
    ),
    emptyLine(),

    p("티어 분포는 의도적인 비용 최적화 전략을 드러냄: 35개 에이전트 중 12개가 LOW 티어(Haiku급 모델)에서 운영되며, 단순 조회, 기본 수정, 빠른 확인을 처리함. HEAVY 티어를 요구하는 에이전트는 4개뿐이며, 영속적 오케스트레이션 루프와 같은 장시간, 토큰 집약적 작업에 예약됨. 이 분포는 에이전트 호출의 대부분이 가장 비용 효과적인 모델 티어를 사용하고, 상위 티어는 진정으로 복잡한 추론 작업에만 예약되도록 보장함."),

    h2("6.2", "Abra: 비즈니스 도메인 플러그인"),
    p("Abra는 AI 에이전트 개발 워크플로우를 위한 도메인 특화 플러그인으로, 일반 플러그인 범주(Hook 미사용)를 대표함. 워크플로우는 Dify AI 에이전트 애플리케이션 생성의 엔드투엔드 프로세스를 오케스트레이션함:"),

    bulletRuns([{ text: "시나리오 정의: ", bold: true }, "scenario-analyst 에이전트가 비즈니스 요구사항을 수집하고 구조화된 유스케이스 시나리오를 생산함."]),
    bulletRuns([{ text: "DSL 생성: ", bold: true }, "dsl-architect 에이전트가 시나리오를 Dify 호환 DSL(Domain Specific Language) 워크플로우 정의로 변환함."]),
    bulletRuns([{ text: "프로토타이핑: ", bold: true }, "prototype-runner 에이전트가 검증을 위한 신속한 프로토타입을 생성함."]),
    bulletRuns([{ text: "개발 계획: ", bold: true }, "plan-writer 에이전트가 상세한 개발 계획을 작성함."]),
    bulletRuns([{ text: "개발: ", bold: true }, "agent-developer 에이전트가 최종 프로덕션 코드를 구현함."]),

    tableCaption("표 6: Abra 플러그인 정량적 프로필"),
    makeTable(
      ["컴포넌트", "수량", "세부사항"],
      [
        ["스킬", "8", "core: 1, setup: 1, Planning: 2 (scenario, dev-plan),\nOrchestrator: 4 (dsl-generate, prototype, develop, orchestrate)"],
        ["에이전트", "5", "scenario-analyst, dsl-architect, agent-developer,\nplan-writer, prototype-runner"],
        ["에이전트 패키지", "5", "각각: AGENT.md + agentcard.yaml + tools.yaml"],
        ["Gateway 파일", "2", "install.yaml + runtime-mapping.yaml"],
        ["Hook 사용", "0", "일반 플러그인: Hook 사용 금지"],
        ["네임스페이스", "\u2014", "스킬: abra:{skill-name}, 에이전트: abra:{dir}:{name}"],
      ],
      [1400, 800, 4100],
    ),
    emptyLine(),

    p("Abra는 여러 핵심 DMAP 속성을 검증함. 첫째, 도메인 범용성: 플러그인이 일반 프로그래밍이 아닌 AI 에이전트 개발을 다루어\u2014DMAP의 아키텍처가 코드 중심 도메인에 묶이지 않음을 입증함. 둘째, 경계 원칙: Abra의 5개 에이전트 각각이 정보 중복 없이 AGENT.md(워크플로우 프롬프트)와 agentcard.yaml(역량 선언) 간의 깨끗한 분리를 유지함. 셋째, 도구 추상화: Abra의 에이전트가 추상 이름(예: {tool:dsl_validate}, {tool:scenario_parse})을 통해 도구를 참조하며, Gateway가 이를 구체적 구현에 매핑함."),

    p("특히 교훈적인 비교는 OMC와 Abra 간의 규모 차이임. OMC는 오케스트레이션 플러그인으로서 12개 도메인에 걸쳐 35개 에이전트와 완전한 Hook 인프라를 요구함. Abra는 집중된 도메인 플러그인으로서 5개 에이전트와 8개 스킬로 워크플로우를 달성함\u2014Hook 없이, 복잡한 티어 분포 없이. 이는 DMAP의 확장성을 입증함: 동일한 아키텍처가 대규모 오케스트레이션 시스템과 집중된 도메인 워크플로우를 모두 우아하게 수용함."),

    h2("6.3", "횡단적 관찰"),
    p("두 플러그인을 함께 분석하면 여러 관찰이 도출됨:"),

    runs([{ text: "아키텍처 일관성. ", bold: true }, "규모와 도메인이 크게 다름에도 불구하고, 두 플러그인은 동일한 아키텍처 패턴을 따름: 스킬이 위임 경로를 통해 에이전트에 라우팅하고, 에이전트가 추상 {tool:name} 표기법을 통해 도구를 참조하며, Gateway가 구체적 매핑을 제공함. Abra의 구조에 익숙한 개발자는 OMC가 약 7배 더 큼에도 불구하고 OMC의 조직을 즉시 이해할 수 있으며, 그 반대도 마찬가지임."]),

    runs([{ text: "규칙 준수. ", bold: true }, "두 플러그인 모두 8개의 MUST 규칙과 6개의 MUST NOT 규칙을 예외 없이 준수함. 이는 규칙 체계가 실제 플러그인 개발에 과도하게 제한적이지 않음을 검증함. 특히 경계 원칙(MUST NOT 규칙 #6)은 Abra 개발 시 신중한 주의를 요구함\u2014프롬프트(AGENT.md)와 메타데이터(agentcard.yaml) 모두에서 에이전트 역량을 기술하려는 자연스러운 경향을 의식적으로 저항해야 했음."]),

    runs([{ text: "Gateway 재사용성. ", bold: true }, "두 플러그인이 서로 다른 도구 세트에 매핑함에도 불구하고 Gateway 구성에서 구조적 유사성을 공유함. 이는 새로운 플러그인 개발을 가속화하는 Gateway 템플릿 라이브러리의 가능성을 시사하며\u2014향후 생태계 도구의 방향임."]),

    runs([{ text: "스킬 유형 분포. ", bold: true }, "OMC에서는 Orchestrator 스킬(39개 중 22개)이 지배적이며, 조정 중심 미션을 반영함. Abra에서는 분포가 더 균형적(Orchestrator 4개, Planning 2개, Core 1개, Setup 1개)이며, 기획과 실행이 교차하는 도메인 워크플로우를 반영함. 이 다양성은 5가지 유형의 스킬 분류체계가 다양한 플러그인 프로필에 충분히 표현적임을 검증함."]),

    p("두 플러그인의 성공적 배포는 DMAP의 아키텍처가 복잡한 오케스트레이션 시스템에 충분히 표현적이면서 집중된 도메인 워크플로우에 충분히 접근 가능하다는 예비적 증거를 제공함. 그러나 8장에서 논의하듯, 다양한 팀과 도메인에 걸친 더 넓은 검증이 이 결론을 강화할 것임."),

    pageBreak(),
  ];
}

function evaluationSection() {
  return [
    h1("7", "평가"),

    p("본 연구는 1장에서 식별한 구조적 한계를 반영하는 7개 비교 축에 따라 DMAP을 평가함. 비교 대상은 조사한 5개 프레임워크(LangGraph, CrewAI, AutoGen, MetaGPT, ChatDev)와 DMAP임."),

    h2("7.1", "정량적 비교: 선언 밀도"),
    p("하나의 도구, 하나의 역할, 하나의 핸드오프 조건을 가진 단일 에이전트를 완전히 정의하는 데 필요한 라인 수를 측정함\u2014최소하지만 완전한 에이전트 정의:"),

    tableCaption("표 7: 최소 에이전트 정의를 위한 코드/선언 라인 수"),
    makeTable(
      ["프레임워크", "언어", "에이전트 정의", "도구 바인딩", "오케스트레이션", "총 LoC"],
      [
        ["LangGraph", "Python", "~40줄", "~15줄", "~30줄", "~85"],
        ["CrewAI", "Python", "~25줄", "~10줄", "~20줄", "~55"],
        ["AutoGen", "Python", "~35줄", "~20줄", "~25줄", "~80"],
        ["MetaGPT", "Python", "~50줄", "~15줄", "~35줄", "~100"],
        ["ChatDev", "Python/JSON", "~45줄", "~10줄", "~40줄", "~95"],
        ["DMAP", "MD + YAML", "~30줄", "~10줄", "~15줄", "~55"],
      ],
      [1100, 1100, 1000, 1100, 1100, 900],
    ),
    emptyLine(),

    p("DMAP의 총 라인 수가 CrewAI와 유사하지만, 결정적 차이는 언어에 있음: DMAP의 라인은 마크다운과 YAML이며 프로그래밍 지식을 요구하지 않음. 또한 DMAP의 에이전트 정의는 본질적으로 이식 가능함\u2014동일한 55줄이 모든 호환 런타임에서 동작함\u2014반면 각 프레임워크의 55\u2013100줄은 해당 SDK에 고정됨."),

    h2("7.2", "정성적 비교"),

    tableCaption("표 8: 다차원 정성적 비교"),
    makeTable(
      ["차원", "LangGraph", "CrewAI", "AutoGen", "MetaGPT", "DMAP"],
      [
        ["진입 장벽", "높음\n(Python +\nSDK)", "중간\n(Python +\nSDK)", "높음\n(Python +\nSDK)", "높음\n(Python +\nSDK)", "낮음\n(Markdown +\nYAML)"],
        ["런타임\n이식성", "없음\n(LangChain\n고정)", "없음\n(CrewAI\n고정)", "없음\n(AutoGen\n고정)", "없음\n(MetaGPT\n고정)", "완전\n(runtime-\nmapping.yaml)"],
        ["확장성", "중간\n(서브클래스\n패턴)", "중간\n(데코레이터\n패턴)", "중간\n(프로토콜\n확장)", "낮음\n(SOP\n수정)", "높음\n(파일 추가,\n코드 변경\n불필요)"],
        ["관심사\n분리", "낮음\n(책임\n혼재)", "중간\n(역할 기반\n이나 결합)", "중간\n(대화\n프로토콜)", "중간\n(SOP 기반\n분리)", "높음\n(5계층,\n엄격한\n경계)"],
        ["토큰\n효율", "해당없음\n(코드\n기반)", "해당없음\n(코드\n기반)", "중간\n(대화\n오버헤드)", "낮음\n(장황한\nSOP 프롬프트)", "높음\n(4-Tier +\n캐시\n최적화)"],
        ["도메인\n범용성", "중간\n(범용이나\n코드\n중심)", "중간\n(범용이나\n코드\n중심)", "중간\n(대화\n중심)", "낮음\n(소프트웨어\n개발 특화)", "높음\n(설계상\n도메인\n무관)"],
        ["비개발자\n접근성", "불가", "불가", "불가", "불가", "가능"],
      ],
      [1200, 1000, 1000, 1000, 1000, 1100],
    ),
    emptyLine(),

    h2("7.3", "결과 분석"),

    p("평가에서 세 가지 관찰이 도출됨:"),

    runs([{ text: "관찰 1: 이식성 격차.", bold: true }, " DMAP은 런타임 이식성을 달성하는 유일한 프레임워크임. 다른 모든 프레임워크는 각각의 SDK에 영구적으로 묶인 에이전트 정의를 생산함. 이는 DMAP의 핵심 아키텍처 결정\u2014Gateway 계층을 통한 선언과 구현의 분리\u2014의 직접적 결과임. 대상 런타임 변경 시 runtime-mapping.yaml만 수정하면 되며\u2014에이전트 정의, 스킬 정의, 조직 구조는 변경되지 않음."]),

    runs([{ text: "관찰 2: 접근성 격차.", bold: true }, " DMAP은 에이전트 시스템 설계에서 비개발자 참여를 고유하게 가능하게 함. 도메인 전문가(예: 튜터링 에이전트 팀을 설계하는 교육자, 또는 문서 처리 워크플로우를 정의하는 비즈니스 분석가)가 자연어로 AGENT.md 파일을 작성하고 어떤 프로그래밍 언어도 배우지 않고 구조화된 YAML 템플릿을 채울 수 있음. 이는 잠재적 설계자 풀을 전문 개발자에서 모든 지식 근로자로 확대함."]),

    runs([{ text: "관찰 3: 아키텍처를 통한 토큰 효율.", bold: true }, " DMAP의 4-Tier 모델과 프롬프트 조립 최적화는 구현적이 아닌 아키텍처적 토큰 효율 이점을 제공함. 간단한 작업을 LOW 티어 에이전트(더 작고 저렴한 모델)에 라우팅하고 HIGH/HEAVY 티어를 복잡한 추론에 예약함으로써, DMAP은 본질적으로 비용을 최적화함. 3단계 프롬프트 조립 순서는 효과적인 캐시 활용을 통해 토큰 소비를 더욱 감소시킴. 이러한 최적화는 모든 에이전트가 일반적으로 동일한 모델을 사용하는 코드 기반 프레임워크에서는 불가능함."]),

    h2("7.4", "이식성 분석"),
    p("이식성 이점을 정량화하기 위해, 에이전트 시스템을 한 런타임에서 다른 런타임으로 이식하는 데 필요한 노력을 분석함:"),

    tableCaption("표 9: 이식성 비용 분석 \u2014 런타임 변경 시 수정 파일 수"),
    makeTable(
      ["프레임워크", "에이전트 파일", "도구 파일", "오케스트레이션", "구성 파일", "총 수정 수"],
      [
        ["LangGraph", "전체 (~N)", "전체 (~N)", "전체 (~N)", "전체", "~3N + config"],
        ["CrewAI", "전체 (~N)", "전체 (~N)", "전체 (~N)", "전체", "~3N + config"],
        ["AutoGen", "전체 (~N)", "전체 (~N)", "전체 (~N)", "전체", "~3N + config"],
        ["MetaGPT", "전체 (~N)", "전체 (~N)", "전체 (~N)", "전체", "~3N + config"],
        ["DMAP", "0", "0", "0", "1 (runtime-\nmapping.yaml)", "1"],
      ],
      [1100, 1000, 1000, 1200, 1100, 1300],
    ),
    emptyLine(),

    p("N개 에이전트를 가진 시스템에서, 코드 기반 프레임워크는 약 3N개 파일(에이전트 정의, 도구 바인딩, 오케스트레이션 로직)과 구성 파일의 수정을 요구함. DMAP은 정확히 하나의 파일: runtime-mapping.yaml의 수정만 요구함. 이 O(1) 대 O(N) 이식성 비용은 DMAP 아키텍처에서 Dependency Inversion Principle의 가장 구체적인 발현임. OMC 사례 연구에서, 35개 에이전트를 다른 런타임으로 이식하는 것은 코드 기반 프레임워크에서 약 105개 파일 수정 대 DMAP에서 1개 파일 수정을 요구함."),

    h2("7.5", "확장성 분석"),
    p("각 프레임워크가 기존 시스템에 새 에이전트를 추가하는 방법을 추가로 평가함:"),

    tableCaption("표 10: 확장성 비용 \u2014 새 에이전트 추가 단계"),
    makeTable(
      ["프레임워크", "신규 파일", "수정된 기존 파일", "코드 필요"],
      [
        ["LangGraph", "1 (Python 모듈)", "그래프 정의,\n라우팅 로직", "예 (Python)"],
        ["CrewAI", "1 (Python 클래스)", "Crew 정의,\n작업 목록", "예 (Python)"],
        ["AutoGen", "1 (Python 클래스)", "그룹 채팅 구성,\n대화 흐름", "예 (Python)"],
        ["MetaGPT", "1 (Python 클래스)", "SOP 파이프라인,\n역할 레지스트리", "예 (Python)"],
        ["DMAP", "3 (MD + 2 YAML)", "0 (Core 스킬이 규약에\n따라 자동 라우팅)", "아니오"],
      ],
      [1200, 1400, 1800, 1400],
    ),
    emptyLine(),

    p("DMAP은 에이전트 확장에 대해 Open-Closed Principle [11]을 달성함: 새 에이전트가 기존 파일 수정 없이 agents/ 디렉토리에 새 파일을 생성하여 추가됨. Core 스킬의 라우팅 로직은 프롬프트 기반이므로 규약에 따른 에이전트 자동 검색(예: agents/ 디렉토리 스캔)으로 작성 가능하여, 수동 등록의 필요를 제거함. 반면, 조사한 모든 코드 기반 프레임워크는 새 에이전트 추가 시 최소 하나의 기존 파일(일반적으로 오케스트레이션 구성) 수정을 요구하여, 신규와 기존 컴포넌트 간 결합을 생성함."),

    pageBreak(),
  ];
}

function discussionSection() {
  return [
    h1("8", "논의"),

    h2("8.1", "한계점"),
    p("DMAP의 선언형 접근법은 LLM 런타임이 자연어 프롬프트를 행동 명세로 정확히 해석하는 능력에 대한 근본적 의존을 도입함. 결정론적으로 실행되는 코드와 달리, 프롬프트 기반 에이전트 정의는 LLM의 해석에 종속되며, 이는 모델 버전, 온도 설정, 컨텍스트 윈도우 활용에 따라 달라질 수 있음. 이 비결정성은 어떤 수준의 명세 엄격성으로도 완전히 제거할 수 없는 프롬프트 기반 아키텍처의 본질적 한계임."),

    p("선언 전용 명세의 표현력 경계는 또 다른 한계임. DMAP이 마크다운과 YAML을 통해 에이전트 오케스트레이션 패턴의 대다수를 처리하지만, 특정 고도로 절차적이거나 알고리즘적으로 복잡한 행동은 선언적으로 표현하기 어려울 수 있음. Gateway의 커스텀 도구 탈출 해치가 이를 부분적으로 해결함\u2014복잡한 로직을 에이전트가 추상 인터페이스를 통해 호출하는 커스텀 도구에 캡슐화할 수 있음\u2014그러나 이는 인프라 수준에서 코드를 도입하여 코드 프리 이상을 부분적으로 훼손함."),

    p("추가적으로, 현재 평가는 동일 팀이 개발한 두 플러그인에 의존함. OMC와 Abra가 범위와 도메인에서 상당히 다르지만, 외부 팀에 의한 독립적 검증이 DMAP의 일반화 가능성에 대한 신뢰를 강화할 것임."),

    p("네 번째 한계는 LLM 런타임 자체의 성숙도에 관련됨. DMAP의 아키텍처는 마크다운 프롬프트를 해석하고, YAML 구성을 해석하며, 하위 에이전트를 스폰하고, 도구 호출을 관리하는 런타임을 가정함. 2025년 기준으로, 소수의 런타임(Claude Code, Codex CLI, Gemini CLI)만이 이러한 역량을 네이티브로 제공함. LLM 런타임의 더 넓은 생태계는 DMAP의 가정을 지원하기 위해 적응 계층을 요구할 수 있으며, 잠재적으로 통합 경계에서 복잡성을 추가함."),

    p("마지막으로, 경계 원칙\u2014AGENT.md와 agentcard.yaml 간 정보 중복 금지\u2014은 플러그인 작성자에게 규율을 요구함. 실제로, 작성자가 가독성을 위해 두 파일 모두에 핵심 정보를 반복하려는 유혹을 느낄 수 있으며, 부주의하게 유지보수 동기화 문제를 생성함. 도구 지원(예: 경계 위반을 감지하는 린터)이 이 위험을 완화할 수 있으나 아직 DMAP 명세의 일부가 아님."),

    h2("8.2", "타당성 위협"),
    p("여러 타당성 위협을 인정해야 함. 첫째, 7장의 비교는 각 프레임워크에서 동일한 애플리케이션을 구축하여 경험적으로 측정된 값이 아닌 추정 라인 수를 사용함\u2014동일 시스템을 5번 구축하는 것은 비실용적이므로. 둘째, \"비개발자 접근성\" 주장은 아키텍처적으로 정당화되지만(마크다운과 YAML은 프로그래밍 불필요), 실제 비개발자 모집단을 대상으로 한 사용자 연구로 검증되지 않음. 셋째, DMAP의 런타임 이식성은 Claude Code, Codex CLI, Gemini CLI에서 입증되었으나, 테스트되지 않은 런타임은 현재 명세가 예상하지 못한 호환성 문제를 드러낼 수 있음."),

    h2("8.3", "향후 연구"),
    p("본 연구에서 여러 향후 연구 방향이 도출됨:"),

    bulletRuns([{ text: "자동 런타임 매핑 생성. ", bold: true }, "현재 Gateway의 runtime-mapping.yaml은 각 대상 런타임에 대해 수동으로 작성되어야 함. 런타임의 사용 가능한 도구와 모델을 분석한 후 호환 가능한 매핑을 생성하는 자동화 시스템이 플러그인의 런타임 간 이식에 필요한 노력을 크게 줄일 것임."]),

    bulletRuns([{ text: "표준화 기구 제안. ", bold: true }, "DMAP의 명세\u2014에이전트 패키지 구조, 스킬 유형, Gateway 형식, 네임스페이스 규약\u2014는 선언형 에이전트 정의를 위한 산업 표준의 기반이 될 수 있음. 관련 기구(예: ACM 또는 IEEE 내 워킹 그룹)에 이 표준을 제안하면 생태계 전반의 채택을 촉진할 수 있음."]),

    bulletRuns([{ text: "벤치마크 구축. ", bold: true }, "멀티에이전트 플러그인 아키텍처 평가를 위한 표준화된 벤치마크 스위트 개발은 더 엄격한 비교를 가능하게 할 것임. 이러한 벤치마크는 기능적 정확성뿐만 아니라 토큰 효율, 이식성 비용, 설계자 인지 부하도 측정해야 함."]),

    bulletRuns([{ text: "비개발자 대상 사용자 연구. ", bold: true }, "도메인 전문가(교육자, 비즈니스 분석가, 프로젝트 관리자)가 DMAP 대 코드 기반 프레임워크를 사용하여 에이전트 시스템을 정의하려 시도하는 실증 연구는 접근성 주장에 대한 더 강력한 근거를 제공할 것임."]),

    bulletRuns([{ text: "선언형 명세의 형식 검증. ", bold: true }, "DMAP의 구조화된 마크다운 및 YAML 명세가 교착 상태 자유(순환 위임 없음), 완전성(모든 선언된 핸드오프가 유효한 대상을 가짐), 일관성(MUST/MUST NOT 모순 없음) 등의 속성에 대해 형식적으로 검증될 수 있는지 탐구하는 것은 형식 방법론과 AI 에이전트 시스템의 흥미로운 교차점을 대표함."]),

    pageBreak(),
  ];
}

function conclusionSection() {
  return [
    h1("9", "결론"),

    p("본 논문은 마크다운과 YAML의 선언형 명세를 통해 Clean Architecture 원칙을 LLM 에이전트 시스템에 적용하는 것의 실현 가능성과 이점을 입증하는 런타임 중립적 플러그인 아키텍처인 DMAP(Declarative Multi-Agent Plugin)을 제시함."),

    p("네 가지 기여는 기존 멀티에이전트 프레임워크의 근본적 한계를 해결함:"),

    bulletRuns([{ text: "기여 1 (선언형 명세): ", bold: true }, "에이전트 패키지 표준(AGENT.md + agentcard.yaml + tools.yaml)이 표현력을 유지하면서 코드 종속성을 제거함. 경계 원칙\u2014마크다운의 WHY+HOW, YAML의 WHO+WHAT+WHEN\u2014은 정보 중복을 방지하고 각 파일이 단일하고 명확한 목적을 가지도록 보장함. 이는 비개발자가 에이전트 시스템 설계에 처음으로 참여할 수 있게 함."]),

    bulletRuns([{ text: "기여 2 (5계층 아키텍처): ", bold: true }, "이중 실행 경로를 갖춘 계층형 아키텍처는 Loosely Coupling, High Cohesion, Dependency Inversion, YAGNI 원칙을 적용하여 엄격한 관심사 분리를 달성함. 위임 경로(Skills \u2192 Agents \u2192 Gateway)는 LLM 추론 작업을 처리하고, 직결 경로(Skills \u2192 Gateway)는 불필요한 에이전트 오버헤드 없이 절차적 작업을 처리함. Hook은 오케스트레이션 플러그인에 대해서만 AOP 스타일 횡단 역량을 제공함."]),

    bulletRuns([{ text: "기여 3 (4-Tier 모델과 런타임 이식성): ", bold: true }, "Gateway의 runtime-mapping.yaml을 갖춘 추상 티어 시스템(HEAVY/HIGH/MEDIUM/LOW)은 O(1) 이식성 비용을 달성함\u2014대상 런타임 변경 시 시스템 규모에 관계없이 정확히 하나의 파일만 수정하면 됨. 이는 코드 기반 프레임워크의 O(N) 비용과 극명하게 대조됨."]),

    bulletRuns([{ text: "기여 4 (실증적 검증): ", bold: true }, "운영 배포된 두 플러그인이 서로 다른 규모에서 아키텍처를 검증함: OMC(39개 스킬, 35개 에이전트, 4-Tier 분포, Hook)는 대규모 오케스트레이션 역량을 입증하고, Abra(8개 스킬, 5개 에이전트, Hook 미사용)는 집중된 도메인 적용 가능성을 입증함. 둘 다 전적으로 마크다운과 YAML로 정의됨."]),

    p("성문화된 규칙 체계\u20148개의 MUST 규칙과 6개의 MUST NOT 규칙\u2014는 모든 DMAP 준수 플러그인에 걸쳐 아키텍처 속성을 보존하는 강제 가능한 계약을 제공함. 이 규칙들은 자의적 제약이 아니라 아키텍처 원칙의 직접적 결과임: 각 규칙은 특정 소프트웨어 공학 원칙(Dependency Inversion, 관심사 분리, YAGNI)과 구체적 아키텍처 이점(이식성, 유지보수성, 확장성)에 추적됨."),

    p("본 연구의 더 넓은 함의는 특정 DMAP 명세를 넘어 확장됨. 전통적 소프트웨어 시스템을 위해 수십 년간 개발된 검증된 소프트웨어 공학 원칙이 근본적으로 다른 도메인인 AI 에이전트 오케스트레이션에 생산적으로 이식될 수 있음을 입증함. 핵심 통찰은 명령형에서 선언형 명세로의 전환이 아키텍처 규율의 포기를 요구하지 않으며, 오히려 검증된 원칙이 새로운 매체에서 어떻게 발현되는지 재구상할 것을 요구한다는 것임. Dependency Inversion이 전통적으로 인터페이스와 추상 클래스를 통해 작동하는 곳에서, DMAP에서는 추상 티어 선언과 YAML 매핑을 통해 작동함. 관심사 분리가 전통적으로 코드 모듈을 나누는 곳에서, DMAP에서는 마크다운 파일(프롬프트)을 YAML 파일(메타데이터)로부터, Gateway 구성(인프라)으로부터 나눔."),

    p("LLM 에이전트 시스템이 복잡성과 배포 범위에서 계속 성장함에 따라, DMAP이 구현하는 아키텍처 규율은 점점 더 필수적이 될 것임. 임시적이고 코드에 결합된 에이전트 정의의 시대는 실용적 한계에 접근하고 있으며, 선언형의 원칙에 기반한 아키텍처가 확장 가능하고 이식 가능하며 접근 가능한 멀티에이전트 시스템을 향한 지속 가능한 경로를 대표함."),

    pageBreak(),
  ];
}

function referencesSection() {
  const refs = [
    "[1] Wu, Q., Bansal, G., Zhang, J., Wu, Y., Li, B., Zhu, E., Jiang, L., Zhang, X., Zhang, S., Liu, J., Awadallah, A.H., White, R.W., Burger, D., & Wang, C. (2023). AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation. arXiv preprint arXiv:2308.08155.",
    "[2] Moura, J. (2024). CrewAI: Framework for orchestrating role-playing autonomous AI agents. GitHub repository. https://github.com/joaomdmoura/crewAI",
    "[3] LangChain Team. (2024). LangGraph: Building language agents as graphs. LangChain Documentation. https://python.langchain.com/docs/langgraph",
    "[4] Hong, S., Zhuge, M., Chen, J., Zheng, X., Cheng, Y., Zhang, C., Wang, J., Wang, Z., Yau, S.K.S., Lin, Z., Zhou, L., Ran, C., Xiao, L., Wu, C., & Schmidhuber, J. (2023). MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework. arXiv preprint arXiv:2308.00352.",
    "[5] Qian, C., Cong, X., Yang, C., Chen, W., Su, Y., Xu, J., Liu, Z., & Sun, M. (2023). Communicative Agents for Software Development. arXiv preprint arXiv:2307.07924.",
    "[6] Martin, R.C. (2017). Clean Architecture: A Craftsman\u2019s Guide to Software Structure and Design. Prentice Hall.",
    "[7] Chase, H. (2022). LangChain: Building applications with LLMs through composability. GitHub repository. https://github.com/langchain-ai/langchain",
    "[8] Beck, K. (2004). Extreme Programming Explained: Embrace Change (2nd ed.). Addison-Wesley.",
    "[9] Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). Design Patterns: Elements of Reusable Object-Oriented Software. Addison-Wesley.",
    "[10] Fowler, M. (2002). Patterns of Enterprise Application Architecture. Addison-Wesley.",
    "[11] Martin, R.C. (2003). Agile Software Development, Principles, Patterns, and Practices. Prentice Hall.",
    "[12] Xi, Z., Chen, W., Guo, X., He, W., Ding, Y., Hong, B., Zhang, M., Wang, J., Jin, S., Zhou, E., Zheng, R., Fan, X., Wang, X., Xiong, L., Zhou, Y., Wang, W., Jiang, C., Zou, Y., Liu, X., Yin, Z., Dou, S., Weng, R., Cheng, W., Zhang, Q., Qin, W., Zheng, Y., Qiu, X., Huang, X., & Gui, T. (2023). The Rise and Potential of Large Language Model Based Agents: A Survey. arXiv preprint arXiv:2309.07864.",
    "[13] Wang, L., Ma, C., Feng, X., Zhang, Z., Yang, H., Zhang, J., Chen, Z., Tang, J., Chen, X., Lin, Y., Zhao, W.X., Wei, Z., & Wen, J. (2024). A Survey on Large Language Model based Autonomous Agents. Frontiers of Computer Science, 18(6), 186345.",
    "[14] Anthropic. (2024). Claude Code: An agentic coding tool. Anthropic Documentation. https://docs.anthropic.com/en/docs/claude-code",
    "[15] Kiczales, G., Lamping, J., Mendhekar, A., Maeda, C., Lopes, C., Loingtier, J.M., & Irwin, J. (1997). Aspect-Oriented Programming. In Proceedings of ECOOP\u201997, Springer LNCS 1241, pp. 220\u2013242.",
    "[16] OpenAI. (2025). Codex CLI: An open-source coding agent. GitHub repository. https://github.com/openai/codex",
    "[17] Google. (2025). Gemini CLI: AI-powered command line tool. Google Developers. https://developers.google.com/gemini/cli",
    "[18] Parnas, D.L. (1972). On the Criteria to Be Used in Decomposing Systems into Modules. Communications of the ACM, 15(12), 1053\u20131058.",
    "[19] Shaw, M. & Garlan, D. (1996). Software Architecture: Perspectives on an Emerging Discipline. Prentice Hall.",
    "[20] Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. In Proceedings of ICLR 2023.",
    "[21] Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. In Proceedings of NeurIPS 2022.",
    "[22] Schick, T., Dwivedi-Yu, J., Dessi, R., Raileanu, R., Lomeli, M., Hambro, E., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2024). Toolformer: Language Models Can Teach Themselves to Use Tools. In Proceedings of NeurIPS 2023.",
    "[23] Park, J.S., O\u2019Brien, J.C., Cai, C.J., Morris, M.R., Liang, P., & Bernstein, M.S. (2023). Generative Agents: Interactive Simulacra of Human Behavior. In Proceedings of UIST 2023.",
  ];

  const children = [
    h1("10", "참고문헌"),
    emptyLine(),
  ];

  refs.forEach((ref) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: ref, font: FONT, size: PT(10) })],
      spacing: { after: 100, line: 260 },
      indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.4) },
      alignment: AlignmentType.LEFT,
    }));
  });

  return children;
}

// ─── DOCUMENT ASSEMBLY ───────────────────────────────────────────────────────

async function main() {
  console.log("DMAP 학술 논문 생성 중...");

  const sections = [
    ...titleSection(),
    ...abstractSection(),
    ...introductionSection(),
    ...relatedWorkSection(),
    ...architectureSection(),
    ...designPrinciplesSection(),
    ...implementationSection(),
    ...caseStudySection(),
    ...evaluationSection(),
    ...discussionSection(),
    ...conclusionSection(),
    ...referencesSection(),
  ];

  const doc = new Document({
    creator: "유니콘주식회사 연구팀",
    title: "선언형 멀티에이전트 오케스트레이션: 마크다운과 YAML을 통한 Clean Architecture 원칙의 LLM 에이전트 시스템 적용",
    description: "DMAP 학술 논문",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        heading1: {
          run: { font: FONT, size: H1_SIZE, bold: true },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading2: {
          run: { font: FONT, size: H2_SIZE, bold: true },
          paragraph: { spacing: { before: 280, after: 160 } },
        },
        heading3: {
          run: { font: FONT, size: H3_SIZE, bold: true, italics: true },
          paragraph: { spacing: { before: 200, after: 120 } },
        },
      },
      paragraphStyles: [
        {
          id: "TOCHeading",
          name: "TOC Heading",
          basedOn: "Normal",
          next: "Normal",
          run: { font: FONT, size: H1_SIZE, bold: true },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
            { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) } } } },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: INCH,
              right: INCH,
              bottom: INCH,
              left: INCH,
            },
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "선언형 멀티에이전트 오케스트레이션", font: FONT, size: PT(9), italics: true, color: "888888" }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "", font: FONT, size: PT(9), color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: PT(9), color: "888888" }),
                  new TextRun({ text: " / ", font: FONT, size: PT(9), color: "888888" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: PT(9), color: "888888" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, "DMAP-paper.docx");
  fs.writeFileSync(outPath, buffer);
  const stats = fs.statSync(outPath);
  console.log(`논문 생성 완료: ${outPath}`);
  console.log(`파일 크기: ${(stats.size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("생성 실패:", err);
  process.exit(1);
});
