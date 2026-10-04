// =====================================================================
// REOWN  build_regions_seed.mjs
// ---------------------------------------------------------------------
// 행정안전부 법정동 코드 원본 파일 → db/seeds/001_regions.sql 생성기 (D7)
//
// 사용법
//   node db/seeds/build_regions_seed.mjs <원본 파일> [출력 파일]
//   출력 파일 기본값: db/seeds/001_regions.sql
//
// 지원하는 원본 형식 (헤더로 자동 판별, 인코딩은 UTF-8 / EUC-KR 자동 판별)
//   A. 공공데이터포털 "행정안전부_법정동코드" CSV
//      헤더: 법정동코드, 시도명, 시군구명, 읍면동명, 리명, ..., 삭제일자, ...
//   B. 행정표준코드관리시스템 "법정동코드 전체자료" TXT (탭 구분)
//      헤더: 법정동코드, 법정동명, 폐지여부
//
// 변환 규칙 (docs/DATABASE.md 5.2)
//   * 현재 존재하는 코드만 (A: 삭제일자 없음 / B: 폐지여부 = 존재)
//   * 읍·면·동 단위만: 코드가 ^[0-9]{8}00$ 이고 읍면동 자리(6~8번째)가 000이 아님
//     → 시·도 / 시·군·구 행, 리 행은 제외
//   * 세종특별자치시처럼 시·군·구가 없으면 sigungu = NULL
//   * 컬럼 길이(sido 20, sigungu 30, eupmyeondong 30)를 넘거나 코드가 중복되면 생성을 중단한다
//
// 이 스크립트는 DB에 연결하지 않는다. SQL 파일만 만든다.
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

const [srcPath, outPath = 'db/seeds/001_regions.sql'] = process.argv.slice(2);
if (!srcPath) {
  console.error('사용법: node db/seeds/build_regions_seed.mjs <원본 파일> [출력 파일]');
  process.exit(1);
}

const BATCH_SIZE = 500;
const LIMITS = { sido: 20, sigungu: 30, eupmyeondong: 30 };

const fail = (msg) => { console.error('생성 중단: ' + msg); process.exit(1); };

// ---------------------------------------------------------------- 읽기 / 인코딩
const buf = readFileSync(srcPath);
const sha256 = createHash('sha256').update(buf).digest('hex');
let text = new TextDecoder('utf-8').decode(buf);
let encoding = 'UTF-8';
if (text.includes('�')) {
  text = new TextDecoder('euc-kr').decode(buf);
  encoding = 'EUC-KR';
}
text = text.replace(/^﻿/, '');

const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
if (lines.length < 2) fail('원본 파일에 데이터가 없습니다.');

const splitCsv = (line) => {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const isTab = lines[0].includes('\t');
const split = isTab ? (l) => l.split('\t').map((s) => s.trim()) : splitCsv;
const header = split(lines[0]);
const col = (name) => header.indexOf(name);

// ---------------------------------------------------------------- 형식 판별
let format;
if (col('법정동코드') >= 0 && col('시도명') >= 0 && col('읍면동명') >= 0) format = 'A';
else if (col('법정동코드') >= 0 && col('법정동명') >= 0 && col('폐지여부') >= 0) format = 'B';
else fail(`알 수 없는 헤더입니다: ${header.join(' | ')}`);

// ---------------------------------------------------------------- 변환
const rows = [];
const seen = new Set();
let total = 0, skippedDeleted = 0, skippedLevel = 0;

for (const line of lines.slice(1)) {
  const f = split(line);
  total++;
  const code = f[col('법정동코드')];
  if (!/^[0-9]{10}$/.test(code)) fail(`잘못된 법정동코드: "${code}" (줄: ${line})`);

  let sido, sigungu, eupmyeondong, alive;
  if (format === 'A') {
    alive = !(f[col('삭제일자')] ?? '').trim();
    sido = f[col('시도명')];
    sigungu = f[col('시군구명')] || null;
    eupmyeondong = f[col('읍면동명')];
    if (col('리명') >= 0 && f[col('리명')]) { skippedLevel++; continue; }
  } else {
    alive = f[col('폐지여부')] === '존재';
    const tokens = f[col('법정동명')].split(/\s+/).filter(Boolean);
    sido = tokens[0];
    eupmyeondong = tokens.length >= 2 ? tokens[tokens.length - 1] : '';
    sigungu = tokens.length >= 3 ? tokens.slice(1, -1).join(' ') : null;
  }

  if (!alive) { skippedDeleted++; continue; }
  // 읍·면·동 단위만: 리 자리 00, 읍면동 자리 000 아님
  if (!/^[0-9]{8}00$/.test(code) || code.slice(5, 8) === '000') { skippedLevel++; continue; }
  if (!eupmyeondong) { skippedLevel++; continue; }

  if (!sido) fail(`시·도 이름이 없습니다: ${code}`);
  for (const [k, v] of Object.entries({ sido, sigungu, eupmyeondong })) {
    if (v && [...v].length > LIMITS[k]) fail(`${k} 길이 초과(${[...v].length} > ${LIMITS[k]}): ${code} ${v}`);
  }
  if (seen.has(code)) fail(`코드 중복: ${code}`);
  seen.add(code);
  rows.push({ code, sido, sigungu, eupmyeondong });
}

if (rows.length === 0) fail('변환 결과가 0행입니다.');
rows.sort((a, b) => a.code.localeCompare(b.code));

// ---------------------------------------------------------------- SQL 생성
const lit = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const bySido = new Map();
for (const r of rows) bySido.set(r.sido, (bySido.get(r.sido) || 0) + 1);

const out = [];
out.push('-- =====================================================================');
out.push('-- REOWN seed  001_regions.sql  (자동 생성 — 직접 수정하지 말고 생성기를 다시 실행한다)');
out.push('-- ---------------------------------------------------------------------');
out.push('-- 대상     : public.regions (docs/DATABASE.md 5.2, D7)');
out.push('-- 생성기   : db/seeds/build_regions_seed.mjs');
out.push(`-- 원본     : ${basename(srcPath)} (형식 ${format}, ${encoding})`);
out.push(`-- 원본 SHA-256 : ${sha256}`);
out.push(`-- 원본 행 수   : ${total} / 폐지·삭제 제외 ${skippedDeleted} / 시도·시군구·리 단위 제외 ${skippedLevel}`);
out.push(`-- 생성 행 수   : ${rows.length} (읍·면·동 단위, 현재 존재하는 코드)`);
out.push('-- 시·도별      : ' + [...bySido].map(([k, v]) => `${k} ${v}`).join(', '));
out.push('-- 중복 방지    : ON CONFLICT (code) DO NOTHING — 여러 번 실행해도 안전');
out.push('-- 상태         : 검토용. 팀 승인 전에는 Supabase에 실행하지 않는다.');
out.push('-- =====================================================================');
out.push('');
out.push('BEGIN;');
out.push('');
out.push('DO $$');
out.push('BEGIN');
out.push("  IF to_regclass('public.regions') IS NULL THEN");
out.push("    RAISE EXCEPTION 'public.regions 테이블이 없습니다. 001_initial_schema.sql을 먼저 적용하세요.';");
out.push('  END IF;');
out.push('END');
out.push('$$;');
out.push('');
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  out.push(`-- ${i + 1} ~ ${i + batch.length}`);
  out.push('INSERT INTO public.regions (code, sido, sigungu, eupmyeondong) VALUES');
  out.push(batch.map((r) => `  (${lit(r.code)}, ${lit(r.sido)}, ${lit(r.sigungu)}, ${lit(r.eupmyeondong)})`).join(',\n'));
  out.push('ON CONFLICT (code) DO NOTHING;');
  out.push('');
}
out.push('DO $$');
out.push('DECLARE');
out.push('  v_count int;');
out.push('BEGIN');
out.push('  SELECT count(*) INTO v_count FROM public.regions;');
out.push(`  IF v_count < ${rows.length} THEN`);
out.push(`    RAISE EXCEPTION 'regions 행 수가 예상보다 적습니다: % < ${rows.length}', v_count;`);
out.push('  END IF;');
out.push("  RAISE NOTICE 'regions 행 수: %', v_count;");
out.push('END');
out.push('$$;');
out.push('');
out.push('COMMIT;');
out.push('');

writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`생성 완료: ${outPath}`);
console.log(`  원본 형식 ${format} / ${encoding} / 원본 ${total}행 → regions ${rows.length}행`);
console.log(`  제외: 폐지·삭제 ${skippedDeleted}, 시도·시군구·리 단위 ${skippedLevel}`);
console.log(`  시·도 ${bySido.size}개: ` + [...bySido].map(([k, v]) => `${k} ${v}`).join(', '));
