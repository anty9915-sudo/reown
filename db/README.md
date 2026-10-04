# REOWN DB

REOWN의 실제 DB 작업 파일(마이그레이션, 초기 데이터, ERD)을 관리하는 폴더입니다.
설계 문서와 정책은 [`docs/DATABASE.md`](../docs/DATABASE.md)를 기준으로 합니다.
DBeaver 접속 방법은 [`docs/DB_CONNECTION.md`](../docs/DB_CONNECTION.md)를 참고합니다.

```text
db/
├── migrations/                 # DB 구조 생성·변경 SQL
│   └── 001_initial_schema.sql
├── seeds/                      # 초기 데이터 SQL
│   ├── 001_regions.sql         # 법정동 지역 (생성기로 만든다 — 아직 생성 전)
│   ├── 002_categories.sql      # 상품 카테고리 16개
│   └── build_regions_seed.mjs  # 법정동 원본 파일 → 001_regions.sql 생성기
├── erd/                        # DB 관계 구조도
│   ├── REOWN-ERD.mmd           # ERD 원본 (Mermaid, 실제 DB 카탈로그에서 자동 생성)
│   ├── REOWN-ERD.png           # ERD 이미지
│   └── mermaid.config.json     # PNG 렌더링 설정
└── README.md
```

## 현재 상태

| 항목 | 상태 |
|---|---|
| `001_initial_schema.sql` | Supabase 적용 완료 (2026-10-04, SHA-256 `0c85efc4…`). 테이블 16개, RLS 16개 ON, 정책 0개 |
| `001_regions.sql` | 아직 없음. 법정동 원본 파일을 받은 뒤 생성기로 만든다 |
| `002_categories.sql` | 작성 완료, Supabase 미적용 |

## DB 관리 원칙

| 항목 | 원칙 |
|---|---|
| Supabase 프로젝트 관리자 | **DB 관리자 1명**이 단독으로 관리합니다. 팀원에게 Supabase 관리자(대시보드) 권한을 공유하지 않습니다. |
| 팀원의 기준 | 팀원은 Supabase 대시보드에 접근하거나 DB 구조를 임의로 변경하지 않고, GitHub의 이 폴더와 `docs/DATABASE.md`를 기준으로 개발합니다. |
| 스키마 변경 | DB 관리자가 검토·승인한 경우에만 진행합니다. |
| migration | `db/migrations/`에서 버전 관리합니다. |
| seed | `db/seeds/`에서 관리합니다. |
| ERD | `db/erd/`에서 관리합니다. |
| Supabase 실행 | migration·seed를 Supabase에 실행하는 것은 DB 관리자만 합니다. |
| DB 조회 | DBeaver로 조회만 합니다. 연결 방법은 [`docs/DB_CONNECTION.md`](../docs/DB_CONNECTION.md)를 참고합니다. |
| 민감정보 | Supabase 비밀번호, `DATABASE_URL`, Service Role Key는 GitHub에 절대 커밋하지 않습니다. |

## DB 변경 요청 절차

팀원이 DB 구조(테이블, 컬럼, 제약조건, 인덱스 등) 변경이 필요하면 아래 순서를 따릅니다.

```text
1. 요청      팀원 → DB 관리자 (GitHub Issue 등)
             변경 이유 / 변경 대상 / 변경 내용 / 영향받는 기능·API / 예상되는 문제 (CLAUDE.md 15장)
2. 검토·승인  DB 관리자
3. migration  승인된 내용만 새 번호의 파일로 작성 (예: 002_….sql) → Pull Request
4. 검증·적용  DB 관리자가 로컬(PGlite)에서 검증한 뒤 Supabase에 적용
5. 문서 갱신  docs/DATABASE.md, db/erd/ 를 실제 구조와 맞춤
```

승인 전에는 migration 파일을 Supabase에 실행하지 않습니다.

## 작업 규칙

1. **Supabase 실행은 DB 관리자의 승인 후 DB 관리자만** 합니다. 실행 전에 로컬(PGlite)에서 먼저 검증합니다. (SQL 파일 머리말의 "팀 승인"은 DB 관리자의 승인을 뜻합니다.)
2. **이미 적용한 마이그레이션 파일은 수정하지 않습니다.** 구조를 바꿀 때는 `002_…sql`처럼 새 번호의 파일을 추가합니다.
3. 마이그레이션과 seed는 하나의 트랜잭션(`BEGIN … COMMIT`)으로 작성합니다. 중간에 실패하면 전부 롤백됩니다.
4. seed는 여러 번 실행해도 중복되지 않게 `ON CONFLICT … DO NOTHING`을 사용합니다.
5. 실행 후에는 읽기 전용 쿼리로 결과를 확인합니다.
6. DB 접속 정보(`DATABASE_URL` 등)는 루트 `.env`에만 둡니다. Git에는 값이 비어 있는 `.env.example`만 올립니다.

## 실행 순서 (새 DB 기준)

```text
migrations/001_initial_schema.sql
  → seeds/001_regions.sql
  → seeds/002_categories.sql
```

regions와 categories는 서로 참조하지 않으므로 seed 순서는 바꿔도 됩니다.

## 지역 seed 만들기 (D7)

원본: 행정안전부 법정동 코드. 아래 두 형식 중 하나를 받아 사용합니다.

- 공공데이터포털 "행정안전부_법정동코드" CSV
- 행정표준코드관리시스템 "법정동코드 전체자료" TXT

```bash
node db/seeds/build_regions_seed.mjs <원본 파일 경로>
```

- 현재 존재하는 **읍·면·동 단위** 코드만 `db/seeds/001_regions.sql`로 만듭니다(시·도, 시·군·구, 리 행과 폐지 코드 제외).
- 생성기는 DB에 연결하지 않습니다. 원본 파일의 해시와 행 수가 SQL 파일 머리말에 기록됩니다.
- 생성된 SQL은 직접 고치지 말고, 원본이 바뀌면 생성기를 다시 실행합니다.

## ERD 갱신

ERD는 손으로 그리지 않고 **실제 마이그레이션을 적용한 DB의 카탈로그에서 생성**합니다. 구조가 바뀌면 `REOWN-ERD.mmd`를 다시 생성한 뒤 PNG를 렌더링합니다.

PNG 렌더링 예시 (mermaid-cli 사용):

```bash
npx -p @mermaid-js/mermaid-cli mmdc -i db/erd/REOWN-ERD.mmd -o db/erd/REOWN-ERD.png -c db/erd/mermaid.config.json -b white -s 2
```
