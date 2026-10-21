# HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH DỰ ÁN TRUSTSIM MOBILE

Tài liệu này hướng dẫn chi tiết từ A đến Z cách cấu hình môi trường, kết nối Backend, chạy ứng dụng trên thiết bị thật / giả lập, và quy trình kiểm thử 9 phân hệ chức năng của ứng dụng di động **TrustSim Mobile**.

---

## 1. TỔNG QUAN KIẾN TRÚC DỰ ÁN

TrustSim Mobile là ứng dụng di động phục vụ sàn đấu giá và giao dịch SIM số đẹp bảo mật cao, được xây dựng dựa trên:
- **Nền tảng**: React Native 0.86, React 19, Expo SDK 57, Expo Router 57 (File-based Routing).
- **Ngôn ngữ**: TypeScript 100% Type-safe.
- **Phong cách thiết kế**: Dark Navy (`#1E3A8A`), Gold Accent (`#F59E0B`), Phẳng hiện đại, Glassmorphism, Hiệu ứng chuyển động mượt mà.
- **Cơ chế bảo mật đặc thù**:
  - **Phòng thủ 3 lớp (3-Layer Kick-out Defense)**: Hàng đợi Mutex (`apiClient.ts`) chống văng phiên đăng nhập khi Refresh Token chạy đồng thời.
  - **VietQR SePay Chuẩn Dynamic compact2**: Mã QR nạp tiền tự động có mã nhận diện riêng, đếm ngược 30 phút, cơ chế sao chép 1-chạm và tải trực tiếp vào thư viện ảnh máy.
  - **eKYC Chống Gian Lận (No Gallery)**: Sử dụng luồng Live Camera bắt buộc 3 bước (Mặt trước CCCD [Cam sau] $\rightarrow$ Mặt sau CCCD [Cam sau] $\rightarrow$ Chân dung [Cam trước với khung Oval]).
  - **Xác thực SIM 2 Pha**: Pha 1 chứng minh đang cầm SIM (SMS OTP), Pha 2 chứng minh chính chủ nhà mạng (Telco Radar Audit).
  - **Ký số Hợp đồng PAdES X.509 Kép**: Hỗ trợ đồng thời OTP, Bảng vẽ tay Canvas (`SignaturePadModal`) và Sinh trắc học phần cứng (FaceID / Vân tay qua `BiometricPromptModal`).

---

## 2. CẤU TRÚC THƯ MỤC NGUỒN (`src/`)

```
TrustSimMobile/
├── app.json                      # Cấu hình Expo, Plugins & Runtime Permissions
├── package.json                  # Dependencies chuẩn Expo SDK 57 & React 19
├── eslint.config.js              # Cấu hình linter tương thích React 19 Compiler
├── tsconfig.json                 # Cấu hình TypeScript
├── assets/                       # Icons và Splash Screen
└── src/
    ├── app/                      # EXPO ROUTER (24 Màn hình & Modal)
    │   ├── _layout.tsx           # Root Stack Navigator bọc SafeAreaProvider & AuthProvider
    │   ├── index.tsx             # Splash Screen điều hướng tự động theo Auth
    │   ├── login.tsx             # SCR-01: Đăng nhập tài khoản & mật khẩu
    │   ├── register.tsx          # SCR-02: Đăng ký thành viên mới
    │   ├── verify-email.tsx      # SCR-03: Xác thực OTP Email kích hoạt
    │   ├── verify-success.tsx    # SCR-03.1: Thông báo kích hoạt tài khoản thành công & điều hướng
    │   ├── (tabs)/               # Bottom Tab Bar chính
    │   │   ├── _layout.tsx       # Cấu hình 4 Tab (Trang Chủ, SIM Của Tôi, Ví Tiền, Tài Khoản)
    │   │   ├── index.tsx         # Tab 1: Trang chủ Dashboard & Đấu giá
    │   │   ├── sims.tsx          # Tab 2: SCR-14 Quản lý SIM sở hữu, tìm kiếm & sắp xếp
    │   │   ├── wallet.tsx        # Tab 3: SCR-04 Master Card số dư, đóng băng & thao tác nhanh
    │   │   └── account.tsx       # Tab 4: SCR-10 Hồ sơ, cấp độ eKYC, bảo mật & đăng xuất
    │   ├── deposit.tsx           # SCR-05 & SCR-06: Chọn gói nạp & Thanh toán VietQR SePay
    │   ├── withdraw.tsx          # SCR-07: Rút tiền về tài khoản ngân hàng chính chủ
    │   ├── transactions.tsx      # SCR-08 & SCR-09: Lịch sử nạp/rút & Sao kê chi tiết biến động
    │   ├── kyc/                  # PHÂN HỆ eKYC AI AWS REKOGNITION
    │   │   ├── index.tsx         # SCR-10: Màn hình giới thiệu & điều kiện xác minh
    │   │   ├── camera-front.tsx  # SCR-11A: Bước 1 - Chụp trực tiếp mặt trước CCCD
    │   │   ├── camera-back.tsx   # SCR-11B: Bước 2 - Chụp trực tiếp mặt sau CCCD
    │   │   ├── camera-selfie.tsx # SCR-12: Bước 3 - Live Selfie khuôn mặt khung Oval
    │   │   └── result.tsx        # SCR-13: Kết quả thẩm định AI & cấp chứng thư số PKI
    │   ├── sims/
    │   │   ├── verify.tsx        # SCR-15, 16, 17: Xác thực SIM chính chủ 2 pha + Telco Radar
    │   │   └── register.tsx      # Khai báo SIM mới lên sàn
    │   ├── contract/
    │   │   └── [tradeId].tsx     # SCR-18, 19, 19.1, 19.2: Hợp đồng PAdES, ký số & kiểm tra tính toàn vẹn
    │   └── handover/
    │       └── [tradeId].tsx     # SCR-20 & SCR-21: Bàn giao SIM, upload biên bản & giải ngân Escrow
    ├── components/               # CÁC COMPONENT TÁI SỬ DỤNG
    │   ├── Badge.tsx             # Huy hiệu trạng thái động (Đã xác minh, Chờ ký, Thành công...)
    │   ├── BiometricPromptModal.tsx # SCR-19.2: Modal cảm biến FaceID/Vân tay phần cứng
    │   ├── BottomNavBar.tsx      # Thanh điều hướng đa màn hình tiện lợi (4 Tab dùng chung)
    │   ├── Button.tsx            # Nút bấm chuẩn Gold/Navy với trạng thái Loading
    │   ├── Card.tsx              # Hộp thẻ bo góc cao cấp đổ bóng
    │   ├── Header.tsx            # Thanh điều hướng trên cùng (Hỗ trợ nút Home & Back)
    │   ├── Input.tsx             # Ô nhập liệu có validation & icon
    │   ├── SignaturePadModal.tsx # SCR-19.1: Bảng vẽ chữ ký tay cảm ứng đa điểm Base64
    │   ├── TelcoRadarModal.tsx   # SCR-16: Modal radar viễn thông quét thông tin chính chủ
    │   └── VietQrPaymentView.tsx # SCR-06: Mã QR động, đếm ngược 30m, copy 1 chạm, polling 2.5s
    ├── constants/
    │   ├── Config.ts             # Cấu hình API Host theo môi trường (Android, iOS, LAN)
    │   └── theme.ts              # Bảng màu, khoảng cách Spacing, BorderRadius, Typography
    ├── context/
    │   └── AuthContext.tsx       # Quản lý phiên đăng nhập, nạp dữ liệu Profile & Wallet
    ├── services/
    │   ├── apiClient.ts          # Axios Client + Mutex Queue Token Refresh
    │   ├── authService.ts        # Đăng ký, Đăng nhập, Xác thực Email, Lấy Profile
    │   ├── biometricService.ts   # Tích hợp expo-local-authentication
    │   ├── contractService.ts    # Xem hợp đồng, Ký số PAdES, Kiểm tra toàn vẹn tài liệu
    │   ├── kycService.ts         # Multipart Form-data upload 3 ảnh lên AWS Rekognition
    │   ├── simService.ts         # Gửi/Xác thực OTP SIM, danh sách SIM sở hữu
    │   ├── storage.ts            # SecureStore bảo mật cao (Lưu JWT Token an toàn)
    │   ├── transferService.ts    # Upload biên bản sang tên, xác nhận nhận SIM & Escrow
    │   ├── vietQrService.ts      # Tạo link VietQR SePay, tải ảnh mã QR vào thư viện
    │   └── walletService.ts      # Số dư, Nạp/Rút tiền với Idempotency Key, Sao kê
    └── types/
        └── index.ts              # Định nghĩa toàn bộ Interface DTOs và Enums
```

---

## 3. CHUẨN BỊ MÔI TRƯỜNG & PHẦN MỀM

1. **Node.js**: Phiên bản 18.x hoặc 20.x LTS hoặc 22.x (Kiểm tra bằng: `node -v`).
2. **Trình quản lý gói**: npm hoặc yarn (khuyến nghị `npm`).
3. **Ứng dụng di động để chạy**:
   - **Cách 1 (Thuận tiện nhất trên điện thoại thật)**: Tải ứng dụng **Expo Go** từ Google Play Store (Android) hoặc App Store (iOS).
   - **Cách 2 (Giả lập Android)**: Cài đặt **Android Studio**, tạo máy ảo Android Emulator (Pixel, Android 11 trở lên, có Google Play).
   - **Cách 3 (Giả lập iOS - chỉ trên macOS)**: Cài đặt **Xcode**, mở iOS Simulator.
   - **Cách 4 (Web Browser)**: Chạy trực tiếp trên trình duyệt web Google Chrome / Edge.

---

## 4. CẤU HÌNH KẾT NỐI MẠNG ĐẾN TRUSTSIM BACKEND

Backend mặc định chạy tại cổng `5130` (hoặc `http://localhost:5130/api`). Do cơ chế mạng của thiết bị di động và máy ảo khác với máy tính thông thường, bạn cần cấu hình đúng IP theo bảng sau:

### Bảng cấu hình IP máy chủ API (`src/constants/Config.ts`):

| Môi trường chạy App Mobile | Địa chỉ API cần trỏ tới | Giải thích |
| :--- | :--- | :--- |
| **Android Studio Emulator** | `http://10.0.2.2:5130/api` | Địa chỉ IP đặc biệt của Android Emulator để truy cập `localhost` của máy tính chủ. *(Đã thiết lập sẵn tự động)* |
| **iOS Simulator** (macOS) | `http://localhost:5130/api` | iOS Simulator dùng chung ngăn xếp mạng với máy Mac. *(Đã thiết lập sẵn tự động)* |
| **Web Browser** | `http://localhost:5130/api` | Chạy trên trình duyệt của chính máy tính. *(Đã thiết lập sẵn tự động)* |
| **Điện thoại thật (Expo Go)** | `http://<IP_LAN_MAY_TINH>:5130/api` | Ví dụ: `http://192.168.1.15:5130/api`. Cả điện thoại và máy tính phải bắt chung 1 mạng Wi-Fi. |

### Cách thiết lập IP cho điện thoại thật:
1. Mở PowerShell / Command Prompt trên máy tính, gõ: `ipconfig`. Tìm dòng **IPv4 Address** của mạng Wi-Fi (Ví dụ: `192.168.1.25`).
2. Tạo file `.env` tại thư mục gốc `TrustSimMobile`:
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.25:5130/api
   ```
3. **Lưu ý Tường Lửa (Windows Firewall)**: Cho phép kết nối đến cổng `5130` trên máy tính bằng lệnh PowerShell (Run as Administrator):
   ```powershell
   New-NetFirewallRule -DisplayName "TrustSim Backend 5130" -Direction Inbound -LocalPort 5130 -Protocol TCP -Action Allow
   ```

---

## 5. CÁC BƯỚC KHỞI CHẠY DỰ ÁN

### Bước 1: Cài đặt các gói phụ thuộc (Dependencies)
Mở terminal tại thư mục `d:\PersonalProject\TrustSim\TrustSimMobile`:
```bash
npm install
```

### Bước 2: Kiểm tra tính toàn vẹn Type và Linter
Đảm bảo mã nguồn đạt 0 lỗi trước khi khởi chạy:
```bash
# Kiểm tra TypeScript
npx tsc --noEmit

# Kiểm tra Linter
npm run lint
```

### Bước 3: Khởi động Expo Metro Bundler
```bash
# Lệnh thông thường
npm start

# Hoặc khởi động với tùy chọn xóa cache (Khuyên dùng khi đổi IP hoặc thêm gói)
npx expo start -c
```

Sau khi chạy lệnh, màn hình console sẽ hiển thị:
- **Mã QR Code**: Dùng app **Expo Go** trên Android để quét mã, hoặc dùng **Camera** mặc định trên iPhone để mở.
- Phím tắt điều khiển:
  - Nhấn phím `a` $\rightarrow$ Mở trên Android Emulator.
  - Nhấn phím `i` $\rightarrow$ Mở trên iOS Simulator.
  - Nhấn phím `w` $\rightarrow$ Mở trên Web Browser.
  - Nhấn phím `r` $\rightarrow$ Tải lại ứng dụng (Reload).

---

## 6. KỊCH BẢN KIỂM THỬ CÁC TÍNH NĂNG CỐT LÕI

Giao diện ứng dụng kết nối trực tiếp với API Backend và hiển thị dữ liệu thực tế. Khi mới khởi tạo hoặc chưa có dữ liệu giao dịch, màn hình sẽ hiển thị trạng thái trống (Empty State) trực quan, tinh tế và hướng dẫn người dùng bắt đầu các thao tác.

### Kịch bản 1: Điều hướng lần đầu & Đăng ký / Đăng nhập
1. Khi mở ứng dụng lần đầu (chưa có phiên đăng nhập), hệ thống tự động kiểm tra trạng thái và chuyển thẳng đến màn hình **Đăng Nhập** (`/login`).
2. **Đăng nhập**:
   - Nhập tên đăng nhập/email và mật khẩu đã đăng ký.
   - Bấm **"Đăng Nhập"** $\rightarrow$ Hệ thống lưu phiên làm việc an toàn và chuyển tiếp vào Trang Chủ.
3. **Đăng ký tài khoản mới**:
   - Bấm **"Đăng Ký Ngay"** $\rightarrow$ Nhập Tên đăng nhập, Email, Mật khẩu $\rightarrow$ Bấm **"Tiếp Tục"**.
   - Màn hình nhập mã xác thực Email OTP hiển thị (`/verify-email`), nhập mã 6 số gửi về hòm thư để kích hoạt tài khoản.

### Kịch bản 2: Nạp tiền chuyển khoản QR & Rút tiền
1. Chọn Tab **"Ví Tiền"**:
   - Thẻ hiển thị "Số dư khả dụng" và "Tạm giữ giao dịch".
2. Bấm nút **"Nạp Tiền"**:
   - Chọn nhanh các mệnh giá hoặc tự nhập số tiền cần nạp.
   - Bấm **"Tạo Mã QR Nạp Tiền"** $\rightarrow$ Màn hình thanh toán chuyển khoản hiển thị:
     - Mã QR động chứa đầy đủ thông tin số tài khoản và nội dung chuyển tiền.
     - Đồng hồ đếm ngược thời gian thanh toán.
     - Nút **"Sao chép"** số tài khoản và nội dung chuyển tiền tiện lợi.
     - Nút **"Lưu ảnh QR vào bộ sưu tập"** để tiện mở trong app ngân hàng.
     - Hệ thống tự động cập nhật số dư ngay khi tài khoản ngân hàng nhận tiền.
3. Bấm nút **"Rút Tiền"**:
   - Nhập số tiền muốn rút về tài khoản ngân hàng chính chủ.
   - Chọn ngân hàng thụ hưởng, nhập số tài khoản và tên chủ tài khoản $\rightarrow$ Bấm **"Rút Tiền"**.

### Kịch bản 3: Quy trình Xác minh danh tính tài khoản (Camera 3 bước)
1. Chọn Tab **"Cá Nhân"** $\rightarrow$ Bấm **"Xác Thực Tài Khoản Ngay"** (hoặc truy cập `/kyc`).
2. Màn hình tóm tắt 3 bước chụp ảnh rõ nét Căn cước công dân:
   - **Bước 1 (`/kyc/camera-front`)**: Chụp trực tiếp mặt trước CCCD bằng máy ảnh sau.
   - **Bước 2 (`/kyc/camera-back`)**: Chụp trực tiếp mặt sau CCCD bằng máy ảnh sau.
   - **Bước 3 (`/kyc/camera-selfie`)**: Chụp ảnh chân dung khuôn mặt trực diện qua máy ảnh trước với khung nhận diện.
3. **Kết quả xác thực (`/kyc/result`)**:
   - Hiển thị thông tin họ tên, số CCCD và độ tương đồng khuôn mặt.
   - Kích hoạt tính năng bảo mật và sẵn sàng ký hợp đồng mua bán SIM.

### Kịch bản 4: Quản lý SIM & Xác thực SIM chính chủ
1. Chọn Tab **"Kho SIM"** (`/sims`):
   - Danh sách các SIM đang sở hữu với bộ lọc tìm kiếm và sắp xếp.
2. Bấm nút **"+ Thêm SIM"**:
   - Điều kiện: Tài khoản đã hoàn thành xác minh danh tính.
   - **Bước 1**: Nhập số điện thoại cần xác thực $\rightarrow$ Bấm "Gửi mã OTP đến số SIM".
   - **Bước 2**: Nhập 6 số OTP gửi về tin nhắn SMS để xác nhận quyền sử dụng.
   - Hệ thống tự động kiểm tra với nhà mạng viễn thông và cấp tích xanh "Chính chủ".

### Kịch bản 5: Xem và Ký hợp đồng chuyển nhượng SIM
1. Khi có giao dịch mua bán SIM, người dùng truy cập màn hình hợp đồng (`/contract/[tradeId]`).
2. Màn hình hiển thị:
   - Thông tin Người bán, Người mua và trạng thái ký kết của 2 bên.
   - Toàn văn hợp đồng mua bán chuyển nhượng SIM.
3. Bấm **"Ký Hợp Đồng Bằng Mã OTP"**:
   - Tùy chọn vẽ thêm chữ ký tay trên bảng cảm ứng.
   - Tùy chọn xác thực nhanh bằng vân tay / FaceID.
   - Nhập mã OTP gửi về Email để hoàn tất ký kết.
4. Bấm **"Kiểm Tra Tính Toàn Vẹn Hợp Đồng"** để kiểm tra tính hợp lệ của tài liệu.

### Kịch bản 6: Tiến trình bàn giao SIM & Chuyển tiền người bán
1. Sau khi hợp đồng được ký đầy đủ, tiến trình bàn giao bắt đầu (`/handover/[tradeId]`).
2. **Người bán**: Sau khi làm thủ tục sang tên tại điểm giao dịch nhà mạng, nộp ảnh chụp biên bản xác nhận lên hệ thống.
3. **Người mua**: Sau khi nhận SIM vật lý và kiểm tra có sóng ổn định, bấm nút **"Xác Nhận Đã Nhận SIM & Hoàn Tất"**.
4. Khoản tiền thanh toán được chuyển ngay cho Người bán và hiển thị Biên bản bàn giao hoàn tất.

---

## 7. BẢNG MÃ LỖI VÀ XỬ LÝ SỰ CỐ (TROUBLESHOOTING)

| Lỗi thường gặp | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Network Error / Không thể kết nối máy chủ** | App trỏ sai IP hoặc máy tính chặn tường lửa port 5130. | 1. Chạy Android Emulator: dùng `http://10.0.2.2:5130/api`.<br>2. Chạy máy thật: tạo file `.env` với IP Wi-Fi máy tính.<br>3. Chạy lệnh mở port Firewall trong PowerShell (mục 4). |
| **Lỗi quyền Camera khi vào eKYC** | Chưa cấp quyền truy cập Camera trên thiết bị. | Bấm vào nút "Cấp Quyền Camera" hiển thị trên màn hình, hoặc vào Cài đặt thiết bị $\rightarrow$ Expo Go $\rightarrow$ Bật quyền "Camera". |
| **Lỗi ExpoMediaLibraryNext trong Expo Go** | Expo SDK 57 tách module Next architecture chưa tích hợp sẵn trong Expo Go. | Đã được xử lý tự động trong `vietQrService.ts` bằng cơ chế Safe Lazy Loading `expo-media-library/legacy`. |
| **Lỗi không lưu được ảnh VietQR** | Chưa cấp quyền đọc/ghi Thư viện ảnh. | Vào Cài đặt máy $\rightarrow$ Cho phép Expo Go truy cập Thư viện ảnh ("Photos / Media Library"). |
| **React Native / Metro cache lỗi** | Thư mục cache `.expo` hoặc Metro bị xung đột sau khi cài gói mới. | Dừng server (Ctrl+C), chạy: `npx expo start -c` để xóa toàn bộ cache và nạp lại từ đầu. |
| **TypeScript báo lỗi không nhận type** | Chưa chạy build type declaration. | Chạy `npx tsc --noEmit` để rà soát lỗi. Toàn bộ types chuẩn đã nằm trong `src/types/index.ts`. |

---

## 8. LỆNH ĐÓNG GÓI BẢN CÀI ĐẶT (PRODUCTION BUILD)

Khi muốn đóng gói thành file `.apk` (Android) hoặc `.ipa` (iOS) để cài đặt trực tiếp không cần qua Expo Go:
```bash
# Cài đặt công cụ EAS CLI
npm install -g eas-cli

# Đăng nhập tài khoản Expo
eas login

# Cấu hình dự án EAS
eas build:configure

# Đóng gói APK chạy thử nội bộ (Android)
eas build -p android --profile preview
```

---
*Tài liệu được cập nhật tự động đồng bộ theo tài liệu kỹ thuật backend tại `TrustSimBackend/docs/mobile`.*
