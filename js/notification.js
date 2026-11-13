
/**
 * LINE.4.05 — LINE Attendance Alert
 *
 * Phase 1: Preview UI only
 *
 * ยังไม่เรียก LINE API
 * ยังไม่บันทึกข้อมูล Supabase
 * ยังไม่แก้ไขข้อมูลการเช็กชื่อ
 */

const NotificationModule = (() => {
    "use strict";

    const VERSION = "LINE.4.05";

    // ปิดการส่ง LINE จริงไว้ในขั้นตอนนี้
    const REAL_DELIVERY_ENABLED = false;

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );
    }

    function getPreviewData() {
        return {
            activityName: "กิจกรรมหน้าเสาธง",
            roomName: "ม.2/2",
            studentName: "นักเรียนตัวอย่าง",
            attendanceStatus: "ขาด",
            recipients: [
                {
                    id: "parent",
                    name: "ผู้ปกครองหลัก",
                    description: "ผู้ปกครองของนักเรียน"
                },
                {
                    id: "main-teacher",
                    name: "ครู Yanisa",
                    description: "ครูผู้รับผิดชอบ"
                },
                {
                    id: "co-teacher",
                    name: "ครู C",
                    description: "ครูที่ปรึกษาร่วม"
                }
            ]
        };
    }

    async function showPreview() {
        if (typeof Swal === "undefined") {
            console.error(
                "NotificationModule: SweetAlert2 not loaded"
            );
            return;
        }

        const data = getPreviewData();

        const recipientHtml = data.recipients.map(item => `
            <label style="
                display:flex;
                align-items:center;
                gap:12px;
                padding:13px;
                margin-bottom:9px;
                border:1px solid #dbe4ef;
                border-radius:12px;
                background:#f8fafc;
                cursor:pointer;
            ">
                <input
                    type="checkbox"
                    class="line-alert-recipient"
                    value="${escapeHtml(item.id)}"
                    checked
                    style="
                        width:19px;
                        height:19px;
                        accent-color:#2563eb;
                        flex-shrink:0;
                    "
                >

                <span style="flex:1;min-width:0;">
                    <strong style="
                        display:block;
                        color:#1e293b;
                        font-size:14px;
                    ">
                        ${escapeHtml(item.name)}
                    </strong>

                    <small style="
                        color:#64748b;
                        font-size:12px;
                    ">
                        ${escapeHtml(item.description)}
                    </small>
                </span>

                <span aria-hidden="true">📱</span>
            </label>
        `).join("");

        const result = await Swal.fire({
            title: "LINE Alert",
            width: 500,
            heightAuto: false,

            html: `
                <div style="
                    text-align:left;
                    font-family:inherit;
                    max-height:65vh;
                    overflow-y:auto;
                    padding:2px;
                ">

                    <div style="
                        padding:16px;
                        border-radius:14px;
                        background:linear-gradient(
                            135deg,#eff6ff,#f5f3ff
                        );
                        border:1px solid #dbeafe;
                        margin-bottom:17px;
                    ">
                        <div style="
                            font-size:12px;
                            font-weight:700;
                            color:#4f46e5;
                            margin-bottom:9px;
                        ">
                            🔔 ATTENDANCE NOTIFICATION
                        </div>

                        <div style="
                            font-weight:700;
                            color:#0f172a;
                            margin-bottom:6px;
                        ">
                            ${escapeHtml(data.activityName)}
                            — ${escapeHtml(data.roomName)}
                        </div>

                        <div style="
                            color:#334155;
                            font-size:14px;
                            margin-bottom:5px;
                        ">
                            นักเรียน:
                            <strong>
                                ${escapeHtml(data.studentName)}
                            </strong>
                        </div>

                        <div style="
                            color:#334155;
                            font-size:14px;
                        ">
                            สถานะ:
                            <strong style="color:#dc2626;">
                                ${escapeHtml(data.attendanceStatus)}
                            </strong>
                        </div>
                    </div>

                    <div style="
                        font-size:14px;
                        font-weight:700;
                        color:#1e293b;
                        margin-bottom:11px;
                    ">
                        👥 เลือกผู้รับ LINE
                    </div>

                    ${recipientHtml}

                    <div style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:10px;
                        padding:12px 14px;
                        background:#f1f5f9;
                        border-radius:11px;
                        margin-top:14px;
                    ">
                        <span style="
                            font-size:13px;
                            color:#475569;
                        ">
                            ผู้รับที่เลือก
                        </span>

                        <strong
                            id="line-alert-selected-count"
                            style="color:#2563eb;"
                        >
                            3 คน
                        </strong>
                    </div>

                    <div style="
                        margin-top:14px;
                        padding:11px 13px;
                        border-radius:10px;
                        background:#fff7ed;
                        border:1px solid #fed7aa;
                        color:#9a3412;
                        font-size:12px;
                        line-height:1.7;
                    ">
                        🧪 โหมดทดลองหน้าต่างเท่านั้น
                        <br>
                        รายชื่อเป็นข้อมูลตัวอย่าง
                        ยังไม่ได้ตรวจ LINE Identity
                        และจะไม่มีการส่งข้อความจริง
                    </div>

                </div>
            `,

            showCancelButton: true,
            confirmButtonText: "🔔 ทดลองยืนยัน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,
            focusConfirm: false,

            didOpen: () => {
                const checkboxes = Array.from(
                    document.querySelectorAll(
                        ".line-alert-recipient"
                    )
                );

                const countElement =
                    document.getElementById(
                        "line-alert-selected-count"
                    );

                const confirmButton =
                    Swal.getConfirmButton();

                function updateCount() {
                    const count = checkboxes.filter(
                        checkbox => checkbox.checked
                    ).length;

                    if (countElement) {
                        countElement.textContent =
                            `${count} คน`;
                    }

                    if (confirmButton) {
                        confirmButton.disabled = count === 0;
                    }
                }

                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener(
                        "change",
                        updateCount
                    );
                });

                updateCount();
            },

            preConfirm: () => {
                const selected = Array.from(
                    document.querySelectorAll(
                        ".line-alert-recipient:checked"
                    )
                ).map(checkbox => checkbox.value);

                if (selected.length === 0) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกผู้รับอย่างน้อย 1 คน"
                    );
                    return false;
                }

                return selected;
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const selectedIds = result.value || [];

        const selectedNames = data.recipients
            .filter(item => selectedIds.includes(item.id))
            .map(item => item.name);

        // ขั้นตอนนี้ไม่มีคำสั่งส่งข้อความ
        if (!REAL_DELIVERY_ENABLED) {
            await Swal.fire({
                icon: "info",
                title: "ทดลองยืนยันสำเร็จ",
                html: `
                    <div style="line-height:1.8;">
                        เลือกผู้รับ
                        <strong>${selectedNames.length}</strong>
                        คน
                        <div style="margin-top:12px;">
                            ${selectedNames
                                .map(escapeHtml)
                                .join("<br>")}
                        </div>
                        <p style="
                            color:#64748b;
                            font-size:13px;
                            margin-top:15px;
                        ">
                            ไม่มีการส่ง LINE จริง
                            และไม่มีการเปลี่ยนแปลงฐานข้อมูล
                        </p>
                    </div>
                `,
                confirmButtonText: "ตกลง"
            });
        }
    }

    // ============================================================
    // LINE-ALERT.1O-13
    // Attendance LINE Alert — Manual Request
    //
    // - Preview real attendance data
    // - Select primary parent and responsible teachers
    // - Supports multiple co-teachers
    // - Confirm before creating Event / Queue
    // - Does not call LINE Push directly
    // ============================================================

    async function showAttendancePreview(attendanceId) {

        if (typeof Swal === "undefined") {
            console.error("SweetAlert2 is not available");
            return;
        }

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            await Swal.fire(
                "เกิดข้อผิดพลาด",
                "ไม่พบการเชื่อมต่อ Supabase",
                "error"
            );
            return;
        }

        const id = String(attendanceId ?? "").trim();

        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(id)) {
            await Swal.fire(
                "ไม่สามารถแสดงข้อมูล",
                "รหัสรายการเช็กชื่อไม่ถูกต้อง",
                "warning"
            );
            return;
        }

        const statusNames = {
            ABSENT: "ขาดเรียน",
            LATE: "มาสาย",
            SICK: "ลาป่วย",
            PERSONAL: "ลากิจ"
        };

        const reasonMessages = {
            TEACHER_NOT_AUTHORIZED:
                "บัญชีนี้ไม่มีสิทธิ์แจ้งเตือนรายการนี้",
            RECORD_NOT_ACTIVE:
                "รายการเช็กชื่อไม่ได้ใช้งานแล้ว",
            STUDENT_NOT_ACTIVE:
                "นักเรียนไม่ได้อยู่ในสถานะใช้งาน",
            STATUS_NOT_ALERTABLE:
                "สถานะนี้ไม่รองรับการแจ้งเตือน",
            SEMESTER_NOT_SUPPORTED:
                "ภาคเรียนนี้ยังไม่รองรับ LINE Alert",
            DATE_OUTSIDE_SEMESTER:
                "วันที่เช็กชื่ออยู่นอกภาคเรียน",
            INVALID_SESSION_TYPE:
                "ประเภทคาบเรียนไม่ถูกต้อง",
            CLASS_SCHEDULE_NOT_VALID:
                "ตารางสอนไม่ตรงกับวันที่เช็กชื่อ",
            ACTIVITY_SCHEDULE_NOT_VALID:
                "ตารางกิจกรรมไม่ตรงกับวันที่เช็กชื่อ",
            STUDENT_NOT_IN_LESSON:
                "นักเรียนไม่ได้อยู่ในคาบหรือกิจกรรม",
            ALERT_ALREADY_REQUESTED:
                "รายการนี้เคยขอส่ง LINE Alert แล้ว"
        };

        try {

            Swal.fire({
                title: "กำลังตรวจสอบ LINE Alert...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            // 1. Read-only Preview RPC
            const { data, error } =
                await supabaseClient.rpc(
                    "line_preview_attendance_alert",
                    {
                        p_attendance_id: id
                    }
                );

            if (error) {
                throw error;
            }

            Swal.close();

            if (!data || data.eligible !== true) {

                const reason = data?.reason || "UNKNOWN";

                await Swal.fire({
                    icon: "warning",
                    title: "ไม่สามารถส่ง LINE Alert",
                    text:
                        reasonMessages[reason] ||
                        "รายการนี้ยังไม่พร้อมสำหรับการแจ้งเตือน",
                    confirmButtonText: "ตกลง"
                });

                return;
            }

            const rawRecipients =
                Array.isArray(data.recipients)
                    ? data.recipients
                    : [];

            // Accept only valid parent/teacher IDs.
            // Use exactly the IDs returned by Preview RPC.
            const recipients = rawRecipients
                .map(item => ({
                    id: String(item.recipient_id ?? "").trim(),
                    type: String(item.recipient_type ?? ""),
                    name: String(item.display_name ?? "-"),
                    connected: item.line_connected === true
                }))
                .filter(item =>
                    uuidPattern.test(item.id) &&
                    (
                        item.type === "PARENT" ||
                        item.type === "TEACHER"
                    )
                );

            const seen = new Set();

            if (
                recipients.length !== rawRecipients.length ||
                recipients.some(item => {
                    const key = `${item.type}:${item.id}`;
                    if (seen.has(key)) {
                        return true;
                    }
                    seen.add(key);
                    return false;
                })
            ) {
                await Swal.fire({
                    icon: "error",
                    title: "ข้อมูลผู้รับไม่ถูกต้อง",
                    text: "กรุณาติดต่อผู้ดูแลระบบ",
                    confirmButtonText: "ตกลง"
                });
                return;
            }

            const connectedCount =
                recipients.filter(item => item.connected).length;

            if (connectedCount === 0) {
                await Swal.fire({
                    icon: "warning",
                    title: "ยังไม่มีผู้รับที่พร้อม",
                    text: "ไม่พบบัญชี LINE ที่เชื่อมต่อและผ่านการตรวจสอบ",
                    confirmButtonText: "ตกลง"
                });
                return;
            }

            const lessonLabel =
                data.lesson_type === "ACTIVITY"
                    ? "กิจกรรม"
                    : "วิชา";

            const lessonNoHtml =
                data.lesson_no !== null &&
                data.lesson_no !== undefined
                    ? `<div>คาบ: ${escapeHtml(data.lesson_no)}</div>`
                    : "";

            const startTime =
                data.start_time
                    ? String(data.start_time).slice(0, 5)
                    : "";

            const endTime =
                data.end_time
                    ? String(data.end_time).slice(0, 5)
                    : "";

            const lessonTime =
                startTime && endTime
                    ? `${startTime}–${endTime} น.`
                    : "-";

            // Every teacher returned by Preview is shown.
            // This includes co-teachers when DB lists them.
            const recipientHtml = recipients.map(item => {

                const roleName =
                    item.type === "PARENT"
                        ? "ผู้ปกครองหลัก"
                        : "ครูผู้รับผิดชอบ / ครูสอนร่วม";

                return `
                    <label style="
                        display:flex;
                        align-items:center;
                        gap:12px;
                        padding:12px;
                        margin-bottom:8px;
                        border:1px solid #dbe4ef;
                        border-radius:10px;
                        background:#f8fafc;
                        opacity:${item.connected ? "1" : "0.6"};
                    ">
                        <input
                            type="checkbox"
                            class="line-alert-live-recipient"
                            data-recipient-id="${escapeHtml(item.id)}"
                            data-recipient-type="${escapeHtml(item.type)}"
                            ${item.connected ? "checked" : "disabled"}
                            style="width:18px;height:18px;"
                        >

                        <span style="flex:1;min-width:0;">
                            <strong style="display:block;">
                                ${escapeHtml(item.name)}
                            </strong>
                            <small style="color:#64748b;">
                                ${escapeHtml(roleName)}
                            </small>
                        </span>

                        <small>
                            ${item.connected
                                ? "✅ เชื่อม LINE"
                                : "⚠️ ยังไม่เชื่อม LINE"}
                        </small>
                    </label>
                `;
            }).join("");

            const html = `
                <div style="
                    text-align:left;
                    line-height:1.7;
                    max-height:65vh;
                    overflow-y:auto;
                ">
                    <div style="
                        padding:14px;
                        border-radius:12px;
                        background:#eff6ff;
                        margin-bottom:15px;
                    ">
                        <strong>🔔 Attendance Alert</strong>

                        <div>
                            นักเรียน:
                            <strong>
                                ${escapeHtml(data.student_name)}
                            </strong>
                        </div>

                        <div>
                            รหัสนักเรียน:
                            ${escapeHtml(data.student_code)}
                        </div>

                        <div>
                            ${escapeHtml(lessonLabel)}:
                            <strong>
                                ${escapeHtml(data.lesson_name || "-")}
                            </strong>
                        </div>

                        ${lessonNoHtml}

                        <div>
                            เวลา: ${escapeHtml(lessonTime)}
                        </div>

                        <div>
                            วันที่:
                            ${escapeHtml(data.attendance_date)}
                        </div>

                        <div>
                            สถานะ:
                            <strong style="color:#dc2626;">
                                ${escapeHtml(
                                    statusNames[data.attendance_status] ||
                                    data.attendance_status
                                )}
                            </strong>
                        </div>
                    </div>

                    <strong>👥 เลือกผู้รับ LINE</strong>

                    <div style="margin-top:10px;">
                        ${recipientHtml}
                    </div>

                    <div style="
                        margin-top:12px;
                        color:#475569;
                    ">
                        ผู้รับที่เลือก:
                        <strong id="line-live-selected-count">0</strong>
                        คน
                    </div>

                    <div style="
                        margin-top:15px;
                        padding:12px;
                        background:#fff7ed;
                        border-radius:10px;
                        color:#9a3412;
                        font-size:12px;
                    ">
                        ⚠️ การยืนยันจะสร้างคำขอแจ้งเตือนจริง
                        ใน Supabase และไม่สามารถสร้างคำขอซ้ำ
                        สำหรับรายการเช็กชื่อเดียวกันได้
                    </div>
                </div>
            `;

            // 2. Choose recipients
            const result = await Swal.fire({
                title: "LINE Alert",
                html,
                width: 500,
                heightAuto: false,
                showCancelButton: true,
                confirmButtonText: "🔔 ยืนยันส่ง LINE",
                cancelButtonText: "ยกเลิก",
                confirmButtonColor: "#2563eb",
                focusConfirm: false,

                didOpen: () => {

                    const popup = Swal.getPopup();

                    const checkboxes = Array.from(
                        popup.querySelectorAll(
                            ".line-alert-live-recipient"
                        )
                    );

                    const countElement =
                        popup.querySelector(
                            "#line-live-selected-count"
                        );

                    const confirmButton =
                        Swal.getConfirmButton();

                    function updateCount() {
                        const count = checkboxes.filter(
                            checkbox =>
                                checkbox.checked &&
                                !checkbox.disabled
                        ).length;

                        if (countElement) {
                            countElement.textContent = count;
                        }

                        if (confirmButton) {
                            confirmButton.disabled =
                                count < 1 || count > 10;
                        }
                    }

                    checkboxes.forEach(checkbox => {
                        checkbox.addEventListener(
                            "change",
                            updateCount
                        );
                    });

                    updateCount();
                },

                preConfirm: () => {

                    const popup = Swal.getPopup();

                    const selected = Array.from(
                        popup.querySelectorAll(
                            ".line-alert-live-recipient:checked:not(:disabled)"
                        )
                    ).map(checkbox => ({
                        recipient_id:
                            checkbox.dataset.recipientId,
                        recipient_type:
                            checkbox.dataset.recipientType
                    }));

                    if (
                        selected.length < 1 ||
                        selected.length > 10
                    ) {
                        Swal.showValidationMessage(
                            "กรุณาเลือกผู้รับ 1–10 คน"
                        );
                        return false;
                    }

                    const allowed = new Set(
                        recipients
                            .filter(item => item.connected)
                            .map(item => `${item.type}:${item.id}`)
                    );

                    const selectedKeys = selected.map(
                        item =>
                            `${item.recipient_type}:${item.recipient_id}`
                    );

                    if (
                        new Set(selectedKeys).size !==
                            selectedKeys.length ||
                        selectedKeys.some(key => !allowed.has(key))
                    ) {
                        Swal.showValidationMessage(
                            "รายชื่อผู้รับไม่ตรงกับข้อมูลที่ตรวจสอบ"
                        );
                        return false;
                    }

                    return selected;
                }
            });

            if (!result.isConfirmed) {
                return;
            }

            const selected = result.value || [];

            const parentIds = selected
                .filter(item =>
                    item.recipient_type === "PARENT"
                )
                .map(item => item.recipient_id);

            const teacherIds = selected
                .filter(item =>
                    item.recipient_type === "TEACHER"
                )
                .map(item => item.recipient_id);

            const selectedNames = selected.map(item => {
                const match = recipients.find(recipient =>
                    recipient.id === item.recipient_id &&
                    recipient.type === item.recipient_type
                );
                return match?.name || "-";
            });

            // 3. Explicit second confirmation
            // LINE-ALERT.1O-16
            // Organized final confirmation.
            // Display recipient names and roles.

            const selectedRecipientsHtml = selected.map(item => {
                const match = recipients.find(recipient =>
                    recipient.id === item.recipient_id &&
                    recipient.type === item.recipient_type
                );

                const name = match?.name || "-";

                const roleLabel =
                    item.recipient_type === "PARENT"
                        ? "ผู้ปกครองหลัก"
                        : "ครูผู้รับผิดชอบ / ครูสอนร่วม";

                const roleIcon =
                    item.recipient_type === "PARENT"
                        ? "👨‍👩‍👧"
                        : "👩‍🏫";

                return `
                    <div style="
                        display:flex;
                        align-items:center;
                        gap:12px;
                        padding:12px;
                        margin-bottom:8px;
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        text-align:left;
                    ">
                        <span style="font-size:24px;">
                            ${roleIcon}
                        </span>

                        <div style="flex:1;min-width:0;">
                            <strong style="
                                display:block;
                                font-size:14px;
                                color:#1e293b;
                                overflow-wrap:anywhere;
                            ">
                                ${escapeHtml(name)}
                            </strong>

                            <small style="
                                display:block;
                                color:#64748b;
                                font-size:12px;
                            ">
                                ${escapeHtml(roleLabel)}
                            </small>
                        </div>

                        <span style="color:#16a34a;">
                            ✅
                        </span>
                    </div>
                `;
            }).join("");

            const confirmation = await Swal.fire({
                icon: "question",
                title: "ยืนยันส่ง LINE Alert",
                width: 520,
                heightAuto: false,

                html: `
                    <div style="
                        text-align:left;
                        line-height:1.7;
                        max-height:65vh;
                        overflow-y:auto;
                    ">

                        <div style="
                            background:#eff6ff;
                            border-radius:12px;
                            padding:14px;
                            margin-bottom:16px;
                        ">
                            <strong style="
                                display:block;
                                margin-bottom:10px;
                                color:#1e40af;
                            ">
                                📋 ข้อมูลการแจ้งเตือน
                            </strong>

                            <div>
                                นักเรียน:
                                <strong>
                                    ${escapeHtml(data.student_name)}
                                </strong>
                            </div>

                            <div>
                                รหัสนักเรียน:
                                ${escapeHtml(data.student_code)}
                            </div>

                            <div>
                                สถานะ:
                                <strong style="color:#dc2626;">
                                    ${escapeHtml(
                                        statusNames[data.attendance_status] ||
                                        data.attendance_status
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div style="
                            font-weight:700;
                            margin-bottom:10px;
                            color:#1e293b;
                        ">
                            👥 ผู้รับแจ้งเตือน
                            (${selected.length} คน)
                        </div>

                        ${selectedRecipientsHtml}

                        <div style="
                            margin-top:15px;
                            padding:12px;
                            background:#fff7ed;
                            border:1px solid #fed7aa;
                            border-radius:10px;
                            color:#9a3412;
                            font-size:12px;
                        ">
                            ⚠️ เมื่อยืนยัน ระบบจะสร้าง
                            Notification Event
                            และบันทึกรายการผู้รับจริงใน Supabase

                            <br>

                            การดำเนินการนี้ไม่ใช่ Preview
                            และไม่สามารถสร้างคำขอซ้ำสำหรับ
                            รายการเช็กชื่อเดิมได้
                        </div>
                    </div>
                `,

                showCancelButton: true,
                confirmButtonText: "🔔 ยืนยันสร้างคำขอ",
                cancelButtonText: "กลับไป",
                confirmButtonColor: "#dc2626",
                reverseButtons: true,
                focusConfirm: false
            });

            if (!confirmation.isConfirmed) {
                return;
            }

            // 4. Create Event + selected recipients.
            // This RPC does NOT send LINE directly.
            Swal.fire({
                title: "กำลังบันทึกคำขอ...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            const {
                data: requestResult,
                error: requestError
            } = await supabaseClient.rpc(
                "line_request_attendance_alert",
                {
                    p_attendance_id: id,
                    p_parent_ids: parentIds,
                    p_teacher_ids: teacherIds
                }
            );

            if (requestError) {
                throw requestError;
            }

            if (
                !requestResult ||
                requestResult.ok !== true ||
                requestResult.status !== "QUEUED" ||
                requestResult.recipient_count !== selected.length
            ) {
                throw new Error(
                    "LINE_ALERT_REQUEST_RESULT_INVALID"
                );
            }

            Swal.close();

            // 5. Report QUEUED, not DELIVERED.
            await Swal.fire({
                icon: "success",
                title: "สร้างคำขอแจ้งเตือนสำเร็จ",
                html: `
                    <div style="line-height:1.8;">
                        บันทึกผู้รับแล้ว
                        <strong>${selected.length} คน</strong>
                        <p style="
                            color:#64748b;
                            margin-top:12px;
                            font-size:13px;
                        ">
                            สถานะ: รอการส่ง (QUEUED)
                            <br>
                            ยังไม่ได้ยืนยันว่า LINE ได้รับข้อความ
                        </p>
                    </div>
                `,
                confirmButtonText: "ตกลง"
            });

        } catch (error) {

            Swal.close();

            const errorMessage =
                String(error?.message || "");

            const isDuplicate =
                errorMessage.includes(
                    "ALERT_ALREADY_REQUESTED"
                ) ||
                errorMessage.includes(
                    "duplicate key"
                );

            console.error(
                "LINE ATTENDANCE REQUEST ERROR:",
                error
            );

            await Swal.fire({
                icon: isDuplicate ? "warning" : "error",
                title: isDuplicate
                    ? "รายการนี้เคยขอแจ้งเตือนแล้ว"
                    : "ไม่สามารถสร้างคำขอแจ้งเตือน",
                text: isDuplicate
                    ? "ไม่สามารถสร้างคำขอซ้ำสำหรับรายการเช็กชื่อเดียวกัน"
                    : "ระบบไม่สามารถบันทึกคำขอได้ กรุณาตรวจสอบสถานะก่อนลองอีกครั้ง",
                confirmButtonText: "ตกลง"
            });
        }
    }

    // ============================================================
    // Export Notification Module
    // ============================================================

    return Object.freeze({
        version: VERSION,
        showPreview,
        showAttendancePreview
    });

})();