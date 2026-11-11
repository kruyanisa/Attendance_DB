
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

    return Object.freeze({
        version: VERSION,
        showPreview
    });

})();
