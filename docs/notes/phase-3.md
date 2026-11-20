# Phase 3 — ADR 003: dầu đèn và sống tới bình minh

Nguồn: `docs/requirements/phase-3.txt`. Chỉ Ticket-03. Snapshot Phase 2 local trước sửa: `tmp/phase-2-snapshot-7d32045b.zip`. Phase 2 đã commit/push riêng tại `b8bff3a`, tag `phase-2`, CI macOS/Linux đạt. Người dùng đã yêu cầu chốt Phase 3; tag bàn giao là `phase-3`, `ng.txt` vẫn local.

## Quyết định

- Dầu dùng số nguyên đơn vị 1/60, max 6000; hao 1 đơn vị/tick, mỗi bóng drain thêm 5 đơn vị/tick. Chỉ làm tròn một chữ số khi xuất snapshot/event. Scenario fuel làm tròn tới đơn vị 1/60.
- Cập nhật dầu và đèn tắt ở bước timer, trước movement/pickup/deposit. Hết dầu reset deposited nhưng giữ ever_lit. Lần đầu cần 10, thắp lại cần 5; refuel không tăng successful_lights.
- Chọn đèn nhận được gần nhất theo XZ rồi numeric id; ceil refuel dùng dầu nguyên chưa làm tròn. Đèn fuel=100 tại snapshot 0 hao 1/60 trước bước E nên có thể nhận 1 đom đóm; đây là hệ quả thứ tự tick.
- Shield chỉ có khi lit và fuel≥30. Wander ưu tiên đèn yếu, rồi đèn tắt; chase giữ mục tiêu Mây. Drain đứng yên, giữ target id; hết stun về wander trước khi đánh giá AI ở tick sau.
- Bước 2 hút dầu theo state drain từ bước trước. Vào drain ở AI thì hút từ tick sau; fuel_drain ghi mỗi 60 bước hút liên tiếp của từng bóng, pause đóng băng. Refuel lên ≥30 dừng drain và khôi phục expulsion 30 tick.
- Bình minh xét sau toàn bộ cập nhật cuối tick: no_flames ưu tiên, rồi còn sống và lit≥ceil(0.6×tổng) thì won/dawn_survived. Không còn all_lit/early win. Bonus chỉ tính một lần từ đèn/fuel/máu cuối, bỏ thưởng thời gian.
- Bonus floor dùng dầu thật chưa làm tròn: ví dụ fuel=99.9833 xuất snapshot 100.0 nhưng floor cho điểm là 99.
- Successful lights tăng khi thắp, kể cả relight; prelit scenario không tính. Capacity=10+2×count, max20; Game mới reset. Snapshot công bố capacity.
- Chế độ dễ phân biệt lưu cùng settings, không ảnh hưởng headless. Shape giấy xẹp/rách và nhấp nháy dầu thấp hoạt động cả khi không phân biệt màu.

## Acceptance criteria và regression

| Yêu cầu | Kiểm chứng |
|---|---|
| Hao chính xác/tắt/reset/ever_lit | Unit 6000 bước, boundary fuel, pause, scenario out |
| Refuel/relight/chọn đèn | Ceil/max100/no-op full, khoảng cách/id, scenario refuel/relight |
| Drain/stack/target/transitions | Scenario drain, chase, pulse, refuel và expulsion |
| Dawn/ưu tiên/no early win | Scenario dawn-win/loss/final-hit; ngưỡng 3/5,4/6,5/7 |
| Capacity và điểm chuẩn | Scenario capacity; prelit/reset, relight, drain pulse tổng15, final floor |
| UI dầu/shape/1 Hz/mù màu | Browser, screenshot, settings reload, runtime errors |
| Luật cũ còn hiệu lực | Movement/dash/drop/pads/drifter/charm/wind/pause/CLI/determinism |

Test early win/all_lit và điểm cũ được thay bằng dawn; cap cố định đổi thành base/dynamic capacity; safe zone vĩnh viễn đổi thành fuel≥30. Những test còn hiệu lực giữ lại, dùng thời lượng mới. Không skip âm thầm. Evidence Phase 1–2 giữ nguyên, Phase 3 ghi riêng.

## Nhật ký và kết quả

- Đạt 65 unit/CLI test, 28 kịch bản deterministic (mỗi output so hai lần), build và HTTP smoke. Bot trên Đêm 1 mặc định sống tới dawn ở tick 14400, won/dawn_survived, điểm1595; chỉ phát input, không sửa state/scenario.
- 29 kiểm tra Chrome đạt: regression điều khiển/pause/settings/3Đêm, thêm capacity/không early win/fuel bars/shape/blink1Hz/mù màu persist. Đường thắng UI dùng fixture thời gian ngắn, được ghi rõ, không coi là người chơi hoàn thành3Đêm mặc định.
- Headless đủ thời lượng mỗi Đêm lần đo cuối khoảng0.98/1.12/2.15s; FPS đo6s tại1280×720 khoảng60 trên Intel Iris Xe/D3D11. Số đo chính xác, cấu hình và hash source nằm trong verification.json/browser-qa.json.
- Lỗi phát hiện khi kiểm chứng: toast từ scenario cũ còn hiện khi đổi Đêm/scenario → clear khi bind Game mới; kiểm tra lại hình đèn tắt rách/xẹp, viền/mắt xanh và icon trắng bằng screenshot Chrome thật. Không đổi luật để giúp bot/test đạt.
- Retro: dầu nguyên giúp assert chính xác tại0/30/100 và full6000tick; tách successful_lights khỏi prelit; dùng test tick cuối để bảo vệ thứ tự out→relight→dawn/no_flames. Những test Phase2 không còn đúng được sửa có lý do ở ADR/changelog, không skip.
- Token/chi phí: không có bộ đếm billing theo phase; ước tính thô20–35nghìn token, không phải đo thực tế; chi phí tiền chưa xác định. Dùng lại module/harness/Chrome/Node, không cài dependency/asset generator mới.
- Khi kiểm chứng trước push, Node tự dò cả tests trong checkout Phase 2 ở tmp, dẫn đến chạy nhầm assertion cũ. Đã giới hạn package test/verify vào ba file test của dự án, giữ đủ 65 test và không skip; checkout cũ không bị xóa hay đưa vào commit.
- Phase 3 chốt theo yêu cầu với tag `phase-3`; CI xem GitHub Actions theo commit. Hidden tests chưa có; Ticket-04 không được triển khai trong yêu cầu này. Sau mỗi phase luôn nhắc người dùng chốt commit/push/tag.
