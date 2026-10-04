# REOWN DB 접속 안내 (DBeaver)

팀원이 DBeaver로 REOWN의 Supabase PostgreSQL에 접속해 **구조와 데이터를 조회**하기 위한 안내입니다.

- DB 구조와 데이터는 DBeaver에서 직접 수정하지 않습니다. 변경이 필요하면 [`db/README.md`](../db/README.md)의 "DB 변경 요청 절차"를 따릅니다.
- 이 문서에는 **실제 DB 비밀번호와 전체 `DATABASE_URL`을 적지 않습니다.** 접속 정보는 DB 관리자에게 비공개로 전달받습니다.
- 설계 기준은 [`docs/DATABASE.md`](DATABASE.md), 실제 SQL은 [`db/migrations/`](../db/migrations/)입니다. DB를 열어보지 않아도 개발할 수 있도록 GitHub의 파일을 기준으로 합니다.

---

## 1. 관리 원칙 요약

| 항목 | 원칙 |
|---|---|
| Supabase 프로젝트 관리자 | DB 관리자 1명. 팀원에게 Supabase 대시보드 권한을 공유하지 않습니다. |
| DB 구조 변경 | DB 관리자가 검토·승인한 경우에만 migration으로 반영합니다. |
| 기준 파일 | migration `db/migrations/`, seed `db/seeds/`, ERD `db/erd/` (GitHub에서 버전 관리) |
| DBeaver 사용 | 조회 전용. 연결 설정은 이 문서로만 공유합니다. |
| 민감정보 | DB 비밀번호, `DATABASE_URL`, Service Role Key는 GitHub·이슈·PR·채팅·스크린샷에 올리지 않습니다. |

---

## 2. 접속 정보

Supabase **Session pooler**로 접속합니다.

| 항목 | 값 |
|---|---|
| 데이터베이스 종류 | PostgreSQL |
| Host | `aws-0-ap-northeast-2.pooler.supabase.com` |
| Port | `5432` |
| Database | `postgres` |
| Username | `postgres.<project-ref>` — `<project-ref>`는 DB 관리자에게 전달받습니다 |
| Password | DB 관리자에게 비공개로 전달받습니다 (이 문서와 GitHub에 기록하지 않음) |
| SSL | 사용 (`require`) |

**Session pooler를 쓰는 이유**

- 직접 연결 주소(`db.<project-ref>.supabase.co`)는 IPv6 전용이라 IPv4 환경에서 접속되지 않습니다.
- Transaction pooler(포트 `6543`)는 세션 기능이 제한되므로 DBeaver와 백엔드 모두 Session pooler(포트 `5432`)를 사용합니다. (`docs/DATABASE.md` 4.2)

---

## 3. DBeaver 연결 방법

1. DBeaver에서 **Database > New Database Connection**을 선택합니다.
2. **PostgreSQL**을 선택하고 **Next**를 누릅니다.
3. **Main** 탭
   - Connect by: `Host`
   - Host: `aws-0-ap-northeast-2.pooler.supabase.com`
   - Port: `5432`
   - Database: `postgres`
   - Authentication: `Database Native`
   - Username: `postgres.<project-ref>`
   - Password: 전달받은 비밀번호 (비밀번호에 특수문자가 있어도 DBeaver에서는 URL 인코딩하지 않고 그대로 입력합니다)
4. **SSL** 탭 (Driver properties 옆, 또는 Connection settings > SSL)
   - `Use SSL` 체크
   - SSL mode: `require`
5. **Connection settings > General**
   - Connection name: `REOWN (Supabase, read-only)` 처럼 구분하기 쉽게 입력
   - Security: **`Read-only connection` 체크** (실수로 데이터를 바꾸지 않도록 반드시 켭니다)
6. **Test Connection**을 눌러 연결을 확인합니다. 처음이면 PostgreSQL 드라이버 다운로드 안내가 나옵니다.
7. **Finish**를 눌러 저장합니다.

### 연결 확인 쿼리 (읽기 전용)

```sql
SELECT current_database(), current_user;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

`public` 스키마에 테이블 16개(`users`, `products` 등, `docs/DATABASE.md` 3장)가 보이면 정상입니다.

---

## 4. 사용 규칙

| 해도 되는 것 | 하지 않는 것 |
|---|---|
| `SELECT`로 구조·데이터 조회 | `CREATE` / `ALTER` / `DROP` 등 구조 변경 |
| ERD·컬럼·제약조건 확인 | `INSERT` / `UPDATE` / `DELETE`로 데이터 직접 수정 |
| 개발 중 쿼리 동작 확인 (조회만) | DBeaver의 표 편집 기능으로 값 수정 |
| | seed·migration SQL을 Supabase에 직접 실행 |
| | 연결 설정 내보내기 파일, `.dbeaver/` 폴더를 Git에 올리기 |
| | 비밀번호를 이슈·PR·채팅·스크린샷에 노출 |

- 테스트 데이터가 필요하거나 데이터 수정이 필요하면 DB 관리자에게 요청합니다.
- 비밀번호가 노출되었다고 의심되면 즉시 DB 관리자에게 알립니다. DB 관리자가 비밀번호를 재설정합니다.

---

## 5. 백엔드 `.env` 설정

백엔드는 DBeaver와 같은 Session pooler 주소를 `DATABASE_URL`로 사용합니다.

```bash
cp .env.example .env
```

- `.env`에 실제 값을 넣습니다. 값은 DB 관리자에게 비공개로 전달받습니다.
- `.env`는 `.gitignore`로 Git 추적에서 제외되어 있습니다. GitHub에는 값이 비어 있는 `.env.example`만 올립니다.
- `DATABASE_URL` 형식과 각 변수의 용도는 `.env.example`의 주석을 참고합니다.
- `VITE_` 접두사를 붙이지 않습니다. 프론트엔드에는 어떤 Supabase 키도 넣지 않습니다.

---

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `Tenant or user not found` | Username이 `postgres`만 있고 `.<project-ref>`가 빠졌는지 확인 |
| `password authentication failed` | 비밀번호 오타. 비밀번호가 변경되었을 수 있으니 DB 관리자에게 확인 |
| SSL 관련 오류 | SSL 탭에서 `Use SSL` 체크, SSL mode `require` 확인 |
| 연결 시간 초과 | Host·Port 확인. 학교·회사 네트워크에서 5432 포트가 막혀 있을 수 있으니 다른 네트워크에서 시도 |
| `cannot execute ... in a read-only transaction` | Read-only 연결이 정상 동작하는 것입니다. 수정이 필요하면 DB 관리자에게 요청 |
