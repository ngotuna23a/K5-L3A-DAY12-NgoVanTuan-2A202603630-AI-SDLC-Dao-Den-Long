# Phase 2 — kế hoạch, acceptance criteria và thay đổi

Nguồn nguyên văn: `docs/requirements/phase-2.txt`. Không đưa `ng.txt` lên GitHub. Phase 1 giữ nguyên ở tag `phase-1`.

## Tiêu chí nghiệm thu trước code

| Phần | Acceptance criteria | Kiểm chứng |
|---|---|---|
| Số chuẩn / tick | Tuning khớp Ticket; thứ tự update đúng; same seed/input/scenario → output giống byte | Unit, CLI regression, scenario ordering |
| 3 bản đồ | Đúng số đèn, vị trí, điểm sinh, tầng/dốc/tháp/cầu/bục | Geometry unit test, ảnh từng Đêm |
| Dash | 14 m/s đúng 12 tick, cooldown 90 tick từ đầu, hướng di chuyển hoặc hướng nhìn, trên không giữ Y, không bất tử | Scenario dash và unit |
| Rơi | Ngoài đất rơi dưới −10 mất 1 máu và toàn bộ đom đóm một lần, chờ 60 tick rồi respawn/invuln 90 | Scenario fall/respawn |
| Gió Lạc | Spawn 1200k, tối đa 2, idle/chase/flee, cướp tối đa 3 một lần, pulse trả đồ đúng luật | Scenario drifter/pulse/drop; unit lịch sinh |
| Bùa Gió | Nhặt, 600 tick, chạy 7.2, dash không cooldown, respawn 2700 | Scenario charm, unit hết hiệu lực/respawn |
| Gió Đêm 3 | Báo trước 120 tick, mỗi 1800 tick gió 300 tick, hướng seeded, đẩy 2 m/s | Scenario wind, unit pause/determinism |
| Chuỗi Đêm | Menu → giới thiệu lời Ông Đăng → chơi → kết quả → tiếp; thắng Đêm 3 → Bình Minh tổng điểm 3 Đêm đã thắng; thua replay cùng Đêm | Browser flow + unit campaign |
| Pause | Esc/P, Tiếp tục/Chơi lại/Cài đặt/Menu; sim_tick/timer/spawn/TTL đứng yên khi paused | Scenario pause, browser |
| Settings | Volume, sensitivity giữ sau reload bằng localStorage | Browser persistence |
| Audio | Nhạc nền và các SFX yêu cầu, volume có tác dụng; không lỗi autoplay | Browser Web Audio graph + chơi thử |
| HUD / màu | Vị trí HUD theo ticket, 10 ô, cooldowns, countdown đỏ nhấp nháy, nhắc E và hướng đèn ngoài màn hình; màu theo palette chuẩn | Browser assertions + ảnh |
| Performance | Full headless mỗi Đêm ≤30 s; browser ≥30 FPS trung bình 1280×720 | Benchmark có cấu hình máy; ghi thật nếu GPU không sẵn |

## Quyết định / giả định tại chỗ chưa quy định

- Dùng các module nhỏ: world geometry, simulation, campaign và renderer. Không thêm dependency.
- Góc điểm sinh dùng x=r cosθ, z=r sinθ; duyệt điểm theo góc tăng dần, chọn seeded không lặp. 20 đom đóm đầu đặt ở 20 điểm khác nhau; mảng scenario thay danh sách mặc định.
- Bóng Mực mặc định có tâm ở mặt đất +0.8 m; shade scenario giữ nguyên tâm đã cho. Wander 2 m/s, phát hiện/thoát đuổi theo XZ; hiệu ứng spawning 30 tick không hit. Scenario không chỉ định state thì chase hoạt động ngay, như contract gốc.
- Vùng an toàn dùng XZ kể cả khác tầng. Shade trong vùng được đẩy tuyến tính ra biên trong 30 tick, không hit; các bóng ngoài bị chặn theo giao điểm đoạn/circle, kể cả push/recoil.
- Đêm 3 chưa nêu điểm xuất phát; tâm nằm trong tháp nên chọn (0,0,−30) làm điểm bắt đầu/respawn hợp lệ. Đêm 1/2 (0,0,0). Đây là giả định, không phải yêu cầu gốc; scenario vẫn override được.
- Pickup có chênh cao ≤1.5; interact vẫn đo XZ theo contract gốc vì Ticket không thêm điều kiện độ cao cho đèn. Pulse đo 3D từ chân +0.8 tới tâm.
- Dash giữ vận tốc Y để tiếp tục sau 12 tick khi trên không. Gió vẫn cộng ngang; pad velocity giữ tới tiếp đất, dash tạm override ngang. Đếm cooldown theo sim tick.
- Đom đóm rơi không tính vào trần random 30; TTL 480 tick, có thể nhặt từ sim tick sau. Shade spawn tính từ tick 300 ở mọi Đêm; khoảng tiếp theo 480/420/360. Thực thể mới không tương tác trong tick sinh.
- `night_start` ghi ở bước gameplay đầu tiên, không phát event lúc dựng scenario/tick 0. Pause/resume event dùng tick thực, không dùng sim_tick.
- Timer giảm đầu tick; nút pause false→true ở tick đó dừng gameplay, resume được tiếp tục bước gameplay ngay. Win/no_flames/dawn theo ưu tiên ticket, bonus floor giây còn lại.

## Regression thay thế có lý do

Các assertion Phase 1 về mang 16, đèn 8, pickup chỉ XZ, pulse đẩy tức thì, chặn mép đảo, điểm khi nhặt, miễn thương 2 s và spawn ban đầu không còn hợp lệ: Ticket-02 thay bằng số chuẩn, pickup có height, push 15 tick, rơi/respawn, điểm khi nạp, invuln 90 tick và spawn từ tick 300. Giữ test tick/input/yaw/normalize/edge/determinism/JSONL/exit code; cập nhật số và hành vi đúng luật mới. Bằng chứng cũ trong docs/proof/phase-1 không ghi đè.

## Nhật ký và kết quả

- Đã chuẩn hóa gameplay/geometry, thêm campaign và audio riêng; không cài dependency mới. `ng.txt` được gitignore, bản yêu cầu lưu riêng.
- Kiểm chứng bằng `npm run verify`: unit/CLI regression, 14 scenario nhỏ deterministic và replay thắng Đêm 1 mặc định bằng input thường. Bot thắng ở tick 8344, điểm 1470; không sửa state/scenario. Ban đầu bot dùng pulse quá sớm nên hết thời gian; sửa chiến thuật bot để chỉ dùng khi nguy cấp, không đổi luật game để giúp test thắng.
- Đo full headless các Đêm lần lượt 18.000/19.800/21.600 tick, đều dưới 30 s; số đo chính xác và máy ở `docs/proof/phase-2/verification.json`. Chỉ tăng máu trong benchmark để tránh chết sớm, không tắt lịch sinh hay thay bản đồ.
- Browser QA đã đi qua 23 nhóm kiểm tra: input theo màn hình trước/sau xoay camera, nhảy/dash, pause, settings persist, pad/respawn, charm/drifter/pulse, countdown, campaign 3 Đêm và retry, palette/mobile/runtime errors. Đường thắng UI dùng scenario và chạy simulation thật; đây không phải video người chơi thắng cả 3 Đêm mặc định.
- FPS đo thực tế khoảng 60 ở 1280×720, pixel ratio 1, GPU Intel Iris Xe/D3D11; scene Đêm 3 có 30 đom đóm, 10 Bóng Mực và 6 đèn sáng. Dùng instanced meshes và không dùng shadow maps để giảm draw calls. Báo cáo cuối ghi số đo cụ thể, không suy FPS từ test headless.
- Các lỗi phát hiện/sửa: shade bị ép Y về mặt đất làm sai test 3D → giữ độ cao tương đối qua địa hình; recoil bị thiếu một bước → kiểm tra đủ 60 tick/2 m; pulse bị trì hoãn trong lúc safe-zone expel → vẫn thực hiện push trong 15 tick đầu; pipe PowerShell làm mất dấu tiếng Việt → dùng UTF-8 rõ ràng hoặc apply_patch; biểu thức test trừ tọa độ âm tạo `--` → đặt ngoặc giá trị. Thêm regression cho các chỗ này.
- Retro: viết contract/geometry tests trước renderer giúp bắt sai số tick, height và spawn sớm. Dùng cùng world module cho renderer và simulation; giữ ảnh/test cũ, tạo evidence riêng cho phase mới. Browser QA cần đo cả hướng hiển thị, flow và hiệu năng GPU.
- Token/chi phí: chưa có bộ đếm billing theo phase; ước tính thô khoảng 40–60 nghìn token cho triển khai và kiểm chứng, không phải số đo thực tế. Tiết kiệm bằng Node test/CDP tích hợp, không asset generator/dependency mới, chỉ đọc các file liên quan. Chi phí tiền chưa xác định.
- Tag bàn giao là `phase-2`, chốt theo yêu cầu của người dùng. Kết quả CI cross-platform xem GitHub Actions của commit tương ứng; hidden tests chưa có. Video/Release cuối thuộc bàn giao sau.
