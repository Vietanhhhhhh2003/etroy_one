# eTroy OIDC API Testing Guideline

## 1. Scope

Tài liệu này hướng dẫn kiểm thử thủ công các API của `eTroy_OIDC` bằng `eTroy_API_Explorer`.

Phạm vi test gồm:

- Identity: register, login, invalid credential handling.
- Email verification and password reset.
- OIDC authorization code + PKCE flow.
- Token exchange, refresh token rotation, introspection, revocation.
- Session, SSO, logout, CSRF behavior.
- Admin user and admin client management.
- System endpoints: health, readiness, metrics, correlation, JWKS.

API Explorer hiện có 87 test cases tương ứng với API test report.

## 2. Prerequisites

Backend phải đang chạy trước khi test:

```text
http://localhost:3000
```

Kiểm tra nhanh:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
```

API Explorer chạy bằng:

```powershell
cd D:\eTroy_API_Explorer
npm run dev
```

Mở URL Vite hiển thị, thường là:

```text
http://127.0.0.1:5173/
```

## 3. Environment Setup

Trong API Explorer, kiểm tra `Base URL`:

```text
http://localhost:3000
```

Các biến thường dùng:

| Field | Purpose |
| --- | --- |
| `Admin Sub` | Header `x-admin-sub` cho admin APIs. Mặc định: `admin-123`. |
| `Client ID` | OIDC client hợp lệ. Mặc định: `etroy-web`. |
| `Redirect URI` | Redirect URI đã đăng ký cho client. |
| `Post Logout Redirect URI` | Redirect URI dùng cho logout flow. |
| `User Email` / `User Password` | Tài khoản test chính. |
| `Subject` | `sub` của user sau khi tạo user. |
| `Authorization Code` | Code lấy từ authorization redirect. |
| `Access Token` | JWT access token lấy từ `/token`. |
| `ID Token` | ID token lấy từ `/token`. |
| `Refresh Token` | Refresh token lấy từ `/token`. |
| `CSRF Token` | CSRF token dùng cho logout khi có session active. |

Sau khi một API trả về dữ liệu mới, copy giá trị cần thiết vào Environment trước khi chạy case tiếp theo.

## 4. Recommended Test Order

Chạy theo thứ tự dưới đây để giảm lỗi do thiếu dữ liệu phụ thuộc:

1. System smoke test: `GET /health`, `GET /ready`, `GET /jwks`.
2. Register user: `POST /register`.
3. Login user: `POST /login`.
4. Admin user setup: tạo hoặc lấy user admin view để có `sub`.
5. Admin client setup: tạo client nếu cần client mới, lưu `clientId` và secret nếu backend trả về.
6. Authorization flow: chạy `GET /authorize`, lấy `interaction_id` hoặc authorization code từ redirect tùy trạng thái flow.
7. Token exchange: `POST /token` với `authorization_code`.
8. UserInfo: `GET /userinfo` bằng access token.
9. Refresh lifecycle: refresh, reuse, invalid, mismatch, introspect, revoke.
10. Session/logout: login để tạo cookie, sau đó test SSO và logout.
11. Negative/security cases: duplicate email, wrong password, invalid redirect URI, invalid client, forbidden admin mutations.

## 5. Pass Criteria

Một test case được coi là pass khi:

- Status code đúng hoặc nằm trong khoảng được acceptance criteria cho phép.
- Response body không chứa secret hoặc internal implementation detail.
- Error response là controlled error, ví dụ:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "..."
  }
}
```

- Không lộ các field nhạy cảm:
  - `password`
  - `password_hash`
  - `passwordHash`
  - raw verification token
  - token hash
  - client secret hash
  - stack trace
  - MongoDB/Mongoose internal error detail

## 6. Fail Criteria

Đánh dấu fail nếu có bất kỳ dấu hiệu nào sau:

- Backend trả `500` cho input sai mà đáng lẽ phải là `400`, `401`, `403`, `404`, hoặc `409`.
- Response có stack trace, database error, model/schema internals.
- Login error phân biệt rõ email không tồn tại và sai password.
- Duplicate email làm lộ MongoDB/Mongoose duplicate key detail.
- User/admin/client response lộ password hash hoặc secret hash.
- Reused refresh token vẫn tạo token mới.
- Revoked refresh token vẫn dùng được.
- Invalid redirect URI được chấp nhận.
- SSO bỏ qua validation client hoặc redirect URI.
- Logout active session không kiểm tra CSRF khi CSRF required.

## 7. Notes Per API Area

### Register and Login

`POST /register` phải trả user profile an toàn. Không được trả password hoặc hash.

`POST /login` chỉ xác thực identity. Auth layer không được phát token hoặc session trong các case login identity cơ bản. Với backend hiện tại, `/login` cũng có thể set cookie phục vụ session flow; response body vẫn phải sanitized.

### Verification and Password Reset

Request endpoints chỉ được trả response an toàn. Không trả raw token hoặc token hash trong response API.

Confirm endpoints yêu cầu token hợp lệ. Reused hoặc expired token phải bị reject bằng controlled error.

### Authorization and Token

Authorization request hợp lệ cần có:

- `response_type=code`
- `client_id`
- `redirect_uri`
- `scope`
- `state`
- `nonce`
- `code_challenge`
- `code_challenge_method=S256`

Token exchange dùng `application/x-www-form-urlencoded`.

Refresh token phải rotate. Token cũ sau rotation không được dùng lại.

### UserInfo

`GET /userinfo` yêu cầu:

```http
Authorization: Bearer <access_token>
```

Invalid JWT hoặc missing authorization phải bị reject an toàn.

### Admin APIs

Admin APIs dùng header:

```http
x-admin-sub: admin-123
```

Chỉ các field được phép mới được mutate. Forbidden fields phải bị reject.

### Logout and Session

Các case session cần browser giữ cookie, vì vậy API Explorer gửi request với `credentials: include`.

Logout active session cần CSRF token hợp lệ qua header hoặc body:

```http
x-oidc-csrf-token: <csrf_token>
```

hoặc:

```json
{
  "csrf_token": "<csrf_token>"
}
```

## 8. Recording Results

Khi ghi nhận kết quả, dùng format:

| No. | Case | Method / Path | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Create User | `POST /register` | 201 with safe user fields | Response omitted password/hash | Passed |

Với failed case, ghi thêm:

- Request body/query/header đã dùng.
- Status code thực tế.
- Response body thực tế.
- Dữ liệu test liên quan.
- Có tái hiện được sau khi reset browser local storage hay không.

## 9. Resetting Test State

Nếu API Explorer giữ dữ liệu cũ trong browser:

1. Mở DevTools.
2. Vào Application.
3. Xóa Local Storage của API Explorer.
4. Reload trang.

Storage key hiện dùng:

```text
etroy-api-explorer-state-v2
```

Nếu backend data bị bẩn do test nhiều lần, đổi email/client name trong Environment hoặc reset database test.
