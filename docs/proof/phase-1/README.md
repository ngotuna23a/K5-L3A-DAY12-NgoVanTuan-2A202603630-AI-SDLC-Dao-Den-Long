# Bằng chứng Phase 1

Các file được tạo từ chương trình/test thật, không sửa tay output. Tái lập bằng `npm ci`, `npm run verify`. `verification.json` lưu môi trường và SHA-256 source; đối chiếu với mã ở tag `phase-1`. Commit mã cùng bằng chứng rồi gắn đúng tag, không sửa lịch sử.

| Yêu cầu | Bằng chứng | Giới hạn |
|---|---|---|
| Input/tick/move/jump/nhặt/nạp/pulse/safe zone/máu/điểm | `tests.tap` | Unit và CLI test, không phải hidden test giảng viên |
| Thắp đủ 5 đèn, thắng, thưởng một lần | `win.jsonl`, fixture trong `tests/scenarios` | Đèn đưa về cùng vị trí để kiểm chứng đường đi |
| Thắng màn mặc định, không sửa state | `default-play.jsonl`, `default-play-inputs.json`, `verification.json` | Bot input-only qua CLI; không phải video người chơi |
| Pulse/stun/đẩy/cost | `pulse.jsonl` | Scenario riêng |
| Thua hết máu | `no-flames.jsonl` | Scenario riêng |
| Thua bình minh | `dawn.jsonl` | Scenario riêng |
| Determinism | `verification.json`, CLI test | So từng byte hai lần cùng đầu vào |
| Build và phục vụ đầy đủ module | `build.txt`, `verification.json` | Chạy Windows Node 22; CI Linux/macOS chưa chạy trước push |
| Giao diện thực sự vẽ 3D, start, di chuyển/nhảy, trái/phải theo màn hình trước/sau xoay camera, pause/resume, thắng màn mặc định và chơi lại | `browser-qa.json`, `intro.png`, `gameplay.png`, `won.png`, `mobile.png` | 16 kiểm tra Chrome headless/SwiftShader; chưa có số FPS trên GPU laptop hay video demo |

Browser QA cần server `npm start` và Chrome cài sẵn chạy với CDP port 9222, profile riêng, rồi `node scripts/browser-qa.mjs`. Không dùng profile cá nhân. Script chụp ảnh thực qua Chrome, kiểm tra runtime errors và hành vi bằng input thông thường.

Thêm `--full-play` để bot điều khiển bằng keyboard events cho đến hết màn, kiểm tra overlay thắng và nút chơi lại; khi đạt có `won.png` và trường `fullPlay` trong `browser-qa.json`. Kết quả nào thực sự đạt được ghi trực tiếp trong báo cáo.

Chưa có video, Release, test hidden, hoặc xác nhận giảng viên; không ghi các mục đó là đạt.
