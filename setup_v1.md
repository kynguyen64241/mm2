# Kiến trúc web nhà cung cấp và Raspberry Pi khách hàng

Tài liệu này mô tả cách tổ chức hệ thống khi:

- website quản trị nằm ở server của nhà cung cấp
- mã nguồn MagicMirror chạy trên Raspberry Pi giao cho khách hàng
- khách hàng sửa giao diện và chức năng của gương từ website

Mục tiêu là giữ hướng đi phù hợp với repo hiện tại, dễ quản lý nhiều thiết bị, và vẫn an toàn khi triển khai ngoài Internet.

## 1. Tư duy tổng thể

Không nên để website gọi thẳng vào Raspberry Pi của khách hàng.

Lý do:

- Raspberry Pi thường nằm sau router/NAT, server ngoài Internet khó gọi vào trực tiếp
- IP của khách có thể thay đổi
- mở cổng từ Pi ra Internet sẽ tăng rủi ro bảo mật
- khó kiểm soát trạng thái online, version và rollback

Hướng đúng là:

```text
Trình duyệt khách hàng
        ->
Website + Backend của nhà cung cấp
        <->
Database trung tâm
        <->
Raspberry Pi agent trên thiết bị khách
        ->
MagicMirror local trên Pi
```

Điểm quan trọng:

- trình duyệt chỉ làm việc với server của nhà cung cấp
- Raspberry Pi chủ động kết nối ra ngoài để đồng bộ
- backend là trung gian duy nhất giữa web và thiết bị

## 2. Ba khối chính

### 2.1. Web và backend của nhà cung cấp

Server trung tâm nên có 2 phần:

- frontend web cho khách hàng đăng nhập và chỉnh giao diện
- backend API để lưu cấu hình, tạo job cập nhật và theo dõi trạng thái thiết bị

Backend chịu trách nhiệm:

- xác thực khách hàng
- quản lý nhiều thiết bị
- lưu version cấu hình
- phát hành job cập nhật
- lưu log đồng bộ
- cho phép rollback

### 2.2. Raspberry Pi agent

Trên mỗi Pi nên có thêm một tiến trình riêng, ví dụ:

```text
mirror-agent
```

Agent này không thay thế MagicMirror. Nó chỉ làm nhiệm vụ:

- đăng ký thiết bị với server
- gửi heartbeat
- kiểm tra job mới
- tải cấu hình hoặc bản cập nhật code
- backup local trước khi áp dụng
- báo kết quả ngược về server

Agent nên chạy bằng `systemd` hoặc `pm2`, tách riêng khỏi tiến trình MagicMirror.

### 2.3. MagicMirror trên Pi

Repo hiện tại vẫn tiếp tục chạy local trên Pi như bây giờ.

Các file quan trọng đang dùng:

- `config/config.vps.js`
- `config/profiles/*.json`
- `config/profiles/active.txt`
- `css/generated/*.css`
- `ops/pi/run-server.sh`
- `ops/pi/run-kiosk.sh`

Điều này rất phù hợp vì Pi chưa cần chạy một database server riêng như MySQL hoặc Postgres ở giai đoạn đầu.

Tuy vậy, Pi vẫn nên lưu dữ liệu local để:

- chạy ổn định khi mạng chập chờn
- có backup để rollback
- giữ log và trạng thái đồng bộ
- giảm phụ thuộc vào server trung tâm

Tóm lại:

- Pi vẫn lưu dữ liệu local
- thứ chưa cần ở bản đầu là một database server riêng
- nếu cần lưu trữ có cấu trúc tốt hơn, nên ưu tiên `SQLite`

## 3. Dữ liệu lưu ở đâu

### 3.1. Dữ liệu nên lưu ở database trung tâm

Phần này nằm ở server nhà cung cấp:

- `customers`
- `users`
- `devices`
- `device_tokens`
- `profiles`
- `profile_versions`
- `update_jobs`
- `job_results`
- `device_heartbeats`
- `release_packages`
- `audit_logs`

Mục đích:

- quản lý nhiều khách
- quản lý nhiều Pi
- theo dõi ai đã sửa gì
- biết thiết bị nào đang dùng version nào
- rollback theo version

### 3.2. Dữ liệu local nên có trên Pi

Phần này vẫn nên nằm trên thiết bị, dù có hay không có database local:

- `config/profiles/<device-or-profile>.json`
- `config/profiles/active.txt`
- `css/generated/*.css`
- bản backup tạm trước khi update
- snapshot để rollback local
- log đồng bộ ngắn hạn
- token hoặc secret của thiết bị
- cache payload tải từ server
- release gần nhất để rollback code
- hàng đợi job tạm khi Pi đang mất mạng

Lý do:

- Pi có thể tiếp tục chạy ngay cả khi mất kết nối Internet
- dễ debug tại chỗ
- hợp với repo hiện tại
- giảm số lần phải gọi ngược về server

### 3.3. Khi nào nên dùng SQLite trên Pi

Ở bản đầu, nếu dữ liệu local còn đơn giản thì file JSON, file log và thư mục backup là đủ.

Nên cân nhắc `SQLite` khi Pi bắt đầu cần:

- lưu job queue local có trạng thái rõ ràng
- lưu log dài hạn để tra lỗi
- lưu cache có cấu trúc
- lưu nhiều version rollback hơn
- lưu các bản tin hoặc nội dung tải về để chạy offline

Khuyến nghị:

- không cần MySQL hoặc Postgres trên Pi ở giai đoạn đầu
- nếu cần database local, ưu tiên `SQLite`
- chỉ thêm database local khi file thường bắt đầu khó quản lý

## 4. Các bảng nên có ở backend

Đây là cấu trúc tối thiểu, không cần làm hết ngay từ ngày đầu.

### 4.1. `devices`

```text
id
customer_id
device_code
device_name
serial_number
status
current_profile_version_id
current_release_id
last_seen_at
created_at
updated_at
```

### 4.2. `profiles`

```text
id
customer_id
name
slug
description
created_at
updated_at
```

### 4.3. `profile_versions`

```text
id
profile_id
version_no
profile_json
note
created_by
created_at
```

`profile_json` chính là dữ liệu tương đương với file trong `config/profiles/*.json`.

### 4.4. `update_jobs`

```text
id
device_id
type
payload_json
status
retry_count
created_at
started_at
finished_at
```

`type` có thể là:

- `config.apply`
- `release.apply`
- `device.restart`
- `device.reload`
- `device.rollback`

### 4.5. `release_packages`

```text
id
version
channel
package_url
checksum
note
created_at
```

Phần này dùng cho cập nhật code, không dùng cho cập nhật cấu hình.

## 5. API server nên có

### 5.1. API cho web khách hàng

Đây là API frontend gọi lên backend:

- `POST /api/auth/login`
- `GET /api/devices`
- `GET /api/devices/:id`
- `GET /api/profiles`
- `GET /api/profiles/:id`
- `POST /api/profiles`
- `POST /api/profiles/:id/versions`
- `POST /api/devices/:id/apply-profile`
- `POST /api/devices/:id/reload`
- `GET /api/devices/:id/jobs`
- `GET /api/devices/:id/logs`

### 5.2. API cho Raspberry Pi agent

Đây là API Pi gọi lên server:

- `POST /agent/register`
- `POST /agent/heartbeat`
- `GET /agent/jobs/next`
- `POST /agent/jobs/:id/start`
- `POST /agent/jobs/:id/success`
- `POST /agent/jobs/:id/fail`
- `GET /agent/profiles/:versionId/download`
- `GET /agent/releases/:releaseId/download`

Tư duy đúng là:

- Pi đi hỏi server có job gì mới không
- server không cố gọi ngược xuống Pi

## 6. Cách xác thực thiết bị

Mỗi Pi nên có:

- `device_id`
- `device_secret`

Hai giá trị này được cấp lúc bàn giao thiết bị hoặc lúc pair thiết bị lần đầu.

Có thể lưu local ở:

```text
ops/device.env
```

hoặc:

```text
.env.device
```

Không nên hard-code secret trong source.

Mỗi request từ agent nên mang:

- `device_id`
- token ngắn hạn hoặc chữ ký HMAC

Nếu muốn làm nhanh bản đầu:

- dùng `Bearer token` riêng cho từng thiết bị

Nếu muốn chắc hơn ở giai đoạn sau:

- dùng token xoay vòng
- hoặc mutual TLS

## 7. Luồng cập nhật cấu hình

Đây là luồng nên làm trước vì phù hợp nhất với repo hiện tại.

### 7.1. Luồng từ web tới backend

1. Khách hàng vào website và sửa giao diện.
2. Frontend gửi JSON profile mới lên backend.
3. Backend validate rồi lưu thành `profile_version`.
4. Backend tạo `update_job` loại `config.apply` cho thiết bị được chọn.

### 7.2. Luồng từ Pi tới backend

1. Agent gửi heartbeat theo chu kỳ, ví dụ 15 hoặc 30 giây.
2. Agent gọi `GET /agent/jobs/next`.
3. Nếu có job `config.apply`, agent tải profile version mới về.
4. Agent backup file profile local hiện tại.
5. Agent ghi file mới vào `config/profiles/...json`.
6. Nếu cần đổi profile active, agent cập nhật `config/profiles/active.txt`.
7. Agent kích hoạt reload.
8. Agent gửi kết quả `success` hoặc `fail` về backend.

### 7.3. Pi nên ghi file như thế nào

Khuyến nghị:

- lưu profile từ server vào file riêng theo `deviceId` hoặc `remote-<profile>.json`
- chỉ đổi `active.txt` khi muốn áp dụng chính thức

Ví dụ:

```text
config/profiles/device-abc.json
config/profiles/active.txt
```

Vì repo hiện tại đã có:

- `config/config.vps.js` đọc file active
- `config/builder.js` tự build config từ profile
- watcher có thể tự restart/reload khi file đổi

nên hướng này rất hợp.

## 8. Pi reload bằng cách nào

Có 2 cách hợp lý.

### 8.1. Cách đơn giản nhất

Chạy MagicMirror bằng:

```bash
npm run server:watch
```

Khi agent ghi đè file profile, watcher sẽ tự restart server.

Ưu điểm:

- ít code
- tận dụng luồng sẵn có của repo

Nhược điểm:

- phụ thuộc watcher
- cần kiểm tra kỹ khi chuyển sang kiosk mode

### 8.2. Cách ổn định hơn cho production

Agent ghi file xong thì gọi:

- `systemctl restart magicmirror-vps-server`

hoặc:

- `systemctl restart magicmirror-vps-kiosk`

Ưu điểm:

- rõ ràng
- dễ kiểm soát production

Nhược điểm:

- thao tác nặng hơn reload mềm

## 9. Luồng cập nhật code

Không nên cho web gửi thẳng từng file JS/CSS xuống Pi.

Nên tách code update thành một luồng riêng.

### 9.1. Cách nên dùng

1. Nhà cung cấp build một gói phát hành mới.
2. Backend tạo bản ghi `release_packages`.
3. Backend tạo `update_job` loại `release.apply`.
4. Pi tải package đã đóng gói sẵn.
5. Pi giải nén vào thư mục staging.
6. Pi kiểm tra checksum.
7. Pi chạy cài dependency cần thiết.
8. Pi chuyển sang bản mới.
9. Pi restart service.
10. Pi gửi kết quả về server.

### 9.2. Dữ liệu job code update

Ví dụ payload:

```json
{
  "releaseId": 12,
  "version": "1.4.0",
  "channel": "stable",
  "checksum": "sha256:..."
}
```

### 9.3. Rollback code

Pi nên luôn giữ:

- bản đang chạy
- bản trước đó

Nếu release mới lỗi:

- agent quay về release cũ
- báo `fail` về backend

## 10. Khi nào dùng polling, khi nào dùng WebSocket hoặc MQTT

### 10.1. Polling

Nên dùng trước ở bản đầu.

Ví dụ:

- heartbeat mỗi 30 giây
- check job mỗi 15 giây

Ưu điểm:

- đơn giản
- dễ debug
- dễ chạy sau NAT

### 10.2. WebSocket

Nên dùng khi cần realtime hơn.

Phù hợp khi:

- muốn bấm cập nhật là Pi nhận gần như ngay
- muốn xem trạng thái thiết bị trực tiếp

### 10.3. MQTT

Phù hợp nếu sau này số lượng thiết bị nhiều.

Nhưng ở giai đoạn đầu, chưa cần phức tạp hóa.

Khuyến nghị:

- giai đoạn 1 dùng polling
- giai đoạn 2 thêm WebSocket nếu cần

## 11. Mapping với repo hiện tại

Repo này đã có sẵn nhiều mảnh ghép phù hợp với mô hình remote management.

### 11.1. Phần có thể giữ nguyên

- `config/config.vps.js` để đọc profile active
- `config/profiles/*.json` để lưu cấu hình local
- `config/profiles/history` để backup và rollback local
- `web/admin` để làm local admin hoặc giao diện nội bộ
- `ops/pi/*.service` để chạy trên Raspberry Pi

### 11.2. Phần nên thêm mới

- một service `mirror-agent`
- một file secret riêng cho thiết bị
- một module sync với backend
- một thư mục cache package update

Ví dụ:

```text
ops/pi/mirror-agent.service
ops/pi/run-agent.sh
storage/agent/
storage/releases/
storage/backups/
```

### 11.3. Local admin có còn cần không

Có.

Vì local admin vẫn hữu ích cho:

- kỹ thuật viên kiểm tra tại chỗ
- xử lý khi backend trung tâm đang lỗi
- debug nhanh trên Pi

Nhưng trong mô hình vận hành chính, khách hàng nên dùng web của nhà cung cấp thay vì đăng nhập trực tiếp vào Pi.

## 12. Quy tắc tách trách nhiệm

### 12.1. Server nhà cung cấp quản lý

- tài khoản
- khách hàng
- thiết bị
- version cấu hình
- version code
- lịch sử thao tác
- hàng đợi job

### 12.2. Raspberry Pi quản lý

- file config local
- dữ liệu local để cache, backup và queue
- áp dụng config
- tải và áp dụng release
- backup local
- gửi trạng thái

### 12.3. Trình duyệt khách hàng quản lý

- chỉnh giao diện
- chọn module
- xem trạng thái thiết bị
- bấm cập nhật
- rollback version

## 13. Mô hình tối ưu cho 3 role

Với bài toán có 3 role:

- `admin toàn quyền`
- `admin kỹ thuật viên`
- `khách hàng`

hướng tối ưu nhất là:

- dùng mô hình `hybrid server-first`
- backend trung tâm là nơi quản lý chính
- Raspberry Pi là nơi giữ bản đang chạy và dữ liệu local
- local admin trên Pi chỉ dùng cho kỹ thuật viên hoặc tình huống cứu hộ

Lý do chọn hướng này:

- tối ưu cá nhân hóa cho từng khách hàng và từng thiết bị
- dễ quản lý nhiều Pi từ một nơi
- tránh xung đột khi sửa config trên web và trên Pi
- Pi vẫn tiếp tục chạy được khi mất mạng

### 13.1. `admin toàn quyền`

Role này quản lý toàn bộ hệ thống:

- quản lý khách hàng
- quản lý user và role
- quản lý template hệ thống
- phát hành release code
- quản lý danh sách module được phép dùng
- force sync, force rollback, khóa thiết bị
- xem toàn bộ log và audit log

Role này nên có quyền trên:

- `System zone`
- `Support zone`
- `Customer zone`

### 13.2. `admin kỹ thuật viên`

Role này tập trung vào vận hành và hỗ trợ:

- gắn thiết bị với khách hàng
- xem heartbeat, log, trạng thái agent
- áp dụng bản config đã publish
- restart service
- rollback bản gần nhất
- kiểm tra mạng, kiosk, timezone, màn hình
- dùng local `/admin` trên Pi khi cần bảo trì

Role này không nên có quyền:

- phát hành release hệ thống
- đổi quyền user toàn hệ thống
- sửa template gốc của mọi khách hàng

Role này nên có quyền trên:

- `Support zone`
- một phần của `Customer zone`

### 13.3. `khách hàng`

Role này chỉ nên thao tác trên phần cá nhân hóa:

- sửa giao diện
- đổi theme
- bật hoặc tắt module trong allowlist
- sửa nội dung hiển thị
- chọn profile cho thiết bị của mình
- preview, publish, rollback version của chính mình

Role này không nên có quyền:

- sửa code
- sửa service
- sửa network
- xem secret thiết bị
- thay đổi release hệ thống

Role này chỉ nên có quyền trên:

- `Customer zone`

### 13.4. Chia quyền theo vùng dữ liệu

Không nên chỉ phân quyền theo vai trò. Nên phân thêm theo vùng dữ liệu:

#### `System zone`

Bao gồm:

- release code
- secret
- pairing
- service
- chính sách hệ thống

Chỉ `admin toàn quyền` được đụng vào.

#### `Support zone`

Bao gồm:

- health
- heartbeat
- log
- restart
- rollback kỹ thuật
- trạng thái agent

`admin toàn quyền` và `admin kỹ thuật viên` được dùng.

#### `Customer zone`

Bao gồm:

- theme
- layout
- module config
- content
- profile version

Cả 3 role có thể tham gia, nhưng phạm vi mỗi role khác nhau.

### 13.5. Ma trận quyền chi tiết theo hành động

Bảng dưới đây dùng để chốt quyền thật sự khi triển khai backend và UI.

| Hành động | Admin toàn quyền | Admin kỹ thuật viên | Khách hàng | Ghi chú |
| --- | --- | --- | --- | --- |
| Quản lý khách hàng | Có | Không | Không | Tạo, sửa, khóa tenant |
| Quản lý user và role | Có | Không | Không | Bao gồm policy và quyền |
| Quản lý `system_template` | Có | Xem | Không | Kỹ thuật viên chỉ nên xem để support |
| Publish release code | Có | Không | Không | Chỉ role cao nhất được làm |
| Pair hoặc gắn Pi vào khách hàng | Có | Có | Không | Kỹ thuật viên là role chính cho việc này |
| Xem danh sách thiết bị | Có | Có | Có giới hạn | Khách chỉ thấy thiết bị của mình |
| Xem health, heartbeat, log | Có | Có | Có giới hạn | Khách chỉ xem thông tin cơ bản |
| Restart hoặc reload thiết bị | Có | Có | Có giới hạn | Khách chỉ nên được reload mềm |
| Sửa network, kiosk, timezone, display | Có | Có | Không | Đây là `Support zone` |
| Tạo và sửa `customer_profile` | Có | Có | Có giới hạn | Khách chỉ sửa trong allowlist |
| Publish `customer_profile` | Có | Có | Có | Trong phạm vi tenant của mình |
| Tạo và sửa `device_override` | Có | Có | Không | Tránh cho khách đụng phần kỹ thuật |
| Rollback config | Có | Có | Có giới hạn | Khách chỉ rollback version của mình |
| Rollback release code | Có | Có giới hạn | Không | Kỹ thuật viên chỉ rollback release đã được duyệt |
| Dùng local `/admin` trên Pi | Có | Có | Không | Chỉ cho bảo trì hoặc cứu hộ |
| Xem audit log toàn hệ thống | Có | Có giới hạn | Không | Kỹ thuật viên xem phần liên quan support |
| Force sync hoặc khóa thiết bị | Có | Có giới hạn | Không | Kỹ thuật viên chỉ dùng khi có ticket |

### 13.6. Kênh truy cập nên mở cho từng role

Không phải role nào cũng nên dùng cùng một giao diện.

| Kênh truy cập | Admin toàn quyền | Admin kỹ thuật viên | Khách hàng | Ghi chú |
| --- | --- | --- | --- | --- |
| Cloud web của nhà cung cấp | Có | Có | Có | Đây là kênh chính |
| Local `/admin` trên Pi | Có | Có | Không | Chỉ bật cho bảo trì |
| SSH vào Pi | Có | Có giới hạn | Không | Chỉ cho support nội bộ |
| API agent nội bộ | Có | Không | Không | Dành cho hệ thống |

Quy tắc nên dùng:

- khách hàng chỉ thao tác trên cloud web
- kỹ thuật viên ưu tiên cloud web, chỉ vào Pi khi cần hỗ trợ
- local `/admin` trên Pi không nên là giao diện chính cho khách hàng

### 13.7. Quy tắc phê duyệt thay đổi

Để tránh lẫn giữa ba role, nên có thêm rule theo loại thay đổi:

- thay đổi `System zone`: cần `admin toàn quyền`
- thay đổi `Support zone`: `admin toàn quyền` hoặc `admin kỹ thuật viên`
- thay đổi `Customer zone`: cho phép khách hàng trong phạm vi allowlist

Nếu thay đổi liên quan tới:

- release code
- module không nằm trong allowlist
- secret thiết bị
- network hoặc service

thì luôn coi là thay đổi nhạy cảm và không mở cho khách hàng.

## 14. Phân tầng config để cá nhân hóa tốt mà không lo xung đột

Để tối ưu cá nhân hóa, không nên chỉ có một file config phẳng.

Nên tổ chức config thành 4 lớp:

### 14.1. `system_template`

Đây là lớp mặc định của nhà cung cấp:

- cấu trúc cơ bản
- module lõi
- style nền tảng
- giới hạn tính năng
- allowlist module

Lớp này do `admin toàn quyền` quản lý.

### 14.2. `customer_profile`

Đây là lớp cá nhân hóa theo từng khách hàng:

- theme riêng
- nội dung riêng
- bố cục riêng
- module mà khách được phép dùng

Lớp này do khách hàng và admin hỗ trợ chỉnh trong phạm vi cho phép.

### 14.3. `device_override`

Đây là lớp cấu hình riêng cho từng Pi:

- độ phân giải
- kiosk mode
- timezone riêng
- cấu hình màn hình
- điều chỉnh nhỏ theo từng thiết bị

Lớp này phù hợp cho kỹ thuật viên và admin toàn quyền.

### 14.4. `runtime_local_state`

Đây là dữ liệu vận hành chỉ nằm local trên Pi:

- file active hiện tại
- queue local
- cache
- backup
- log
- trạng thái sync

Lớp này không phải là nơi khách hàng sửa trực tiếp trên web.

### 14.5. Rule merge config

Config cuối cùng đang chạy trên Pi nên được tính như sau:

```text
effective_config
= system_template
+ customer_profile
+ device_override
```

`runtime_local_state` không đè vào cấu hình nội dung. Nó chỉ phục vụ vận hành.

Thứ tự này giúp:

- giữ được chuẩn chung của hệ thống
- vẫn cá nhân hóa mạnh cho từng khách
- cho phép tinh chỉnh riêng từng Pi
- dễ audit và rollback

### 14.6. Nguồn dữ liệu chính

Để tránh xung đột, nên chốt rõ:

- backend là `source of truth` cho version chính thức
- Pi giữ `bản đang chạy`
- local admin trên Pi chỉ là kênh kỹ thuật hoặc cứu hộ

Rule nên dùng:

- khách hàng sửa trên website
- backend lưu version mới
- backend tạo job `config.apply`
- Pi tải về, ghi local, reload

Nếu kỹ thuật viên sửa trực tiếp trên Pi thì nên có một trong 2 cách:

- chỉ dùng để cứu hộ tạm thời
- hoặc bắt buộc có bước đồng bộ ngược lên server

### 14.7. Kết luận cho 3 role

Nếu cần tối ưu đồng thời:

- cá nhân hóa
- kiểm soát quyền
- hỗ trợ kỹ thuật
- vận hành nhiều thiết bị

thì mô hình phù hợp nhất là:

- `server-first` ở cấp quản lý version
- `hybrid` ở cấp vận hành thực tế
- `RBAC` theo role
- `config layering` theo 4 lớp

### 14.8. Schema DB tối thiểu bám theo 4 lớp config

Schema dưới đây là bản tối thiểu để backend triển khai đúng mô hình đã chốt.

#### 14.8.1. Nhóm bảng lõi về tenant và phân quyền

##### `customers`

```text
id
name
slug
status
created_at
updated_at
```

##### `users`

```text
id
email
password_hash
display_name
status
created_at
updated_at
```

##### `customer_memberships`

```text
id
customer_id
user_id
role_code
status
created_at
updated_at
```

`role_code` chỉ nên nhận một trong các giá trị:

- `super_admin`
- `tech_admin`
- `customer_admin`

#### 14.8.2. Nhóm bảng thiết bị

##### `devices`

```text
id
customer_id
device_code
device_name
serial_number
hardware_model
status
last_seen_at
current_release_id
current_config_release_id
created_at
updated_at
```

##### `device_secrets`

```text
id
device_id
secret_hash
issued_at
revoked_at
created_at
```

#### 14.8.3. Nhóm bảng cho lớp `system_template`

##### `system_templates`

```text
id
name
slug
status
created_by
created_at
updated_at
```

##### `system_template_versions`

```text
id
system_template_id
version_no
template_json
note
created_by
created_at
```

`template_json` chứa phần mặc định toàn hệ thống như:

- module lõi
- style nền
- policy module
- giới hạn tính năng

#### 14.8.4. Nhóm bảng cho lớp `customer_profile`

##### `customer_profiles`

```text
id
customer_id
name
slug
status
created_by
created_at
updated_at
```

##### `customer_profile_versions`

```text
id
customer_profile_id
base_template_version_id
version_no
profile_json
note
created_by
created_at
```

`base_template_version_id` cho biết bản `system_template` nào đang làm nền cho profile này.

#### 14.8.5. Nhóm bảng cho lớp `device_override`

##### `device_overrides`

```text
id
device_id
name
status
created_by
created_at
updated_at
```

##### `device_override_versions`

```text
id
device_override_id
version_no
override_json
note
created_by
created_at
```

`override_json` chứa phần kỹ thuật riêng cho từng Pi như:

- kiosk
- display
- timezone
- tuning theo màn hình

#### 14.8.6. Nhóm bảng để publish config cuối cùng

Đây là lớp rất quan trọng vì nó nối ba lớp cấu hình phía trên thành một version có thể áp dụng cho thiết bị.

##### `config_releases`

```text
id
device_id
system_template_version_id
customer_profile_version_id
device_override_version_id
effective_config_json
checksum
published_by
published_at
status
```

Ý nghĩa:

- backend merge 3 lớp config
- sinh ra `effective_config_json`
- gắn checksum
- Pi chỉ cần tải đúng `config_release` này để áp dụng

Cách làm này giúp:

- rollback dễ
- audit dễ
- tránh việc Pi phải tự merge logic quá phức tạp

#### 14.8.7. Nhóm bảng cho runtime và đồng bộ

`runtime_local_state` chủ yếu nằm trên Pi, nhưng backend vẫn nên lưu phần tóm tắt để theo dõi.

##### `update_jobs`

```text
id
device_id
job_type
target_release_id
payload_json
status
retry_count
created_by
created_at
started_at
finished_at
```

##### `device_heartbeats`

```text
id
device_id
agent_version
app_version
ip_address
health_json
created_at
```

##### `device_sync_states`

```text
id
device_id
last_config_release_id
last_release_id
last_sync_at
last_status
last_error
updated_at
```

##### `audit_logs`

```text
id
customer_id
device_id
user_id
action
target_type
target_id
meta_json
created_at
```

#### 14.8.8. Quan hệ tối thiểu giữa các bảng

Quan hệ chính nên là:

```text
customers
  -> customer_memberships
  -> devices
  -> customer_profiles

system_templates
  -> system_template_versions

customer_profiles
  -> customer_profile_versions

devices
  -> device_overrides
  -> config_releases
  -> update_jobs
  -> device_heartbeats
  -> device_sync_states
```

Luồng publish config nên là:

1. chọn `system_template_version`
2. chọn `customer_profile_version`
3. chọn `device_override_version`
4. backend tạo `config_release`
5. backend tạo `update_job`
6. Pi tải `config_release` và áp dụng

#### 14.8.9. Mức tối thiểu thật sự để làm bản đầu

Nếu muốn làm gọn nhất để chạy được trước, có thể bắt đầu chỉ với:

- `customers`
- `users`
- `customer_memberships`
- `devices`
- `system_template_versions`
- `customer_profile_versions`
- `device_override_versions`
- `config_releases`
- `update_jobs`
- `device_sync_states`
- `audit_logs`

Sau khi hệ thống chạy ổn định mới tách thêm:

- bảng master và bảng version riêng
- bảng secret riêng
- bảng heartbeat chi tiết
- bảng release code

### 14.9. Kết nối schema DB với quyền của 3 role

Để schema DB khớp với RBAC ở mục 13, nên chốt như sau:

- `admin toàn quyền` có thể thao tác mọi bảng
- `admin kỹ thuật viên` không được sửa `system_template_versions` và release code nếu không có quyền đặc biệt
- `khách hàng` chỉ được thao tác dữ liệu thuộc `customer_profiles`, `config_releases` của tenant mình, và không được chạm vào `device_secrets`

Tất cả thao tác sau nên ghi `audit_logs`:

- publish config
- rollback config
- restart thiết bị
- đổi role
- đổi secret
- phát hành release code

## 15. Lộ trình triển khai nên đi

### Giai đoạn 1

Làm bản tối thiểu nhưng chạy được:

- backend có `devices`, `profiles`, `profile_versions`, `update_jobs`
- Pi agent dùng polling
- chỉ hỗ trợ `config.apply`
- Pi ghi file profile local và restart

### Giai đoạn 2

Ổn định hóa:

- thêm heartbeat
- thêm trạng thái online/offline
- thêm rollback config
- thêm local backup rõ ràng
- thêm audit log

### Giai đoạn 3

Mở rộng:

- thêm `release.apply`
- thêm kênh `stable` và `beta`
- thêm WebSocket hoặc MQTT
- thêm dashboard theo dõi nhiều thiết bị

## 16. Kết luận

Với repo hiện tại, hướng hợp lý nhất là:

- server nhà cung cấp có database
- Raspberry Pi chưa cần database server riêng ở giai đoạn đầu
- Pi vẫn giữ dữ liệu local như config, backup, log, cache và secret
- nếu cần lưu trữ có cấu trúc hơn trên Pi, ưu tiên `SQLite`
- web chỉ nói chuyện với backend
- Pi agent chủ động đồng bộ từ server
- cập nhật giao diện dùng JSON profile
- cập nhật code dùng release package riêng
- phân quyền theo 3 role và theo vùng dữ liệu
- dùng phân tầng config để cá nhân hóa mà không lo xung đột

Nếu làm theo hướng này thì vừa dễ quản lý nhiều thiết bị, vừa không phá cấu trúc MagicMirror đang có trong repo.
