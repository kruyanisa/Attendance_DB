
"use strict";

// =====================================================
// LINE.08.9.G.21.A
// LINE Management Module
//
// Admin LINE Registration Requests
// READ ONLY
//
// Future:
// - Parent LINE status
// - Approve / Reject
// - Revoke LINE identity
// - Teacher LINE management
// =====================================================

const LineManagement = (() => {

    let loading = false;

    // -------------------------------------------------
    // DOM Helpers
    // -------------------------------------------------

    function createElement(tag, value = "") {
        const element = document.createElement(tag);

        if (value !== null && value !== undefined) {
            element.textContent = String(value);
        }

        return element;
    }

    function showMessage(target, message) {
        target.replaceChildren(
            createElement("p", message)
        );
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }
    // =================================================
    // LINE.08.9.G.24
    // Admin LINE Registration Review
    // APPROVE / REJECT via secured RPC
    // =================================================

    function renderLineReviewPreview(target, candidates, request) {

        const panel = createElement("div");

        panel.style.cssText = [
            "margin-top:18px",
            "padding:16px",
            "border:1px solid #cbd5e1",
            "border-radius:12px",
            "background:#ffffff",
            "display:grid",
            "gap:12px",
            "white-space:normal",
            "min-width:0"
        ].join(";");

        const heading = createElement(
            "strong",
            "ตรวจสอบและพิจารณาคำขอ LINE"
        );

        heading.style.fontSize = "16px";
        panel.append(heading);

        const applicant = createElement(
            "p",
            "ชื่อที่ผู้ยื่นกรอก: " +
            request.submitted_parent_name
        );

        panel.append(applicant);

        const label = createElement(
            "label",
            "เลือกผู้ปกครองจากฐานข้อมูลโรงเรียน"
        );

        label.style.fontWeight = "600";
        panel.append(label);

        const select = document.createElement("select");

        select.style.cssText = [
            "width:100%",
            "padding:10px",
            "border:1px solid #cbd5e1",
            "border-radius:8px",
            "background:white",
            "box-sizing:border-box"
        ].join(";");

        const placeholder = createElement(
            "option",
            "-- เลือกผู้ปกครอง --"
        );

        placeholder.value = "";
        select.append(placeholder);

        // ป้องกันรายการ Parent ID ซ้ำ
        const uniqueCandidates = [
            ...new Map(
                candidates.map(candidate => [
                    candidate.parent_id,
                    candidate
                ])
            ).values()
        ];

        uniqueCandidates.forEach(candidate => {
            const option = createElement(
                "option",
                candidate.parent_name +
                " — " +
                candidate.student_name +
                " (" +
                candidate.student_code +
                ")"
            );

            option.value = candidate.parent_id;
            select.append(option);
        });

        select.disabled = uniqueCandidates.length === 0;
        panel.append(select);
        // LINE.08.9.G.33.A
        // Compare names for administrative warning only.
        // Name matching is NOT identity verification.

        const nameWarning = createElement("p");

        nameWarning.style.cssText = [
            "margin:0",
            "padding:12px 14px",
            "font-size:15px",
            "font-weight:600",
            "line-height:1.8",
            "border-radius:9px",
            "white-space:pre-line",
            "overflow-wrap:anywhere"
        ].join(";");

        const normalizeParentName = value =>
    String(value || "")
        .normalize("NFC")
        // ลบอักขระมองไม่เห็นที่มักติดมาจากการคัดลอก
        .replace(/[\u200B-\u200D\uFEFF]/gu, "")
        // ไม่สนใจช่องว่างในการเปรียบเทียบชื่อ
        .replace(/\s+/gu, "")
        .trim()
        .toLocaleLowerCase();

        const updateNameWarning = () => {

            // ล้างสีเดิมก่อนตรวจชื่อครั้งใหม่
            nameWarning.style.background = "";
            nameWarning.style.border = "";
            nameWarning.style.color = "";

            const selected = uniqueCandidates.find(
                item => item.parent_id === select.value
            );

            if (!selected) {
                nameWarning.textContent = "";
                return;
            }

            const submittedName = normalizeParentName(
                request.submitted_parent_name
            );

            const registeredName = normalizeParentName(
                selected.parent_name
            );

            if (
                !submittedName ||
                !registeredName ||
                submittedName !== registeredName
            ) {
                nameWarning.style.cssText += [
                    ";background:#fef2f2",
                    "border:1px solid #fca5a5",
                    "color:#991b1b"
                ].join(";");

                nameWarning.textContent = [
                    "⚠️ ชื่อผู้ยื่นไม่ตรงกับทะเบียน",
                    "",
                    "ชื่อที่กรอก: " +
                        request.submitted_parent_name,
                    "ชื่อในทะเบียน: " +
                        selected.parent_name,
                    "",
                    "กรุณาตรวจสอบตัวบุคคลและบันทึกเหตุผลก่อนอนุมัติ"
                ].join("\n");

            } else {
                nameWarning.style.cssText += [
                    ";background:#f0fdf4",
                    "border:1px solid #86efac",
                    "color:#166534"
                ].join(";");

                nameWarning.textContent =
                    "✓ ชื่อที่กรอกตรงกับทะเบียน\n" +
                    "แต่ยังต้องตรวจยืนยันตัวบุคคลจริงก่อนอนุมัติ";
            }
        };

        select.addEventListener(
            "change",
            updateNameWarning
        );

        panel.append(nameWarning);

        const verificationLabel =
            document.createElement("label");

        verificationLabel.style.cssText = [
            "display:flex",
            "gap:10px",
            "align-items:flex-start",
            "line-height:1.7"
        ].join(";");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.style.marginTop = "5px";

        const verificationText = createElement(
            "span",
            "Admin ได้ยืนยันตัวบุคคลกับผู้ปกครอง" +
            "ผ่านช่องทางที่โรงเรียนเชื่อถือแล้ว"
        );

        verificationLabel.append(
            checkbox,
            verificationText
        );

        panel.append(verificationLabel);

        const noteLabel = createElement(
            "label",
            "หมายเหตุการตรวจสอบ"
        );

        panel.append(noteLabel);

        const note = document.createElement("textarea");
        note.rows = 3;
        note.maxLength = 1000;

        note.placeholder =
            "ระบุวิธีตรวจสอบ หรือเหตุผลที่ปฏิเสธ";

        note.style.cssText = [
            "width:100%",
            "padding:10px",
            "border:1px solid #cbd5e1",
            "border-radius:8px",
            "box-sizing:border-box",
            "font-family:inherit"
        ].join(";");

        panel.append(note);

        const actions = createElement("div");

        actions.style.cssText = [
            "display:flex",
            "gap:10px",
            "flex-wrap:wrap"
        ].join(";");

        const approve = createElement(
            "button",
            "✅ อนุมัติ"
        );

        const reject = createElement(
            "button",
            "❌ ปฏิเสธ"
        );

        approve.type = "button";
        reject.type = "button";

        approve.style.cssText = [
            "padding:10px 18px",
            "border:0",
            "border-radius:8px",
            "background:#166534",
            "color:white",
            "cursor:pointer"
        ].join(";");

        reject.style.cssText = [
            "padding:10px 18px",
            "border:1px solid #fca5a5",
            "border-radius:8px",
            "background:#fef2f2",
            "color:#991b1b",
            "cursor:pointer"
        ].join(";");

        actions.append(approve, reject);
        panel.append(actions);

        const confirmation = createElement("div");
        confirmation.style.cssText = [
            "display:none",
            "padding:14px",
            "border:1px solid #fbbf24",
            "border-radius:8px",
            "background:#fffbeb",
            "white-space:pre-line"
        ].join(";");

        const confirmationMessage = createElement("p");

        const confirmationActions = createElement("div");
        confirmationActions.style.cssText =
            "display:flex;gap:10px;flex-wrap:wrap;margin-top:12px";

        const finalConfirm = createElement(
            "button",
            "ยืนยันดำเนินการจริง"
        );

        const cancel = createElement(
            "button",
            "ยกเลิก"
        );

        finalConfirm.type = "button";
        cancel.type = "button";

        finalConfirm.style.cssText =
            "padding:10px;border:0;border-radius:8px;" +
            "background:#991b1b;color:white;cursor:pointer";

        cancel.style.cssText =
            "padding:10px;border:1px solid #cbd5e1;" +
            "border-radius:8px;background:white;cursor:pointer";

        confirmationActions.append(finalConfirm, cancel);
        confirmation.append(
            confirmationMessage,
            confirmationActions
        );

        panel.append(confirmation);

        const status = createElement("p");
        status.style.cssText =
            "font-size:13px;color:#475569;white-space:pre-line";

        panel.append(status);

        let pendingDecision = null;
        let saving = false;

        const prepareDecision = decision => {

            if (saving) return;

            if (request.is_expired) {
                status.textContent =
                    "คำขอนี้หมดอายุแล้ว ไม่สามารถดำเนินการได้";
                return;
            }

            if (decision === "APPROVE") {

                const selected = uniqueCandidates.find(
                    item => item.parent_id === select.value
                );

                if (!selected) {
                    status.textContent =
                        "กรุณาเลือกผู้ปกครองจากฐานข้อมูล";
                    return;
                }

                if (!checkbox.checked) {
                    status.textContent =
                        "กรุณาติ๊กยืนยันว่าตรวจตัวบุคคลแล้ว";
                    return;
                }
            }

            if (
                decision === "REJECT" &&
                !note.value.trim()
            ) {
                status.textContent =
                    "กรุณาระบุเหตุผลที่ปฏิเสธ";
                return;
            }

            const currentNote = note.value.trim();
            if (
                decision === "APPROVE" &&
                currentNote.length < 10
            ) {
                status.textContent =
                    "กรุณาระบุวิธีตรวจยืนยันตัวบุคคล " +
                    "อย่างน้อย 10 ตัวอักษรก่อนอนุมัติ";
                return;
            }

            if (
                currentNote.length > 1000 ||
                /[\u0000-\u001F\u007F-\u009F]/u.test(
                    currentNote
                )
            ) {
                status.textContent =
                    "หมายเหตุมีอักขระไม่ถูกต้อง";
                return;
            }

            pendingDecision = {
                decision,
                parentId: decision === "APPROVE"
                    ? select.value
                    : null,
                identityConfirmed:
                    decision === "APPROVE" &&
                    checkbox.checked,
                reviewNote: currentNote
            };

            const selected = uniqueCandidates.find(
                item => item.parent_id === pendingDecision.parentId
            );

            confirmationMessage.textContent =
                decision === "APPROVE"
                    ? [
                        "ยืนยันการอนุมัติจริง",
                        "",
                        "ผู้ปกครอง: " +
                            (selected?.parent_name || "—"),
                        "รหัสนักเรียน: " +
                            request.submitted_student_code,
                        "",
                        "ระบบจะเชื่อม LINE กับ Parent ID ที่เลือก",
                        "กรุณาตรวจสอบตัวบุคคลก่อนยืนยัน"
                    ].join("\n")
                    : [
                        "ยืนยันการปฏิเสธจริง",
                        "",
                        "ชื่อที่ยื่น: " +
                            request.submitted_parent_name,
                        "รหัสนักเรียน: " +
                            request.submitted_student_code,
                        "",
                        "คำขอนี้จะถูกปฏิเสธ",
                        "แต่จะไม่ลบข้อมูล Parent หรือ Student"
                    ].join("\n");

            status.textContent = "";

            select.disabled = true;
            checkbox.disabled = true;
            note.disabled = true;
            approve.disabled = true;
            reject.disabled = true;

            confirmation.style.display = "block";
        };

        approve.addEventListener(
            "click",
            () => prepareDecision("APPROVE")
        );

        reject.addEventListener(
            "click",
            () => prepareDecision("REJECT")
        );

        cancel.addEventListener("click", () => {
            if (saving) return;

            pendingDecision = null;
            confirmation.style.display = "none";

            select.disabled =
                uniqueCandidates.length === 0;

            checkbox.disabled = false;
            note.disabled = false;
            approve.disabled = false;
            reject.disabled = false;
        });

        finalConfirm.addEventListener(
            "click",
            async () => {

                if (saving || !pendingDecision) return;

                saving = true;
                finalConfirm.disabled = true;
                cancel.disabled = true;

                status.textContent =
                    "กำลังบันทึก กรุณาอย่าส่งคำขอซ้ำ...";

                try {
                    const { data, error } =
                        await supabaseClient.rpc(
                            "admin_review_line_registration",
                            {
                                p_request_id:
                                    request.request_id,

                                p_decision:
                                    pendingDecision.decision,

                                p_parent_id:
                                    pendingDecision.parentId,

                                p_identity_confirmed:
                                    pendingDecision.identityConfirmed,

                                p_review_note:
                                    pendingDecision.reviewNote
                            }
                        );

                    if (error) throw error;

                    if (
                        ![
                            "APPROVED",
                            "REJECTED",
                            "REQUEST_EXPIRED",
                            "NOT_PENDING"
                        ].includes(data)
                    ) {
                        throw new Error(
                            "UNEXPECTED_REVIEW_RESULT"
                        );
                    }

                    const root = document.getElementById(
                        "line-management-requests"
                    );

                    if (root && root.isConnected) {
                        await loadPendingRequests(root);
                    }

                    // ใช้ผลจาก Server ไม่สมมติว่าบันทึกสำเร็จ
                    if (data === "APPROVED") {
                        console.info(
                            "LINE registration approved"
                        );

                        // LINE.08.9.G.37.B
                        // Refresh Parent table after approval
                        if (
                            typeof AdminUsers !== "undefined" &&
                            typeof AdminUsers.refreshParentLineStatus === "function"
                        ) {
                            await AdminUsers.refreshParentLineStatus();
                        }

                    } else if (data === "REJECTED") {
                        console.info(
                            "LINE registration rejected"
                        );
                    } else {
                        console.warn(
                            "LINE request is no longer pending"
                        );
                    }

                } catch (error) {

                    console.error(
                        "LINE Registration Review:",
                        error
                    );

                    status.textContent =
                        "ยังไม่สามารถยืนยันผลการบันทึกได้ " +
                        "กรุณาปิดหน้าต่างและโหลดรายการใหม่ " +
                        "ก่อนดำเนินการอีกครั้ง";

                    // ห้ามส่งคำสั่งซ้ำอัตโนมัติ
                    finalConfirm.disabled = true;

                } finally {
                    saving = false;
                }
            }
        );

        target.append(panel);
    }
    // =================================================
    // LINE.08.9.G.23.B
    // Admin LINE Requests + Candidate Details
    // READ ONLY
    // =================================================

    function renderRequests(target, requests) {

        target.replaceChildren();

        if (!requests.length) {
            showMessage(
                target,
                "ยังไม่มีคำขอลงทะเบียน LINE ที่รอตรวจสอบ"
            );
            return;
        }

        target.append(
            createElement(
                "p",
                "พบคำขอรอตรวจสอบ " +
                requests.length +
                " รายการ (แสดงสูงสุด 50 รายการ)"
            )
        );

        const wrapper = createElement("div");
        wrapper.style.cssText =
            "width:100%;overflow-x:auto;margin-top:12px";

        const table = createElement("table");
        table.style.cssText =
            "width:100%;border-collapse:collapse;text-align:left";

        const headers = [
            "ชื่อที่กรอก",
            "รหัสนักเรียน",
            "ระดับชั้น",
            "วันที่ส่ง",
            "สถานะ",
            "ตรวจสอบ"
        ];

        const thead = createElement("thead");
        const headerRow = createElement("tr");

        headers.forEach(title => {
            const th = createElement("th", title);
            th.style.cssText =
                "padding:10px;border-bottom:1px solid #cbd5e1;" +
                "white-space:nowrap";
            headerRow.append(th);
        });

        thead.append(headerRow);

        const tbody = createElement("tbody");

        requests.forEach(request => {

            const row = createElement("tr");

            const values = [
                request.submitted_parent_name,
                request.submitted_student_code,
                "ม." + request.submitted_grade_level,
                formatDate(request.created_at),
                request.is_expired
                    ? "หมดอายุแล้ว"
                    : "รอตรวจสอบ"
            ];

            values.forEach(value => {
                const cell = createElement(
                    "td",
                    value ?? "—"
                );

                cell.style.cssText =
                    "padding:10px;" +
                    "border-bottom:1px solid #e2e8f0;" +
                    "vertical-align:top";

                row.append(cell);
            });

            const actionCell = createElement("td");
            actionCell.style.cssText =
                "padding:10px;border-bottom:1px solid #e2e8f0";

            const button = createElement(
                "button",
                "ดูรายละเอียด"
            );

            button.type = "button";
            button.disabled = request.is_expired === true;

            button.style.cssText = [
                "padding:7px 12px",
                "border:1px solid #93c5fd",
                "border-radius:8px",
                "background:#eff6ff",
                "color:#1d4ed8",
                "cursor:pointer",
                "white-space:nowrap"
            ].join(";");

            if (button.disabled) {
                button.style.opacity = "0.5";
                button.style.cursor = "not-allowed";
            }

            const detailRow = createElement("tr");
            detailRow.style.display = "none";

            const detailCell = createElement("td");
            detailCell.colSpan = headers.length;

            detailCell.style.cssText = [
                "padding:14px",
                "background:#f8fafc",
                "border-bottom:1px solid #cbd5e1",
                "white-space:pre-line",
                "line-height:1.8"
            ].join(";");

            detailRow.append(detailCell);

            let detailLoaded = false;
            let detailOpen = false;
            let checking = false;

            button.addEventListener("click", async () => {

                if (checking || request.is_expired) {
                    return;
                }

                detailOpen = !detailOpen;
                detailRow.style.display =
                    detailOpen ? "" : "none";

                if (!detailOpen || detailLoaded) {
                    return;
                }

                checking = true;
                button.disabled = true;

                detailCell.textContent =
                    "กำลังตรวจสอบข้อมูลจากโรงเรียน...";

                try {
                    const { data, error } =
                        await supabaseClient.rpc(
                            "admin_line_registration_candidates",
                            {
                                p_request_id: request.request_id
                            }
                        );

                    if (error) throw error;

                    if (!detailCell.isConnected) return;

                    const candidates = data || [];

                    if (!candidates.length) {
                        detailCell.textContent = [
                            "ไม่พบผู้ปกครองหลักที่ตรงกับข้อมูลนักเรียน",
                            "",
                            "กรุณาตรวจสอบข้อมูลกับโรงเรียน",
                            "ห้ามสร้างหรือเชื่อม Parent ID",
                            "โดยอาศัยข้อมูลที่ผู้ยื่นกรอกเพียงอย่างเดียว"
                        ].join("\n");

                    } else {

                        const lines = [
                            "ข้อมูลสำหรับ Admin ตรวจสอบ",
                            "",
                            "ชื่อที่ผู้ยื่นกรอก: " +
                                request.submitted_parent_name,
                            "",
                            "ผู้ปกครองหลักจากฐานข้อมูลโรงเรียน"
                        ];

                        candidates.forEach((candidate, index) => {
                            lines.push(
                                "",
                                (index + 1) + ". " +
                                    candidate.parent_name,
                                "นักเรียน: " +
                                    candidate.student_name,
                                "รหัสนักเรียน: " +
                                    candidate.student_code,
                                "ห้องเรียน: " +
                                    candidate.room_name
                            );
                        });

                        lines.push(
                            "",
                            "สำคัญ: ข้อมูลนี้เป็นเพียงรายการที่เกี่ยวข้อง",
                            "ยังไม่ใช่การยืนยันตัวบุคคลของผู้ยื่นคำขอ",
                            "Admin ต้องตรวจสอบผ่านช่องทางที่เชื่อถือได้"
                        );

                        detailCell.textContent = lines.join("\n");
                    }

                    // LINE.08.9.G.23.C
                    // แสดงแบบฟอร์มตรวจสอบ READ ONLY
                    // ไม่เรียก RPC อนุมัติหรือปฏิเสธ

                    renderLineReviewPreview(
                        detailCell,
                        candidates,
                        request
                    );

                    detailLoaded = true;

                } catch (error) {
                    console.error(
                        "LINE Registration Candidates:",
                        error
                    );

                    if (detailCell.isConnected) {
                        detailCell.textContent =
                            "ไม่สามารถตรวจสอบข้อมูลได้ " +
                            "กรุณาลองใหม่ภายหลัง";
                    }

                } finally {
                    checking = false;

                    if (button.isConnected) {
                        button.disabled = false;
                    }
                }
            });

            actionCell.append(button);
            row.append(actionCell);

            tbody.append(row, detailRow);
        });

        table.append(thead, tbody);
        wrapper.append(table);
        target.append(wrapper);

        const note = createElement(
            "p",
            "คำขอลงทะเบียนต้องผ่านการตรวจสอบข้อมูล " +
            "และยืนยันตัวบุคคลก่อนอนุมัติ " +
            "การอนุมัติหรือปฏิเสธจะมีผลเมื่อ Admin " +
            "กดยืนยันดำเนินการจริงเท่านั้น"
        );

        note.style.cssText =
            "font-size:12px;color:#64748b;margin-top:12px";

        target.append(note);
    }

    // -------------------------------------------------
    // Load Pending Requests — Admin RPC
    // -------------------------------------------------

    async function loadPendingRequests(target) {

        showMessage(
            target,
            "กำลังโหลดคำขอลงทะเบียน LINE..."
        );

        const { data, error } = await supabaseClient.rpc(
            "admin_list_line_registration_requests"
        );

        if (error) {
            throw error;
        }

        if (!target.isConnected) return;

        renderRequests(target, data || []);
    }

    // -------------------------------------------------
    // Open Admin Request Popup
    // -------------------------------------------------

    async function openRequests() {

        if (loading) return;

        loading = true;

        try {
            await Swal.fire({
                title: "คำขอลงทะเบียน LINE",
                width: "min(850px, calc(100vw - 24px))",
                heightAuto: false,
                showCloseButton: true,
                confirmButtonText: "ปิดหน้าต่าง",
                html:
                    '<div id="line-management-requests"></div>',

                didOpen: async () => {

                    const popup = Swal.getPopup();
                    const target = document.getElementById(
                        "line-management-requests"
                    );

                    if (!target) return;

                    popup.style.maxHeight =
                        "calc(100dvh - 24px)";

                    popup.style.overflowY = "auto";

                    target.style.cssText = [
                        "text-align:left",
                        "line-height:1.7",
                        "min-width:0"
                    ].join(";");

                    try {
                        await loadPendingRequests(target);

                    } catch (error) {

                        console.error(
                            "LINE Management Load Requests:",
                            error
                        );

                        if (target.isConnected) {
                            showMessage(
                                target,
                                "ไม่สามารถโหลดคำขอลงทะเบียน LINE ได้"
                            );
                        }
                    }
                }
            });

        } finally {
            loading = false;
        }
    }
    // =================================================
    // LINE.08.9.G.22.B
    // Read linked LINE parent IDs — READ ONLY
    // =================================================

    async function getLinkedParentIds() {

        const { data, error } = await supabaseClient.rpc(
            "admin_list_linked_line_parents"
        );

        if (error) {
            throw error;
        }

        const parentIds = new Set();

        (data || []).forEach(row => {
            if (
                row &&
                typeof row.parent_id === "string" &&
                row.parent_id.length > 0
            ) {
                parentIds.add(row.parent_id);
            }
        });

        return parentIds;
    }
    // =================================================
    // LINE.08.9.G.25.F
    // Admin Revoke Parent LINE — Confirm + Audit RPC
    // =================================================

    async function openParentLineStatus(parent) {

        if (
            !parent ||
            !parent.id ||
            parent.line_status !== "เชื่อมแล้ว"
        ) {
            return;
        }

        const parentName = [
            parent.first_name,
            parent.last_name
        ].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";

        const firstConfirmation = await Swal.fire({
            title: "จัดการ LINE ผู้ปกครอง",
            text: [
                "ผู้ปกครอง: " + parentName,
                "",
                "สถานะ: เชื่อมแล้ว",
                "",
                "หากยกเลิกการเชื่อม",
                "LINE เดิมจะไม่ผูกกับ Parent ID นี้อีก",
                "แต่ข้อมูลผู้ปกครองและนักเรียนยังอยู่ครบ"
            ].join("\n"),
            icon: "warning",
            width: "min(600px, calc(100vw - 24px))",
            showCancelButton: true,
            confirmButtonText: "ดำเนินการยกเลิก LINE",
            cancelButtonText: "ปิด",
            confirmButtonColor: "#b91c1c",
            heightAuto: false
        });

        if (!firstConfirmation.isConfirmed) {
            return;
        }

        let confirmedIdentity = false;

        const details = await Swal.fire({
            title: "ตรวจสอบก่อนยกเลิก LINE",
            text: "กรุณาระบุเหตุผลและยืนยันตัวบุคคล",
            input: "textarea",
            inputPlaceholder:
                "เหตุผล เช่น ผู้ปกครองเปลี่ยนบัญชี LINE",
            inputAttributes: {
                maxlength: "500",
                rows: "4"
            },
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบข้อมูล",
            cancelButtonText: "กลับ",
            confirmButtonColor: "#b91c1c",
            width: "min(600px, calc(100vw - 24px))",

            didOpen: () => {

                const input = Swal.getInput();

                if (!input) return;

                const label = document.createElement("label");

                label.style.cssText = [
                    "display:flex",
                    "align-items:flex-start",
                    "gap:10px",
                    "margin:14px 0 14px 24px",
                    "max-width:calc(100% - 24px)",
                    "box-sizing:border-box",
                    "text-align:left",
                    "font-size:14px",
                    "line-height:1.6"
                ].join(";");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.style.marginTop = "5px";

                const caption = document.createElement("span");
                caption.textContent =
                    "Admin ได้ตรวจยืนยันตัวบุคคล" +
                    "ผ่านช่องทางที่โรงเรียนเชื่อถือแล้ว";

                label.append(checkbox, caption);

                input.insertAdjacentElement(
                    "afterend",
                    label
                );

                checkbox.addEventListener("change", () => {
                    confirmedIdentity = checkbox.checked;
                });
            },

            preConfirm: value => {

                const reason = (value || "").trim();

                if (reason.length < 5 || reason.length > 500) {
                    Swal.showValidationMessage(
                        "กรุณาระบุเหตุผล 5–500 ตัวอักษร"
                    );
                    return false;
                }

                if (!confirmedIdentity) {
                    Swal.showValidationMessage(
                        "กรุณายืนยันว่าตรวจตัวบุคคลแล้ว"
                    );
                    return false;
                }

                return reason;
            }
        });

        if (!details.isConfirmed) {
            return;
        }

        const reason = details.value;

        const finalConfirmation = await Swal.fire({
            title: "ยืนยันการยกเลิก LINE",

            width: "min(560px, calc(100vw - 24px))",
            padding: "24px",
            heightAuto: false,

            showCancelButton: true,

            confirmButtonText: "ยืนยันยกเลิก LINE",
            cancelButtonText: "ไม่ดำเนินการ",

            confirmButtonColor: "#b91c1c",
            cancelButtonColor: "#64748b",

            reverseButtons: false,

            // ไม่แสดง Icon เครื่องหมายตกใจ
            icon: undefined,

            html: `
                <div style="
                    text-align:left;
                    font-size:15px;
                    line-height:1.8;
                    color:#334155;
                ">

                    <div style="
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:12px;
                        padding:16px;
                        margin:16px 0;
                    ">

                        <div style="
                            font-weight:700;
                            font-size:16px;
                            color:#0f172a;
                            margin-bottom:12px;
                        ">
                            ข้อมูลการยกเลิก
                        </div>

                        <div style="
                            margin-bottom:10px;
                        ">
                            <strong>ผู้ปกครอง</strong>
                            <div id="line-revoke-parent"
                                 style="overflow-wrap:anywhere;">
                            </div>
                        </div>

                        <div style="
                            margin-bottom:10px;
                        ">
                            <strong>สถานะปัจจุบัน</strong>
                            <div style="color:#166534;">
                                เชื่อม LINE แล้ว
                            </div>
                        </div>

                        <div>
                            <strong>เหตุผลการยกเลิก</strong>
                            <div id="line-revoke-reason"
                                 style="
                                    margin-top:4px;
                                    white-space:pre-wrap;
                                    overflow-wrap:anywhere;
                                 ">
                            </div>
                        </div>

                    </div>

                    <div style="
                        border-left:4px solid #dc2626;
                        background:#fef2f2;
                        color:#991b1b;
                        padding:12px 14px;
                        border-radius:8px;
                        margin-bottom:14px;
                    ">
                        <strong>ผลหลังยกเลิก</strong>

                        <div style="margin-top:5px;">
                            บัญชี LINE เดิมจะไม่เชื่อมกับ
                            Parent ID นี้อีก แต่ข้อมูลผู้ปกครอง
                            นักเรียน และความสัมพันธ์เดิมจะยังอยู่ครบ
                        </div>
                    </div>

                    <p style="
                        font-size:13px;
                        color:#64748b;
                        margin:0 0 8px;
                    ">
                        ระบบจะบันทึกผู้ดำเนินการ เวลา
                        และเหตุผลการยกเลิกไว้ในประวัติ
                        กรุณาตรวจสอบข้อมูลก่อนยืนยัน
                    </p>

                </div>
            `,

            didOpen: () => {
                const popup = Swal.getPopup();

                if (!popup) return;

                const parentElement = popup.querySelector(
                    "#line-revoke-parent"
                );

                const reasonElement = popup.querySelector(
                    "#line-revoke-reason"
                );

                if (parentElement) {
                    parentElement.textContent = parentName;
                }

                if (reasonElement) {
                    reasonElement.textContent = reason;
                }
            }
        });

        if (!finalConfirmation.isConfirmed) {
            return;
        }

        Swal.fire({
            title: "กำลังบันทึก",
            text: "กรุณาอย่าส่งคำขอซ้ำ",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const { data, error } = await supabaseClient.rpc(
                "admin_revoke_parent_line_identity",
                {
                    p_parent_id: parent.id,
                    p_identity_confirmed: true,
                    p_reason: reason
                }
            );

            if (error) throw error;

            if (data === "REVOKED") {

                // LINE.08.9.G.37.B
                // Refresh Parent table after revocation
                if (
                    typeof AdminUsers !== "undefined" &&
                    typeof AdminUsers.refreshParentLineStatus === "function"
                ) {
                    await AdminUsers.refreshParentLineStatus();
                }

                await Swal.fire({
                    icon: "success",
                    title: "ยกเลิก LINE สำเร็จ",
                    text:
                        "บันทึกประวัติการยกเลิกแล้ว " +
                        "และโหลดสถานะ LINE ล่าสุดเรียบร้อย"
                });

                return;
            }

            if (data === "NOT_LINKED") {

                await Swal.fire({
                    icon: "info",
                    title: "ไม่มี LINE ที่เชื่อมอยู่",
                    text:
                        "ข้อมูลอาจเปลี่ยนแปลงแล้ว " +
                        "กรุณาโหลดรายชื่อ Parent ใหม่"
                });

                return;
            }

            throw new Error("UNEXPECTED_REVOKE_RESULT");

        } catch (error) {

            console.error(
                "Admin Revoke Parent LINE:",
                error
            );

            await Swal.fire({
                icon: "error",
                title: "ยังไม่สามารถยืนยันผลได้",
                text:
                    "กรุณาโหลดข้อมูลใหม่และตรวจสถานะ " +
                    "ก่อนดำเนินการอีกครั้ง"
            });
        }
    }
    // -------------------------------------------------
    // Parent LINE Status Cell
    // -------------------------------------------------

    function renderParentLineStatus(parent) {

        const status =
            parent.line_status || "ตรวจสอบไม่ได้";

        const students = parent.linked_students || [];

        const isPrimary = students.some(
            student => student.is_primary === true
        );

        const element = document.createElement(
            isPrimary && status === "เชื่อมแล้ว"
                ? "button"
                : "span"
        );

        element.textContent = status;

        if (
            !isPrimary ||
            status !== "เชื่อมแล้ว"
        ) {
            element.style.cssText =
                "font-size:13px;color:#64748b";

            return element;
        }

        element.type = "button";

        element.style.cssText = [
            "padding:7px 12px",
            "border:1px solid #86efac",
            "border-radius:8px",
            "background:#dcfce7",
            "color:#166534",
            "font-size:13px",
            "font-weight:700",
            "cursor:pointer"
        ].join(";");

        element.addEventListener("click", () => {
            openParentLineStatus(parent);
        });

        return element;
    }

    // -------------------------------------------------
    // Public API
    // -------------------------------------------------

        return Object.freeze({
        openRequests,
        getLinkedParentIds,
        renderParentLineStatus
    });

})();
