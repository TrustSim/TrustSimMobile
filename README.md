# 📱 TrustSim Mobile App

> **Sàn đấu giá & Giao dịch chuyển nhượng SIM số đẹp bảo mật cao với cơ chế Quỹ Ký Quỹ Escrow, eKYC AI AWS Rekognition, Chữ ký số PAdES X.509 và Thanh toán VietQR SePay tự động.**

---

## 📖 Tài Liệu Hướng Dẫn Vận Hành Chi Tiết
👉 **Xem toàn bộ hướng dẫn cài đặt, cấu hình IP mạng, khắc phục sự cố và kịch bản kiểm thử tại:**
**[HUONG_DAN_CHAY.md](./HUONG_DAN_CHAY.md)**

---

## 🚀 Công Nghệ Cốt Lõi
- **Framework**: React Native 0.86, React 19, Expo SDK 57, Expo Router 57 (File-based Routing).
- **Ngôn ngữ**: TypeScript 100% strict type-checking.
- **Bảo mật**:
  - Hàng đợi Promise Mutex Queue phòng thủ 3 lớp (`apiClient.ts`) chống văng phiên khi xoay vòng Refresh Token.
  - Lưu trữ JWT an toàn bằng `expo-secure-store`.
  - eKYC Chống gian lận bằng luồng Live Camera bắt buộc (không cho phép chọn ảnh từ thư viện).
  - Tích hợp Sinh trắc học phần cứng `expo-local-authentication` (FaceID / Vân tay) và Bảng vẽ tay Canvas.
- **Thanh toán**: Tích hợp VietQR SePay chuẩn `compact2`, bộ đếm thời gian 30 phút, sao chép 1 chạm và tự động lưu ảnh QR vào Album ảnh máy bằng `expo-file-system` & `expo-media-library`.

---

## 🌟 9 Phân Hệ & 24 Màn Hình / Modal Đã Triển Khai
1. **Xác thực người dùng (SCR-01 $\rightarrow$ SCR-03)**: Đăng ký, Đăng nhập, Xác thực OTP Email.
2. **Ví Tiền & Thanh Toán (SCR-04 $\rightarrow$ SCR-09)**: Dashboard số dư đóng băng/khả dụng, Nạp tiền VietQR SePay, Rút tiền, Lịch sử & Sao kê chi tiết.
3. **Thẩm định eKYC AI (SCR-10 $\rightarrow$ SCR-13)**: Hướng dẫn eKYC, Live Cam mặt trước CCCD, Live Cam mặt sau CCCD, Live Selfie khung Oval và Cấp khóa PKI Key Pair.
4. **Kho SIM & Xác thực 2 Pha (SCR-14 $\rightarrow$ SCR-17)**: Quản lý SIM cá nhân, Tìm kiếm Debounce, Sắp xếp, Xác thực OTP SIM và Radar sóng viễn thông đối soát chính chủ.
5. **Hợp đồng điện tử PAdES (SCR-18 $\rightarrow$ SCR-19.2)**: Xem hợp đồng HTML, Ký số OTP Email, Bảng vẽ chữ ký tay Canvas, Xác thực Sinh trắc học phần cứng và Kiểm tra toàn vẹn tài liệu SHA-256.
6. **Bàn giao SIM & Giải ngân Escrow (SCR-20 $\rightarrow$ SCR-21)**: Upload biên bản sang tên nhà mạng, Xác nhận có sóng và Giải ngân Quỹ Escrow tự động.

---

## ⚡ Khởi Chạy Nhanh (Quick Start)

```bash
# 1. Cài đặt thư viện
npm install

# 2. Kiểm tra type và linter
npx tsc --noEmit
npm run lint

# 3. Khởi động ứng dụng
npx expo start -c
```

- Nhấn phím `a` để mở trên Android Emulator.
- Nhấn phím `i` để mở trên iOS Simulator.
- Nhấn phím `w` để mở trên Web Browser.
- Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại thật.

Chi tiết cấu hình IP kết nối Backend xin xem file **[HUONG_DAN_CHAY.md](./HUONG_DAN_CHAY.md)**.
