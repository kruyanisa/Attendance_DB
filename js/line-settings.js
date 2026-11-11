
"use strict";

// =====================================================
// LINE Settings — Shared Module for 4 Roles
// Admin / Teacher / Parent / Student
//
// ทุก Role เห็นเมนู LINE ในหน้า Settings
// เปิดการเชื่อมจริงเฉพาะ Teacher ในระยะแรก
//
// FUTURE:
// เพิ่มการรองรับ Role อื่นในโมดูลกลางนี้
// โดยตรวจ Backend / RPC / สิทธิ์ก่อนเปิดปุ่ม
// ห้ามใช้ Teacher RPC กับ Role อื่นโดยตรง
// ห้ามสร้าง LINE Identity ซ้ำตาม Role
// =====================================================

const LineSettings = (() => {

    let openRequestId = 0;

    const SUPPORTED_ROLES = [
        "Admin",
        "Teacher",
        "Parent",
        "Student"
    ];

    async function open() {
        const requestId = ++openRequestId;

        const section = document.getElementById(
            "teacher-line-settings"
        );

        const divider = document.getElementById(
            "teacher-line-settings-divider"
        );

        const status = document.getElementById(
            "teacher-line-settings-status"
        );

        const button = document.getElementById(
            "teacher-line-connect-button"
        );

        const message = document.getElementById(
            "teacher-line-settings-message"
        );

        if (!section || !status || !button || !message) {
            console.warn(
                "LineSettings: ไม่พบส่วน LINE ในหน้า Settings"
            );
            return;
        }

        // Reset ทุกครั้งก่อนตรวจบัญชี
        section.style.display = "none";

        if (divider) {
            divider.style.display = "none";
        }

        button.style.display = "";
        button.disabled = true;
        button.onclick = null;

        status.textContent = "กำลังตรวจสอบสิทธิ์...";
        message.textContent = "";

        try {
            if (typeof getCurrentUserRole !== "function") {
                throw new Error("ROLE_CHECK_UNAVAILABLE");
            }

            const role = await getCurrentUserRole();

            if (requestId !== openRequestId) {
                return;
            }

            // ไม่แสดง LINE สำหรับ Role ที่ไม่รู้จัก
            if (!SUPPORTED_ROLES.includes(role)) {
                return;
            }

            // ทุก Role ที่รองรับเห็นส่วน LINE
            section.style.display = "block";

            if (divider) {
                divider.style.display = "block";
            }

            // Role ที่ยังไม่ได้เปิดระบบเชื่อม LINE
            if (role !== "Teacher") {
                status.textContent =
                    "ยังไม่เปิดให้เชื่อมบัญชี LINE สำหรับ " +
                    role;

                message.textContent =
                    "ระบบกำลังเตรียมรองรับการเชื่อม LINE " +
                    "สำหรับบัญชี " + role +
                    " โดยยังไม่เปิดลงทะเบียนในขณะนี้";

                button.disabled = true;
                button.onclick = null;

                return;
            }

            // Teacher เท่านั้นที่เรียก RPC นี้
            status.textContent =
                "กำลังตรวจสอบสถานะ LINE...";

            const { data, error } = await supabaseClient.rpc(
                "line_get_my_connection_status"
            );

            if (requestId !== openRequestId) {
                return;
            }

            if (error) {
                throw error;
            }

            switch (data) {

                case "NOT_LINKED":
                    status.textContent =
                        "ยังไม่ได้เชื่อมบัญชี LINE";

                    message.textContent =
                        "คุณสามารถเริ่มเชื่อม LINE " +
                        "เพื่อส่งคำขอให้ Admin ตรวจสอบและอนุมัติ";

                    button.disabled = false;

                    button.onclick = () => {
                        window.location.assign(
                            "line-connect.html"
                        );
                    };
                    break;

                case "EXPIRED_PENDING":
                    status.textContent =
                        "คำขอเชื่อม LINE หมดอายุ";

                    message.textContent =
                        "คำขอเดิมหมดอายุแล้ว " +
                        "คุณสามารถเริ่มเชื่อมบัญชี LINE ใหม่ได้";

                    button.disabled = false;

                    button.onclick = () => {
                        window.location.assign(
                            "line-connect.html"
                        );
                    };
                    break;

                case "PENDING":
                    status.textContent =
                        "รอผู้ดูแลระบบอนุมัติ";

                    message.textContent =
                        "ส่งคำขอเชื่อม LINE แล้ว " +
                        "กรุณารอ Admin ตรวจสอบและอนุมัติ";

                    button.disabled = true;
                    break;

                case "LINKED":
                    status.textContent =
                        "✅ เชื่อมบัญชี LINE แล้ว";

                    message.textContent =
                        "หากต้องการเปลี่ยนบัญชี LINE " +
                        "กรุณาติดต่อ Admin เพื่อยกเลิก" +
                        "การเชื่อมเดิมก่อนลงทะเบียนใหม่";

                    button.style.display = "none";
                    button.disabled = true;
                    break;

                default:
                    throw new Error("UNKNOWN_LINE_STATUS");
            }

        } catch (error) {
            if (requestId !== openRequestId) {
                return;
            }

            console.error(
                "LineSettings: ตรวจสอบสถานะ LINE ไม่สำเร็จ",
                error
            );

            // แสดงข้อผิดพลาดเฉพาะกรณีที่
            // ส่วน LINE ผ่านการตรวจ Role และเปิดแล้ว
            if (section.style.display === "block") {
                status.textContent =
                    "ไม่สามารถตรวจสอบสถานะ LINE ได้";

                message.textContent =
                    "กรุณาตรวจสอบการเชื่อมต่อระบบ " +
                    "หรือติดต่อผู้ดูแลระบบ";
            }

            button.disabled = true;
            button.onclick = null;
        }
    }

    return Object.freeze({
        open
    });

})();
