# REOWN API 명세

> 상태: 작성 중 — 회원가입·로그인 API 작성 완료
> 기준 경로: `/api/v1`

이 문서는 프론트엔드와 백엔드가 같은 요청 형식과 응답 형식을 사용하기 위한 약속이다.

---

## 1. 공통 규칙

### 1.1 요청과 응답 형식

- 요청과 응답은 JSON을 사용한다.
- 요청 헤더에 `Content-Type: application/json`을 사용한다.
- 인증이 필요한 API는 `Authorization` 헤더에 JWT를 보낸다.

```http
Authorization: Bearer <access-token>
```

### 1.2 성공 응답

```json
{
  "success": true,
  "data": {}
}
```

### 1.3 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 보여줄 오류 메시지"
  }
}
```

- `code`는 프론트엔드가 오류 종류를 구분할 때 사용한다.
- `message`는 사용자가 이해할 수 있는 한글 문장으로 작성한다.
- 비밀번호, 비밀번호 해시, JWT 비밀키 같은 정보는 응답에 포함하지 않는다.

---

## 2. 회원가입

새로운 사용자 계정을 만든다.

```http
POST /api/v1/auth/signup
```

인증은 필요하지 않다.

### 2.1 요청 Body

```json
{
  "email": "student@example.com",
  "password": "password123!",
  "nickname": "리오너"
}
```

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `email` | string | O | 이메일 형식, 최대 255자 |
| `password` | string | O | 8자 이상 20자 이하 |
| `nickname` | string | O | 한글·영문·숫자만 사용, 2자 이상 20자 이하 |

처리 규칙:

1. 이메일 앞뒤 공백을 제거하고 소문자로 바꾼다.
2. 이메일과 닉네임의 중복을 확인한다.
3. 비밀번호를 bcrypt로 해시한 뒤 저장한다.
4. 가입 직후 지역은 설정하지 않은 상태(`regionId: null`)로 둔다.
5. 회원 생성에 성공하면 JWT Access Token을 발급한다.

### 2.2 성공 응답

**상태 코드: `201 Created`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "student@example.com",
      "nickname": "리오너",
      "regionId": null
    }
  }
}
```

### 2.3 실패 응답

#### 요청값이 올바르지 않음

**상태 코드: `400 Bad Request`**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요."
  }
}
```

다음과 같은 경우에 반환한다.

- 필수값이 없음
- 이메일 형식이 올바르지 않음
- 비밀번호 길이가 규칙에 맞지 않음
- 닉네임에 허용되지 않은 문자가 포함됨

#### 이미 사용 중인 이메일

**상태 코드: `409 Conflict`**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "이미 사용 중인 이메일입니다."
  }
}
```

#### 이미 사용 중인 닉네임

**상태 코드: `409 Conflict`**

```json
{
  "success": false,
  "error": {
    "code": "NICKNAME_ALREADY_EXISTS",
    "message": "이미 사용 중인 닉네임입니다."
  }
}
```

---

## 3. 로그인

이메일과 비밀번호를 확인하고 JWT Access Token을 발급한다.

```http
POST /api/v1/auth/login
```

인증은 필요하지 않다.

### 3.1 요청 Body

```json
{
  "email": "student@example.com",
  "password": "password123!"
}
```

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `email` | string | O | 가입할 때 사용한 이메일 |
| `password` | string | O | 가입할 때 사용한 비밀번호 |

처리 규칙:

1. 이메일 앞뒤 공백을 제거하고 소문자로 바꾼다.
2. 이메일로 사용자를 찾는다.
3. bcrypt를 사용하여 비밀번호를 비교한다.
4. 정보가 일치하면 JWT Access Token을 발급한다.
5. 이메일이 없거나 비밀번호가 틀려도 같은 오류를 반환한다.

### 3.2 성공 응답

**상태 코드: `200 OK`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "student@example.com",
      "nickname": "리오너",
      "regionId": 123
    }
  }
}
```

### 3.3 실패 응답

#### 요청값이 올바르지 않음

**상태 코드: `400 Bad Request`**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "이메일과 비밀번호를 입력해 주세요."
  }
}
```

#### 이메일 또는 비밀번호가 일치하지 않음

**상태 코드: `401 Unauthorized`**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
  }
}
```

이메일이 존재하는지 외부에 알려주지 않기 위해 이메일 오류와 비밀번호 오류를 구분하지 않는다.

---

## 4. JWT 사용 방법

로그인 이후 인증이 필요한 API를 호출할 때 발급받은 토큰을 헤더에 넣는다.

```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

JWT에는 최소한 사용자 ID를 넣는다.

```json
{
  "userId": 1
}
```

### 4.1 JWT 만료 시간

- Access Token의 만료 시간은 **발급 시점부터 2시간**으로 한다.
- 백엔드는 환경변수 `JWT_EXPIRES_IN=2h`를 사용하여 만료 시간을 관리한다.
- 만료된 토큰은 사용할 수 없으며, 사용자는 다시 로그인해야 한다.
- REOWN은 Refresh Token을 사용하지 않으므로 Access Token을 자동으로 갱신하지 않는다.
- 프론트엔드는 `401 Unauthorized` 응답을 받으면 저장된 토큰을 삭제하고 로그인 화면으로 이동한다.

JWT에는 비밀번호나 이메일 같은 개인정보를 넣지 않는다. 현재는 사용자 ID만 넣는다.

### 4.2 인증 실패 응답

토큰이 없거나 올바르지 않거나 만료된 경우 다음 응답을 반환한다.

**상태 코드: `401 Unauthorized`**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다."
  }
}
```

---

## 5. 로그아웃

REOWN은 Refresh Token을 사용하지 않는다. 따라서 별도의 로그아웃 API를 만들지 않는다.

로그아웃할 때 프론트엔드가 보관 중인 Access Token을 삭제한다.

### 5.1 프론트엔드 토큰 보관 규칙

- Access Token은 브라우저의 `sessionStorage`에 저장한다.
- 저장할 때 사용하는 키 이름은 `accessToken`으로 통일한다.
- 로그인 성공 시 토큰을 저장하고, 로그아웃하거나 인증에 실패하면 삭제한다.
- 브라우저 탭을 닫으면 `sessionStorage`의 토큰도 사라지므로 다시 로그인해야 한다.
- 토큰을 URL, 화면, 콘솔 로그에 출력하지 않는다.
- API를 호출할 때 저장된 토큰을 읽어 `Authorization` 헤더에 넣는다.

```javascript
sessionStorage.setItem('accessToken', accessToken)

const token = sessionStorage.getItem('accessToken')

sessionStorage.removeItem('accessToken')
```

---

## 6. CORS 규칙

CORS는 허용된 프론트엔드 주소에서만 백엔드 API를 호출할 수 있게 하는 설정이다.

### 6.1 허용 주소

- 개발 환경에서는 Vite 기본 주소인 `http://localhost:5173`을 허용한다.
- 배포 환경에서는 실제 프론트엔드 주소 한 개만 허용한다.
- 허용 주소는 백엔드 환경변수 `FRONTEND_URL`로 관리한다.
- 모든 주소를 허용하는 `*`는 사용하지 않는다.
- 주소가 여러 개 필요하면 코드에 직접 추가하지 않고 환경변수에 쉼표로 구분하여 작성한다.

```env
# 개발 환경
FRONTEND_URL=http://localhost:5173

# 주소가 여러 개인 경우
FRONTEND_URL=http://localhost:5173,https://reown.example.com
```

주소를 비교할 때는 프로토콜과 포트까지 정확히 확인한다. 예를 들어 `http://localhost:5173`과 `http://localhost:3000`은 서로 다른 주소다.

### 6.2 허용 항목

| 항목 | 허용값 |
|---|---|
| HTTP 메서드 | `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS` |
| 요청 헤더 | `Content-Type`, `Authorization` |
| 쿠키 전송 | 사용하지 않음 |

REOWN은 JWT를 쿠키가 아니라 `Authorization` 헤더로 보내므로 CORS의 `credentials` 옵션은 `false`로 설정한다.

허용되지 않은 주소의 요청은 브라우저에서 차단한다. CORS 오류에는 DB 정보나 서버 내부 정보를 포함하지 않는다.

---

## 7. 서버 오류

예상하지 못한 서버 또는 DB 오류가 발생한 경우 다음 응답을 반환한다.

**상태 코드: `500 Internal Server Error`**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "서버 오류가 발생했습니다."
  }
}
```

DB 오류 내용, SQL 문장, 환경변수, 오류 스택은 사용자에게 반환하지 않는다.

---

## 8. 인증·CORS 설정 요약

| 항목 | 규칙 |
|---|---|
| JWT 만료 시간 | 발급 후 2시간 (`JWT_EXPIRES_IN=2h`) |
| 토큰 저장 위치 | 브라우저 `sessionStorage` |
| 토큰 저장 키 | `accessToken` |
| 개발 CORS 주소 | `http://localhost:5173` |
| 배포 CORS 주소 | 실제 프론트엔드 주소만 허용 |
| CORS 환경변수 | `FRONTEND_URL` |
| 쿠키·CORS credentials | 사용하지 않음 |
