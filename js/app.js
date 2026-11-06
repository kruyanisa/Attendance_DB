// ฟังก์ชันสลับหน้าจอ และไฮไลต์เมนูที่เลือก
function switchView(view) {
    // Hide the navigation placeholder
    const navigationPlaceholder =
        document.getElementById("view-navigation-placeholder");

    if (navigationPlaceholder) {
        navigationPlaceholder.style.display = "none";
    }

    const views = [
        "attendance",
        "homework",
        "qrcode",
        "guidance",
        "study",
        "scholarship",
        "pdf",
        "settings",
        "portal",
        "dashboard",
        "schedule",
        "import",
        "student-management",
        "student-detail",
        "admin-academic",
        "admin-users",
        "admin-activities",
        "admin-subjects",
        "admin-assignments",
        "admin-audit"
    ];

    views.forEach(v => {
        const viewElement =
            document.getElementById(`view-${v}`);

        if (viewElement) {
            viewElement.style.display =
                (v === view) ? "block" : "none";
        }

        const menuBtn =
            document.getElementById(`menu-${v}`);

        if (menuBtn) {
            if (v === view) {
                menuBtn.classList.add("active");
            } else {
                menuBtn.classList.remove("active");
            }
        }
    });

    if (view === "settings") {
        showSetting("profile");
        loadProfile();
    }

    if (view === "dashboard") {
        loadDashboard();
    }

    if (view === "student-management") {
        if (typeof StudentManagement !== "undefined") {
            StudentManagement.init();
        }
    }

    if (view === "student-detail") {
        if (typeof StudentDetail !== "undefined") {
            // Opened from Student Management
        }
    }

    if (view === "schedule") {
        switchScheduleTab("timetable");
    }

    if (view === "admin-academic") {
        loadAdminAcademicOverview();
    }

    if (view === "admin-users") {
        if (typeof AdminUsers !== "undefined") {
            AdminUsers.init();
        } else {
            console.error("B56: AdminUsers module not loaded.");
        }
    }

    if (view === "admin-activities") {
        loadAdminActivityAssignment();
    }

    // B57-03: Load Admin Subject Catalog
    if (view === "admin-subjects") {
        loadAdminSubjectCatalog();
    }

    // B57-03: Admin Teaching Assignments
    if (view === "admin-assignments") {
        loadAdminTeachingAssignments();
    }

    // AUDIT.3 — Admin Audit History Module
    if (view === "admin-audit") {
        if (typeof AdminAudit !== "undefined") {
            AdminAudit.init();
        } else {
            console.error("AUDIT.3: AdminAudit module not loaded.");
        }
    }

    // AUDIT.3: Admin Audit History
    // หน้าจอจะเพิ่มใน index.html ขั้นตอนถัดไป
    // ยังไม่มีการเรียกฐานข้อมูล

    const activeMenu =
        document.getElementById(`menu-${view}`);

    if (activeMenu) {
        const parentGroup =
            activeMenu.closest(".nav-group");

        if (parentGroup) {
            parentGroup.classList.add("open");
        }
    }
}

async function openAdminSubjectCreateForm() {
    // B57-03: Admin subject creation with duplicate checks

    const result = await Swal.fire({
        title: "📚 เพิ่มรายวิชาใหม่",
        html: `
            <div style="text-align:left;">
                <label for="new-subject-code"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    รหัสวิชา *
                </label>
                <input
                    id="new-subject-code"
                    class="swal2-input"
                    style="width:100%;margin:0 0 16px;box-sizing:border-box;"
                    maxlength="30"
                    placeholder="เช่น อ32101"
                >

                <label for="new-subject-name"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    ชื่อวิชา *
                </label>
                <input
                    id="new-subject-name"
                    class="swal2-input"
                    style="width:100%;margin:0 0 16px;box-sizing:border-box;"
                    maxlength="200"
                    placeholder="เช่น ภาษาอังกฤษพื้นฐาน"
                >

                <label for="new-subject-credit"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    หน่วยกิต (ไม่บังคับ)
                </label>
                <input
                    id="new-subject-credit"
                    class="swal2-input"
                    type="number"
                    min="0"
                    step="any"
                    style="width:100%;margin:0;box-sizing:border-box;"
                    placeholder="เช่น 1.5"
                >
            </div>
        `,
        width: 520,
        showCancelButton: true,
        confirmButtonText: "ตรวจสอบข้อมูล",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#2563eb",
        focusConfirm: false,

        preConfirm: () => {
            const code = document
                .getElementById("new-subject-code")
                .value.trim();

            const name = document
                .getElementById("new-subject-name")
                .value.trim();

            const creditText = document
                .getElementById("new-subject-credit")
                .value.trim();

            if (!code || !name) {
                Swal.showValidationMessage(
                    "กรุณากรอกรหัสวิชาและชื่อวิชา"
                );
                return false;
            }

            const credit = creditText === ""
                ? null
                : Number(creditText);

            if (
                credit !== null &&
                (!Number.isFinite(credit) || credit < 0)
            ) {
                Swal.showValidationMessage(
                    "หน่วยกิตต้องเป็นตัวเลขที่ไม่ติดลบ"
                );
                return false;
            }

            return { code, name, credit };
        }
    });

    if (!result.isConfirmed) {
        return;
    }

    const subject = result.value;

    try {
        // Check existing and archived subject codes.
        const existingSubjects = await getSubjects();

        const duplicate = (existingSubjects || []).find(
            item => item.subject_code === subject.code
        );

        if (duplicate) {
            const message = duplicate.deleted_at
                ? "รหัสวิชานี้เคยมีในระบบและถูกยกเลิกใช้งานแล้ว กรุณาตรวจสอบก่อนนำกลับมาใช้"
                : "รหัสวิชานี้มีอยู่ในทะเบียนรายวิชาแล้ว ไม่จำเป็นต้องสร้างซ้ำ";

            await Swal.fire({
                icon: "warning",
                title: "พบรหัสวิชาซ้ำ",
                text: message,
                confirmButtonText: "รับทราบ"
            });

            return;
        }

        // Confirm before writing to the database.
        const confirmation = await Swal.fire({
            icon: "question",
            title: "ยืนยันเพิ่มรายวิชา?",
            text:
                `รหัสวิชา: ${subject.code}\n` +
                `ชื่อวิชา: ${subject.name}\n` +
                `หน่วยกิต: ${subject.credit ?? "ไม่ระบุ"}`,
            showCancelButton: true,
            confirmButtonText: "ยืนยันบันทึก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,
            didOpen: () => {
                const content = Swal.getHtmlContainer();

                if (content) {
                    content.style.whiteSpace = "pre-line";
                }
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        // Write through the Admin-only RPC.
        const { data: subjectId, error } =
            await supabaseClient.rpc(
                "admin_create_subject",
                {
                    p_subject_code: subject.code,
                    p_subject_name: subject.name,
                    p_credit: subject.credit
                }
            );

        if (error) {
            throw error;
        }

        if (typeof subjectId !== "string" || !subjectId) {
            throw new Error("SUBJECT_CREATION_RESULT_INVALID");
        }

        await Swal.fire({
            icon: "success",
            title: "เพิ่มรายวิชาสำเร็จ",
            text:
                `บันทึก ${subject.code} — ${subject.name} ` +
                "ลงทะเบียนรายวิชากลางแล้ว",
            confirmButtonText: "ตกลง"
        });

        // Refresh the active catalog.
        await loadAdminSubjectCatalog();

    } catch (error) {
        console.error(
            "B57-03: Admin subject creation failed:",
            error
        );

        let message = "ไม่สามารถเพิ่มรายวิชาได้ กรุณาตรวจสอบข้อมูล";

        const errorText = String(error.message || "");

        if (
            errorText.includes("SUBJECT_CODE_ALREADY_EXISTS") ||
            error.code === "23505"
        ) {
            message = "รหัสวิชานี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบทะเบียนรายวิชา";
        } else if (
            errorText.includes("SUBJECT_ADMIN_REQUIRED")
        ) {
            message = "เฉพาะ Admin เท่านั้นที่สามารถเพิ่มรายวิชาได้";
        } else if (
            errorText.includes("SUBJECT_REQUIRED_FIELDS")
        ) {
            message = "กรุณากรอกรหัสวิชาและชื่อวิชาให้ครบ";
        } else if (
            errorText.includes("SUBJECT_INVALID_CREDIT")
        ) {
            message = "หน่วยกิตต้องไม่ติดลบ";
        } else if (
            errorText.includes("SUBJECT_CREATION_RESULT_INVALID")
        ) {
            message =
                "ไม่สามารถยืนยันผลการบันทึกได้ กรุณารีเฟรชทะเบียนรายวิชา" +
                "ก่อนลองอีกครั้ง";
        }

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเพิ่มรายวิชาได้",
            text: message,
            confirmButtonText: "รับทราบ"
        });
    }
}

async function openAdminSubjectEditForm(subject) {
    // B57-03: Admin subject edit with confirmation and RPC

    const result = await Swal.fire({
        title: "แก้ไขรายวิชา",
        html: `
            <div style="text-align:left;">
                <label for="edit-subject-code"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    รหัสวิชา *
                </label>
                <input
                    id="edit-subject-code"
                    class="swal2-input"
                    style="width:100%;margin:0 0 16px;box-sizing:border-box;"
                    maxlength="30"
                >

                <label for="edit-subject-name"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    ชื่อวิชา *
                </label>
                <input
                    id="edit-subject-name"
                    class="swal2-input"
                    style="width:100%;margin:0 0 16px;box-sizing:border-box;"
                    maxlength="200"
                >

                <label for="edit-subject-credit"
                    style="display:block;margin-bottom:6px;font-weight:600;">
                    หน่วยกิต (ไม่บังคับ)
                </label>
                <input
                    id="edit-subject-credit"
                    class="swal2-input"
                    type="number"
                    min="0"
                    step="any"
                    style="width:100%;margin:0;box-sizing:border-box;"
                >
            </div>
        `,
        width: 520,
        showCancelButton: true,
        confirmButtonText: "ตรวจสอบการแก้ไข",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#2563eb",
        focusConfirm: false,

        didOpen: () => {
            document.getElementById("edit-subject-code").value =
                subject.subject_code || "";

            document.getElementById("edit-subject-name").value =
                subject.subject_name || "";

            document.getElementById("edit-subject-credit").value =
                subject.credit == null ? "" : subject.credit;
        },

        preConfirm: () => {
            const code = document
                .getElementById("edit-subject-code")
                .value.trim();

            const name = document
                .getElementById("edit-subject-name")
                .value.trim();

            const creditInput =
                document.getElementById("edit-subject-credit");

            const creditText = creditInput.value.trim();

            if (!code || !name) {
                Swal.showValidationMessage(
                    "กรุณากรอกรหัสวิชาและชื่อวิชา"
                );
                return false;
            }

            if (creditText !== "" && !creditInput.validity.valid) {
                Swal.showValidationMessage(
                    "กรุณากรอกหน่วยกิตเป็นตัวเลขที่ถูกต้อง"
                );
                return false;
            }

            const credit = creditText === ""
                ? null
                : Number(creditText);

            if (
                credit !== null &&
                (!Number.isFinite(credit) || credit < 0)
            ) {
                Swal.showValidationMessage(
                    "หน่วยกิตต้องเป็นตัวเลขที่ไม่ติดลบ"
                );
                return false;
            }

            return { code, name, credit };
        }
    });

    if (!result.isConfirmed) {
        return;
    }

    const updated = result.value;

    const originalCredit = subject.credit == null
        ? null
        : Number(subject.credit);

    const unchanged =
        updated.code === subject.subject_code &&
        updated.name === subject.subject_name &&
        updated.credit === originalCredit;

    if (unchanged) {
        await Swal.fire({
            title: "ไม่มีข้อมูลเปลี่ยนแปลง",
            text: "ข้อมูลรายวิชายังเหมือนเดิม",
            confirmButtonText: "ตกลง"
        });

        return;
    }

    try {
        // Check duplicate codes before confirmation.
        const subjects = await getSubjects();

        const duplicate = (subjects || []).find(item =>
            item.subject_code === updated.code &&
            item.id !== subject.id
        );

        if (duplicate) {
            await Swal.fire({
                title: "พบรหัสวิชาซ้ำ",
                text: "รหัสวิชานี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น",
                confirmButtonText: "รับทราบ"
            });

            return;
        }

        // Display the original and updated values.
        const confirmation = await Swal.fire({
            title: "ยืนยันการแก้ไขรายวิชา",
            text:
                `ข้อมูลเดิม\n` +
                `รหัสวิชา: ${subject.subject_code}\n` +
                `ชื่อวิชา: ${subject.subject_name}\n` +
                `หน่วยกิต: ${originalCredit ?? "ไม่ระบุ"}\n\n` +
                `ข้อมูลใหม่\n` +
                `รหัสวิชา: ${updated.code}\n` +
                `ชื่อวิชา: ${updated.name}\n` +
                `หน่วยกิต: ${updated.credit ?? "ไม่ระบุ"}`,
            showCancelButton: true,
            confirmButtonText: "ยืนยันบันทึก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,
            didOpen: () => {
                const content = Swal.getHtmlContainer();

                if (content) {
                    content.style.whiteSpace = "pre-line";
                }
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        // Save changes through the Admin-only RPC.
        const { data: updatedId, error } =
            await supabaseClient.rpc(
                "admin_update_subject",
                {
                    p_subject_id: subject.id,
                    p_subject_code: updated.code,
                    p_subject_name: updated.name,
                    p_credit: updated.credit
                }
            );

        if (error) {
            throw error;
        }

        if (updatedId !== subject.id) {
            throw new Error("SUBJECT_UPDATE_RESULT_UNCONFIRMED");
        }

        await Swal.fire({
            title: "แก้ไขรายวิชาสำเร็จ",
            text: "บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว",
            confirmButtonText: "ตกลง"
        });

        // Reload the catalog after a successful update.
        await loadAdminSubjectCatalog();

    } catch (error) {
        console.error(
            "B57-03: Admin subject update failed:",
            error
        );

        const errorText = String(error?.message || "");
        let message =
            "ไม่สามารถแก้ไขรายวิชาได้ กรุณาตรวจสอบข้อมูลอีกครั้ง";

        if (errorText.includes("SUBJECT_ALREADY_ASSIGNED")) {
            message =
                "รายวิชานี้มีข้อมูลการสอนแล้ว " +
                "จึงไม่อนุญาตให้แก้ไขข้อมูลหลัก";
        } else if (
            errorText.includes("SUBJECT_CODE_ALREADY_EXISTS") ||
            error.code === "23505"
        ) {
            message =
                "รหัสวิชานี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น";
        } else if (errorText.includes("SUBJECT_ADMIN_REQUIRED")) {
            message =
                "เฉพาะ Admin เท่านั้นที่สามารถแก้ไขรายวิชาได้";
        } else if (errorText.includes("SUBJECT_ARCHIVED")) {
            message =
                "รายวิชานี้ถูกยกเลิกใช้งานแล้ว";
        } else if (errorText.includes("SUBJECT_NOT_FOUND")) {
            message =
                "ไม่พบรายวิชาที่ต้องการแก้ไข";
        } else if (errorText.includes("SUBJECT_REQUIRED_FIELDS")) {
            message =
                "กรุณากรอกรหัสวิชาและชื่อวิชาให้ครบ";
        } else if (errorText.includes("SUBJECT_INVALID_CREDIT")) {
            message =
                "หน่วยกิตต้องไม่ติดลบ";
        } else if (
            errorText.includes("SUBJECT_UPDATE_RESULT_UNCONFIRMED")
        ) {
            message =
                "ไม่สามารถยืนยันผลการบันทึกได้ " +
                "กรุณารีเฟรชทะเบียนรายวิชาก่อนลองอีกครั้ง";
        }

        await Swal.fire({
            title: "ไม่สามารถแก้ไขรายวิชาได้",
            text: message,
            confirmButtonText: "รับทราบ"
        });
    }
}
// ============================================================
// B57-03-42 — Admin Subject Catalog Pagination
// แบ่งหน้า 25 รายวิชา โดยรักษาการค้นหาและปุ่มแก้ไขเดิม
// ============================================================

function setupAdminSubjectPagination() {
    const tbody = document.getElementById(
        "admin-subject-table-body"
    );

    const pagination = document.getElementById(
        "admin-subject-pagination"
    );

    const pageInfo = document.getElementById(
        "admin-subject-page-info"
    );

    const pageNumber = document.getElementById(
        "admin-subject-page-number"
    );

    const prevButton = document.getElementById(
        "admin-subject-page-prev"
    );

    const nextButton = document.getElementById(
        "admin-subject-page-next"
    );

    if (
        !tbody ||
        !pagination ||
        !pageInfo ||
        !pageNumber ||
        !prevButton ||
        !nextButton
    ) {
        return;
    }

    // ป้องกัน Observer ซ้ำเมื่อเปิดเมนูอีกครั้ง
    if (typeof pagination._cleanupPagination === "function") {
        pagination._cleanupPagination();
    }

    const pageSize = 25;
    let currentPage = 1;

    function getDataRows() {
        const rows = Array.from(tbody.rows);

        if (
            rows.length === 1 &&
            rows[0].cells.length === 1 &&
            Number(rows[0].cells[0].colSpan) > 1
        ) {
            return [];
        }

        return rows;
    }

    function renderPage() {
        const rows = getDataRows();
        const total = rows.length;

        if (total === 0) {
            pagination.style.display = "none";
            return;
        }

        const totalPages = Math.max(
            1,
            Math.ceil(total / pageSize)
        );

        currentPage = Math.min(
            Math.max(1, currentPage),
            totalPages
        );

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(
            startIndex + pageSize,
            total
        );

        rows.forEach((row, index) => {
            row.style.display =
                index >= startIndex && index < endIndex
                    ? ""
                    : "none";
        });

        pageInfo.textContent =
            `แสดง ${startIndex + 1}–${endIndex} จาก ${total} รายการ`;

        pageNumber.textContent =
            `${currentPage} / ${totalPages}`;

        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;

        prevButton.style.opacity =
            prevButton.disabled ? "0.45" : "1";

        nextButton.style.opacity =
            nextButton.disabled ? "0.45" : "1";

        prevButton.style.cursor =
            prevButton.disabled ? "not-allowed" : "pointer";

        nextButton.style.cursor =
            nextButton.disabled ? "not-allowed" : "pointer";

        pagination.style.display = "flex";
    }

    prevButton.onclick = function () {
        if (currentPage <= 1) {
            return;
        }

        currentPage--;
        renderPage();
    };

    nextButton.onclick = function () {
        const totalPages = Math.max(
            1,
            Math.ceil(getDataRows().length / pageSize)
        );

        if (currentPage >= totalPages) {
            return;
        }

        currentPage++;
        renderPage();
    };

    // เมื่อค้นหารายวิชา ระบบสร้างแถวตารางใหม่
    // จึงเริ่ม Pagination ที่หน้า 1 ทุกครั้ง
    const observer = new MutationObserver(() => {
        currentPage = 1;
        renderPage();
    });

    observer.observe(tbody, {
        childList: true
    });

    pagination._cleanupPagination = function () {
        observer.disconnect();
        prevButton.onclick = null;
        nextButton.onclick = null;
    };

    renderPage();
}
async function loadAdminSubjectCatalog() {
    // B57-03: Subject catalog with search and safe edit controls

    const status = document.getElementById("admin-subject-status");
    const tbody = document.getElementById("admin-subject-table-body");

    if (!status || !tbody) {
        return;
    }

    // B57-03-42 — Initialize Subject Pagination
    setupAdminSubjectPagination();

    const addButton = document.getElementById("admin-subject-add-btn");

    if (addButton) {
        addButton.style.display = "inline-flex";
        addButton.onclick = openAdminSubjectCreateForm;
    }

    let searchInput = document.getElementById("admin-subject-search");

    if (!searchInput) {
        searchInput = document.createElement("input");
        searchInput.id = "admin-subject-search";
        searchInput.type = "search";
        searchInput.placeholder = "🔍 ค้นหารหัสวิชา หรือชื่อวิชา...";
        searchInput.setAttribute("aria-label", "ค้นหารายวิชา");

        searchInput.style.cssText = `
            display: block;
            width: 100%;
            max-width: 460px;
            min-height: 44px;
            padding: 10px 14px;
            margin-bottom: 16px;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--card);
            color: var(--text);
            font-family: inherit;
            font-size: 14px;
            box-sizing: border-box;
        `;

        status.parentNode.insertBefore(searchInput, status);
    }

    searchInput.value = "";
    searchInput.disabled = true;
    searchInput.oninput = null;

    status.textContent = "กำลังโหลดทะเบียนรายวิชา...";
    tbody.replaceChildren();

    try {
        // Read the existing subject catalog.
        const subjects = await getSubjects();

        // Read assignment references without modifying data.
        const { data: assignments, error: assignmentError } =
            await supabaseClient
                .from("subject_assignments")
                .select("subject_id");

        if (assignmentError) {
            throw assignmentError;
        }

        const assignedSubjectIds = new Set(
            (assignments || []).map(item => item.subject_id)
        );

        const activeSubjects = (subjects || []).filter(
            subject => subject.deleted_at == null
        );

        function renderSubjects(keyword = "") {
            const query = keyword.trim().toLocaleLowerCase();

            const filteredSubjects = activeSubjects.filter(subject => {
                const code = String(
                    subject.subject_code || ""
                ).toLocaleLowerCase();

                const name = String(
                    subject.subject_name || ""
                ).toLocaleLowerCase();

                return code.includes(query) || name.includes(query);
            });

            tbody.replaceChildren();

            if (filteredSubjects.length === 0) {
                const row = tbody.insertRow();
                const cell = row.insertCell();

                cell.colSpan = 5;
                cell.textContent = query
                    ? "ไม่พบรายวิชาที่ตรงกับคำค้นหา"
                    : "ยังไม่มีรายวิชาในทะเบียนกลาง";
            } else {
                const fragment = document.createDocumentFragment();

                filteredSubjects.forEach(subject => {
                    const row = document.createElement("tr");

                    const codeCell = row.insertCell();
                    const nameCell = row.insertCell();
                    const creditCell = row.insertCell();
                    const statusCell = row.insertCell();
                    const actionCell = row.insertCell();

                    codeCell.textContent =
                        subject.subject_code || "-";

                    nameCell.textContent =
                        subject.subject_name || "-";

                    creditCell.textContent =
                        subject.credit == null ? "-" : subject.credit;

                    statusCell.textContent = "ใช้งาน";

                    if (assignedSubjectIds.has(subject.id)) {
                        // Preserve subjects with teaching history.
                        const locked = document.createElement("span");

                        locked.textContent = "🔒 มีข้อมูลการสอนแล้ว";
                        locked.title =
                            "รายวิชานี้มีข้อมูลการสอนผูกอยู่ จึงไม่อนุญาตให้แก้ไขรหัสวิชา ชื่อวิชา หรือหน่วยกิต";

                        actionCell.appendChild(locked);
                    } else {
                        const editButton = document.createElement("button");

                        editButton.type = "button";
                        editButton.className = "btn";
                        editButton.textContent = "✏️ แก้ไข";

                        editButton.style.cssText = `
                            padding: 7px 12px;
                            height: auto;
                            font-size: 13px;
                            white-space: nowrap;
                        `;

                        editButton.onclick = () => {
                            openAdminSubjectEditForm(subject);
                        };

                        actionCell.appendChild(editButton);
                    }

                    fragment.appendChild(row);
                });

                tbody.appendChild(fragment);
            }

            status.textContent = query
                ? `พบ ${filteredSubjects.length} จาก ${activeSubjects.length} รายวิชา`
                : `แสดงรายวิชาที่เปิดใช้งาน ${activeSubjects.length} รายวิชา`;
        }

        searchInput.disabled = false;

        searchInput.oninput = () => {
            renderSubjects(searchInput.value);
        };

        renderSubjects();

    } catch (error) {
        console.error(
            "B57-03: Subject catalog load failed:",
            error
        );

        searchInput.disabled = true;
        status.textContent = "ไม่สามารถโหลดทะเบียนรายวิชาได้";

        const row = tbody.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 5;
        cell.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
}
// ============================================================
// B57-03-42 — Admin Batch Subject Assignment Preview
// ค้นหาและเลือกสูงสุด 20 วิชา
// READ ONLY — ยังไม่มีการบันทึกฐานข้อมูล
// ============================================================

async function openAdminTeacherSubjectBatchPreview() {
    try {
        const role = await getCurrentUserRole();

        if (role !== "Admin") {
            throw new Error("เฉพาะ Admin เท่านั้นที่ใช้งานได้");
        }

        const yearSelect = document.getElementById(
            "admin-assignment-year"
        );

        const semesterSelect = document.getElementById(
            "admin-assignment-semester"
        );

        if (!yearSelect?.value || !semesterSelect?.value) {
            throw new Error(
                "กรุณาเลือกปีการศึกษาและภาคเรียนก่อน"
            );
        }

        const semesterId = semesterSelect.value;

        // โหลดข้อมูลสำหรับแสดงฟอร์มเท่านั้น
        const [
            teacherResult,
            profileResult,
            roleResult,
            subjectResult
        ] = await Promise.all([
            supabaseClient
                .from("teachers")
                .select(
                    "id, profile_id, teacher_code, instructor_number, first_name, last_name"
                )
                .is("deleted_at", null),

            supabaseClient
                .from("profiles")
                .select("id, role_id, is_active, deleted_at"),

            supabaseClient
                .from("roles")
                .select("id, name, deleted_at"),

            supabaseClient
                .from("subjects")
                .select(
                    "id, subject_code, subject_name, credit"
                )
                .is("deleted_at", null)
        ]);

        for (const result of [
            teacherResult,
            profileResult,
            roleResult,
            subjectResult
        ]) {
            if (result.error) {
                throw result.error;
            }
        }

        const profiles = new Map(
            (profileResult.data || []).map(
                item => [item.id, item]
            )
        );

        const teacherRoleIds = new Set(
            (roleResult.data || [])
                .filter(item =>
                    item.name === "Teacher" &&
                    item.deleted_at === null
                )
                .map(item => item.id)
        );

        const teachers = (teacherResult.data || [])
            .filter(teacher => {
                const profile = profiles.get(
                    teacher.profile_id
                );

                return (
                    profile &&
                    profile.is_active === true &&
                    profile.deleted_at === null &&
                    teacherRoleIds.has(profile.role_id)
                );
            })
            .sort((a, b) =>
                String(a.teacher_code || "").localeCompare(
                    String(b.teacher_code || ""),
                    "th"
                )
            );

        const subjects = (subjectResult.data || [])
            .sort((a, b) =>
                String(a.subject_code || "").localeCompare(
                    String(b.subject_code || ""),
                    "th"
                )
            );

        if (!teachers.length || !subjects.length) {
            throw new Error(
                "ไม่พบครูหรือรายวิชาที่พร้อมใช้งาน"
            );
        }

        // B57-03-42 — อ่านสิทธิ์ที่มอบหมายแล้ว
        // READ ONLY — ไม่สร้างหรือแก้ไขข้อมูล

        const existingPermissions = [];
        const permissionPageSize = 500;
        let permissionOffset = 0;

        while (true) {
            const { data, error } = await supabaseClient
                .from("teacher_subject_permissions")
                .select("teacher_id, subject_id")
                .eq("semester_id", semesterId)
                .order("id", { ascending: true })
                .range(
                    permissionOffset,
                    permissionOffset + permissionPageSize - 1
                );

            if (error) {
                throw error;
            }

            const page = data || [];
            existingPermissions.push(...page);

            if (page.length < permissionPageSize) {
                break;
            }

            permissionOffset += permissionPageSize;
        }

        const assignedSubjectKeys = new Set(
            existingPermissions.map(permission =>
                `${permission.teacher_id}|${permission.subject_id}`
            )
        );
        // เก็บรายการที่เลือกไว้ แม้เปลี่ยนคำค้นหา
        const selectedSubjectIds = new Set();

        const result = await Swal.fire({
            title: "มอบหมายหลายรายวิชา",
            width: 650,
            html: `
                <div style="text-align:left;">

                    <p style="margin:0 0 14px;">
                        เลือกรายวิชาสูงสุด 20 วิชา
                        สำหรับครูหนึ่งคน
                    </p>

                    <label for="batch-teacher">
                        ครูผู้สอน *
                    </label>

                    <select
                        id="batch-teacher"
                        class="swal2-select"
                        style="
                            display:block;
                            width:100%;
                            margin:6px 0 16px;
                        "
                    ></select>

                    <label for="batch-subject-search">
                        ค้นหารหัสวิชาหรือชื่อวิชา
                    </label>

                    <input
                        id="batch-subject-search"
                        class="swal2-input"
                        type="text"
                        placeholder="เช่น อ321 หรือ ภาษาอังกฤษ"
                        autocomplete="off"
                        style="
                            width:100%;
                            margin:6px 0 12px;
                            box-sizing:border-box;
                        "
                    >

                    <div
                        id="batch-subject-list"
                        style="
                            max-height:180px;
                            overflow-y:auto;
                            border:1px solid #e2e8f0;
                            border-radius:10px;
                            padding:8px;
                        "
                    ></div>

                    <p
                        id="batch-subject-count"
                        style="
                            margin:12px 0 0;
                            font-weight:600;
                        "
                    ></p>

                    <p style="
                        font-size:13px;
                        color:#64748b;
                        margin-top:8px;
                    ">
                        ขั้นตอนนี้เป็นการทดลองเลือกเท่านั้น
                        ยังไม่มีการบันทึกข้อมูล
                    </p>

                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบรายการที่เลือก",
            cancelButtonText: "ยกเลิก",
            focusConfirm: false,
            heightAuto: false,

            didOpen: () => {
                const popup = Swal.getPopup();

                if (popup) {
                    popup.style.maxHeight =
                        "calc(100dvh - 24px)";

                    popup.style.overflowY = "auto";
                    popup.style.boxSizing = "border-box";
                }

                const subjectList = document.getElementById(
                    "batch-subject-list"
                );

                if (subjectList) {
                    const availableHeight = Math.max(
                        220,
                        Math.min(260, window.innerHeight - 380)
                    );

                    subjectList.style.maxHeight =
                        `${availableHeight}px`;
                }
                const teacherSelect =
                    document.getElementById("batch-teacher");

                const searchInput =
                    document.getElementById(
                        "batch-subject-search"
                    );

                const list =
                    document.getElementById(
                        "batch-subject-list"
                    );

                const countLabel =
                    document.getElementById(
                        "batch-subject-count"
                    );

                teacherSelect.add(
                    new Option("-- เลือกครู --", "")
                );

                teachers.forEach(teacher => {
                    const name = [
                        teacher.first_name,
                        teacher.last_name
                    ].filter(Boolean).join(" ");

                    const number =
                        teacher.instructor_number ||
                        teacher.teacher_code ||
                        "";

                    teacherSelect.add(
                        new Option(
                            `${number} — ${name}`,
                            teacher.id
                        )
                    );
                });

                function updateCount() {
                    countLabel.textContent =
                        `เลือกแล้ว ${selectedSubjectIds.size} / 20 วิชา`;
                }

                function renderSubjects() {
                    const keyword = searchInput.value
                        .trim()
                        .toLocaleLowerCase();

                    const filtered = subjects.filter(subject => {
                        const code = String(
                            subject.subject_code || ""
                        ).toLocaleLowerCase();

                        const name = String(
                            subject.subject_name || ""
                        ).toLocaleLowerCase();

                        return (
                            code.includes(keyword) ||
                            name.includes(keyword)
                        );
                    });

                    list.replaceChildren();

                    if (!filtered.length) {
                        list.textContent =
                            "ไม่พบรายวิชาที่ตรงกับคำค้นหา";

                        updateCount();
                        return;
                    }

                    filtered.forEach(subject => {
                        const row =
                            document.createElement("label");

                        row.style.cssText = [
                            "display:flex",
                            "align-items:center",
                            "gap:10px",
                            "padding:10px",
                            "border-bottom:1px solid #e2e8f0",
                            "cursor:pointer"
                        ].join(";");

                        const checkbox =
                            document.createElement("input");

                        const selectedTeacherId =
                            teacherSelect.value;

                        const alreadyAssigned =
                            assignedSubjectKeys.has(
                                `${selectedTeacherId}|${subject.id}`
                            );

                        checkbox.type = "checkbox";
                        checkbox.value = subject.id;

                        checkbox.checked =
                            selectedSubjectIds.has(subject.id);

                        checkbox.disabled =
                            !selectedTeacherId || alreadyAssigned;

                        const text =
                            document.createElement("span");

                        const credit =
                            subject.credit == null
                                ? "-"
                                : subject.credit;

                            text.textContent =
                            `${subject.subject_code} — ` +
                            `${subject.subject_name} ` +
                            `(หน่วยกิต ${credit})` +
                            (alreadyAssigned
                                ? "  ✅ มีแล้ว"
                                : "");

                        checkbox.addEventListener(
                            "change",
                            () => {
                                if (checkbox.checked) {
                                    if (
                                        selectedSubjectIds.size >= 20
                                    ) {
                                        checkbox.checked = false;

                                        Swal.showValidationMessage(
                                            "เลือกได้สูงสุด 20 วิชา"
                                        );

                                        return;
                                    }

                                    selectedSubjectIds.add(
                                        subject.id
                                    );
                                } else {
                                    selectedSubjectIds.delete(
                                        subject.id
                                    );
                                }

                                Swal.resetValidationMessage();
                                updateCount();
                            }
                        );

                        row.append(checkbox, text);
                        list.appendChild(row);
                    });

                    updateCount();
                }

                searchInput.addEventListener(
                    "input",
                    renderSubjects
                );

                teacherSelect.addEventListener(
                    "change",
                    () => {
                        // ล้างรายการที่เลือกจากครูคนก่อน
                        selectedSubjectIds.clear();

                        Swal.resetValidationMessage();

                        // โหลดสถานะการมอบหมายของครูที่เลือก
                        renderSubjects();
                    }
                );

                renderSubjects();
            },

            preConfirm: () => {
                const teacherId = document.getElementById(
                    "batch-teacher"
                ).value;

                if (!teacherId) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกครูผู้สอน"
                    );
                    return false;
                }

                if (
                    selectedSubjectIds.size === 0 ||
                    selectedSubjectIds.size > 20
                ) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกตั้งแต่ 1 ถึง 20 วิชา"
                    );
                    return false;
                }

                return {
                    teacherId,
                    subjectIds: Array.from(
                        selectedSubjectIds
                    )
                };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        // แสดงตัวอย่างเท่านั้น ไม่เรียก RPC
        const teacher = teachers.find(
            item => item.id === result.value.teacherId
        );

        const selectedSubjects = subjects.filter(
            subject =>
                result.value.subjectIds.includes(subject.id)
        );

        // ====================================================
        // B57-03-42 — Batch Assignment Summary
        // UI PREVIEW ONLY — ยังไม่บันทึกข้อมูลจริง
        // ====================================================

        const summary = document.createElement("div");

        summary.style.cssText = [
            "text-align:left",
            "font-size:14px",
            "display:flex",
            "flex-direction:column",
            "gap:12px",
            "min-height:0"
        ].join(";");

        // ----------------------------------------------------
        // 1. ข้อมูลครูและภาคเรียน
        // ----------------------------------------------------

        const teacherInfo = document.createElement("div");

        teacherInfo.style.cssText = [
            "padding:12px",
            "background:#f1f5f9",
            "border-radius:10px",
            "line-height:1.7"
        ].join(";");

        const teacherName = [
            teacher.first_name,
            teacher.last_name
        ].filter(Boolean).join(" ");

        const teacherNumber =
            teacher.instructor_number ||
            teacher.teacher_code ||
            "";

        const yearName =
            yearSelect.selectedOptions[0]?.textContent || "-";

        const semesterName =
            semesterSelect.selectedOptions[0]?.textContent || "-";

        const teacherLine = document.createElement("div");
        const semesterLine = document.createElement("div");

        teacherLine.textContent =
            `ครูผู้สอน: ${teacherNumber} — ${teacherName}`;

        semesterLine.textContent =
            `${yearName} / ${semesterName}`;

        teacherInfo.append(
            teacherLine,
            semesterLine
        );

        // ----------------------------------------------------
        // 2. หัวข้อรายการวิชา
        // ----------------------------------------------------

        const listHeading = document.createElement("div");

        listHeading.textContent =
            `รายวิชาที่เลือก (${selectedSubjects.length} วิชา)`;

        listHeading.style.fontWeight = "600";

        // ----------------------------------------------------
        // 3. กรอบรายวิชาที่ Scroll ได้
        // ----------------------------------------------------

        const subjectList = document.createElement("div");

        subjectList.style.cssText = [
            "height:220px",
            "max-height:35dvh",
            "min-height:100px",
            "overflow-y:auto",
            "overscroll-behavior:contain",
            "border:1px solid #e2e8f0",
            "border-radius:10px"
        ].join(";");

        selectedSubjects.forEach((subject, index) => {
            const row = document.createElement("div");

            row.style.cssText = [
                "display:flex",
                "gap:10px",
                "align-items:flex-start",
                "padding:10px 12px",
                "border-bottom:1px solid #e2e8f0"
            ].join(";");

            const number = document.createElement("span");

            number.textContent = `${index + 1}.`;

            number.style.cssText = [
                "flex-shrink:0",
                "color:#64748b",
                "min-width:22px"
            ].join(";");

            const details = document.createElement("div");

            details.style.cssText = [
                "flex:1",
                "min-width:0",
                "overflow-wrap:anywhere"
            ].join(";");

            const subjectTitle = document.createElement("div");

            subjectTitle.textContent =
                `${subject.subject_code} — ${subject.subject_name}`;

            subjectTitle.style.fontWeight = "500";

            const credit = document.createElement("div");

            credit.textContent =
                "หน่วยกิต: " +
                (subject.credit == null ? "-" : subject.credit);

            credit.style.cssText = [
                "font-size:12px",
                "color:#64748b",
                "margin-top:3px"
            ].join(";");

            details.append(
                subjectTitle,
                credit
            );

            row.append(
                number,
                details
            );

            subjectList.appendChild(row);
        });

        // ----------------------------------------------------
        // 4. สรุปจำนวน
        // ----------------------------------------------------

        const total = document.createElement("div");

        total.textContent =
            `รวมรายการที่เลือก ${selectedSubjects.length} วิชา`;

        total.style.cssText = [
            "font-weight:600",
            "text-align:right"
        ].join(";");

        // ----------------------------------------------------
        // 5. ข้อความ Preview
        // ----------------------------------------------------

        const notice = document.createElement("p");

        notice.textContent =
            "ขั้นตอนนี้เป็นการตรวจสอบรายการเท่านั้น " +
            "ยังไม่ได้บันทึกข้อมูลลงฐานข้อมูล";

        notice.style.cssText = [
            "font-size:12px",
            "color:#64748b",
            "margin:0"
        ].join(";");

        summary.append(
            teacherInfo,
            listHeading,
            subjectList,
            total,
            notice
        );

        // ----------------------------------------------------
        // 6. แสดงหน้าต่างสรุป
        // ----------------------------------------------------

        // ====================================================
        // B57-03-42 — Confirm and Save Batch Assignment
        // ตรวจสอบอีกครั้งก่อนบันทึกจริง
        // ====================================================

        const confirmation = await Swal.fire({
            title: "ตรวจสอบการมอบหมายรายวิชา",
            html: summary,
            width: 600,
            heightAuto: false,
            padding: "16px",
            showCancelButton: true,
            confirmButtonText: "ยืนยันมอบหมาย",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,
            focusConfirm: false,

            didOpen: popup => {
                popup.style.maxHeight =
                    "calc(100dvh - 24px)";

                popup.style.boxSizing = "border-box";
                popup.style.display = "flex";
                popup.style.flexDirection = "column";

                const content = Swal.getHtmlContainer();
                const actions = Swal.getActions();

                if (content) {
                    content.style.minHeight = "0";
                    content.style.overflowY = "hidden";
                    content.style.flex = "0 1 auto";
                    content.style.margin = "8px 0";
                }

                if (actions) {
                    actions.style.flexShrink = "0";
                }

                subjectList.style.maxHeight =
                    `${Math.max(
                        80,
                        Math.min(
                            220,
                            window.innerHeight - 430
                        )
                    )}px`;
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        // 1. ตรวจจำนวนรายการก่อนส่ง RPC
        const subjectIds = result.value.subjectIds;

        if (
            !Array.isArray(subjectIds) ||
            subjectIds.length < 1 ||
            subjectIds.length > 20 ||
            new Set(subjectIds).size !== subjectIds.length
        ) {
            throw new Error(
                "รายการรายวิชาไม่ถูกต้อง กรุณาเลือกใหม่"
            );
        }

        // 2. แสดงสถานะระหว่างตรวจสอบและบันทึก
        Swal.fire({
            title: "กำลังตรวจสอบการมอบหมาย",
            text: "กรุณาอย่ากดบันทึกซ้ำ",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        let rpcAttempted = false;

        try {
            // 3. ตรวจรายการซ้ำจากฐานข้อมูลล่าสุด
            const { data: existing, error: checkError } =
                await supabaseClient
                    .from("teacher_subject_permissions")
                    .select("subject_id")
                    .eq("teacher_id", result.value.teacherId)
                    .eq("semester_id", semesterId)
                    .in("subject_id", subjectIds);

            if (checkError) {
                throw checkError;
            }

            if (existing && existing.length > 0) {
                const existingIds = new Set(
                    existing.map(item => item.subject_id)
                );

                const duplicateSubjects = selectedSubjects
                    .filter(subject =>
                        existingIds.has(subject.id)
                    )
                    .map(subject => subject.subject_code);

                await Swal.fire({
                    icon: "warning",
                    title: "พบรายวิชาที่มอบหมายแล้ว",
                    text:
                        "ยังไม่มีการบันทึกข้อมูลใหม่\n" +
                        "รายวิชาที่ซ้ำ: " +
                        duplicateSubjects.join(", ") +
                        "\nกรุณาเปิดฟอร์มใหม่เพื่อตรวจสอบรายการ",
                    confirmButtonText: "รับทราบ"
                });

                return;
            }

            // 4. บันทึกผ่าน Batch RPC
            rpcAttempted = true;

            const { data: permissionIds, error: saveError } =
                await supabaseClient.rpc(
                    "admin_assign_teacher_subjects_batch",
                    {
                        p_teacher_id: result.value.teacherId,
                        p_subject_ids: subjectIds,
                        p_semester_id: semesterId
                    }
                );

            if (saveError) {
                throw saveError;
            }

            if (
                !Array.isArray(permissionIds) ||
                permissionIds.length !== subjectIds.length
            ) {
                throw new Error(
                    "RPC ตอบกลับจำนวนรายการไม่ตรงกับที่เลือก"
                );
            }

            // 5. ตรวจข้อมูลที่บันทึกจากฐานข้อมูลจริง
            const { data: verified, error: verifyError } =
                await supabaseClient
                    .from("teacher_subject_permissions")
                    .select("id, subject_id")
                    .eq("teacher_id", result.value.teacherId)
                    .eq("semester_id", semesterId)
                    .in("subject_id", subjectIds);

            if (verifyError) {
                await Swal.fire({
                    icon: "warning",
                    title: "บันทึกแล้ว แต่ตรวจสอบผลไม่สำเร็จ",
                    text:
                        "RPC ส่งผลสำเร็จแล้ว แต่ไม่สามารถอ่านข้อมูลยืนยันได้ " +
                        "กรุณาตรวจสอบรายการในหน้า Admin ก่อนลองบันทึกอีกครั้ง",
                    confirmButtonText: "รับทราบ"
                });

                await loadAdminTeachingAssignments();
                return;
            }

            const returnedIds = new Set(permissionIds);
            const verifiedSubjectIds = new Set(
                (verified || []).map(item => item.subject_id)
            );

            const allMatched =
                verified.length === subjectIds.length &&
                new Set(verified.map(item => item.id)).size ===
                    subjectIds.length &&
                verified.every(item =>
                    returnedIds.has(item.id)
                ) &&
                subjectIds.every(id =>
                    verifiedSubjectIds.has(id)
                );

            if (!allMatched) {
                await Swal.fire({
                    icon: "warning",
                    title: "ต้องตรวจสอบผลการบันทึก",
                    text:
                        "RPC ส่งผลสำเร็จแล้ว แต่ผลตรวจสอบไม่ตรงครบทุกวิชา " +
                        "กรุณาตรวจสอบฐานข้อมูลก่อนลองอีกครั้ง",
                    confirmButtonText: "รับทราบ"
                });

                await loadAdminTeachingAssignments();
                return;
            }

            // 6. แจ้งสำเร็จเมื่อยืนยันผลได้ครบ
            await Swal.fire({
                icon: "success",
                title: "มอบหมายรายวิชาสำเร็จ",
                text:
                    `บันทึกและตรวจสอบแล้วครบ ` +
                    `${verified.length} วิชา`,
                confirmButtonText: "ตกลง"
            });

            // 7. โหลดหน้ารายการใหม่
            await loadAdminTeachingAssignments();

        } catch (saveError) {
            console.error(
                "Admin Batch Assignment Save Error:",
                saveError
            );

            const errorText = String(
                saveError?.message || ""
            );

            let message = errorText ||
                "ไม่สามารถดำเนินการได้";

            if (
                errorText.includes("ALREADY_EXISTS") ||
                saveError?.code === "23505"
            ) {
                message =
                    "พบรายวิชาที่ได้รับมอบหมายแล้ว " +
                    "ระบบยกเลิกการบันทึกทั้งชุด";
            } else if (
                errorText.includes("SEMESTER_NOT_ACTIVE")
            ) {
                message =
                    "ภาคเรียนนี้ไม่เปิดให้มอบหมายรายวิชา";
            } else if (
                errorText.includes("ADMIN_REQUIRED")
            ) {
                message =
                    "บัญชีนี้ไม่มีสิทธิ์มอบหมายรายวิชา";
            } else if (rpcAttempted) {
                message +=
                    "\nกรุณาตรวจสอบสถานะในฐานข้อมูลก่อนลองซ้ำ " +
                    "เพราะยังยืนยันผลการเรียก RPC ไม่ได้";
            }

            await Swal.fire({
                icon: "error",
                title: "ไม่สามารถยืนยันผลการมอบหมาย",
                text: message,
                confirmButtonText: "รับทราบ"
            });
        }

    } catch (error) {
        console.error(
            "Admin Batch Preview Error:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเปิดฟอร์มได้",
            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        });
    }
}
// ============================================================
// B57-03-42 — Admin Assign Teacher Subject
// ใช้ทะเบียนรายวิชากลาง ไม่สร้าง Subject ใหม่
// ============================================================

async function openAdminTeacherSubjectAssignForm() {
    try {
        // 1. ตรวจสิทธิ์ Admin
        const role = await getCurrentUserRole();

        if (role !== "Admin") {
            throw new Error("เฉพาะ Admin เท่านั้นที่มอบหมายรายวิชาได้");
        }

        // 2. อ่านภาคเรียนที่เลือกจากหน้า Admin
        const yearSelect = document.getElementById(
            "admin-assignment-year"
        );

        const semesterSelect = document.getElementById(
            "admin-assignment-semester"
        );

        if (!yearSelect?.value || !semesterSelect?.value) {
            throw new Error("กรุณาเลือกปีการศึกษาและภาคเรียนก่อน");
        }

        const yearId = yearSelect.value;
        const semesterId = semesterSelect.value;

        // 3. โหลดข้อมูลสำหรับฟอร์ม
        const [
            yearResult,
            semesterResult,
            teacherResult,
            profileResult,
            roleResult,
            subjectResult
        ] = await Promise.all([
            supabaseClient
                .from("academic_years")
                .select("id, year, is_current")
                .eq("id", yearId)
                .single(),

            supabaseClient
                .from("semesters")
                .select(
                    "id, academic_year_id, semester_no, start_date, end_date, schedule_locked_at"
                )
                .eq("id", semesterId)
                .single(),

            supabaseClient
                .from("teachers")
                .select(
                    "id, profile_id, teacher_code, instructor_number, first_name, last_name, deleted_at"
                )
                .is("deleted_at", null),

            supabaseClient
                .from("profiles")
                .select("id, role_id, is_active, deleted_at"),

            supabaseClient
                .from("roles")
                .select("id, name, deleted_at"),

            supabaseClient
                .from("subjects")
                .select(
                    "id, subject_code, subject_name, deleted_at"
                )
                .is("deleted_at", null)
        ]);

        const results = [
            yearResult,
            semesterResult,
            teacherResult,
            profileResult,
            roleResult,
            subjectResult
        ];

        for (const result of results) {
            if (result.error) {
                throw result.error;
            }
        }

        const year = yearResult.data;
        const semester = semesterResult.data;

        // 4. ตรวจปีและภาคเรียนที่เปิดใช้งาน
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());

        if (
            !year.is_current ||
            semester.academic_year_id !== year.id ||
            semester.schedule_locked_at !== null ||
            !semester.start_date ||
            !semester.end_date ||
            today < semester.start_date ||
            today > semester.end_date
        ) {
            throw new Error(
                "ภาคเรียนที่เลือกไม่เปิดให้มอบหมายรายวิชาใหม่"
            );
        }

        // 5. เลือกเฉพาะครูที่มีบัญชี Teacher และ Active
        const profiles = new Map(
            (profileResult.data || []).map(
                item => [item.id, item]
            )
        );

        const teacherRoleIds = new Set(
            (roleResult.data || [])
                .filter(item =>
                    item.name === "Teacher" &&
                    item.deleted_at === null
                )
                .map(item => item.id)
        );

        const teachers = (teacherResult.data || [])
            .filter(teacher => {
                const profile = profiles.get(teacher.profile_id);

                return (
                    profile &&
                    profile.is_active === true &&
                    profile.deleted_at === null &&
                    teacherRoleIds.has(profile.role_id)
                );
            })
            .sort((a, b) =>
                a.teacher_code.localeCompare(b.teacher_code)
            );

        const subjects = (subjectResult.data || [])
            .sort((a, b) =>
                a.subject_code.localeCompare(
                    b.subject_code,
                    "th"
                )
            );

        if (!teachers.length || !subjects.length) {
            throw new Error(
                "ไม่พบครูหรือรายวิชาที่พร้อมมอบหมาย"
            );
        }

        // 6. แสดงฟอร์ม
        const result = await Swal.fire({
            title: "มอบหมายรายวิชาให้ครู",
            width: 540,
            html: `
                <div style="text-align:left;display:grid;gap:14px;">

                    <p id="assign-semester-info"
                       style="margin:0;font-weight:600;">
                    </p>

                    <div>
                        <label for="assign-teacher">
                            ครูผู้สอน *
                        </label>
                        <select id="assign-teacher"
                            class="swal2-select"
                            style="width:100%;margin:6px 0 0;">
                        </select>
                    </div>

                    <div>
                            <div style="margin-bottom:12px;">
                            <label for="assign-subject-search">
                                ค้นหารายวิชา
                            </label>
                            <input
                                id="assign-subject-search"
                                class="swal2-input"
                                type="text"
                                placeholder="พิมพ์รหัสวิชาหรือชื่อวิชา"
                                autocomplete="off"
                                style="
                                    width:100%;
                                    margin:6px 0 0;
                                    box-sizing:border-box;
                                "
                            >
                        </div>
                        <label for="assign-subject">
                            รายวิชา *
                        </label>
                        <select id="assign-subject"
                            class="swal2-select"
                            style="width:100%;margin:6px 0 0;">
                        </select>
                    </div>

                    <p style="font-size:13px;margin:0;">
                        Admin มอบหมายเฉพาะรายวิชา
                        ครูจะเลือกกลุ่มนักเรียนและจัดตารางสอนเอง
                    </p>

                </div>
            `,
            didOpen: () => {
                document.getElementById(
                    "assign-semester-info"
                ).textContent =
                    `ปีการศึกษา ${year.year} / ` +
                    `ภาคเรียนที่ ${semester.semester_no}`;

                const teacherSelect = document.getElementById(
                    "assign-teacher"
                );

                const subjectSelect = document.getElementById(
                    "assign-subject"
                );

                teacherSelect.add(
                    new Option("-- เลือกครู --", "")
                );

                teachers.forEach(teacher => {
                    const name = [
                        teacher.first_name,
                        teacher.last_name
                    ].filter(Boolean).join(" ");

                    const number =
                        teacher.instructor_number ||
                        teacher.teacher_code;

                    teacherSelect.add(
                        new Option(
                            `${number} — ${name}`,
                            teacher.id
                        )
                    );
                });

                subjectSelect.add(
                    new Option("-- เลือกรายวิชา --", "")
                );

                    const subjectSearch = document.getElementById(
                    "assign-subject-search"
                );

                function filterSubjectOptions() {
                    const keyword = subjectSearch.value
                        .trim()
                        .toLocaleLowerCase();

                    const previousSubjectId = subjectSelect.value;

                    const filteredSubjects = subjects.filter(subject => {
                        const code = String(
                            subject.subject_code || ""
                        ).toLocaleLowerCase();

                        const name = String(
                            subject.subject_name || ""
                        ).toLocaleLowerCase();

                        return (
                            code.includes(keyword) ||
                            name.includes(keyword)
                        );
                    });

                    subjectSelect.replaceChildren(
                        new Option(
                            filteredSubjects.length === 0
                                ? "-- ไม่พบรายวิชา --"
                                : "-- เลือกรายวิชา --",
                            ""
                        )
                    );

                    filteredSubjects.forEach(subject => {
                        subjectSelect.add(
                            new Option(
                                `${subject.subject_code} — ${subject.subject_name}`,
                                subject.id
                            )
                        );
                    });

                    const selectedStillVisible = filteredSubjects.some(
                        subject => subject.id === previousSubjectId
                    );

                    subjectSelect.value = selectedStillVisible
                        ? previousSubjectId
                        : "";
                }

                subjectSearch.addEventListener(
                    "input",
                    filterSubjectOptions
                );

                filterSubjectOptions();
            },
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบการมอบหมาย",
            cancelButtonText: "ยกเลิก",
            preConfirm: () => {
                const teacherId = document.getElementById(
                    "assign-teacher"
                ).value;

                const subjectId = document.getElementById(
                    "assign-subject"
                ).value;

                if (!teacherId || !subjectId) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกครูและรายวิชา"
                    );
                    return false;
                }

                return { teacherId, subjectId };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const selectedTeacher = teachers.find(
            item => item.id === result.value.teacherId
        );

        const selectedSubject = subjects.find(
            item => item.id === result.value.subjectId
        );

        if (!selectedTeacher || !selectedSubject) {
            throw new Error("ข้อมูลที่เลือกไม่ถูกต้อง");
        }

        // 7. ตรวจรายการซ้ำจากฐานข้อมูลล่าสุด
        const { data: existing, error: checkError } =
            await supabaseClient
                .from("teacher_subject_permissions")
                .select("id")
                .eq("teacher_id", selectedTeacher.id)
                .eq("subject_id", selectedSubject.id)
                .eq("semester_id", semesterId)
                .limit(1);

        if (checkError) {
            throw checkError;
        }

        if (existing && existing.length > 0) {
            await Swal.fire({
                title: "มีการมอบหมายแล้ว",
                text: "ครูคนนี้ได้รับรายวิชานี้ในภาคเรียนที่เลือกแล้ว",
                confirmButtonText: "ตกลง"
            });
            return;
        }

        // 8. ยืนยันก่อนบันทึกข้อมูลจริง
        const confirmation = await Swal.fire({
            title: "ยืนยันการมอบหมายรายวิชา",
            text:
                `ครู: ${selectedTeacher.first_name} ${selectedTeacher.last_name}\n` +
                `รายวิชา: ${selectedSubject.subject_code} — ${selectedSubject.subject_name}\n` +
                `ปีการศึกษา: ${year.year}\n` +
                `ภาคเรียน: ${semester.semester_no}`,
            showCancelButton: true,
            confirmButtonText: "ยืนยันมอบหมาย",
            cancelButtonText: "ยกเลิก",
            reverseButtons: true,
            didOpen: () => {
                const content = Swal.getHtmlContainer();

                if (content) {
                    content.style.whiteSpace = "pre-line";
                }
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        // 9. บันทึกผ่าน Admin-only RPC
        const { data: permissionId, error } =
            await supabaseClient.rpc(
                "admin_assign_teacher_subject",
                {
                    p_teacher_id: selectedTeacher.id,
                    p_subject_id: selectedSubject.id,
                    p_semester_id: semesterId
                }
            );

        if (error) {
            throw error;
        }

        if (!permissionId) {
            throw new Error(
                "ไม่สามารถยืนยันรหัสสิทธิ์สอนที่สร้างได้"
            );
        }

        await Swal.fire({
            title: "มอบหมายรายวิชาสำเร็จ",
            text: "บันทึกสิทธิ์สอนให้ครูเรียบร้อยแล้ว",
            confirmButtonText: "ตกลง"
        });

        await loadAdminTeachingAssignments();

    } catch (error) {
        console.error(
            "Admin Teacher Subject Assignment Error:",
            error
        );

        let message =
            error?.message ||
            "ไม่สามารถมอบหมายรายวิชาได้";

        if (
            message.includes("SUBJECT_ASSIGNMENT_ALREADY_EXISTS") ||
            error?.code === "23505"
        ) {
            message =
                "ครูได้รับรายวิชานี้ในภาคเรียนดังกล่าวแล้ว";
        } else if (
            message.includes("SUBJECT_ASSIGNMENT_ADMIN_REQUIRED")
        ) {
            message =
                "เฉพาะ Admin เท่านั้นที่มอบหมายรายวิชาได้";
        } else if (
            message.includes("SUBJECT_ASSIGNMENT_SEMESTER_NOT_ACTIVE")
        ) {
            message =
                "ภาคเรียนนี้ไม่เปิดให้มอบหมายรายวิชา";
        }

        await Swal.fire({
            title: "ไม่สามารถมอบหมายรายวิชาได้",
            text: message,
            confirmButtonText: "รับทราบ"
        });
    }
}
// ============================================================
// B57-03-42 — Admin Assignment Pagination
// กรองครูก่อนแบ่งหน้า แสดงสูงสุด 25 รายการต่อหน้า
// ============================================================

function setupAdminAssignmentPagination() {
    const tbody = document.getElementById(
        "admin-assignment-table-body"
    );

    const pagination = document.getElementById(
        "admin-assignment-pagination"
    );

    const pageInfo = document.getElementById(
        "admin-assignment-page-info"
    );

    const pageNumber = document.getElementById(
        "admin-assignment-page-number"
    );

    const prevButton = document.getElementById(
        "admin-assignment-page-prev"
    );

    const nextButton = document.getElementById(
        "admin-assignment-page-next"
    );

    const teacherFilter = document.getElementById(
        "admin-assignment-teacher"
    );

    if (
        !tbody ||
        !pagination ||
        !pageInfo ||
        !pageNumber ||
        !prevButton ||
        !nextButton
    ) {
        return;
    }

    // ป้องกัน Observer ซ้ำเมื่อเปิดเมนูอีกครั้ง
    if (typeof pagination._cleanupPagination === "function") {
        pagination._cleanupPagination();
    }

    const pageSize = 25;
    let currentPage = 1;

    function getDataRows() {
        const rows = Array.from(tbody.rows);

        // ไม่รวมแถว Loading / Empty / Error
        if (
            rows.length === 1 &&
            rows[0].cells.length === 1 &&
            Number(rows[0].cells[0].colSpan) > 1
        ) {
            return [];
        }

        // กรองข้อมูลตามครูที่เลือก
        const selectedTeacherId = teacherFilter
            ? teacherFilter.value
            : "";

        return rows.filter(row => {
            return (
                !selectedTeacherId ||
                row.dataset.teacherId === selectedTeacherId
            );
        });
    }

    function renderPage() {
        const allRows = Array.from(tbody.rows);
        const filteredRows = getDataRows();

        const total = filteredRows.length;

        if (total === 0) {
            pagination.style.display = "none";
            return;
        }

        const totalPages = Math.max(
            1,
            Math.ceil(total / pageSize)
        );

        currentPage = Math.min(
            Math.max(1, currentPage),
            totalPages
        );

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(
            startIndex + pageSize,
            total
        );

        // เลือกเฉพาะรายการของหน้าปัจจุบัน
        const visibleRows = new Set(
            filteredRows.slice(startIndex, endIndex)
        );

        // ซ่อนทั้งแถวที่ไม่ตรงกับครู
        // และแถวที่อยู่นอกหน้าปัจจุบัน
        allRows.forEach(row => {
            row.style.display = visibleRows.has(row)
                ? ""
                : "none";
        });

        pageInfo.textContent =
            `แสดง ${startIndex + 1}–${endIndex} จาก ${total} รายการ`;

        pageNumber.textContent =
            `${currentPage} / ${totalPages}`;

        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;

        prevButton.style.opacity =
            prevButton.disabled ? "0.45" : "1";

        nextButton.style.opacity =
            nextButton.disabled ? "0.45" : "1";

        prevButton.style.cursor =
            prevButton.disabled ? "not-allowed" : "pointer";

        nextButton.style.cursor =
            nextButton.disabled ? "not-allowed" : "pointer";

        pagination.style.display = "flex";
    }

    prevButton.onclick = function () {
        if (currentPage <= 1) {
            return;
        }

        currentPage--;
        renderPage();
    };

    nextButton.onclick = function () {
        const totalPages = Math.max(
            1,
            Math.ceil(getDataRows().length / pageSize)
        );

        if (currentPage >= totalPages) {
            return;
        }

        currentPage++;
        renderPage();
    };

    // ให้ตัวกรองครูเรียกใช้เมื่อเปลี่ยนค่า
    pagination._refreshPagination = function () {
        currentPage = 1;
        renderPage();
    };

    // เมื่อโหลดข้อมูลใหม่ ให้กลับหน้าแรก
    const observer = new MutationObserver(() => {
        currentPage = 1;
        renderPage();
    });

    observer.observe(tbody, {
        childList: true
    });

    pagination._cleanupPagination = function () {
        observer.disconnect();
        prevButton.onclick = null;
        nextButton.onclick = null;
        pagination._refreshPagination = null;
    };

    renderPage();
}
async function loadAdminTeachingAssignments() {
    // B57-03: Read-only teaching assignments by semester

    const yearSelect = document.getElementById("admin-assignment-year");
    const semesterSelect = document.getElementById("admin-assignment-semester");
    const status = document.getElementById("admin-assignment-status");
    const tbody = document.getElementById("admin-assignment-table-body");

    if (!yearSelect || !semesterSelect || !status || !tbody) {
        return;
    }

    // B57-03-42 — Initialize 25-row Pagination
    setupAdminAssignmentPagination();

    let requestVersion = 0;

    function showMessage(message) {
        tbody.replaceChildren();

        const row = tbody.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 6;
        cell.textContent = message;
    }

    yearSelect.disabled = true;
    semesterSelect.disabled = true;

    yearSelect.replaceChildren(new Option("-- เลือกปี --", ""));
    semesterSelect.replaceChildren(new Option("-- เลือกภาคเรียน --", ""));

    status.textContent = "กำลังโหลดข้อมูล...";
    showMessage("กำลังโหลดข้อมูล");

    try {
        const role = await getCurrentUserRole();

                if (role !== "Admin") {
            status.textContent = "ไม่มีสิทธิ์เข้าถึงข้อมูลการมอบหมาย";
            showMessage("เฉพาะ Admin เท่านั้น");
            return;
        }

        // B57-03-42 — เปิดปุ่มมอบหมายรายวิชาสำหรับ Admin
        const addButton = document.getElementById(
            "admin-assignment-add-btn"
        );

        if (addButton) {
            addButton.style.display = "inline-flex";
            addButton.onclick = openAdminTeacherSubjectBatchPreview;
        }

        const [yearResult, semesterResult] = await Promise.all([
            supabaseClient
                .from("academic_years")
                .select("id, year, is_current")
                .order("year", { ascending: false }),

            supabaseClient
                .from("semesters")
                .select("id, academic_year_id, semester_no, start_date, end_date")
                .order("semester_no", { ascending: true })
        ]);

        if (yearResult.error) throw yearResult.error;
        if (semesterResult.error) throw semesterResult.error;

        const years = yearResult.data || [];
        const semesters = semesterResult.data || [];

        years.forEach(year => {
            yearSelect.add(
                new Option(`ปีการศึกษา ${year.year}`, year.id)
            );
        });

        function getBangkokDate() {
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Bangkok",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date());

            const values = Object.fromEntries(
                parts.map(part => [part.type, part.value])
            );

            return `${values.year}-${values.month}-${values.day}`;
        }

        async function loadSelectedAssignments() {
            const version = ++requestVersion;
            const yearId = yearSelect.value;
            const semesterId = semesterSelect.value;

            if (!yearId || !semesterId) {
                status.textContent = "กรุณาเลือกปีการศึกษาและภาคเรียน";
                showMessage("กรุณาเลือกภาคเรียน");
                return;
            }

            status.textContent = "กำลังโหลดรายการมอบหมายการสอน...";
            showMessage("กำลังโหลดรายการมอบหมายการสอน");

            try {
                // Fetch all assignment pages for the selected term.
                const assignments = [];
                const pageSize = 500;
                let offset = 0;

                while (true) {
                    const { data, error } = await supabaseClient
                        .from("subject_assignments")
                        .select(
                            "id, teacher_id, subject_id, room_id, academic_year_id, semester_id"
                        )
                        .eq("academic_year_id", yearId)
                        .eq("semester_id", semesterId)
                        .order("id", { ascending: true })
                        .range(offset, offset + pageSize - 1);

                    if (error) throw error;

                    const page = data || [];
                    assignments.push(...page);

                    if (page.length < pageSize) {
                        break;
                    }

                    offset += pageSize;
                }

                if (version !== requestVersion) {
                    return;
                }
                // B57-03-42 — โหลดสิทธิ์สอนในภาคเรียนที่เลือก
                // READ ONLY — ไม่เปลี่ยนข้อมูลจริง
                const permissions = [];
                const permissionPageSize = 500;
                let permissionOffset = 0;

                while (true) {
                    const { data, error } = await supabaseClient
                        .from("teacher_subject_permissions")
                        .select("id, teacher_id, subject_id, semester_id")
                        .eq("semester_id", semesterId)
                        .order("id", { ascending: true })
                        .range(
                            permissionOffset,
                            permissionOffset + permissionPageSize - 1
                        );

                    if (error) {
                        throw error;
                    }

                    const page = data || [];
                    permissions.push(...page);

                    if (page.length < permissionPageSize) {
                        break;
                    }

                    permissionOffset += permissionPageSize;
                }

                if (version !== requestVersion) {
                    return;
                }

                const [teacherResult, subjectResult, roomResult] =
                    await Promise.all([
                        supabaseClient
                            .from("teachers")
                            .select(
                                "id, teacher_code, instructor_number, first_name, last_name"
                            ),

                        supabaseClient
                            .from("subjects")
                            .select("id, subject_code, subject_name, credit"),

                        supabaseClient
                            .from("rooms")
                            .select("id, room_name")
                            .eq("academic_year_id", yearId)
                    ]);

                if (teacherResult.error) throw teacherResult.error;
                if (subjectResult.error) throw subjectResult.error;
                if (roomResult.error) throw roomResult.error;

                if (version !== requestVersion) {
                    return;
                }

                const teacherMap = new Map(
                    (teacherResult.data || []).map(item => [item.id, item])
                );

                const subjectMap = new Map(
                    (subjectResult.data || []).map(item => [item.id, item])
                );

                const roomMap = new Map(
                    (roomResult.data || []).map(item => [item.id, item])
                );

                const rows = assignments.map(assignment => {
                    const teacher = teacherMap.get(assignment.teacher_id);
                    const subject = subjectMap.get(assignment.subject_id);
                    const room = roomMap.get(assignment.room_id);

                    const teacherName = teacher
                        ? [teacher.first_name, teacher.last_name]
                            .filter(Boolean)
                            .join(" ")
                        : "ไม่พบข้อมูลครู";

                    const teacherCode = teacher
                        ? teacher.instructor_number || teacher.teacher_code || ""
                        : "";

                        return {
                        teacherId: assignment.teacher_id,
                        teacher: [teacherCode, teacherName]
                            .filter(Boolean)
                            .join(" — "),
                        subjectCode: subject?.subject_code || "-",
                        subjectName: subject?.subject_name || "-",
                        credit: subject?.credit == null ? "-" : subject.credit,
                        roomName: room?.room_name || "-"
                    };
                });

                // B57-03-42 — เพิ่มรายการสิทธิ์สอนที่ยังไม่มีห้อง
                // ไม่แก้ไข Assignment เดิม

                const assignmentKeys = new Set(
                    assignments.map(assignment =>
                        `${assignment.teacher_id}|${assignment.subject_id}`
                    )
                );

                permissions.forEach(permission => {
                    const key =
                        `${permission.teacher_id}|${permission.subject_id}`;

                    // ถ้ารายวิชานี้มี Assignment แล้ว
                    // ให้ใช้รายการห้องเรียนเดิม ไม่เพิ่มแถวซ้ำ
                    if (assignmentKeys.has(key)) {
                        return;
                    }

                    const teacher = teacherMap.get(
                        permission.teacher_id
                    );

                    const subject = subjectMap.get(
                        permission.subject_id
                    );

                    const teacherName = teacher
                        ? [teacher.first_name, teacher.last_name]
                            .filter(Boolean)
                            .join(" ")
                        : "ไม่พบข้อมูลครู";

                    const teacherCode = teacher
                        ? (
                            teacher.instructor_number ||
                            teacher.teacher_code ||
                            ""
                        )
                        : "";

                    rows.push({
                        teacherId: permission.teacher_id,
                        teacher: [teacherCode, teacherName]
                            .filter(Boolean)
                            .join(" — "),
                        subjectCode: subject?.subject_code || "-",
                        subjectName: subject?.subject_name || "-",
                        credit: subject?.credit == null
                            ? "-"
                            : subject.credit,
                        roomName: "ยังไม่เลือกกลุ่มนักเรียน",
                        pendingGroup: true
                    });
                });
                rows.sort((a, b) =>
                    a.teacher.localeCompare(b.teacher, "th") ||
                    a.subjectCode.localeCompare(b.subjectCode, "th") ||
                    a.roomName.localeCompare(b.roomName, "th")
                );

                tbody.replaceChildren();

                const fragment = document.createDocumentFragment();

                rows.forEach(item => {
                    const row = document.createElement("tr");

                    row.dataset.teacherId = item.teacherId;

                    const teacherCell = row.insertCell();
                    const codeCell = row.insertCell();
                    const nameCell = row.insertCell();
                    const creditCell = row.insertCell();
                    const roomCell = row.insertCell();
                    const actionCell = row.insertCell();

                    teacherCell.textContent = item.teacher;
                    codeCell.textContent = item.subjectCode;
                    nameCell.textContent = item.subjectName;
                    creditCell.textContent = item.credit;
                    roomCell.textContent = item.roomName;

                    actionCell.textContent = "—";

                    fragment.appendChild(row);
                });

                tbody.appendChild(fragment);

                // B57-03-42 — Teacher Filter
                const teacherFilter = document.getElementById(
                    "admin-assignment-teacher"
                );

                if (teacherFilter) {
                    const previousTeacherId = teacherFilter.value;

                    teacherFilter.replaceChildren(
                        new Option("ครูทุกคน", "")
                    );

                    const uniqueTeachers = new Map();

                    rows.forEach(item => {
                        if (!uniqueTeachers.has(item.teacherId)) {
                            uniqueTeachers.set(
                                item.teacherId,
                                item.teacher
                            );
                        }
                    });

                    Array.from(uniqueTeachers.entries())
                        .sort((a, b) =>
                            a[1].localeCompare(b[1], "th")
                        )
                        .forEach(([teacherId, teacherName]) => {
                            teacherFilter.add(
                                new Option(teacherName, teacherId)
                            );
                        });

                    const teacherStillExists =
                        Array.from(teacherFilter.options).some(
                            option => option.value === previousTeacherId
                        );

                    teacherFilter.value = teacherStillExists
                        ? previousTeacherId
                        : "";

                    teacherFilter.disabled = false;

                    function applyTeacherFilter() {
                        const selectedTeacherId = teacherFilter.value;
                        let visibleCount = 0;

                        Array.from(tbody.rows).forEach(row => {
                            const matches =
                                !selectedTeacherId ||
                                row.dataset.teacherId === selectedTeacherId;

                            row.style.display = matches ? "" : "none";

                            if (matches) {
                                visibleCount++;
                            }
                        });

                        status.textContent =
                            `แสดงรายการมอบหมายการสอน ${visibleCount} รายการ`;

                        // B57-03-42 — อัปเดต Pagination หลังกรองครู
                        const pagination = document.getElementById(
                            "admin-assignment-pagination"
                        );

                        if (
                            pagination &&
                            typeof pagination._refreshPagination === "function"
                        ) {
                            pagination._refreshPagination();
                        }
                    }

                    teacherFilter.onchange = applyTeacherFilter;

                    applyTeacherFilter();

                } else {
                    status.textContent =
                        `แสดงรายการมอบหมายการสอน ${rows.length} รายการ`;
                }

            } catch (error) {
                if (version !== requestVersion) {
                    return;
                }

                console.error(
                    "B57-03: Failed to load teaching assignments:",
                    error
                );

                status.textContent =
                    "ไม่สามารถโหลดรายการมอบหมายการสอนได้";

                showMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            }
        }

        function updateSemesters() {
            // Invalidate requests from the previous selection.
            requestVersion++;

            semesterSelect.replaceChildren(
                new Option("-- เลือกภาคเรียน --", "")
            );

            const matchingSemesters = semesters.filter(
                semester => semester.academic_year_id === yearSelect.value
            );

            matchingSemesters.forEach(semester => {
                semesterSelect.add(
                    new Option(
                        `ภาคเรียนที่ ${semester.semester_no}`,
                        semester.id
                    )
                );
            });

            semesterSelect.disabled = matchingSemesters.length === 0;

            if (matchingSemesters.length === 0) {
                status.textContent = yearSelect.value
                    ? "ปีการศึกษานี้ยังไม่มีข้อมูลภาคเรียน"
                    : "กรุณาเลือกปีการศึกษา";

                showMessage("ยังไม่มีภาคเรียนที่เลือก");
                return;
            }

            const today = getBangkokDate();

            const activeSemester = matchingSemesters.find(
                semester =>
                    semester.start_date <= today &&
                    semester.end_date >= today
            );

            if (activeSemester) {
                semesterSelect.value = activeSemester.id;
            }

            loadSelectedAssignments();
        }

        yearSelect.onchange = updateSemesters;
        semesterSelect.onchange = loadSelectedAssignments;

        yearSelect.disabled = false;

        const currentYear = years.find(
            year => year.is_current === true
        );

        if (currentYear) {
            yearSelect.value = currentYear.id;
        }

        updateSemesters();

    } catch (error) {
        console.error(
            "B57-03: Failed to load academic context:",
            error
        );

        status.textContent =
            "ไม่สามารถโหลดปีการศึกษาและภาคเรียนได้";

        showMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
}

 // ============================================================
 // B56-ACTIVITY-10 — Admin Activity Assignment
 // READ ONLY — ยังไม่มีการบันทึกข้อมูล
 // ============================================================

async function loadAdminActivityAssignment() {
    const container = document.getElementById(
        "admin-activities-content"
    );

    if (!container) return;

    container.textContent = "กำลังโหลดข้อมูลครูและกิจกรรม...";

    try {
        const role = await getCurrentUserRole();

        if (role !== "Admin") {
            container.textContent =
                "ไม่มีสิทธิ์เข้าถึงหน้ามอบหมายกิจกรรม";
            return;
        }

        const semester = await getScheduleManageActiveSemester();

        if (!semester) {
            container.textContent =
                "ไม่พบภาคเรียนปัจจุบันที่เปิดให้จัดการกิจกรรม";
            return;
        }

        const [teachers, types, activities, yearResponse] =
            await Promise.all([
                getAdminActivityTeachers(),
                getActiveActivityTypes(),
                getActivitiesForScheduleCreate(),
                supabaseClient
                    .from("academic_years")
                    .select("year")
                    .eq("id", semester.academic_year_id)
                    .single()
            ]);

        if (yearResponse.error) {
            throw yearResponse.error;
        }

        // ตรวจความครบถ้วนก่อนแสดงผล
        if (types.length !== 9) {
            throw new Error(
                "จำนวนประเภทกิจกรรมไม่ครบ 9 ประเภท"
            );
        }

        const currentActivities = activities.filter(
            activity => activity.semesterId === semester.id
        );

        container.replaceChildren();

        const context = document.createElement("p");
        context.textContent =
            `ปีการศึกษา ${yearResponse.data.year} · ` +
            `ภาคเรียนที่ ${semester.semester_no}`;

        context.style.marginBottom = "16px";
        container.appendChild(context);

        const label = document.createElement("label");
        label.textContent = "👩‍🏫 เลือกครูผู้รับผิดชอบ";
        label.htmlFor = "admin-activity-teacher-select";

        const select = document.createElement("select");
        select.id = "admin-activity-teacher-select";
        select.className = "schedule-filter-select";

        select.style.cssText = [
            "display:block",
            "width:100%",
            "max-width:480px",
            "margin:8px 0 20px",
            "padding:10px"
        ].join(";");

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "-- เลือกครู --";

        select.appendChild(placeholder);

        teachers.forEach(teacher => {
            const option = document.createElement("option");

            option.value = teacher.id;

            const name = [
                teacher.first_name,
                teacher.last_name
            ].filter(Boolean).join(" ");

            const number =
                teacher.instructor_number || teacher.teacher_code || "";

            option.textContent =
                [number, name].filter(Boolean).join(" — ");

            select.appendChild(option);
        });

        const heading = document.createElement("h3");
        heading.textContent = "🎯 รายการกิจกรรม";

        const list = document.createElement("div");
        list.style.cssText = [
            "display:grid",
            "gap:10px",
            "margin-top:12px"
        ].join(";");

        const note = document.createElement("p");
        note.style.cssText = [
            "font-size:13px",
            "color:#64748b",
            "margin-top:16px"
        ].join(";");

        note.textContent =
        "เลือกรายการที่ต้องการ แล้วตรวจสอบข้อมูลก่อนยืนยัน " +
        "การมอบหมายจะบันทึกลงฐานข้อมูลจริง";

        // B56-ACTIVITY-11
        // เลือกกิจกรรมและตรวจสอบก่อนบันทึก
        // UI ONLY — ไม่มีการเขียนข้อมูล

        const selectedCodes = new Set();
        let assignmentSaving = false;

        const previewButton = document.createElement("button");
        previewButton.type = "button";
        previewButton.className = "btn";
        previewButton.textContent = "🔍 ตรวจสอบรายการที่เลือก";
        previewButton.disabled = true;
        previewButton.style.marginTop = "16px";

        const selectionSummary = document.createElement("p");
        selectionSummary.style.marginTop = "10px";

        function updateSelectionSummary() {
            selectionSummary.textContent =
                `เลือกกิจกรรมใหม่ ${selectedCodes.size} ประเภท`;

            previewButton.disabled =
                !select.value || selectedCodes.size === 0;
        }

        function renderActivities(teacherId) {
            list.replaceChildren();

            if (!teacherId) {
                list.textContent =
                    "กรุณาเลือกครูเพื่อดูสถานะกิจกรรม";
                updateSelectionSummary();
                return;
            }

            types.forEach(type => {
                const existing = currentActivities.filter(
                    activity =>
                        activity.activityTypeCode === type.code &&
                        Array.isArray(activity.teacherIds) &&
                        activity.teacherIds.includes(teacherId)
                );

                const row = document.createElement("div");

                row.style.cssText = [
                    "display:flex",
                    "justify-content:space-between",
                    "align-items:center",
                    "flex-wrap:wrap",
                    "gap:12px",
                    "padding:12px",
                    "border:1px solid #e2e8f0",
                    "border-radius:10px"
                ].join(";");

                const label = document.createElement("label");
                label.style.cssText = [
                    "display:flex",
                    "align-items:center",
                    "gap:10px",
                    "cursor:pointer"
                ].join(";");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = type.code;
                checkbox.checked = selectedCodes.has(type.code);

                // รายการที่มีอยู่แล้ว ห้ามเลือกสร้างซ้ำ
                checkbox.disabled = existing.length > 0;

                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) {
                        selectedCodes.add(type.code);
                    } else {
                        selectedCodes.delete(type.code);
                    }

                    updateSelectionSummary();
                });

                const name = document.createElement("span");
                name.textContent = `${type.name} (${type.code})`;

                label.append(checkbox, name);

                const status = document.createElement("strong");

                if (existing.length > 1) {
                    status.textContent = "⚠️ พบรายการซ้ำ";
                    status.style.color = "#dc2626";
                } else if (existing.length === 1) {
                    status.textContent = "✅ มีแล้ว";
                    status.style.color = "#16a34a";
                } else {
                    status.textContent = "ยังไม่ได้มอบหมาย";
                    status.style.color = "#64748b";
                }

                row.append(label, status);
                list.appendChild(row);
            });

            updateSelectionSummary();
        }

        select.addEventListener("change", () => {
            selectedCodes.clear();
            renderActivities(select.value);
        });

        previewButton.addEventListener("click", async () => {
            const teacher = teachers.find(
                item => item.id === select.value
            );

            if (!teacher || selectedCodes.size === 0) return;

            const teacherName = [
                teacher.first_name,
                teacher.last_name
            ].filter(Boolean).join(" ");

            const teacherNumber =
                teacher.instructor_number ||
                teacher.teacher_code ||
                "";

            const chosenTypes = types.filter(
                type => selectedCodes.has(type.code)
            );

            // B56-ACTIVITY-12
            // หน้าสรุปแบบจัดหมวดหมู่ อ่านง่าย
            // UI ONLY — ยังไม่บันทึกข้อมูลจริง

            const summaryBox = document.createElement("div");

            summaryBox.style.cssText = [
                "text-align:left",
                "font-size:15px",
                "line-height:1.7"
            ].join(";");

            // ส่วนข้อมูลครูและภาคเรียน
            const teacherBox = document.createElement("div");

            teacherBox.style.cssText = [
                "background:#f8fafc",
                "border:1px solid #e2e8f0",
                "border-radius:12px",
                "padding:16px",
                "margin-bottom:18px",
                "color:#334155"
            ].join(";");

            const teacherCaption = document.createElement("div");
            teacherCaption.textContent = "👩‍🏫 ครูผู้รับผิดชอบ";
            teacherCaption.style.cssText =
                "font-size:13px;color:#64748b;margin-bottom:4px";

            const teacherValue = document.createElement("div");
            teacherValue.textContent =
                [teacherNumber, teacherName]
                    .filter(Boolean)
                    .join(" — ");
            teacherValue.style.cssText =
                "font-size:17px;font-weight:700;margin-bottom:12px";

            const academicInfo = document.createElement("div");
            academicInfo.textContent =
                `📅 ปีการศึกษา ${yearResponse.data.year}` +
                `   |   ภาคเรียนที่ ${semester.semester_no}`;
            academicInfo.style.fontSize = "14px";

            teacherBox.append(
                teacherCaption,
                teacherValue,
                academicInfo
            );

            // ส่วนรายการกิจกรรม
            const activityHeading = document.createElement("h3");
            activityHeading.textContent = "🎯 กิจกรรมที่เลือก";
            activityHeading.style.cssText = [
                "font-size:16px",
                "margin:0 0 12px",
                "color:#1e293b"
            ].join(";");

            const activityList = document.createElement("div");
activityList.style.cssText = [
    "display:grid",
    "gap:8px",
    "max-height:220px",
    "overflow-y:auto",
    "overscroll-behavior:contain",
    "padding:2px 6px 2px 0"
].join(";");

            chosenTypes.forEach(type => {
                const item = document.createElement("div");

                item.style.cssText = [
                    "display:flex",
                    "gap:10px",
                    "align-items:flex-start",
                    "padding:10px 12px",
                    "border:1px solid #e2e8f0",
                    "border-radius:9px",
                    "color:#334155"
                ].join(";");

                const check = document.createElement("span");
                check.textContent = "✅";

                const name = document.createElement("span");
                name.textContent = `${type.name} (${type.code})`;

                item.append(check, name);
                activityList.appendChild(item);
            });

            // จำนวนกิจกรรมทั้งหมด
            const total = document.createElement("div");
            total.style.cssText = [
                "display:flex",
                "justify-content:space-between",
                "gap:10px",
                "font-weight:700",
                "margin-top:16px",
                "padding-top:14px",
                "border-top:1px solid #e2e8f0",
                "color:#1e293b"
            ].join(";");

            const totalLabel = document.createElement("span");
            totalLabel.textContent = "รวมทั้งหมด";

            const totalValue = document.createElement("span");
            totalValue.textContent =
                `${chosenTypes.length} กิจกรรม`;

            total.append(totalLabel, totalValue);

            const notice = document.createElement("p");
            notice.textContent =
            "โปรดตรวจสอบชื่อครู ปีการศึกษา และรายการกิจกรรม " +
            "ก่อนกดยืนยัน เพราะปุ่มยืนยันจะบันทึกข้อมูลจริง";

            notice.style.cssText = [
                "font-size:13px",
                "color:#64748b",
                "margin:16px 0 0"
            ].join(";");

            summaryBox.append(
                teacherBox,
                activityHeading,
                activityList,
                total,
                notice
            );

            // B56-ACTIVITY-13 — ยืนยันและบันทึกจริง
            // ใช้ RPC เดิมและตรวจผลจากฐานข้อมูลทุกกิจกรรม

            if (assignmentSaving) return;

            const confirmation = await Swal.fire({
                title: "ตรวจสอบการมอบหมายกิจกรรม",
                html: summaryBox,
                width: "min(600px, calc(100vw - 24px))",
                padding: "16px",
                confirmButtonText: "ยืนยันมอบหมาย",
                cancelButtonText: "ยกเลิก",
                confirmButtonColor: "#2563eb",
                showCancelButton: true,
                reverseButtons: true,
                heightAuto: false,
                didOpen: (popup) => {
                    popup.style.maxHeight = "calc(100dvh - 20px)";
                    popup.style.overflowY = "auto";
                    popup.style.boxSizing = "border-box";
                }
            });

            if (!confirmation.isConfirmed) return;
            if (assignmentSaving) return;

            assignmentSaving = true;
            previewButton.disabled = true;
            select.disabled = true;

            const teacherId = teacher.id;
            const verified = [];
            let processingType = null;

            // แสดงสถานะระหว่างบันทึก
            Swal.fire({
                title: "กำลังมอบหมายกิจกรรม",
                text: "กำลังตรวจสอบข้อมูลล่าสุด...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // ตรวจ Role อีกครั้งก่อนเขียนข้อมูล
                const currentRole = await getCurrentUserRole();

                if (currentRole !== "Admin") {
                    throw new Error("ไม่มีสิทธิ์มอบหมายกิจกรรม");
                }

                // ตรวจรายการล่าสุดจากฐานข้อมูล
                const before = await getActivitiesForScheduleCreate();

                for (const type of chosenTypes) {
                    const existing = before.filter(activity =>
                        activity.semesterId === semester.id &&
                        activity.academicYearId ===
                            semester.academic_year_id &&
                        activity.activityTypeCode === type.code &&
                        Array.isArray(activity.teacherIds) &&
                        activity.teacherIds.includes(teacherId)
                    );

                    if (existing.length > 0) {
                        throw new Error(
                            `${type.name} มีอยู่แล้วในฐานข้อมูล ` +
                            "กรุณาโหลดหน้าใหม่ก่อนดำเนินการ"
                        );
                    }

                    if (!type.id || !type.code) {
                        throw new Error("ข้อมูลประเภทกิจกรรมไม่ครบถ้วน");
                    }

                    if (
                        type.code !== "CLUB" &&
                        (
                            !type.name ||
                            type.name.trim().length > 30
                        )
                    ) {
                        throw new Error(
                            `ชื่อกิจกรรม ${type.code} ไม่ถูกต้อง`
                        );
                    }
                }

                // บันทึกทีละประเภทและตรวจผลหลังบันทึก
                for (const type of chosenTypes) {
                    processingType = type;

                    Swal.update({
                        text:
                            `กำลังมอบหมาย ${type.name} ` +
                            `(${verified.length + 1}/${chosenTypes.length})`
                    });

                    const activityId = await createTeacherActivity({
                        activityTypeId: type.id,
                        activityName:
                            type.code === "CLUB" ? "" : type.name,
                        teacherId
                    });

                    // อ่านฐานข้อมูลใหม่ ไม่เชื่อผลจาก RPC อย่างเดียว
                    const after = await getActivitiesForScheduleCreate();

                    const matches = after.filter(activity =>
                        activity.activityId === activityId &&
                        activity.semesterId === semester.id &&
                        activity.academicYearId ===
                            semester.academic_year_id &&
                        activity.activityTypeCode === type.code &&
                        Array.isArray(activity.teacherIds) &&
                        activity.teacherIds.includes(teacherId)
                    );

                    const sameType = after.filter(activity =>
                        activity.semesterId === semester.id &&
                        activity.academicYearId ===
                            semester.academic_year_id &&
                        activity.activityTypeCode === type.code &&
                        Array.isArray(activity.teacherIds) &&
                        activity.teacherIds.includes(teacherId)
                    );

                    if (matches.length !== 1 ||
                        sameType.length !== 1) {
                        throw new Error(
                            "ยังยืนยันผลจากฐานข้อมูลไม่ได้ " +
                            `สำหรับ ${type.name}`
                        );
                    }

                    verified.push(type);
                }

                // ยืนยันครบทุกกิจกรรม
                await Swal.fire({
                    icon: "success",
                    title: "มอบหมายกิจกรรมสำเร็จ",
                    text:
                        `ตรวจสอบแล้ว ${verified.length} กิจกรรม ` +
                        `สำหรับครู ${teacherNumber} ${teacherName}`,
                    confirmButtonText: "ตกลง"
                });

            } catch (error) {
                console.error(
                    "B56 Activity Assignment:",
                    error
                );

                const completedText = verified.length
                    ? verified.map(type =>
                        `• ${type.name} (${type.code})`
                    ).join("\n")
                    : "ไม่มีรายการที่ยืนยันสำเร็จ";

                const uncertainText = processingType
                    ? `\nรายการที่ต้องตรวจสอบเพิ่มเติม: ` +
                      processingType.name
                    : "";

                await Swal.fire({
                    icon: "error",
                    title: "มอบหมายกิจกรรมไม่ครบ",
                    text:
                        `ตรวจยืนยันสำเร็จ ${verified.length} รายการ\n` +
                        completedText +
                        uncertainText +
                        "\n\nสาเหตุ: " +
                        (error.message || "เกิดข้อผิดพลาด") +
                        "\nกรุณาตรวจสถานะล่าสุดก่อนลองอีกครั้ง",
                    confirmButtonText: "ตกลง"
                });

            } finally {
                assignmentSaving = false;
                select.disabled = false;

                // โหลดสถานะจริงใหม่ทุกกรณี
                await loadAdminActivityAssignment();
            }

        });

        container.append(
            label,
            select,
            heading,
            list,
            selectionSummary,
            previewButton,
            note
        );

        renderActivities("");

    } catch (error) {
        console.error(
            "B56 Admin Activity Assignment:",
            error
        );

        container.textContent =
            "ไม่สามารถโหลดข้อมูลกิจกรรมได้: " +
            (error.message || "เกิดข้อผิดพลาด");
    }
}

function openStudentDetailFromMenu() {
    if (typeof StudentDetail === "undefined") {
        Swal.fire("ระบบไม่พร้อม", "ไม่พบโมดูลรายละเอียดนักเรียน", "error");
        return;
    }

    StudentDetail.open();
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');

    body.classList.toggle('dark-mode');

    const icon = btn.querySelector('.menu-icon');
    const text = btn.querySelector('.menu-text');

    if (body.classList.contains('dark-mode')) {
        icon.textContent = '☀️';
        text.textContent = 'Light Mode';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark Mode';
    }
}

function showSetting(page) {

    // ซ่อนทุกหน้า
    document.querySelectorAll(".setting-page").forEach(p => {
        p.style.display = "none";
    });

    // ลบ active ทุกปุ่ม
    document.querySelectorAll(".setting-item").forEach(btn => {
        btn.classList.remove("active");
    });

    // แสดงหน้าที่เลือก
    document.getElementById("setting-" + page).style.display = "block";

    // เติม active ให้ปุ่มที่กด
    document.querySelector(`[onclick="showSetting('${page}')"]`).classList.add("active");

}

/* =====================================================
   B56-06 — Change Password
   ขั้นตอนตรวจฟอร์มเท่านั้น ยังไม่เปลี่ยนรหัสจริง
   ===================================================== */

async function openChangePasswordForm() {
    const result = await Swal.fire({
        title: "🔐 เปลี่ยนรหัสผ่าน",
        width: 520,
        padding: "16px 24px",
        html: `
            <div style="
                text-align:left;
                display:grid;
                gap:12px;
            ">
                <div>
                    <label for="b56-current-password">
                        รหัสผ่านปัจจุบัน *
                    </label>
                    <input
                        id="b56-current-password"
                        type="password"
                        class="swal2-input"
                        autocomplete="off"
                        style="
                            width:100%;
                            height:40px;
                            margin:5px 0 0;
                            box-sizing:border-box;
                        "
                    >
                </div>

                <div>
                    <label for="b56-new-password">
                        รหัสผ่านใหม่ *
                    </label>
                    <input
                        id="b56-new-password"
                        type="password"
                        class="swal2-input"
                        autocomplete="new-password"
                        style="
                            width:100%;
                            height:40px;
                            margin:5px 0 0;
                            box-sizing:border-box;
                        "
                    >
                </div>

                <div>
                    <label for="b56-confirm-password">
                        ยืนยันรหัสผ่านใหม่ *
                    </label>
                    <input
                        id="b56-confirm-password"
                        type="password"
                        class="swal2-input"
                        autocomplete="new-password"
                        style="
                            width:100%;
                            height:40px;
                            margin:5px 0 0;
                            box-sizing:border-box;
                        "
                    >
                </div>

                <p style="
                    margin:0;
                    font-size:13px;
                    color:#64748b;
                    line-height:1.6;
                ">
                    รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร
                    และไม่ควรใช้รหัสผ่านเดิมซ้ำ
                </p>
            </div>
        `,

        showCancelButton: true,
        confirmButtonText: "ตรวจสอบรหัสผ่าน",
        cancelButtonText: "ยกเลิก",
        focusConfirm: false,

                // B56-06.3 — ปุ่มแสดง/ซ่อนรหัสผ่าน
        didOpen: () => {
            // เริ่มต้นช่องรหัสผ่านปัจจุบันเป็นค่าว่าง
            const currentInput = document.getElementById(
                "b56-current-password"
            );

            if (currentInput) {
                currentInput.value = "";
            }
            const passwordIds = [
                "b56-current-password",
                "b56-new-password",
                "b56-confirm-password"
            ];

            passwordIds.forEach(id => {
                const input = document.getElementById(id);

                if (!input) return;

                const container = input.parentElement;
                container.style.position = "relative";

                input.style.paddingRight = "48px";

                const eyeButton = document.createElement("button");

                eyeButton.type = "button";
                eyeButton.textContent = "👁️";
                eyeButton.title = "แสดงรหัสผ่าน";
                eyeButton.setAttribute(
                    "aria-label",
                    "แสดงรหัสผ่าน"
                );

                eyeButton.style.cssText = [
                    "position:absolute",
                    "right:10px",
                    "bottom:4px",
                    "width:36px",
                    "height:34px",
                    "border:none",
                    "background:transparent",
                    "cursor:pointer",
                    "font-size:19px",
                    "display:flex",
                    "align-items:center",
                    "justify-content:center"
                ].join(";");

                eyeButton.addEventListener("click", () => {
                    const isHidden = input.type === "password";

                    input.type = isHidden ? "text" : "password";

                    eyeButton.textContent = isHidden
                        ? "🙈"
                        : "👁️";

                    eyeButton.title = isHidden
                        ? "ซ่อนรหัสผ่าน"
                        : "แสดงรหัสผ่าน";

                    eyeButton.setAttribute(
                        "aria-label",
                        eyeButton.title
                    );
                });

                container.appendChild(eyeButton);
            });
        },

        preConfirm: () => {
            const currentPassword =
                document.getElementById(
                    "b56-current-password"
                ).value;

            const newPassword =
                document.getElementById(
                    "b56-new-password"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "b56-confirm-password"
                ).value;

            if (!currentPassword) {
                Swal.showValidationMessage(
                    "กรุณากรอกรหัสผ่านปัจจุบัน"
                );
                return false;
            }

            if (newPassword.length < 12) {
                Swal.showValidationMessage(
                    "รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร"
                );
                return false;
            }

            if (newPassword === currentPassword) {
                Swal.showValidationMessage(
                    "รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม"
                );
                return false;
            }

            if (newPassword !== confirmPassword) {
                Swal.showValidationMessage(
                    "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน"
                );
                return false;
            }

            return {
                currentPassword,
                newPassword
            };
        }

    });

    if (!result.isConfirmed || !result.value) return;

    const { currentPassword, newPassword } = result.value;

    // B56-06.4 — เปลี่ยนรหัสผ่านของบัญชีที่ Login อยู่
    Swal.fire({
        title: "กำลังเปลี่ยนรหัสผ่าน",
        text: "กรุณารอให้ระบบยืนยันผลการบันทึก",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // ตรวจสอบตัวตนของผู้ใช้งานปัจจุบัน
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData?.user?.id) {
            throw new Error("SESSION_REQUIRED");
        }

        // Supabase Auth ตรวจรหัสผ่านเดิมที่ Server
        const { data, error } =
            await supabaseClient.auth.updateUser({
                password: newPassword,
                current_password: currentPassword
            });

        if (error) {
            throw error;
        }

        if (!data?.user?.id ||
            data.user.id !== userData.user.id) {
            throw new Error("UPDATE_NOT_CONFIRMED");
        }

        await Swal.fire({
            icon: "success",
            title: "เปลี่ยนรหัสผ่านสำเร็จ",
            text:
                "ระบบบันทึกรหัสผ่านใหม่เรียบร้อยแล้ว " +
                "โปรดใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งต่อไป",
            confirmButtonText: "ตกลง"
        });

    } catch (error) {
    // B56 — ตรวจสาเหตุโดยไม่แสดงรหัสผ่าน
    console.info("B56 Password Change:", {
        code: error?.code || "ไม่มี",
        status: error?.status || "ไม่มี",
        name: error?.name || "ไม่มี",
        message: error?.message || "ไม่มี"
    });

    const errorCode = error?.code || error?.message || "";

        let message =
            "ไม่สามารถยืนยันผลการเปลี่ยนรหัสผ่านได้ " +
            "กรุณาตรวจสอบสถานะบัญชีก่อนลองใหม่";

        if (
            errorCode === "current_password_invalid" ||
            errorCode === "current_password_mismatch" ||
            errorCode === "current_password_required"
        ) {
            message =
                "รหัสผ่านปัจจุบันไม่ถูกต้อง " +
                "กรุณาตรวจสอบแล้วลองใหม่";

        } else if (errorCode === "same_password") {
            message =
                "รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม";
        } else if (errorCode === "weak_password") {
            message =
                "รหัสผ่านใหม่ไม่ผ่านเงื่อนไขความปลอดภัย";
        } else if (errorCode === "SESSION_REQUIRED") {
            message =
                "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
        }

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
            text: message,
            confirmButtonText: "ตกลง"
        });
    }

}

// เชื่อมปุ่มเปลี่ยนรหัสผ่าน โดยไม่แก้ HTML เพิ่ม
document.addEventListener("click", function (event) {
    if (event.target.closest("#btn-change-password")) {
        openChangePasswordForm();
    }
});

// =========================================
// 🌐 ศูนย์รวมระบบ
// =========================================

function openHomeVisit() {

    window.open(
        "https://script.google.com/macros/s/AKfycbxdheI3npD8Foq-TYqqbd2ZAFwBE_lYTnQN193q0-HWl43ohJkDNmJd7RvRdiDr7od7/exec",
        "_blank"
    );

}

function openClassroomOnline() {

    window.open(
        "https://sites.google.com/view/kruyanisaclass/%E0%B8%AB%E0%B8%99%E0%B8%B2%E0%B9%81%E0%B8%A3%E0%B8%81",
        "_blank"
    );

}

// =========================================================
// Navigation Controller — UI.01
// =========================================================

function toggleNavGroup(groupName) {

    const group = document.getElementById(`nav-group-${groupName}`);

    if (!group) {
        console.warn(`Navigation group not found: ${groupName}`);
        return;
    }

    group.classList.toggle('open');
}


function showNavigationPlaceholder(featureName) {

    const placeholder =
        document.getElementById(
            "view-navigation-placeholder"
        );

    if (!placeholder) {
        console.warn(
            "Navigation placeholder view not found."
        );
        return;
    }

    // ซ่อน View หลักทั้งหมด
    const views = [
        "attendance",
        "homework",
        "qrcode",
        "guidance",
        "study",
        "scholarship",
        "pdf",
        "settings",
        "portal",
        "dashboard",
        "schedule",
        'import',
        "student-management",
        "student-detail",
        "admin-academic",
        "admin-users",
        "admin-activities",
        "admin-subjects",
        "admin-assignments",
        "admin-audit"

    ];

    views.forEach(viewName => {

        const view =
            document.getElementById(
                `view-${viewName}`
            );

        if (view) {
            view.style.display = "none";
        }

    });


    // ลบ Active จากเมนูที่เป็น View จริง
    document
        .querySelectorAll(".menu-btn.active")
        .forEach(button => {
            button.classList.remove("active");
        });


    // กำหนดข้อความ Placeholder
    const title =
        document.getElementById(
            "navigation-placeholder-title"
        );

    const subtitle =
        document.getElementById(
            "navigation-placeholder-subtitle"
        );

    const heading =
        document.getElementById(
            "navigation-placeholder-heading"
        );

    const description =
        document.getElementById(
            "navigation-placeholder-description"
        );


    if (title) {
        title.textContent =
            `🚧 ${featureName}`;
    }

    if (subtitle) {
        subtitle.textContent =
            "ฟังก์ชันนี้กำลังเตรียมพัฒนา";
    }

    if (heading) {
        heading.textContent =
            featureName;
    }

    if (description) {
        description.textContent =
            "ระบบส่วนนี้อยู่ในแผนการพัฒนา และจะเปิดใช้งานในลำดับถัดไป";
    }


    // แสดง Placeholder
    placeholder.style.display = "block";
}


function openSchedulePlaceholder() {

    showNavigationPlaceholder("ตารางสอน");
}
// ============================================================
// SCHEDULE MANAGEMENT TYPE
// STEP 4.2 — Class / Activity Sub-tab
// ============================================================

function switchScheduleManageType(type) {

    const classTab =
        document.getElementById(
            "schedule-manage-class-tab"
        );

    const activityTab =
        document.getElementById(
            "schedule-manage-activity-tab"
        );

    const addClassButton =
        document.getElementById(
            "schedule-manage-add-class-btn"
        );

    const addActivityButton =
        document.getElementById(
            "schedule-manage-add-activity-btn"
        );

    const filterArea =
        document.getElementById(
            "schedule-manage-filter"
        );

    const list =
        document.getElementById(
            "schedule-manage-list"
        );

    if (
        !classTab ||
        !activityTab ||
        !addClassButton ||
        !addActivityButton ||
        !filterArea ||
        !list
    ) {
        return;
    }

    // ========================================================
    // CLASS
    // ========================================================

    if (type === "class") {

        classTab.style.background = "#2563eb";
        classTab.style.color = "#fff";

        activityTab.style.background = "transparent";
        activityTab.style.color = "#334155";

        addClassButton.style.display = "";
        addActivityButton.style.display = "none";

        filterArea.innerHTML = `
            <select
                id="schedule-manage-day-filter"
                class="schedule-filter-select"
            >
                <option value="">📅 ทุกวัน</option>
                <option value="1">จันทร์</option>
                <option value="2">อังคาร</option>
                <option value="3">พุธ</option>
                <option value="4">พฤหัสบดี</option>
                <option value="5">ศุกร์</option>
            </select>

            <select
    id="schedule-manage-lesson-filter"
    class="schedule-filter-select"
>
    <option value="">🔢 ทุกคาบ</option>

    ${SCHEDULE_PERIODS.map(period => `
        <option value="${period.lessonNo}">
            ${period.label}
        </option>
    `).join("")}
</select>
        `;

const dayFilter =
    document.getElementById(
        "schedule-manage-day-filter"
    );

const lessonFilter =
    document.getElementById(
        "schedule-manage-lesson-filter"
    );

dayFilter.addEventListener(
    "change",
    () => loadScheduleManage()
);

lessonFilter.addEventListener(
    "change",
    () => loadScheduleManage()
);

        list.innerHTML = `
            <div class="schedule-loading-state">
                <div class="schedule-empty-icon">🗂️</div>
                <h2>กำลังโหลดตารางสอน...</h2>
            </div>
        `;

        loadScheduleManage();

        return;
    }

    // ========================================================
    // ACTIVITY
    // ========================================================

    classTab.style.background = "transparent";
    classTab.style.color = "#334155";

    activityTab.style.background = "#2563eb";
    activityTab.style.color = "#fff";

    addClassButton.style.display = "none";
    addActivityButton.style.display = "";

    filterArea.innerHTML = `
        <select
            id="activity-manage-type-filter"
            class="schedule-filter-select"
        >
            <option value="">🎯 ทุกประเภทกิจกรรม</option>
        </select>

        <select
            id="activity-manage-day-filter"
            class="schedule-filter-select"
        >
            <option value="">📅 ทุกวัน</option>
            <option value="1">จันทร์</option>
            <option value="2">อังคาร</option>
            <option value="3">พุธ</option>
            <option value="4">พฤหัสบดี</option>
            <option value="5">ศุกร์</option>
        </select>
    `;

    const activityTypeFilter =
    document.getElementById(
        "activity-manage-type-filter"
    );

const activityDayFilter =
    document.getElementById(
        "activity-manage-day-filter"
    );

activityTypeFilter.addEventListener(
    "change",
    () => loadActivityScheduleManage()
);

activityDayFilter.addEventListener(
    "change",
    () => loadActivityScheduleManage()
);

    loadActivityScheduleManage();
}
// ============================================================
// SCHEDULE UI — STEP 5B.3
// ============================================================

function switchScheduleTab(tabName) {

    const tabs = document.querySelectorAll('.schedule-tab');

    tabs.forEach(tab => {
        tab.classList.toggle(
            'active',
            tab.dataset.scheduleTab === tabName
        );
    });

    const content = document.getElementById('schedule-content');

    if (!content) return;

    if (tabName === 'timetable') {

    loadScheduleView();

    return;
}

    if (tabName === 'manage') {

    content.innerHTML = `
        <div class="schedule-manage-header">

            <div>
                <h2>🗂️ จัดการตาราง</h2>
                <p>จัดการ เพิ่ม แก้ไข และสิ้นสุดตารางสอน</p>
            </div>

            <div
    id="schedule-manage-add-actions"
    style="
        display:flex;
        align-items:center;
        gap:8px;
    "
>
    <button
        type="button"
        id="schedule-manage-add-class-btn"
        class="schedule-add-btn"
        onclick="openScheduleCreate()"
    >
        ＋ เพิ่มตารางสอน
    </button>

    <button
        type="button"
        id="schedule-manage-add-activity-btn"
        class="schedule-add-btn"
        style="display:none;"
        onclick="openActivityScheduleCreate()"
    >
        ＋ เพิ่มตารางกิจกรรม
    </button>
</div>

        </div>

        <!-- Schedule Management Type -->
        <div
            style="
                display:flex;
                gap:8px;
                margin:16px 0 12px;
                padding:4px;
                background:#f1f5f9;
                border-radius:12px;
                width:max-content;
            "
        >

            <button
                type="button"
                id="schedule-manage-class-tab"
                onclick="switchScheduleManageType('class')"
                style="
                    border:0;
                    border-radius:9px;
                    padding:9px 18px;
                    background:#2563eb;
                    color:#fff;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                📚 วิชา
            </button>

            <button
                type="button"
                id="schedule-manage-activity-tab"
                onclick="switchScheduleManageType('activity')"
                style="
                    border:0;
                    border-radius:9px;
                    padding:9px 18px;
                    background:transparent;
                    color:#334155;
                    font-weight:600;
                    cursor:pointer;
                "
            >
                🎯 กิจกรรม
            </button>

        </div>

        <!-- Filter Area -->
        <div
            id="schedule-manage-filter"
            style="
                display:flex;
                flex-wrap:wrap;
                gap:10px;
                margin-bottom:16px;
            "
        ></div>

        <!-- Schedule List -->
        <div id="schedule-manage-list">

            <div class="schedule-loading-state">
                <div class="schedule-empty-icon">🗂️</div>
                <h2>กำลังโหลดตารางสอน...</h2>
            </div>

        </div>
    `;

    switchScheduleManageType('class');

    return;
}

    if (tabName === 'groups') {

        content.innerHTML = `
            <div class="schedule-empty-state">
                <div class="schedule-empty-icon">👥</div>
                <h2>กลุ่มการสอน</h2>
                <p>จัดการ Schedule Group สำหรับการสอนร่วมกัน</p>
                <span class="schedule-status-badge">
                    เตรียมพัฒนาต่อ
                </span>
            </div>
        `;

        return;
    }

}

// ============================================================
// SCHEDULE DATA MAPPING
// STEP 5B.4.3
// ============================================================

function mapScheduleData(schedule) {

    const assignment = schedule.subject_assignments || {};
const subject = assignment.subjects || {};
const teacher = assignment.teachers || {};
const room = assignment.rooms || {};
const teachingRoom = schedule.teaching_rooms || {};

// Semester Lock — อ่านจากภาคเรียนของ Assignment
const semester = assignment.semesters || {};

    const teacherName = [
        teacher.first_name,
        teacher.last_name
    ]
        .filter(Boolean)
        .join(" ");

    return {
        id: schedule.id,
        subjectAssignmentId:
    schedule.subject_assignment_id,

semesterId:
    assignment.semester_id || null,

semesterStart:
    semester.start_date || null,

semesterEnd:
    semester.end_date || null,

semesterLockedAt:
    semester.schedule_locked_at || null,

teachingRoomId:
    schedule.teaching_room_id,

        weekday: schedule.weekday,
        lessonNo: schedule.lesson_no,

        startTime: schedule.start_time,
        endTime: schedule.end_time,

        validFrom: schedule.valid_from,
        validUntil: schedule.valid_until,

        scheduleGroupId: schedule.schedule_group_id,

        className: room.room_name || "",
        teachingRoom: teachingRoom.room_name || "",

        subjectCode: subject.subject_code || "",
        subjectName: subject.subject_name || "",

        teacherId: assignment.teacher_id || "",
        teacherName: teacherName
    };
}

// ============================================================
// SCHEDULE TIMETABLE
// STEP 5B.5.1
// ============================================================


function scheduleLocalToday() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function scheduleIsValidOnDate(item, date) {
    return (
        (!item.validFrom || item.validFrom <= date) &&
        (!item.validUntil || item.validUntil >= date)
    );
}

async function loadScheduleView(referenceDate) {

    const content = document.getElementById("schedule-content");
    if (!content) return;

    const selectedDate =
        typeof referenceDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)
            ? referenceDate
            : (
                window.scheduleReferenceDate ||
                scheduleLocalToday()
            );

    window.scheduleReferenceDate = selectedDate;

    content.innerHTML = `
        <div class="schedule-loading-state">
            <h2>กำลังโหลดตารางสอน...</h2>
        </div>
    `;

    try {

        const [
            rawSchedules,
            rawActivities,
            role
        ] = await Promise.all([
            getClassSchedules(),
            getActivitySchedules(),
            getCurrentUserRole()
        ]);

        let teacherId = null;

        if (role === "Teacher") {

            const context =
                await getCurrentTeacherContext();

            teacherId = context?.teacherId;

            if (!teacherId) {
                throw new Error(
                    "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
                );
            }

        } else if (role !== "Admin") {

            throw new Error(
                "ไม่มีสิทธิ์ดูตารางสอน"
            );
        }

        // ตารางสอนที่มีผลในวันที่เลือก
        const validSchedules = (rawSchedules || [])
            .map(mapScheduleData)
            .filter(item =>
                scheduleIsValidOnDate(item, selectedDate)
            );

        // Admin ต้องเลือกครูหนึ่งคนเสมอ
        if (role === "Admin") {
            const availableTeacherIds = [
                ...new Set(
                    validSchedules
                        .map(item => item.teacherId)
                        .filter(Boolean)
                )
            ];

            if (
                !availableTeacherIds.includes(
                    window.scheduleAdminTeacherId
                )
            ) {
                window.scheduleAdminTeacherId =
                    availableTeacherIds[0] || "";
            }
        }

        const selectedTeacherId =
            role === "Admin"
                ? window.scheduleAdminTeacherId
                : teacherId;


        const schedules = validSchedules.filter(item =>
            !selectedTeacherId ||
            item.teacherId === selectedTeacherId
        );

        // B53 — หาภาคเรียนของวันที่เลือกดูตาราง
        const {
            data: dateSemesters,
            error: dateSemesterError
        } = await supabaseClient
            .from("semesters")
            .select("id")
            .lte("start_date", selectedDate)
            .gte("end_date", selectedDate);

        if (dateSemesterError) {
            throw dateSemesterError;
        }

        if ((dateSemesters || []).length > 1) {
            throw new Error(
                "พบภาคเรียนซ้อนทับกันในวันที่เลือก"
            );
        }

        const activityDateSemesterId =
        dateSemesters?.[0]?.id || null;

        // กิจกรรมต้องอยู่ในภาคเรียนของวันที่เลือก
        // และอยู่ในช่วงวันที่ใช้งานจริง
        const activities = (rawActivities || [])
            .filter(item =>
    activityDateSemesterId !== null &&
    item.semesterId === activityDateSemesterId &&
    scheduleIsValidOnDate(item, selectedDate)
                )
            .filter(item =>
                role === "Admin" ||
                (
                    Array.isArray(item.teacherIds) &&
                    item.teacherIds.includes(teacherId)
                )
            );

const filteredActivitySchedules =
    (activities || []).filter(item =>
        Array.isArray(item.teacherIds) &&
        item.teacherIds.includes(selectedTeacherId)
    );

// ============================================================
// B55.44 — แสดงชื่อ CLUB ตามวันที่เลือกดูตารางสอน
// Read-only / ไม่เปลี่ยนข้อมูล Attendance
// ============================================================

const clubNameById = new Map();

const clubIds = [
    ...new Set(
        filteredActivitySchedules
            .filter(item =>
                item.activityTypeCode === "CLUB" &&
                item.activityId
            )
            .map(item => item.activityId)
    )
];

// อ่านชื่อเพียงหนึ่งครั้งต่อชุมนุม
await Promise.all(
    clubIds.map(async activityId => {
        const name = await getClubNameForDate(
            activityId,
            selectedDate
        );

        clubNameById.set(activityId, name);
    })
);

// สร้างรายการสำหรับแสดงผลเท่านั้น
// ไม่แก้ข้อมูลต้นฉบับที่โหลดจาก API
const displayActivitySchedules =
    filteredActivitySchedules.map(item => {

        if (item.activityTypeCode !== "CLUB") {
            return item;
        }

        return {
            ...item,
            activityName:
                clubNameById.get(item.activityId) ||
                item.activityName ||
                "ชุมนุม"
        };
    });

renderScheduleTimetable(
    schedules,
    displayActivitySchedules
);

        // เพิ่มตัวเลือกวันที่เหนือแสดงตาราง
        const toolbar = document.createElement("div");

        toolbar.style.cssText = `
            display:flex;
            align-items:center;
            gap:12px;
            flex-wrap:wrap;
            margin-bottom:16px;
        `;

        const label = document.createElement("label");
        label.htmlFor = "schedule-reference-date";
        label.textContent = "📅 ดูตารางที่ใช้ในวันที่";

        const input = document.createElement("input");
        input.type = "date";
        input.id = "schedule-reference-date";
        input.value = selectedDate;

        input.style.cssText = `
            padding:9px 12px;
            border:1px solid #cbd5e1;
            border-radius:9px;
        `;

        input.addEventListener("change", function () {
            if (this.value) {
                loadScheduleView(this.value);
            }
        });

        toolbar.append(label, input);
        content.prepend(toolbar);

        // ============================================
        // ADMIN — Teacher Filter
        // ============================================

        if (role === "Admin") {

            const teacherMap = new Map();

            validSchedules.forEach(item => {
                if (
                    item.teacherId &&
                    !teacherMap.has(item.teacherId)
                ) {
                    teacherMap.set(item.teacherId, {
                        id: item.teacherId,
                        name: item.teacherName || "ไม่ระบุชื่อ"
                    });
                }
            });

            const teacherFilter =
                document.createElement("select");

            teacherFilter.id = "schedule-teacher-filter";

            teacherFilter.style.cssText = `
                padding: 9px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 9px;
                font-family: inherit;
                max-width: 100%;
            `;

            [...teacherMap.values()]
                .sort((a, b) =>
                    a.name.localeCompare(b.name, "th")
                )
                .forEach(teacher => {
                    const option =
                        document.createElement("option");

                    option.value = teacher.id;
                    option.textContent = teacher.name;

                    teacherFilter.appendChild(option);
                });

            teacherFilter.value =
                window.scheduleAdminTeacherId || "";

            teacherFilter.addEventListener("change", function () {
                window.scheduleAdminTeacherId = this.value;
                loadScheduleView(selectedDate);
            });

            const teacherLabel =
                document.createElement("label");

            teacherLabel.htmlFor =
                "schedule-teacher-filter";

            teacherLabel.textContent = "👨‍🏫 ครูผู้สอน";

            toolbar.append(
                teacherLabel,
                teacherFilter
            );
        }

        // ============================================
        // SCHEDULE HEADER — Teacher / Admin
        // ============================================

        const scheduleHeader = document.createElement("div");

        scheduleHeader.style.cssText = `
            margin-bottom: 16px;
            padding: 14px 18px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: var(--card-bg, #ffffff);
        `;

        if (role === "Teacher") {

            const { data: teacher, error: teacherError } =
                await supabaseClient
                    .from("teachers")
                    .select(`
                        instructor_number,
                        first_name,
                        last_name
                    `)
                    .eq("id", teacherId)
                    .single();

            if (teacherError) {
                throw teacherError;
            }

            const teacherName = [
                teacher.first_name,
                teacher.last_name
            ].filter(Boolean).join(" ");

            const instructorNumber =
                teacher.instructor_number
                    ? teacher.instructor_number + " "
                    : "";

            const heading = document.createElement("h2");
            heading.textContent =
                `ตารางสอน ${instructorNumber}${teacherName}`;

            heading.style.cssText = `
                margin: 0;
                font-size: 20px;
                font-weight: 700;
            `;

            scheduleHeader.appendChild(heading);

        } else {

            const heading = document.createElement("h2");

            // Admin: แสดงชื่อครูตาม Filter ที่เลือก
            heading.textContent = "ตารางสอนบุคลากร";

            if (selectedTeacherId) {

                const { data: selectedTeacher, error: teacherError } =
                    await supabaseClient
                        .from("teachers")
                        .select(
                            "instructor_number, first_name, last_name"
                        )
                        .eq("id", selectedTeacherId)
                        .maybeSingle();

                if (teacherError) {
                    console.error(
                        "Load selected teacher:",
                        teacherError
                    );
                }

                if (selectedTeacher) {

                    const teacherName = [
                        selectedTeacher.first_name,
                        selectedTeacher.last_name
                    ]
                        .filter(Boolean)
                        .join(" ");

                    const instructorNumber =
                        selectedTeacher.instructor_number || "";

                    heading.textContent =
                        `ตารางสอน ${[
                            instructorNumber,
                            teacherName
                        ].filter(Boolean).join(" ")}`;
                }
            }

            heading.style.cssText = `
                margin: 0;
                font-size: 20px;
                font-weight: 700;
            `;

            scheduleHeader.appendChild(heading);
        }

        content.insertBefore(
            scheduleHeader,
            toolbar.nextSibling
        );

        // ============================================
        // แสดงภาคเรียนจาก Supabase ตามวันที่เลือก
        // ============================================

        const { data: semester, error: semesterError } =
            await supabaseClient
                .from("semesters")
                .select(
                    "semester_no, academic_year_id, start_date, end_date"
                )
                .lte("start_date", selectedDate)
                .gte("end_date", selectedDate)
                .limit(1)
                .maybeSingle();

        if (semesterError) {
            console.error("Load semester:", semesterError);
        }

        let semesterLabel = "ไม่พบภาคเรียนของวันที่เลือก";

        if (semester) {

            const { data: academicYear, error: yearError } =
                await supabaseClient
                    .from("academic_years")
                    .select("year")
                    .eq("id", semester.academic_year_id)
                    .maybeSingle();

            if (yearError) {
                console.error("Load academic year:", yearError);
            }

            semesterLabel =
                academicYear?.year != null
                    ? `ภาคเรียนที่ ${semester.semester_no}/${academicYear.year}`
                    : `ภาคเรียนที่ ${semester.semester_no}`;
        }

        const semesterText = document.createElement("p");

        semesterText.textContent =
            `${semesterLabel} · โรงเรียนศรีสุขวิทยา`;

        semesterText.style.cssText = `
            margin: 5px 0 0;
            font-size: 14px;
            color: #64748b;
        `;

        scheduleHeader.appendChild(semesterText);

        // ============================================
        // SEMESTER FILTER — โหลดจาก Supabase
        // ============================================

        const { data: semesterOptions, error: optionsError } =
            await supabaseClient
                .from("semesters")
                .select(`
                    id,
                    semester_no,
                    academic_year_id,
                    start_date,
                    end_date
                `)
                .order("start_date", { ascending: false });

        if (optionsError) {
            throw optionsError;
        }

        const { data: academicYears, error: yearsError } =
            await supabaseClient
                .from("academic_years")
                .select("id, year");

        if (yearsError) {
            throw yearsError;
        }

        const yearsById = new Map(
            (academicYears || []).map(year => [
                year.id,
                year.year
            ])
        );

        const semesterFilter = document.createElement("select");
        semesterFilter.id = "schedule-semester-filter";

        semesterFilter.style.cssText = `
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 9px;
            font-family: inherit;
            max-width: 100%;
        `;

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "-- เลือกภาคเรียน --";
        placeholder.disabled = true;

        semesterFilter.appendChild(placeholder);

        let selectedSemesterId = "";

        (semesterOptions || []).forEach(sem => {

            const option = document.createElement("option");

            option.value = sem.id;

            const year = yearsById.get(sem.academic_year_id);

            option.textContent =
                `ภาคเรียนที่ ${sem.semester_no}/${year ?? "-"}`;

            semesterFilter.appendChild(option);

            if (
                sem.start_date <= selectedDate &&
                sem.end_date >= selectedDate
            ) {
                selectedSemesterId = sem.id;
            }
        });

        semesterFilter.value = selectedSemesterId;

        semesterFilter.addEventListener("change", function () {

            const selected = (semesterOptions || []).find(
                sem => sem.id === this.value
            );

            if (!selected) return;

            // เลือกวันที่เริ่มภาคเรียนเพื่อโหลดตาราง
            loadScheduleView(selected.end_date);
        });

        const semesterLabelElement = document.createElement("label");
        semesterLabelElement.htmlFor = "schedule-semester-filter";
        semesterLabelElement.textContent = "📚 ภาคเรียน";

        toolbar.append(
            semesterLabelElement,
            semesterFilter
        );

    } catch (error) {

        console.error(
            "Schedule Load Error:",
            error
        );

        content.innerHTML = `
            <div class="schedule-empty-state">
                <h2>ไม่สามารถโหลดตารางสอนได้</h2>
                <p>กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์การใช้งาน</p>
            </div>
        `;
    }
}


async function deleteActivityScheduleManage(scheduleId) {

    if (!scheduleId) {
        console.error(
            "Activity Schedule Delete: missing scheduleId"
        );
        return;
    }

    const result = await Swal.fire({
        title: "🗑️ ลบตารางกิจกรรม?",
        text: "คุณกำลังลบเฉพาะคาบกิจกรรมนี้ หากเคยมีการเช็กชื่อแล้ว ระบบจะไม่อนุญาตให้ลบ",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ยืนยันลบคาบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#dc2626"
    });

    if (!result.isConfirmed) {
        return;
    }

    try {

        await deleteActivitySchedule(scheduleId);

        await Swal.fire({
            title: "ลบสำเร็จ",
            text: "ลบตารางกิจกรรมเรียบร้อยแล้ว",
            icon: "success",
            confirmButtonText: "ตกลง"
        });

        await loadActivityScheduleManage();

    } catch (error) {

        console.error(
            "Activity Schedule Delete Error:",
            error
        );

        await Swal.fire({
            title: "ไม่สามารถลบได้",
            text:
                error.message ||
                "เกิดข้อผิดพลาดในการลบตารางกิจกรรม",
            icon: "error",
            confirmButtonText: "ตกลง"
        });
    }
}

function showScheduleManageCount(
    list,
    count,
    semesterLabel = "",
    teacherLabel = ""
) {
    if (!list) return;

    const summary = document.createElement("div");

    summary.style.cssText = `
        margin: 0 0 14px;
        font-size: 14px;
        font-weight: 600;
        color: #334155;
    `;

    const parts = [];

    if (semesterLabel) {
        parts.push(semesterLabel);
    }

    if (teacherLabel) {
        parts.push(teacherLabel);
    }

    parts.push(
        `จำนวนคาบที่แสดง: ${count} คาบ`
    );

    summary.textContent = parts.join(" · ");

    list.prepend(summary);
}

// ============================================================
// ACTIVITY SCHEDULE MANAGE
// STEP 4.4.1 — Load Activity Schedule Cards
// ============================================================

async function loadActivityScheduleManage() {

    const list =
        document.getElementById(
            "schedule-manage-list"
        );

    if (!list) return;

    try {

    // B53 — ใช้ภาคเรียนปัจจุบันเดียวกับแท็บวิชา
    const activeSemester =
        await getScheduleManageActiveSemester();

    if (!activeSemester) {
        list.innerHTML = `
            <div class="schedule-empty-state">
                <div class="schedule-empty-icon">🔒</div>
                <h2>ไม่มีภาคเรียนที่เปิดให้จัดการกิจกรรม</h2>
                <p>กรุณาตรวจสอบสถานะภาคเรียนในเมนูจัดการงานวิชาการ</p>
            </div>
        `;
        return;
    }

        // B53 — กรองกิจกรรมตามภาคเรียนปัจจุบัน
        const allActivitySchedules =
            await getActivitySchedules();

        const currentSemesterSchedules =
            (allActivitySchedules || []).filter(activity =>
                activity.semesterId === activeSemester.id
            );

        // ตรวจ Role ของผู้ใช้งาน
        const role = await getCurrentUserRole();

        let schedules = currentSemesterSchedules;

        if (role === "Teacher") {

            const teacherContext =
                await getCurrentTeacherContext();

            if (!teacherContext?.teacherId) {
                throw new Error(
                    "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
                );
            }

            // กิจกรรมหนึ่งอาจมีครูร่วมหลายคน
            schedules = currentSemesterSchedules.filter(
                activity =>
                    Array.isArray(activity.teacherIds) &&
                    activity.teacherIds.includes(
                        teacherContext.teacherId
                    )
            );

        } else if (role !== "Admin") {

            throw new Error(
                "ไม่มีสิทธิ์จัดการตารางกิจกรรม"
            );

        }

        // B53 — ตัวกรองครูของ Admin สำหรับกิจกรรม
        if (role === "Admin") {

            const filterArea =
                document.getElementById(
                    "schedule-manage-filter"
                );

            if (filterArea) {

                let teacherFilter =
                    document.getElementById(
                        "activity-manage-teacher-filter"
                    );

                if (!teacherFilter) {
                    teacherFilter =
                        document.createElement("select");

                    teacherFilter.id =
                        "activity-manage-teacher-filter";

                    teacherFilter.className =
                        "schedule-filter-select";

                    filterArea.prepend(teacherFilter);
                }

                // ครูที่ผูกกับกิจกรรมในภาคเรียนปัจจุบัน
                const teacherIds = [
                    ...new Set(
                        schedules.flatMap(activity =>
                            Array.isArray(activity.teacherIds)
                                ? activity.teacherIds
                                : []
                        ).filter(Boolean)
                    )
                ];

                let teachers = [];

                if (teacherIds.length > 0) {

                    const { data, error } =
                        await supabaseClient
                            .from("teachers")
                            .select(
                                "id, first_name, last_name, nickname"
                            )
                            .in("id", teacherIds);

                    if (error) throw error;

                    teachers = data || [];
                }

                const previousTeacherId =
                    window.activityManageTeacherFilterId || "";

                teacherFilter.replaceChildren();

                const allOption =
                    document.createElement("option");

                allOption.value = "";
                allOption.textContent =
                    "👨‍🏫 ครูทุกคน";

                teacherFilter.appendChild(allOption);

                teachers
                    .sort((a, b) =>
                        `${a.first_name || ""} ${a.last_name || ""}`
                            .localeCompare(
                                `${b.first_name || ""} ${b.last_name || ""}`,
                                "th"
                            )
                    )
                    .forEach(teacher => {

                        const option =
                            document.createElement("option");

                        option.value = teacher.id;
                        option.textContent =
                            [teacher.first_name, teacher.last_name]
                                .filter(Boolean)
                                .join(" ") ||
                            teacher.nickname ||
                            "ไม่ระบุชื่อครู";

                        teacherFilter.appendChild(option);
                    });

                const selectedTeacherId =
                    teacherIds.includes(previousTeacherId)
                        ? previousTeacherId
                        : "";

                teacherFilter.value =
                    selectedTeacherId;

                window.activityManageTeacherFilterId =
                    selectedTeacherId;

                teacherFilter.onchange = function () {
                    window.activityManageTeacherFilterId =
                        this.value;

                    loadActivityScheduleManage();
                };

                if (selectedTeacherId) {
                    schedules = schedules.filter(activity =>
                        Array.isArray(activity.teacherIds) &&
                        activity.teacherIds.includes(
                            selectedTeacherId
                        )
                    );
                }
            }
        }

    const typeFilter =

    document.getElementById(
        "activity-manage-type-filter"
    );

const dayFilter =
    document.getElementById(
        "activity-manage-day-filter"
    );

const selectedType =
    typeFilter?.value || "";

const selectedDay =
    dayFilter?.value || "";

if (typeFilter) {

    const currentValue =
        typeFilter.value;

    const types =
        [...new Map(
            schedules.map(activity => [
                activity.activityTypeCode,
                activity.activityTypeName
            ])
        ).entries()];

    typeFilter.innerHTML = `
        <option value="">
            🎯 ทุกประเภทกิจกรรม
        </option>

        ${types.map(
            ([code, name]) => `
                <option value="${code}">
                    ${name}
                </option>
            `
        ).join("")}
    `;

    typeFilter.value = currentValue;
}

        // B53 — ชื่อภาคเรียนและครูสำหรับสรุปกิจกรรม
        let summaryTeacherId = "";

        if (role === "Admin") {
            summaryTeacherId =
                window.activityManageTeacherFilterId || "";
        } else if (role === "Teacher") {
            const context =
                await getCurrentTeacherContext();

            summaryTeacherId = context?.teacherId || "";
        }

        const summaryLabels =
            await getScheduleManageSummaryLabels(
                activeSemester,
                summaryTeacherId
            );

const filteredSchedules =
    schedules.filter(activity => {

        const matchType =
            !selectedType ||
            activity.activityTypeCode ===
            selectedType;

        const matchDay =
            !selectedDay ||
            String(activity.weekday) ===
            String(selectedDay);

        return matchType && matchDay;
    });

        if (!schedules || schedules.length === 0) {

            list.innerHTML = `
                <div class="schedule-empty-state">
                    <div class="schedule-empty-icon">
                        🎯
                    </div>

                    <h2>
                        ยังไม่มีตารางกิจกรรม
                    </h2>

                    <p>
                        กด "＋ เพิ่มตารางกิจกรรม"
                        เพื่อสร้างตารางกิจกรรมใหม่
                    </p>
                </div>
            `;
            showScheduleManageCount(
    list,
    0,
    summaryLabels.semesterLabel,
    summaryLabels.teacherLabel
             );
            return;
        }

        const weekdayNames = {
            1: "จันทร์",
            2: "อังคาร",
            3: "พุธ",
            4: "พฤหัสบดี",
            5: "ศุกร์"
        };

        list.innerHTML =
            filteredSchedules.map(
                (activity, index) => {

                    const weekdayName =
                        weekdayNames[
                            activity.weekday
                        ] || "-";

                    const lesson =
                        activity.lessonNo
                            ? `คาบ ${activity.lessonNo}`
                            : "ไม่ระบุคาบ";

                    const time =
                        activity.startTime &&
                        activity.endTime
                            ? `${activity.startTime} – ${activity.endTime}`
                            : "-";

                    const validFrom =
                        activity.validFrom || "-";

                    const validUntil =
                        activity.validUntil ||
                        "ไม่กำหนด";

                    return `
                        <div class="schedule-manage-card">

                            <div class="schedule-manage-card-main">

                                <div class="schedule-manage-card-title">
                                    🎯
                                    ${activity.activityName || "-"}
                                </div>

                                <div class="schedule-manage-card-info">
                                    🏷️
                                    ${activity.activityTypeCode || "-"}
                                </div>

                                <div class="schedule-manage-card-info">
                                    📅
                                    ${weekdayName}

                                    <span>•</span>

                                    🕐
                                    ${lesson}

                                    <span>•</span>

                                    ${time}
                                </div>

                                <div class="schedule-manage-card-date">
                                    📅
                                    เริ่มใช้:
                                    ${validFrom}

                                    &nbsp;→&nbsp;

                                    สิ้นสุด:
                                    ${validUntil}
                                </div>

                            </div>

                            <div class="schedule-manage-card-actions">

    <button
        type="button"
        class="schedule-edit-btn"
        onclick="openActivityScheduleEdit('${activity.scheduleId}')"
    >
        ✏️ แก้ไข
    </button>

    <button
        type="button"
        class="schedule-delete-btn"
        onclick="deleteActivityScheduleManage('${activity.scheduleId}')"
    >
        🗑️ ลบ
    </button>

</div>

                        </div>
                    `;
                }
            ).join("");

        showScheduleManageCount(
    list,
    filteredSchedules.length,
    summaryLabels.semesterLabel,
    summaryLabels.teacherLabel
       );

    } catch (error) {

        console.error(
            "Activity Schedule Manage Load Error:",
            error
        );

        list.innerHTML = `
            <div class="schedule-empty-state">

                <div class="schedule-empty-icon">
                    ⚠️
                </div>

                <h2>
                    ไม่สามารถโหลดตารางกิจกรรมได้
                </h2>

                <p>
                    กรุณาลองใหม่อีกครั้ง
                </p>

            </div>
        `;
    }
}

async function openClubMembersPreview(activityId, returnScheduleId = null) {
    try {
        if (!activityId) throw new Error("ไม่พบรหัสชุมนุม");

        const semester = await getScheduleManageActiveSemester();
        if (!semester) throw new Error("ไม่มีภาคเรียนที่เปิดให้จัดการชุมนุม");

        const [students, activities, role, roomResponse] = await Promise.all([
            getClubMemberStatuses(activityId),
            getActivitiesForScheduleCreate(),
            getCurrentUserRole(),
            supabaseClient.from("rooms")
                .select("id, room_name")
                .eq("academic_year_id", semester.academic_year_id)
                .is("deleted_at", null)
        ]);
        if (roomResponse.error) throw roomResponse.error;
        if (!Array.isArray(students)) throw new Error("ข้อมูลรายชื่อชุมนุมไม่ถูกต้อง");

        const clubs = (activities || []).filter(a =>
            a.semesterId === semester.id && a.activityTypeCode === "CLUB"
        );
        const currentClub = clubs.find(a => a.activityId === activityId);
        if (!currentClub) throw new Error("ไม่พบชุมนุมในภาคเรียนที่กำลังจัดการ");

        const roomNames = new Map((roomResponse.data || []).map(r => [r.id, r.room_name]));
        const isAdmin = role === "Admin";
        let canAdd = isAdmin;
        if (role === "Teacher") {
            const context = await getCurrentTeacherContext();
            canAdd = !!context?.teacherId &&
                (currentClub.teacherIds || []).includes(context.teacherId);
        }
        const otherClubs = clubs.filter(a => a.activityId !== activityId);
        let openedAction = false;

        const popup = await Swal.fire({
            title: `👥 สมาชิกชุมนุม: ${currentClub.activityName}`,
            width: 800,
            showConfirmButton: true,
            confirmButtonText: returnScheduleId ? "← กลับไปหน้าแก้ไข" : "ปิด",
            html: `
                <div style="text-align:left">
                    <input id="club-member-search" class="swal2-input"
                        placeholder="ค้นหาชื่อหรือรหัสนักเรียน"
                        style="width:100%;box-sizing:border-box;margin:8px 0 12px">
                    <div id="club-member-summary" style="font-size:13px;margin-bottom:10px"></div>
                    <div id="club-member-list" style="max-height:370px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px"></div>
                    <p style="font-size:12px;color:#64748b;margin-top:12px">
                        เพิ่มสมาชิกได้เฉพาะผู้มีสิทธิ์ · ย้าย/ออกจากชุมนุมได้เฉพาะ Admin
                    </p>
                </div>`,
            didOpen: () => {
                const search = document.getElementById("club-member-search");
                const list = document.getElementById("club-member-list");
                const summary = document.getElementById("club-member-summary");
                if (!search || !list || !summary) return;

                const launch = async (student, action) => {
                    openedAction = true;
                    Swal.close();
                    try {
                        const studentId = student.student_id || student.id;
                        if (!studentId) throw new Error("ไม่พบรหัสนักเรียนจากผล RPC");
                        const fullName = [student.prefix, student.first_name, student.last_name]
                            .filter(Boolean).join(" ");
                        let destinationId = "";
                        let reason = "";
                        let message = "";

                        if (action === "ADD") {
                            message = `เพิ่ม ${fullName} เป็นสมาชิกชุมนุม ${currentClub.activityName}?`;
                        } else if (action === "EXIT") {
                            message = `ให้นักเรียน ${fullName} ออกจากชุมนุม ${currentClub.activityName} วันนี้?`;
                        } else if (action === "TRANSFER") {
                            message = `ย้าย ${fullName} ออกจาก ${currentClub.activityName} วันนี้?`;
                        }

                        const confirm = await Swal.fire({
                            title: action === "ADD" ? "ยืนยันเพิ่มสมาชิก" :
                                action === "EXIT" ? "ยืนยันให้ออกจากชุมนุม" : "ยืนยันย้ายชุมนุม",
                            text: message,
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "ยืนยันดำเนินการ",
                            cancelButtonText: "ยกเลิก",
                            html: action === "ADD" ? undefined : `
                                <p style="text-align:left">${action === "EXIT" ? "ระบุเหตุผลการออก" : "เลือกชุมนุมปลายทางและระบุเหตุผล"}</p>
                                ${action === "TRANSFER" ? '<select id="club-destination" class="swal2-select" style="width:95%;margin:5px 0"></select>' : ''}
                                <textarea id="club-reason" class="swal2-textarea"
                                    placeholder="เหตุผล (จำเป็น)" style="width:95%;box-sizing:border-box;margin:5px 0"></textarea>`,
                            didOpen: () => {
                                if (action === "TRANSFER") {
                                    const select = document.getElementById("club-destination");
                                    select.add(new Option("-- เลือกชุมนุมปลายทาง --", ""));
                                    otherClubs.forEach(club => select.add(new Option(club.activityName, club.activityId)));
                                }
                            },
                            preConfirm: () => {
                                if (action === "ADD") return true;
                                reason = document.getElementById("club-reason")?.value.trim() || "";
                                if (!reason) {
                                    Swal.showValidationMessage("กรุณาระบุเหตุผล");
                                    return false;
                                }
                                if (action === "TRANSFER") {
                                    destinationId = document.getElementById("club-destination")?.value || "";
                                    if (!destinationId) {
                                        Swal.showValidationMessage("กรุณาเลือกชุมนุมปลายทาง");
                                        return false;
                                    }
                                }
                                return true;
                            }
                        });

                        if (confirm.isConfirmed) {
                            if (action === "ADD") {
                                await addClubActivityMember(activityId, studentId);
                            } else if (action === "EXIT") {
                                await exitClubActivityMember({ activityId, studentId, reason });
                            } else {
                                await transferClubActivityMember({
                                    studentId,
                                    fromActivityId: activityId,
                                    toActivityId: destinationId,
                                    reason
                                });
                            }
                            await Swal.fire("สำเร็จ", "ฐานข้อมูลบันทึกการจัดการสมาชิกแล้ว", "success");
                        }
                    } catch (error) {
                        console.error("Club member change:", error);
                        await Swal.fire("ไม่สามารถดำเนินการได้", error?.message || "กรุณาตรวจสอบข้อมูล", "error");
                    }
                    // โหลดข้อมูลใหม่ทุกครั้งหลังยืนยันหรือยกเลิก ไม่ใช้ข้อมูลสถานะเก่า
                    await openClubMembersPreview(activityId, returnScheduleId);
                };

                const render = () => {
                    const keyword = search.value.trim().toLocaleLowerCase();
                    const filtered = students.filter(student => [
                        student.prefix, student.first_name,
                        student.last_name, student.student_code
                    ].filter(Boolean).join(" ").toLocaleLowerCase().includes(keyword));
                    const own = students.filter(s => s.club_status === "own").length;
                    const other = students.filter(s => s.club_status === "other").length;
                    summary.textContent = `สมาชิกชุมนุมนี้ ${own} คน · อยู่ชุมนุมอื่น ${other} คน · แสดง ${filtered.length} คน`;
                    list.replaceChildren();
                    filtered.forEach(student => {
                        const row = document.createElement("div");
                        row.style.cssText = "padding:10px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px;";
                        const info = document.createElement("div");
                        const name = document.createElement("div");
                        name.style.fontWeight = "600";
                        name.textContent = [student.prefix,student.first_name,student.last_name].filter(Boolean).join(" ");
                        const subtitle = document.createElement("div");
                        subtitle.style.cssText = "font-size:12px;color:#64748b";
                        subtitle.textContent = `${student.student_code || "-"} · ${roomNames.get(student.room_id) || "ไม่พบห้องเรียน"}`;
                        info.append(name, subtitle);
                        const actions = document.createElement("div");
                        actions.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end";
                        const addButton = (label, action) => {
                            const button = document.createElement("button");
                            button.type = "button";
                            button.textContent = label;
                            button.style.cssText = "padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-size:12px";
                            button.addEventListener("click", () => launch(student, action));
                            actions.appendChild(button);
                        };
                        if (student.club_status === "available") {
                            if (canAdd) addButton("＋ เพิ่ม", "ADD");
                            else actions.textContent = "เพิ่มได้ (ไม่มีสิทธิ์)";
                        } else if (student.club_status === "own") {
                            if (isAdmin) {
                                if (otherClubs.length) addButton("ย้าย", "TRANSFER");
                                addButton("ออก", "EXIT");
                            } else actions.textContent = "สมาชิกชุมนุมนี้";
                        } else {
                            actions.textContent = student.club_status === "other" ? "มีชุมนุมแล้ว 🔒" : "สถานะไม่พร้อม";
                        }
                        row.append(info, actions);
                        list.appendChild(row);
                    });
                    if (!filtered.length) list.textContent = "ไม่พบรายชื่อนักเรียน";
                };
                search.addEventListener("input", render);
                render();
            }
        });

        if (!openedAction && returnScheduleId && popup.isConfirmed) {
            await openActivityScheduleEdit(returnScheduleId);
        }
    } catch (error) {
        console.error("Club Members:", error);
        await Swal.fire("ไม่สามารถโหลดสมาชิกชุมนุม", error?.message || "กรุณาตรวจสอบข้อมูลและสิทธิ์", "error");
    }
}

/* =====================================================
   B55-L2 — GENERAL ACTIVITY MEMBER MANAGEMENT
   SCOUT / ROTC: เลือกรายคนคละห้อง
   อีก 6 ประเภท: เลือกทั้งห้อง
   ===================================================== */

async function openGeneralActivityMembers(
    activityId,
    returnScheduleId = null
) {
    try {
        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error("ไม่มีภาคเรียนที่เปิดให้จัดการ");
        }

        const activities = await getActivitiesForScheduleCreate();
        const activity = (activities || []).find(
            a => a.activityId === activityId &&
                 a.semesterId === semester.id
        );

        if (!activity || activity.activityTypeCode === "CLUB") {
            throw new Error("ไม่พบกิจกรรมทั่วไปในภาคเรียนนี้");
        }

        const individualMode = ["SCOUT", "ROTC"].includes(
            activity.activityTypeCode
        );

        const today = new Date().toLocaleDateString(
            "sv-SE",
            { timeZone: "Asia/Bangkok" }
        );

        const [candidates, participants] = await Promise.all([
            getGeneralActivityCandidates(activityId),
            getActivityParticipants(activityId, today)
        ]);

        const members = Array.isArray(participants)
            ? participants
            : [];

        const activeIds = new Set(
            members.map(s => s.studentId)
        );

        const rooms = [
            ...new Map(
                candidates
                    .filter(s => s.roomId)
                    .map(s => [
                        s.roomId,
                        {
                            id: s.roomId,
                            name: s.roomName
                        }
                    ])
            ).values()
        ].sort((a, b) =>
            a.name.localeCompare(b.name, "th", {
                numeric: true
            })
        );

        const selected = new Set();
        let handled = false;

        const result = await Swal.fire({
            title: "👥 จัดการผู้เข้าร่วม",
            width: 780,
            showCancelButton: true,
            confirmButtonText: "ดำเนินการเพิ่มสมาชิก",
            cancelButtonText: returnScheduleId
                ? "← กลับไปหน้าแก้ไข"
                : "ปิด",
            html: `
                <div style="text-align:left">
                    <p id="b55-activity-title"
                       style="font-weight:600"></p>

                    <p id="b55-member-count"
                       style="color:#64748b;font-size:13px"></p>

                    <div id="b55-room-section"
                         style="margin:10px 0">
                        <label for="b55-room-select">
                            เลือกห้องเรียน
                        </label>
                        <select id="b55-room-select"
                            class="swal2-select"
                            style="width:100%;margin:6px 0">
                        </select>
                    </div>

                    <input id="b55-member-search"
                        class="swal2-input"
                        placeholder="ค้นหาชื่อ รหัส หรือห้อง"
                        style="width:100%;
                               box-sizing:border-box;
                               margin:8px 0">

                    <p id="b55-selection-count"
                       style="font-size:13px;color:#64748b">
                    </p>

                    <div id="b55-candidate-list"
                         style="max-height:280px;
                                overflow-y:auto;
                                border:1px solid #e2e8f0;
                                border-radius:10px">
                    </div>

                            <h4 id="b55-current-heading"
                                style="margin:18px 0 8px">
                                สมาชิกปัจจุบัน
                            </h4>

                    <div id="b55-current-list"
                         style="max-height:220px;
                                overflow-y:auto;
                                border:1px solid #e2e8f0;
                                border-radius:10px">
                    </div>

                    <p style="font-size:12px;
                              color:#64748b;margin-top:12px">
                        การเพิ่มหรือสิ้นสุดสมาชิกมีผลตามวันที่
                        ที่ฐานข้อมูลกำหนด และต้องยืนยันก่อนบันทึก
                    </p>
                </div>
            `,
            didOpen: () => {
                const title = document.getElementById(
                    "b55-activity-title"
                );
                const memberCount = document.getElementById(
                    "b55-member-count"
                );
                const roomSection = document.getElementById(
                    "b55-room-section"
                );
                const roomSelect = document.getElementById(
                    "b55-room-select"
                );
                const search = document.getElementById(
                    "b55-member-search"
                );
                const candidateList = document.getElementById(
                    "b55-candidate-list"
                );
                const currentList = document.getElementById(
                    "b55-current-list"
                );
                const selectionCount = document.getElementById(
                    "b55-selection-count"
                );

                title.textContent =
                    activity.activityName ||
                    activity.activityTypeName ||
                    "กิจกรรม";

memberCount.textContent =
    `สมาชิกปัจจุบัน ${members.length} คน`;

const currentHeading =
    document.getElementById("b55-current-heading");

if (currentHeading) {
    currentHeading.textContent = individualMode
        ? "สมาชิกปัจจุบัน"
        : "ห้องเรียนที่เป็นสมาชิก";
}

roomSection.style.display =
    individualMode ? "none" : "block";

search.style.display =
    individualMode ? "" : "none";

candidateList.style.display =
    individualMode ? "" : "none";

                const placeholder = document.createElement(
                    "option"
                );
                placeholder.value = "";
                placeholder.textContent = "-- เลือกห้องเรียน --";
                roomSelect.appendChild(placeholder);

                rooms.forEach(room => {
                    const option = document.createElement(
                        "option"
                    );
                    option.value = room.id;
                    option.textContent = room.name;
                    roomSelect.appendChild(option);
                });

                function fullName(student) {
                    return [
                        student.prefix,
                        student.firstName,
                        student.lastName
                    ].filter(Boolean).join(" ");
                }

                function makeRow(student, suffix) {
                    const row = document.createElement("div");
                    row.style.cssText = `
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        padding:10px 12px;
                        border-bottom:1px solid #e2e8f0;
                    `;

                    const details = document.createElement("div");

                    const name = document.createElement("div");
                    name.style.fontWeight = "600";
                    name.textContent = fullName(student);

                    const secondary = document.createElement("div");
                    secondary.style.cssText =
                        "color:#64748b;font-size:12px";

                    secondary.textContent =
                        `${student.studentCode || "-"} · ` +
                        `${student.roomName || "-"}`;

                    details.append(name, secondary);

                    row.appendChild(details);

                    if (suffix) {
                        row.appendChild(suffix);
                    }

                    return row;
                }

                function renderCandidates() {
                    candidateList.replaceChildren();

                    const keyword = search.value
                        .trim()
                        .toLocaleLowerCase();

                    const roomId = roomSelect.value;

                    const available = candidates.filter(s =>
                        !activeIds.has(s.studentId) &&
                        !s.alreadyMember
                    );

                    const displayed = available.filter(s => {
                        if (!individualMode &&
                            s.roomId !== roomId) {
                            return false;
                        }

                        const text = [
                            fullName(s),
                            s.studentCode,
                            s.roomName
                        ].join(" ").toLocaleLowerCase();

                        return text.includes(keyword);
                    });

                    if (!individualMode) {
                         selected.clear();

    if (roomId) {
        const roomStudents = candidates.filter(
            s => s.roomId === roomId
        );

        const memberCount = roomStudents.filter(
            s => activeIds.has(s.studentId) ||
                 s.alreadyMember
        ).length;

        if (
            roomStudents.length > 0 &&
            memberCount === 0
        ) {
            roomStudents.forEach(
                s => selected.add(s.studentId)
            );
        }
    }
}

if (individualMode) {
    selectionCount.textContent =
        `เลือกแล้ว ${selected.size} คน`;
    selectionCount.style.color = "#64748b";
} else if (!roomId) {
    selectionCount.textContent = "กรุณาเลือกห้องเรียน";
    selectionCount.style.color = "#64748b";
} else {
    const roomStudents = candidates.filter(
        s => s.roomId === roomId
    );

    const existing = roomStudents.filter(
        s => activeIds.has(s.studentId) ||
             s.alreadyMember
    ).length;

    if (roomStudents.length === 0) {
        selectionCount.textContent =
            "ไม่พบรายชื่อนักเรียนในห้องนี้";
        selectionCount.style.color = "#dc2626";
    } else if (existing === roomStudents.length) {
        selectionCount.textContent =
            "ห้องนี้เป็นสมาชิกกิจกรรมแล้ว";
        selectionCount.style.color = "#64748b";
    } else if (existing > 0) {
        selectionCount.textContent =
            "ตรวจสอบไม่ผ่าน: สมาชิกในห้องไม่ครบ กรุณาตรวจสอบข้อมูล";
        selectionCount.style.color = "#dc2626";
    } else {
        selectionCount.textContent =
            "✓ ตรวจสอบข้อมูลเบื้องต้นผ่าน";
        selectionCount.style.color = "#15803d";
    }
}

                    displayed.forEach(student => {
                        let control = null;

                        if (individualMode) {
                            control = document.createElement(
                                "input"
                            );
                            control.type = "checkbox";
                            control.checked = selected.has(
                                student.studentId
                            );

                            control.addEventListener(
                                "change",
                                () => {
                                    if (control.checked) {
                                        selected.add(
                                            student.studentId
                                        );
                                    } else {
                                        selected.delete(
                                            student.studentId
                                        );
                                    }

                                    selectionCount.textContent =
                                        `เลือกแล้ว ${selected.size} คน`;
                                }
                            );
                        }

                        candidateList.appendChild(
                            makeRow(student, control)
                        );
                    });

                    if (displayed.length === 0) {
                        const empty = document.createElement(
                            "p"
                        );
                        empty.style.cssText =
                            "padding:12px;color:#64748b";
                        empty.textContent =
                            "ไม่มีนักเรียนที่เพิ่มได้ในรายการนี้";
                        candidateList.appendChild(empty);
                    }
                }

                function renderMembers() {
                    currentList.replaceChildren();

if (individualMode) {
    members.forEach(student => {
        const endButton = document.createElement("button");

        endButton.type = "button";
        endButton.textContent = "สิ้นสุดสมาชิก";
        endButton.className = "schedule-edit-btn";

        endButton.addEventListener("click", async () => {
            handled = true;
            Swal.close();

            const confirm = await Swal.fire({
                icon: "warning",
                title: "ยืนยันสิ้นสุดสมาชิก?",
                text:
                    `${fullName(student)} จะสิ้นสุดสมาชิก` +
                    "หลังจบวันนี้",
                showCancelButton: true,
                confirmButtonText: "ยืนยันสิ้นสุดสมาชิก",
                cancelButtonText: "ยกเลิก"
            });

            if (confirm.isConfirmed) {
                try {
                    await endIndividualActivityMember(
                        activityId,
                        student.studentId
                    );

                    await Swal.fire({
                        icon: "success",
                        title: "บันทึกสำเร็จ",
                        text: "สมาชิกจะสิ้นสุดหลังจบวันนี้"
                    });
                } catch (error) {
                    await Swal.fire({
                        icon: "error",
                        title: "บันทึกไม่สำเร็จ",
                        text: error.message
                    });
                }
            }

            await openGeneralActivityMembers(
                activityId,
                returnScheduleId
            );
        });

        currentList.appendChild(
            makeRow(student, endButton)
        );
    });
} else {
    const roomGroups = new Map();

    candidates.forEach(student => {
        if (!student.roomId) return;

        if (!roomGroups.has(student.roomId)) {
            roomGroups.set(student.roomId, {
                roomName: student.roomName,
                students: []
            });
        }

        roomGroups.get(student.roomId)
            .students.push(student);
    });

    roomGroups.forEach((group, roomId) => {
        const existing = group.students.filter(
            s => activeIds.has(s.studentId) ||
                 s.alreadyMember
        ).length;

        if (existing === 0) return;

        const row = document.createElement("div");
        row.style.cssText =
            "display:flex;align-items:center;" +
            "justify-content:space-between;" +
            "gap:12px;padding:12px;" +
            "border-bottom:1px solid #e2e8f0";

        const detail = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = group.roomName;

        const status = document.createElement("div");
        status.style.cssText =
            "font-size:12px;color:#64748b";

        const complete = existing === group.students.length;

        status.textContent = complete
            ? "เป็นสมาชิกทั้งห้องแล้ว"
            : "สมาชิกไม่ครบห้อง — ต้องตรวจสอบ";

        detail.append(name, status);
        row.appendChild(detail);

        if (complete) {
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "นำออกทั้งห้อง";
            removeButton.className = "schedule-edit-btn";

            removeButton.addEventListener("click", async () => {
                handled = true;
                Swal.close();

                const confirm = await Swal.fire({
                    icon: "warning",
                    title: "ยืนยันนำสมาชิกออกทั้งห้อง?",
                    text:
                        `ระบบจะสิ้นสุดสมาชิกห้อง ` +
                        `${group.roomName} ทั้งห้อง ` +
                        `หลังจบวันนี้`,
                    showCancelButton: true,
                    confirmButtonText: "ยืนยันนำออกทั้งห้อง",
                    cancelButtonText: "ยกเลิก"
                });

                if (confirm.isConfirmed) {
                    try {
                        const result =
                            await manageActivityRoomMembers(
                                activityId,
                                roomId,
                                "REMOVE"
                            );

                        await Swal.fire({
                            icon: "success",
                            title: result.resultCode === "REMOVED"
                                ? "บันทึกสำเร็จ"
                                : "ไม่มีสมาชิกที่ต้องนำออก",
                            text:
                                result.resultCode === "REMOVED"
                                    ? `สิ้นสุดสมาชิก ${result.changedCount} คน หลังจบวันนี้`
                                    : "ไม่พบสมาชิกที่ต้องสิ้นสุด"
                        });
                    } catch (error) {
                        await Swal.fire({
                            icon: "error",
                            title: "บันทึกไม่สำเร็จ",
                            text: error.message
                        });
                    }
                }

                await openGeneralActivityMembers(
                    activityId,
                    returnScheduleId
                );
            });

            row.appendChild(removeButton);
        }

        currentList.appendChild(row);
    });
}

                    if (members.length === 0) {
                        currentList.textContent =
                            "ยังไม่มีสมาชิกในกิจกรรมนี้";
                    }
                }

                search.addEventListener(
                    "input",
                    renderCandidates
                );

                roomSelect.addEventListener(
                    "change",
                    renderCandidates
                );

                renderCandidates();
                renderMembers();
            },
            preConfirm: () => {
                if (selected.size === 0) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกนักเรียนหรือห้องเรียนก่อน"
                    );
                    return false;
                }

                return {
                    studentIds: [...selected],
                    roomId: document.getElementById(
                        "b55-room-select"
                    ).value
                };
            }
        });

        if (handled) return;

        if (result.isConfirmed) {
            const requested = result.value;

const confirm = await Swal.fire({
    icon: "question",
    title: "ยืนยันเพิ่มสมาชิก?",
    text:
        `ระบบจะเพิ่มนักเรียน ${requested.studentIds.length} คน` +
        "ลงในระบบทันที",
    showCancelButton: true,
    confirmButtonText: "ยืนยันเพิ่มสมาชิก",
    cancelButtonText: "ยกเลิก"
});

if (confirm.isConfirmed) {
    try {
        let added = 0;
        let resultCode = "ADDED";

        if (individualMode) {
            added = await addIndividualActivityMembers(
                activityId,
                requested.studentIds
            );
        } else {
            const roomResult = await manageActivityRoomMembers(
                activityId,
                requested.roomId,
                "ADD"
            );

            added = roomResult.changedCount;
            resultCode = roomResult.resultCode;
        }

        if (resultCode === "ALREADY_MEMBER") {
            await Swal.fire({
                icon: "info",
                title: "เป็นสมาชิกอยู่แล้ว",
                text: "ห้องเรียนนี้เป็นสมาชิกกิจกรรมแล้ว ไม่มีการเพิ่มซ้ำ"
            });
        } else {
            await Swal.fire({
                icon: "success",
                title: "เพิ่มสมาชิกสำเร็จ",
                text: `เพิ่มสมาชิก ${added} คน`
            });
        }

    } catch (error) {
        await Swal.fire({
            icon: "error",
            title: "บันทึกไม่สำเร็จ",
            text: error?.message || "ไม่สามารถเพิ่มสมาชิกได้"
        });
    }
}

await openGeneralActivityMembers(
    activityId,
    returnScheduleId
);
return;
}

if (returnScheduleId) {
    await openActivityScheduleEdit(
        returnScheduleId
    );
}

} catch (error) {

        console.error(
            "General Activity Members:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถจัดการสมาชิก",
            text: error?.message || "เกิดข้อผิดพลาด"
        });
    }
}

/* =====================================================
   B57-02 — Save Activity Schedule Changes
   Protect attendance history and semester boundaries
   ===================================================== */

async function saveActivityScheduleEditChanges(
    activity,
    changes,
    semester
) {
    if (!activity?.scheduleId || !semester?.id) {
        throw new Error("ข้อมูลตารางกิจกรรมไม่ครบถ้วน");
    }

    const schedules = await getActivitySchedules();

    const current = (schedules || []).find(item =>
        item.scheduleId === activity.scheduleId &&
        item.activityId === activity.activityId &&
        item.semesterId === semester.id
    );

    if (!current) {
        throw new Error(
            "ไม่พบตารางกิจกรรมล่าสุด กรุณาโหลดหน้าใหม่"
        );
    }

    const role = await getCurrentUserRole();

    if (!["Admin", "Teacher"].includes(role)) {
        throw new Error("ไม่มีสิทธิ์แก้ไขตารางกิจกรรม");
    }

    if (role === "Teacher") {
        const context = await getCurrentTeacherContext();

        if (
            !context?.teacherId ||
            !current.teacherIds?.includes(context.teacherId)
        ) {
            throw new Error(
                "คุณไม่ได้รับมอบหมายให้ดูแลกิจกรรมนี้"
            );
        }
    }

    if (semester.schedule_locked_at) {
        throw new Error("ภาคเรียนนี้ถูกล็อกแล้ว");
    }

    const weekday = Number(changes.weekday);
    const lessonNo = changes.lessonNo == null
        ? null
        : Number(changes.lessonNo);

    const startTime = String(changes.startTime || "");
    const endTime = String(changes.endTime || "");
    const validFrom = String(changes.validFrom || "");
    const validUntil = changes.validUntil || null;

    if (
        !Number.isInteger(weekday) ||
        weekday < 1 ||
        weekday > 7
    ) {
        throw new Error("กรุณาเลือกวันให้ถูกต้อง");
    }

    if (
        lessonNo !== null &&
        (!Number.isInteger(lessonNo) ||
         lessonNo < 1 ||
         lessonNo > 20)
    ) {
        throw new Error("หมายเลขคาบไม่ถูกต้อง");
    }

    if (
        !startTime ||
        !endTime ||
        startTime >= endTime
    ) {
        throw new Error("ช่วงเวลาเริ่มต้นและสิ้นสุดไม่ถูกต้อง");
    }

    if (
        !validFrom ||
        validFrom < semester.start_date ||
        validFrom > semester.end_date
    ) {
        throw new Error(
            "วันที่เริ่มใช้ต้องอยู่ภายในภาคเรียน (ค.ศ.)"
        );
    }

    if (
        validUntil &&
        (
            validUntil < validFrom ||
            validUntil > semester.end_date
        )
    ) {
        throw new Error(
            "วันที่สิ้นสุดต้องอยู่ภายในช่วงวันที่ที่ถูกต้อง"
        );
    }

    // Read all attendance sessions, including soft-deleted rows.
    const { count, error: historyError } =
        await supabaseClient
            .from("attendance_sessions")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq(
                "activity_schedule_id",
                activity.scheduleId
            );

    if (historyError) {
        throw historyError;
    }

    const normalizeTime = value =>
        String(value || "").slice(0, 5);

    if (count > 0) {
        const detailsChanged =
            weekday !== Number(current.weekday) ||
            lessonNo !== (current.lessonNo ?? null) ||
            startTime !== normalizeTime(current.startTime) ||
            endTime !== normalizeTime(current.endTime) ||
            validFrom !== current.validFrom;

        if (detailsChanged) {
            throw new Error(
                "ตารางนี้มีประวัติเช็กชื่อแล้ว " +
                "จึงแก้วัน คาบ เวลา หรือวันที่เริ่มใช้ไม่ได้"
            );
        }

        if (!validUntil) {
            throw new Error(
                "ตารางที่มีประวัติเช็กชื่อต้องระบุวันที่สิ้นสุด"
            );
        }
    }

    // Database RLS and triggers perform the final checks.
    return await updateActivitySchedule(
        activity.scheduleId,
        {
            weekday,
            lessonNo,
            startTime,
            endTime,
            validFrom,
            validUntil
        }
    );
}

/* =====================================================
   B57-02 — Compact Activity Edit Layout
   Responsive two-column form
   Keep member management separate
   Scroll only when viewport is too small
   ===================================================== */

function applyActivityScheduleEditLayout() {

    const modal = document.getElementById(
        "activity-schedule-edit-modal"
    );

    if (!modal) return;

    const backdrop = modal.querySelector(
        ".schedule-modal-backdrop"
    );

    const card = modal.querySelector(
        ".schedule-modal"
    );

    const header = modal.querySelector(
        ".schedule-modal-header"
    );

    const body = modal.querySelector(
        ".schedule-modal-body"
    );

    const footer = modal.querySelector(
        ".schedule-modal-footer"
    );

    if (!card || !body) return;

    // --------------------------------------------------
    // 1. Modal sizing
    // --------------------------------------------------

    if (backdrop) {
        backdrop.style.display = "flex";
        backdrop.style.alignItems = "center";
        backdrop.style.justifyContent = "center";
        backdrop.style.padding = "12px";
        backdrop.style.boxSizing = "border-box";
    }

    card.style.width = "min(720px, calc(100vw - 24px))";
    card.style.maxWidth = "100%";
    card.style.maxHeight = "calc(100dvh - 24px)";
    card.style.height = "auto";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.overflow = "hidden";
    card.style.boxSizing = "border-box";

    if (header) {
        header.style.flex = "0 0 auto";
        header.style.padding = "16px 22px 12px";
    }

    body.style.flex = "1 1 auto";
    body.style.minHeight = "0";
    body.style.overflowY = "auto";
    body.style.overflowX = "hidden";
    body.style.padding = "12px 22px 16px";

    if (footer) {
        footer.style.flex = "0 0 auto";
        footer.style.padding = "12px 22px";
        footer.style.borderTop = "1px solid #e2e8f0";
        footer.style.background = "var(--card-bg, #ffffff)";
    }

    // --------------------------------------------------
    // 2. Find existing form groups
    // Do not recreate inputs or change their IDs
    // --------------------------------------------------

    const getGroup = id => {
        const element = modal.querySelector(`#${id}`);

        return element?.closest(
            ".schedule-form-group"
        ) || null;
    };

    const nameGroup = getGroup("activity-edit-name");
    const typeGroup = getGroup("activity-edit-type");

    const dayGroup = getGroup("activity-edit-weekday");
    const lessonGroup = getGroup("activity-edit-lesson");

    const startGroup = getGroup("activity-edit-start-time");
    const endGroup = getGroup("activity-edit-end-time");

    const fromGroup = getGroup("activity-edit-valid-from");
    const untilGroup = getGroup("activity-edit-valid-until");

    // --------------------------------------------------
    // 3. Create responsive two-column rows
    // --------------------------------------------------

    const createRow = (groups) => {

        const available = groups.filter(Boolean);

        if (available.length === 0) return;

        const row = document.createElement("div");

        row.className = "b57-activity-edit-row";

        row.style.display = "grid";
        row.style.gridTemplateColumns =
            "repeat(auto-fit, minmax(min(100%, 240px), 1fr))";

        row.style.gap = "10px 14px";
        row.style.marginBottom = "12px";

        available.forEach(group => {

            group.style.marginBottom = "0";
            group.style.minWidth = "0";

            const label = group.querySelector("label");

            if (label) {
                label.style.display = "block";
                label.style.marginBottom = "5px";
                label.style.fontSize = "13px";
                label.style.fontWeight = "600";
            }

            const controls = group.querySelectorAll(
                "input, select"
            );

            controls.forEach(control => {
                control.style.width = "100%";
                control.style.maxWidth = "100%";
                control.style.minWidth = "0";
                control.style.height = "40px";
                control.style.boxSizing = "border-box";
            });

            row.appendChild(group);
        });

        return row;
    };

    // --------------------------------------------------
    // 4. Preserve existing form nodes
    // --------------------------------------------------

    const historyNotice = modal.querySelector(
        "#activity-edit-history-notice"
    );

    const memberButton = modal.querySelector(
        "#activity-edit-members"
    );

    const memberMode = modal.querySelector(
        "#activity-edit-member-mode"
    );

    const infoRow = createRow([
        nameGroup,
        typeGroup
    ]);

    const dayRow = createRow([
        dayGroup,
        lessonGroup
    ]);

    const timeRow = createRow([
        startGroup,
        endGroup
    ]);

    const dateRow = createRow([
        fromGroup,
        untilGroup
    ]);

    // --------------------------------------------------
    // 5. Compact status notice
    // --------------------------------------------------

    if (historyNotice) {
        historyNotice.style.margin = "0 0 12px";
        historyNotice.style.padding = "9px 12px";
        historyNotice.style.fontSize = "12px";
        historyNotice.style.lineHeight = "1.5";
    }

    // --------------------------------------------------
    // 6. Member management stays in its own section
    // --------------------------------------------------

    const memberSection = document.createElement("div");

    memberSection.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "flex-wrap:wrap",
        "gap:10px",
        "padding:12px 0 2px",
        "margin-top:2px",
        "border-top:1px solid #e2e8f0"
    ].join(";");

    const memberInfo = document.createElement("div");

    memberInfo.style.flex = "1 1 180px";
    memberInfo.style.minWidth = "0";

    const memberTitle = document.createElement("strong");
    memberTitle.textContent = "👥 สมาชิก / ผู้เข้าร่วม";
    memberTitle.style.fontSize = "14px";

    memberInfo.appendChild(memberTitle);

    if (memberMode) {
        memberMode.style.margin = "4px 0 0";
        memberMode.style.fontSize = "12px";
        memberInfo.appendChild(memberMode);
    }

    memberSection.appendChild(memberInfo);

    if (memberButton) {
        memberButton.style.flexShrink = "0";
        memberButton.style.margin = "0";
        memberSection.appendChild(memberButton);
    }

    // --------------------------------------------------
    // 7. Rebuild layout without replacing live controls
    // --------------------------------------------------

    body.replaceChildren();

    if (infoRow) body.appendChild(infoRow);

    if (historyNotice) {
        body.appendChild(historyNotice);
    }

    if (dayRow) body.appendChild(dayRow);
    if (timeRow) body.appendChild(timeRow);
    if (dateRow) body.appendChild(dateRow);

    body.appendChild(memberSection);
}

/* =====================================================
   B57-02 — Edit Activity Schedule
   Edit day, period, time and effective dates
   Protect attendance history and preserve member tools
   ===================================================== */

async function openActivityScheduleEdit(scheduleId) {
    try {
        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้จัดการ"
            );
        }

        const role = await getCurrentUserRole();

        if (!["Admin", "Teacher"].includes(role)) {
            throw new Error(
                "ไม่มีสิทธิ์จัดการตารางกิจกรรม"
            );
        }

        const schedules = await getActivitySchedules();

        const activity = (schedules || []).find(item =>
            item.scheduleId === scheduleId &&
            item.semesterId === semester.id
        );

        if (!activity) {
            throw new Error(
                "ไม่พบตารางกิจกรรมในภาคเรียนนี้"
            );
        }

        if (role === "Teacher") {
            const context =
                await getCurrentTeacherContext();

            if (
                !context?.teacherId ||
                !activity.teacherIds?.includes(context.teacherId)
            ) {
                throw new Error(
                    "คุณไม่ได้รับผิดชอบกิจกรรมนี้"
                );
            }
        }

        // Check all attendance sessions, including soft-deleted.
        const { count, error: historyError } =
            await supabaseClient
                .from("attendance_sessions")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq(
                    "activity_schedule_id",
                    scheduleId
                );

        if (historyError) throw historyError;

        const hasHistory = count > 0;

        const oldModal = document.getElementById(
            "activity-schedule-edit-modal"
        );

        oldModal?.remove();

        const modal = document.createElement("div");
        modal.id = "activity-schedule-edit-modal";

        const dayOptions = [
            [1, "จันทร์"],
            [2, "อังคาร"],
            [3, "พุธ"],
            [4, "พฤหัสบดี"],
            [5, "ศุกร์"],
            [6, "เสาร์"],
            [7, "อาทิตย์"]
        ];

        const periodOptions = [
            ...SCHEDULE_PERIODS
        ];

        if (
            activity.lessonNo != null &&
            !periodOptions.some(p =>
                p.lessonNo === Number(activity.lessonNo)
            )
        ) {
            periodOptions.push({
                lessonNo: Number(activity.lessonNo),
                label: `คาบที่ ${activity.lessonNo}`,
                start: "",
                end: ""
            });
        }

        periodOptions.sort(
            (a, b) => a.lessonNo - b.lessonNo
        );

        modal.innerHTML = `
            <div class="schedule-modal-backdrop">
                <div class="schedule-modal">

                    <div class="schedule-modal-header">
                        <div>
                            <h2>✏️ แก้ไขตารางกิจกรรม</h2>
                            <p>แก้ไขวัน คาบ เวลา และช่วงวันที่</p>
                        </div>

                        <button
                            type="button"
                            class="schedule-modal-close"
                            id="activity-edit-close"
                        >✕</button>
                    </div>

                    <div class="schedule-modal-body">

                        <div class="schedule-form-group">
                            <label>กิจกรรม</label>
                            <div id="activity-edit-name"></div>
                        </div>

                        <div class="schedule-form-group">
                            <label>ประเภทกิจกรรม</label>
                            <div id="activity-edit-type"></div>
                        </div>

                        <div
                            id="activity-edit-history-notice"
                            style="
                                padding:12px;
                                margin-bottom:16px;
                                background:#f8fafc;
                                border:1px solid #e2e8f0;
                                border-radius:9px;
                                font-size:13px;
                                line-height:1.6;
                            "
                        ></div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-weekday">
                                วัน
                            </label>
                            <select
                                id="activity-edit-weekday"
                                class="schedule-filter-select"
                            >
                                ${dayOptions.map(day => `
                                    <option value="${day[0]}">
                                        ${day[1]}
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-lesson">
                                คาบ
                            </label>
                            <select
                                id="activity-edit-lesson"
                                class="schedule-filter-select"
                            >
                                <option value="">
                                    ไม่ระบุคาบ
                                </option>
                                ${periodOptions.map(period => `
                                    <option value="${period.lessonNo}">
                                        ${period.label}
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-start-time">
                                เวลาเริ่ม
                            </label>
                            <input
                                type="time"
                                id="activity-edit-start-time"
                            >
                        </div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-end-time">
                                เวลาสิ้นสุด
                            </label>
                            <input
                                type="time"
                                id="activity-edit-end-time"
                            >
                        </div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-valid-from">
                                วันที่เริ่มใช้ (ค.ศ.)
                            </label>
                            <input
                                type="date"
                                id="activity-edit-valid-from"
                            >
                        </div>

                        <div class="schedule-form-group">
                            <label for="activity-edit-valid-until">
                                วันที่สิ้นสุด (ค.ศ.)
                            </label>
                            <input
                                type="date"
                                id="activity-edit-valid-until"
                            >
                        </div>

                        <hr style="
                            border:0;
                            border-top:1px solid #e2e8f0;
                            margin:20px 0;
                        ">

                        <h3>👥 สมาชิก / ผู้เข้าร่วม</h3>

                        <p
                            id="activity-edit-member-mode"
                            style="font-size:13px;color:#64748b;"
                        ></p>

                        <button
                            type="button"
                            class="schedule-add-btn"
                            id="activity-edit-members"
                        >
                            👥 จัดการรายชื่อ
                        </button>

                    </div>

                    <div class="schedule-modal-footer">
                        <button
                            type="button"
                            class="schedule-modal-cancel"
                            id="activity-edit-cancel"
                        >
                            ปิด
                        </button>

                        <button
                            type="button"
                            class="schedule-add-btn"
                            id="activity-edit-save"
                        >
                            💾 บันทึกการแก้ไข
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);
        // B57-02 — Apply compact responsive layout
        applyActivityScheduleEditLayout();

        const field = id =>
            modal.querySelector(`#${id}`);

        const setText = (id, value) => {
            field(id).textContent = value;
        };

        setText(
            "activity-edit-name",
            activity.activityName || "ไม่ระบุชื่อ"
        );

        setText(
            "activity-edit-type",
            activity.activityTypeName ||
            activity.activityTypeCode ||
            "-"
        );

        const weekdayInput = field("activity-edit-weekday");
        const lessonInput = field("activity-edit-lesson");
        const startInput = field("activity-edit-start-time");
        const endInput = field("activity-edit-end-time");
        const fromInput = field("activity-edit-valid-from");
        const untilInput = field("activity-edit-valid-until");
        const saveButton = field("activity-edit-save");

        const shortTime = value =>
            String(value || "").slice(0, 5);

        weekdayInput.value = String(activity.weekday);
        lessonInput.value =
            activity.lessonNo == null
                ? ""
                : String(activity.lessonNo);

        startInput.value = shortTime(activity.startTime);
        endInput.value = shortTime(activity.endTime);
        fromInput.value = activity.validFrom || "";
        untilInput.value = activity.validUntil || "";

        fromInput.min = semester.start_date;
        fromInput.max = semester.end_date;
        untilInput.min = semester.start_date;
        untilInput.max = semester.end_date;

        const detailInputs = [
            weekdayInput,
            lessonInput,
            startInput,
            endInput,
            fromInput
        ];

        if (hasHistory) {
            detailInputs.forEach(input => {
                input.disabled = true;
            });

            setText(
                "activity-edit-history-notice",
                "🔒 ตารางนี้มีประวัติเช็กชื่อแล้ว " +
                "จึงแก้วัน คาบ เวลา และวันที่เริ่มใช้ไม่ได้ " +
                "สามารถปรับวันที่สิ้นสุดได้ " +
                "แต่ต้องไม่ตัดวันที่ที่เคยเช็กชื่อ"
            );
        } else {
            setText(
                "activity-edit-history-notice",
                "✅ ยังไม่มีประวัติเช็กชื่อ " +
                "สามารถแก้ไขตารางได้ภายในช่วงภาคเรียน " +
                "โดยระบบจะตรวจตารางซ้ำก่อนบันทึก"
            );
        }

        // Automatically fill standard times when period changes.
        lessonInput.addEventListener("change", () => {
            const period = SCHEDULE_PERIODS.find(
                item =>
                    item.lessonNo === Number(lessonInput.value)
            );

            if (!lessonInput.value || !period) return;

            startInput.value = period.start;
            endInput.value = period.end;
        });

        const individualTypes = [
            "CLUB",
            "SCOUT",
            "ROTC"
        ];

        const individualMode = individualTypes.includes(
            activity.activityTypeCode
        );

        setText(
            "activity-edit-member-mode",
            individualMode
                ? "สมาชิกแบบรายคน สามารถคละห้องเรียนได้"
                : "ผู้เข้าร่วมแบบเลือกห้องเรียน"
        );

        const closeModal = () => modal.remove();

        field("activity-edit-close")
            .addEventListener("click", closeModal);

        field("activity-edit-cancel")
            .addEventListener("click", closeModal);

        // Preserve existing member management behavior.
        field("activity-edit-members")
            .addEventListener("click", async () => {
                closeModal();

                if (activity.activityTypeCode === "CLUB") {
                    await openClubMembersPreview(
                        activity.activityId,
                        activity.scheduleId
                    );
                } else {
                    await openGeneralActivityMembers(
                        activity.activityId,
                        activity.scheduleId
                    );
                }
            });

        let saving = false;

        saveButton.addEventListener("click", async () => {
            if (saving) return;

            const changes = {
                weekday: Number(weekdayInput.value),
                lessonNo: lessonInput.value
                    ? Number(lessonInput.value)
                    : null,
                startTime: startInput.value,
                endTime: endInput.value,
                validFrom: fromInput.value,
                validUntil: untilInput.value || null
            };

            const original = {
                weekday: Number(activity.weekday),
                lessonNo: activity.lessonNo ?? null,
                startTime: shortTime(activity.startTime),
                endTime: shortTime(activity.endTime),
                validFrom: activity.validFrom,
                validUntil: activity.validUntil || null
            };

            const unchanged =
                Object.keys(changes).every(
                    key => changes[key] === original[key]
                );

            if (unchanged) {
                await Swal.fire({
                    icon: "info",
                    title: "ไม่มีข้อมูลเปลี่ยนแปลง",
                    confirmButtonText: "ตกลง"
                });
                return;
            }

            const confirmation = await Swal.fire({
                icon: "question",
                title: "ยืนยันแก้ไขตารางกิจกรรม",
                text: "ต้องการบันทึกข้อมูลตารางกิจกรรมใหม่ใช่หรือไม่",
                showCancelButton: true,
                confirmButtonText: "ยืนยันบันทึก",
                cancelButtonText: "ยกเลิก"
            });

            if (!confirmation.isConfirmed) return;

            saving = true;
            saveButton.disabled = true;

            try {
                await saveActivityScheduleEditChanges(
                    activity,
                    changes,
                    semester
                );

                await Swal.fire({
                    icon: "success",
                    title: "แก้ไขตารางกิจกรรมสำเร็จ",
                    confirmButtonText: "ตกลง"
                });

                closeModal();
                await loadActivityScheduleManage();

            } catch (error) {
                console.error(
                    "B57-02 Activity Edit:",
                    error
                );

                const raw = String(error?.message || "");
                let message = raw || "ไม่สามารถบันทึกได้";

                if (raw.includes("ACTIVITY_SCHEDULE_OVERLAP")) {
                    message =
                        "ตารางกิจกรรมซ้ำกับรายการเดิม " +
                        "กรุณาเปลี่ยนวัน คาบ หรือช่วงเวลา";
                } else if (
                    raw.includes(
                        "ACTIVITY_SCHEDULE_HAS_HISTORY_CANNOT_CHANGE_DETAILS"
                    )
                ) {
                    message =
                        "มีประวัติเช็กชื่อแล้ว " +
                        "ไม่สามารถแก้วัน คาบ เวลา หรือวันที่เริ่มใช้";
                } else if (
                    raw.includes(
                        "ACTIVITY_SCHEDULE_DATES_EXCLUDE_ATTENDANCE_HISTORY"
                    )
                ) {
                    message =
                        "วันที่สิ้นสุดใหม่ตัดประวัติการเช็กชื่อเดิม";
                } else if (
                    raw.includes("ACTIVITY_SEMESTER_PERMANENTLY_LOCKED") ||
                    raw.includes("ACTIVITY_SEMESTER_EXPIRED")
                ) {
                    message =
                        "ภาคเรียนถูกล็อกหรือสิ้นสุดแล้ว";
                }

                await Swal.fire({
                    icon: "error",
                    title: "ไม่สามารถแก้ไขตารางกิจกรรม",
                    text: message,
                    confirmButtonText: "ตกลง"
                });

            } finally {
                saving = false;
                saveButton.disabled = false;
            }
        });

    } catch (error) {
        console.error(
            "Activity Schedule Edit:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเปิดแก้ไขกิจกรรม",
            text: error?.message || "เกิดข้อผิดพลาด"
        });
    }
}

async function getScheduleManageActiveSemester() {

    // วันที่ปัจจุบันตามเวลาประเทศไทย
    const todayBangkok = new Date().toLocaleDateString(
        "sv-SE",
        { timeZone: "Asia/Bangkok" }
    );

    // อ่านภาคเรียนที่ครอบคลุมวันนี้
    const { data, error } = await supabaseClient
        .from("semesters")
        .select(`
            id,
            academic_year_id,
            semester_no,
            start_date,
            end_date,
            schedule_locked_at
        `)
        .lte("start_date", todayBangkok)
        .gte("end_date", todayBangkok);

    if (error) {
        throw error;
    }

    // ไม่พบภาคเรียนปัจจุบัน
    if (!data || data.length === 0) {
        return null;
    }

    // ป้องกันข้อมูลภาคเรียนทับซ้อน
    if (data.length !== 1) {
        throw new Error(
            "พบภาคเรียนปัจจุบันมากกว่า 1 รายการ กรุณาตรวจสอบข้อมูลภาคเรียน"
        );
    }

    const semester = data[0];

    // ถูกล็อกแล้ว ไม่อนุญาตให้จัดการ
    if (semester.schedule_locked_at != null) {
        return null;
    }

    return semester;
}

async function getScheduleManageSummaryLabels(
    semester,
    teacherId = ""
) {
    const { data: year, error: yearError } =
        await supabaseClient
            .from("academic_years")
            .select("year")
            .eq("id", semester.academic_year_id)
            .single();

    if (yearError) throw yearError;

    const semesterLabel =
        `ภาคเรียนที่ ${semester.semester_no}/${year.year}`;

    if (!teacherId) {
        return {
            semesterLabel,
            teacherLabel: "ครูทุกคน"
        };
    }

    const { data: teacher, error: teacherError } =
        await supabaseClient
            .from("teachers")
            .select("first_name, last_name, nickname")
            .eq("id", teacherId)
            .single();

    if (teacherError) throw teacherError;

    const teacherLabel =
        [teacher.first_name, teacher.last_name]
            .filter(Boolean)
            .join(" ") ||
        teacher.nickname ||
        "ไม่ระบุชื่อครู";

    return {
        semesterLabel,
        teacherLabel
    };
}

// ============================================================
// SCHEDULE MANAGE
// STEP 5B.9.2 — Group Schedule Records for UI
// ============================================================

async function loadScheduleManage() {

    const list =
        document.getElementById("schedule-manage-list");

    if (!list) return;

    try {

        // ====================================================
        // 1. โหลด Schedule ทั้งหมด
        // ====================================================

        const rawSchedules =
            await getClassSchedules();

        const activeSemester =
            await getScheduleManageActiveSemester();

// ไม่มีภาคเรียนที่เปิดให้จัดการ
if (!activeSemester) {

    window.scheduleManageGroups = [];

    list.innerHTML = `
        <div class="schedule-empty-state">
            <div class="schedule-empty-icon">🔒</div>
            <h2>ไม่มีภาคเรียนที่เปิดให้จัดการตารางสอน</h2>
            <p>
                กรุณาตรวจสอบสถานะภาคเรียน
                ในเมนูจัดการงานวิชาการ
            </p>
        </div>
    `;

    return;
}

// แสดงเฉพาะคาบของภาคเรียนปัจจุบัน
const schedules = (rawSchedules || [])
    .map(mapScheduleData)
    .filter(schedule =>
        schedule.semesterId === activeSemester.id
    );

        // B53 — จำกัดรายการตาม Role ของผู้ใช้งาน
        const role = await getCurrentUserRole();

        let scopedSchedules = schedules;

        if (role === "Teacher") {

            const teacherContext =
                await getCurrentTeacherContext();

            if (!teacherContext?.teacherId) {
                throw new Error(
                    "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
                );
            }

            scopedSchedules = schedules.filter(schedule =>
                schedule.teacherId === teacherContext.teacherId
            );

        } else if (role !== "Admin") {

            throw new Error(
                "ไม่มีสิทธิ์จัดการตารางสอน"
            );

        }

        // ====================================================
// CLASS SCHEDULE FILTER
// ====================================================

        // B53 — Admin Teacher Filter
        // ใช้เฉพาะภาคเรียนปัจจุบันที่กรองไว้แล้ว

        if (role === "Admin") {

            const filterArea =
                document.getElementById(
                    "schedule-manage-filter"
                );

            if (filterArea) {

                let teacherFilter =
                    document.getElementById(
                        "schedule-manage-teacher-filter"
                    );

                if (!teacherFilter) {
                    teacherFilter =
                        document.createElement("select");

                    teacherFilter.id =
                        "schedule-manage-teacher-filter";

                    teacherFilter.className =
                        "schedule-filter-select";

                    filterArea.prepend(teacherFilter);
                }

                const teachersById = new Map();

                schedules.forEach(schedule => {
                    if (schedule.teacherId) {
                        teachersById.set(
                            schedule.teacherId,
                            schedule.teacherName ||
                                "ไม่ระบุชื่อครู"
                        );
                    }
                });

                const previousTeacherId =
                    teacherFilter.value ||
                    window.scheduleManageTeacherFilterId ||
                    "";

                teacherFilter.replaceChildren();

                const allTeachersOption =
                    document.createElement("option");

                allTeachersOption.value = "";
                allTeachersOption.textContent =
                    "👨‍🏫 ครูทุกคน";

                teacherFilter.appendChild(
                    allTeachersOption
                );

                [...teachersById.entries()]
                    .sort((a, b) =>
                        a[1].localeCompare(b[1], "th")
                    )
                    .forEach(([teacherId, teacherName]) => {

                        const option =
                            document.createElement("option");

                        option.value = teacherId;
                        option.textContent = teacherName;

                        teacherFilter.appendChild(option);
                    });

                const selectedTeacherId =
                    teachersById.has(previousTeacherId)
                        ? previousTeacherId
                        : "";

                teacherFilter.value =
                    selectedTeacherId;

                window.scheduleManageTeacherFilterId =
                    selectedTeacherId;

                teacherFilter.onchange = function () {
                    window.scheduleManageTeacherFilterId =
                        this.value;

                    loadScheduleManage();
                };

                if (selectedTeacherId) {
                    scopedSchedules =
                        scopedSchedules.filter(schedule =>
                            schedule.teacherId ===
                            selectedTeacherId
                        );
                }
            }
        }

const dayFilter =
    document.getElementById(
        "schedule-manage-day-filter"
    );

const lessonFilter =
    document.getElementById(
        "schedule-manage-lesson-filter"
    );

const selectedDay =
    dayFilter?.value || "";

const selectedLesson =
    lessonFilter?.value || "";

        // B53 — ข้อความสรุปภาคเรียนและครู
        let summaryTeacherId = "";

        if (role === "Admin") {
            summaryTeacherId =
                window.scheduleManageTeacherFilterId || "";
        } else if (role === "Teacher") {
            const context =
                await getCurrentTeacherContext();

            summaryTeacherId = context?.teacherId || "";
        }

        const summaryLabels =
            await getScheduleManageSummaryLabels(
                activeSemester,
                summaryTeacherId
            );

const filteredSchedules =
    scopedSchedules.filter(schedule => {

        const matchDay =
            !selectedDay ||
            String(schedule.weekday) ===
            String(selectedDay);

        const matchLesson =
            !selectedLesson ||
            String(schedule.lessonNo) ===
            String(selectedLesson);

        return matchDay && matchLesson;
    });


        // ====================================================
        // 3. ไม่มีข้อมูล
        // ====================================================

        if (filteredSchedules.length === 0) {

            list.innerHTML = `
                <div class="schedule-empty-state">

                    <div class="schedule-empty-icon">
                        🗂️
                    </div>

                    <h2>ยังไม่มีตารางสอน</h2>

                    <p>
                        กด "＋ เพิ่มตารางสอน"
                        เพื่อสร้างตารางสอนใหม่
                    </p>

                </div>
            `;
            showScheduleManageCount(
    list,
    0,
    summaryLabels.semesterLabel,
    summaryLabels.teacherLabel
        );
            return;
        }


        // ====================================================
        // 4. ชื่อวัน
        // ====================================================

        const weekdayNames = {
            1: "จันทร์",
            2: "อังคาร",
            3: "พุธ",
            4: "พฤหัสบดี",
            5: "ศุกร์"
        };


        // ====================================================
        // 5. จัดกลุ่ม Schedule
        //
        // DB = แยก Record
        // UI = รวมเป็น Card
        //
        // classRecords จะเก็บคู่:
        // className + scheduleId
        // ====================================================

        const groupedMap = new Map();


        filteredSchedules.forEach(schedule => {

            const groupKey = [
                schedule.subjectCode,
                schedule.subjectName,
                schedule.teacherId,
                schedule.weekday,
                schedule.lessonNo,
                schedule.startTime,
                schedule.endTime,
                schedule.teachingRoom,
                schedule.validFrom,
                schedule.validUntil,
                schedule.scheduleGroupId || ""
            ].join("|");


            if (!groupedMap.has(groupKey)) {

                groupedMap.set(groupKey, {

                    ...schedule,

                    classRecords: []

                });

            }


            const group =
                groupedMap.get(groupKey);


            // ------------------------------------------------
            // เก็บห้องเรียน + Schedule ID เป็นคู่กัน
            // ------------------------------------------------

            if (
                schedule.id &&
                schedule.className
            ) {

                const alreadyExists =
                    group.classRecords.some(
                        record =>
                            record.scheduleId ===
                            schedule.id
                    );


                if (!alreadyExists) {

                    group.classRecords.push({

                        scheduleId:
                            schedule.id,

                        className:
                            schedule.className,

                        validFrom:
                            schedule.validFrom,

                        validUntil:
                            schedule.validUntil,

                        subjectAssignmentId:
                            schedule.subjectAssignmentId ||
                            null

                    });

                }

            }

        });


        const groupedSchedules =
            Array.from(
                groupedMap.values()
            );


        // ====================================================
        // 6. เก็บ Group ไว้สำหรับ Edit
        //
        // อนาคต Permission จะครอบตรงชั้นนี้ได้
        // โดยไม่ต้องเปลี่ยนโครงสร้าง Card
        // ====================================================

        window.scheduleManageGroups =
            groupedSchedules;


        // ====================================================
        // 7. เรียงห้องเรียน
        //
        // className และ scheduleId
        // จะติดกันตลอด เพราะอยู่ใน object เดียวกัน
        // ====================================================

        groupedSchedules.forEach(group => {

            group.classRecords.sort(
                (a, b) =>
                    a.className.localeCompare(
                        b.className,
                        "th",
                        {
                            numeric: true
                        }
                    )
            );

        });


        // ====================================================
        // 8. Render Card
        // ====================================================

        list.innerHTML =
            groupedSchedules.map(
                (group, index) => {

                    const weekdayName =
                        weekdayNames[
                            group.weekday
                        ] || "-";


                    const validFrom =
                        group.validFrom || "-";


                    const validUntil =
                        group.validUntil ||
                        "ไม่กำหนด";


                    const classNames =
                        group.classRecords.length > 0
                            ? group.classRecords
                                .map(
                                    record =>
                                        record.className
                                )
                                .join(", ")
                            : "-";


                    return `
                        <div class="schedule-manage-card">

                            <div class="schedule-manage-card-main">

                                <div class="schedule-manage-card-title">

                                    ${group.subjectCode || "-"}

                                    —

                                    ${group.subjectName || "-"}

                                </div>


                                <div class="schedule-manage-card-info">

                                    👨‍🎓
                                    ${classNames}

                                </div>


                                <div class="schedule-manage-card-info">

                                    📅
                                    ${weekdayName}

                                    <span>•</span>

                                    🕐
                                    คาบ ${group.lessonNo || "-"}

                                    <span>•</span>

                                    ${group.startTime || "-"}

                                    –

                                    ${group.endTime || "-"}

                                </div>


                                <div class="schedule-manage-card-info">

                                    🏫
                                    ห้องสอน
                                    ${group.teachingRoom || "-"}

                                </div>


                                <div class="schedule-manage-card-info">

                                    👨‍🏫
                                    ${group.teacherName || "-"}

                                </div>


                                <div class="schedule-manage-card-date">

                                    📅
                                    เริ่มใช้:
                                    ${validFrom}

                                    &nbsp;→&nbsp;

                                    สิ้นสุด:
                                    ${validUntil}

                                </div>

                            </div>


                            <div class="schedule-manage-card-actions">

                                <button
                                    type="button"
                                    class="schedule-edit-btn"
                                    onclick="openScheduleEditGroup(${index})"
                                >
                                    ✏️ แก้ไข
                                </button>

                                <button
                                   type="button"
                                   class="schedule-delete-btn"
                                   onclick="deleteScheduleGroup(${index})"
                                >
                                   🗑️ ลบ
                                </button>

                            </div>

                        </div>
                    `;

                }
                        ).join("");

        showScheduleManageCount(
    list,
    groupedSchedules.length,
    summaryLabels.semesterLabel,
    summaryLabels.teacherLabel
);

    } catch (error) {

        console.error(
            "Schedule Manage Load Error:",
            error
        );


        list.innerHTML = `
            <div class="schedule-empty-state">

                <div class="schedule-empty-icon">
                    ⚠️
                </div>

                <h2>
                    ไม่สามารถโหลดตารางสอนได้
                </h2>

                <p>
                    กรุณาลองใหม่อีกครั้ง
                </p>

            </div>
        `;

    }

}
// ============================================================
// DELETE SCHEDULE CARD
// STEP 2 — Delete entire Schedule Group
// ============================================================

async function deleteScheduleGroup(groupIndex) {

    // --------------------------------------------------------
    // 1. หา Group จาก Index
    // --------------------------------------------------------

    const groups =
        window.scheduleManageGroups || [];

    const group =
        groups[groupIndex];


    if (!group) {

        await Swal.fire({
            icon: "error",
            title: "ไม่พบข้อมูล",
            text: "ไม่พบคาบเรียนที่ต้องการลบ",
            confirmButtonText: "ตกลง"
        });

        return;
    }


    // --------------------------------------------------------
    // 2. ตรวจสอบ Schedule Group ID
    // --------------------------------------------------------

    if (!group.scheduleGroupId) {

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถลบได้",
            text:
                "คาบเรียนนี้ไม่มี Schedule Group ID",
            confirmButtonText: "ตกลง"
        });

        return;
    }


    // --------------------------------------------------------
    // 3. ยืนยันการลบ
    // --------------------------------------------------------

    const classNames =
        (group.classRecords || [])
            .map(record => record.className)
            .join(", ");


    const result =
        await Swal.fire({

            icon: "warning",

            title:
                "ต้องการลบคาบเรียนนี้?",

            html: `
                <div style="
                    text-align:center;
                    line-height:1.8;
                ">

                    <strong>
                        ${group.subjectCode || "-"}
                        —
                        ${group.subjectName || "-"}
                    </strong>

                    <br>

                    👨‍🎓
                    ${classNames || "-"}

                    <br>

                    📅
                    ${group.weekday || "-"}
                    •
                    คาบ ${group.lessonNo || "-"}

                    <br>

                    🏫
                    ห้องสอน
                    ${group.teachingRoom || "-"}

                    <br><br>

                    <span style="color:#dc2626;">
                        การลบจะลบตารางสอนของ
                        ทุกห้องเรียนในคาบนี้
                    </span>

                </div>
            `,

            showCancelButton: true,

            confirmButtonText:
                "🗑️ ลบทั้งคาบ",

            cancelButtonText:
                "ยกเลิก",

            reverseButtons: true

        });


    // --------------------------------------------------------
    // 4. ยกเลิก
    // --------------------------------------------------------

    if (!result.isConfirmed) {
        return;
    }


    try {

        // ----------------------------------------------------
        // 5. ลบ Schedule ทั้งหมดใน Group
        // ----------------------------------------------------

        await deleteClassScheduleGroup(
            group.scheduleGroupId
        );


        // ----------------------------------------------------
        // 6. แจ้งสำเร็จ
        // ----------------------------------------------------

        await Swal.fire({

            icon: "success",

            title:
                "ลบสำเร็จ",

            text:
                "ลบคาบเรียนและห้องเรียนทั้งหมดออกแล้ว",

            confirmButtonText:
                "ตกลง"

        });


        // ----------------------------------------------------
        // 7. โหลดข้อมูลใหม่
        // ----------------------------------------------------

        await loadScheduleManage();


    } catch (error) {

        console.error(
            "Delete Schedule Group Error:",
            error
        );


        await Swal.fire({

            icon: "error",

            title:
                "ลบไม่สำเร็จ",

            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการลบคาบเรียน",

            confirmButtonText:
                "ตกลง"

        });

    }

}

// ============================================================
// SCHEDULE MANAGE EDIT MODAL
// STEP 5B.9.3 — Select Class Room to Edit
// ============================================================

function openScheduleEditGroup(groupIndex) {

    const groups =
        window.scheduleManageGroups || [];

    const group =
        groups[groupIndex];

    if (!group) {

        console.error(
            "Schedule group not found:",
            groupIndex
        );

        Swal.fire(
            "ไม่พบข้อมูล",
            "ไม่พบข้อมูลตารางสอนที่ต้องการแก้ไข",
            "error"
        );

        return;
    }


    const oldModal =
        document.getElementById(
            "schedule-edit-modal"
        );

    if (oldModal) {
        oldModal.remove();
    }


    const modal =
        document.createElement("div");

    modal.id =
        "schedule-edit-modal";


    const classRecords =
        group.classRecords || [];


    modal.innerHTML = `

        <div class="schedule-modal-backdrop">

            <div class="schedule-modal">

                <div class="schedule-modal-header">

                    <div>

                        <h2>
                            ✏️ แก้ไขตารางสอน
                        </h2>

                        <p>
                            จัดการห้องเรียนในคาบนี้
                        </p>

                    </div>


                    <button
                        type="button"
                        class="schedule-modal-close"
                        onclick="closeScheduleEditGroup()"
                    >
                        ✕
                    </button>

                </div>


                <div class="schedule-modal-body">

                    <div class="schedule-form-group">

                        <label>
                            วิชา
                        </label>

                        <div>
                            <strong>
                                ${group.subjectCode || "-"}
                            </strong>
                            —
                            ${group.subjectName || "-"}
                        </div>

                    </div>


                    <div class="schedule-form-group">

                        <label>
                            👨‍🏫 ครูผู้สอน
                        </label>

                        <div>
                            ${group.teacherName || "-"}
                        </div>

                    </div>


                    <div class="schedule-form-row">

                        <div class="schedule-form-group">

                            <label>
                                📅 วัน
                            </label>

                            <div>
                                ${
                                    {
                                        1: "จันทร์",
                                        2: "อังคาร",
                                        3: "พุธ",
                                        4: "พฤหัสบดี",
                                        5: "ศุกร์"
                                    }[group.weekday] || "-"
                                }
                            </div>

                        </div>


                        <div class="schedule-form-group">

                            <label>
                                🕐 คาบ
                            </label>

                            <div>
                                คาบ ${group.lessonNo || "-"}
                                •
                                ${group.startTime || "-"}
                                –
                                ${group.endTime || "-"}
                            </div>

                        </div>

                    </div>


                    <div class="schedule-form-group">

                        <label>
                            🏫 ห้องสอน
                        </label>

                        <div>
                            ${group.teachingRoom || "-"}
                        </div>

                    </div>


                    <div class="schedule-form-group">

                        <label>
                            👨‍🎓 ห้องเรียนในคาบนี้
                        </label>


                        <div
                            id="schedule-edit-class-list"
                        >

                            ${
                                classRecords.length > 0

                                ? classRecords.map(
                                    record => `

                                        <div
                                            style="
                                                display:flex;
                                                align-items:center;
                                                justify-content:space-between;
                                                gap:12px;
                                                padding:12px 14px;
                                                margin-bottom:8px;
                                                border:1px solid #e2e8f0;
                                                border-radius:10px;
                                                background:#f8fafc;
                                            "
                                        >

                                            <strong>
                                                ${
                                                    record.className ||
                                                    "-"
                                                }
                                            </strong>


                                            <button
                                                type="button"
                                                class="schedule-delete-btn"
                                                onclick="deleteScheduleClassFromGroup(
                                                    '${record.scheduleId}',
                                                    '${record.className}'
                                                )"
                                            >
                                                🗑️ ลบ
                                            </button>

                                        </div>

                                    `
                                ).join("")

                                : `
                                    <div>
                                        ยังไม่มีห้องเรียนในคาบนี้
                                    </div>
                                `
                            }

                        </div>

                    </div>


                    <div
                        style="
                            margin-top:16px;
                            padding-top:16px;
                            border-top:1px solid #e2e8f0;
                        "
                    >

                        <button
                            type="button"
                            class="schedule-modal-save"
                            onclick="openScheduleAddClass(${groupIndex})"
                        >
                            ＋ เพิ่มห้องเรียน
                        </button>

                    </div>

                </div>


                <div class="schedule-modal-footer">

                    <button
                        type="button"
                        class="schedule-modal-cancel"
                        onclick="closeScheduleEditGroup()"
                    >
                        ปิด
                    </button>

                </div>

            </div>

        </div>
    `;


    document.body.appendChild(modal);
}

// ============================================================
// ADD CLASS TO EXISTING SCHEDULE CARD
// STEP 18 — Add Class + Get/Create Subject Assignment
// ============================================================

async function openScheduleAddClass(groupIndex) {

    const groups =
        window.scheduleManageGroups || [];

    const group =
        groups[groupIndex];


    // --------------------------------------------------------
    // 1. ตรวจสอบ Group
    // --------------------------------------------------------

    if (!group) {

        await Swal.fire(
            "ไม่พบข้อมูล",
            "ไม่พบข้อมูลตารางสอนที่ต้องการเพิ่มห้องเรียน",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // 2. ตรวจสอบข้อมูลหลักของ Card
    // --------------------------------------------------------

    if (
        !group.subjectAssignmentId ||
        !group.teachingRoomId
    ) {

        await Swal.fire(
            "ข้อมูลไม่ครบ",
            "ข้อมูลหลักของตารางสอนไม่ครบ",
            "error"
        );

        return;
    }


    try {

        // ----------------------------------------------------
        // 3. หา Subject Assignment หลักของ Card
        // ----------------------------------------------------

        const {
            data: currentAssignment,
            error: currentAssignmentError
        } = await supabaseClient

            .from("subject_assignments")

            .select(`
                id,
                teacher_id,
                subject_id,
                academic_year_id,
                semester_id
            `)

            .eq(
                "id",
                group.subjectAssignmentId
            )

            .single();


        if (currentAssignmentError) {
            throw currentAssignmentError;
        }


        // ----------------------------------------------------
        // 4. ดึงห้องเรียนทั้งหมด
        // ----------------------------------------------------

        const rooms =
            await getRooms();


        // ----------------------------------------------------
        // 5. ดึงห้องเรียนที่มีอยู่ใน Card แล้ว
        // ----------------------------------------------------

        const existingClassNames =
            (group.classRecords || [])
                .map(
                    record =>
                        record.className
                );


        // ----------------------------------------------------
        // 6. เหลือเฉพาะห้องที่ยังไม่ได้อยู่ใน Card
        // ----------------------------------------------------

        const availableRooms =
            (rooms || [])
                .filter(room => {

                    return (
                        room.room_name &&
                        !existingClassNames.includes(
                            room.room_name
                        )
                    );

                });


        // ----------------------------------------------------
        // 7. ไม่มีห้องให้เพิ่ม
        // ----------------------------------------------------

        if (
            availableRooms.length === 0
        ) {

            await Swal.fire({

                icon: "info",

                title:
                    "ไม่มีห้องเรียนให้เพิ่ม",

                text:
                    "ห้องเรียนทั้งหมดถูกเพิ่มในคาบนี้แล้ว",

                confirmButtonText:
                    "ตกลง"

            });

            return;
        }


        // ----------------------------------------------------
        // 8. สร้างตัวเลือกห้องเรียน
        // ----------------------------------------------------

        const options =
            availableRooms

                .sort(
                    (a, b) =>
                        (
                            a.room_name || ""
                        ).localeCompare(
                            b.room_name || "",
                            "th",
                            {
                                numeric: true
                            }
                        )
                )

                .map(
                    room => `

                        <option
                            value="${room.id}"
                        >
                            ${
                                room.room_name ||
                                "-"
                            }
                        </option>

                    `
                )

                .join("");


        // ----------------------------------------------------
        // 9. เปิด Modal
        // ----------------------------------------------------

        const result =
            await Swal.fire({

                title:
                    "＋ เพิ่มห้องเรียน",

                html: `

                    <div style="
                        text-align:left;
                        margin-bottom:12px;
                    ">

                        <strong>
                            ${
                                group.subjectCode ||
                                "-"
                            }
                            —
                            ${
                                group.subjectName ||
                                "-"
                            }
                        </strong>

                        <br>

                        ${
                            {
                                1: "จันทร์",
                                2: "อังคาร",
                                3: "พุธ",
                                4: "พฤหัสบดี",
                                5: "ศุกร์"
                            }[group.weekday] || "-"
                        }

                        • คาบ
                        ${
                            group.lessonNo ||
                            "-"
                        }

                        • ห้องสอน
                        ${
                            group.teachingRoom ||
                            "-"
                        }

                    </div>


                    <label
                        for="schedule-add-class"
                        style="
                            display:block;
                            text-align:left;
                            font-weight:600;
                            margin-bottom:8px;
                        "
                    >
                        👨‍🎓 ห้องเรียน
                    </label>


                    <select
                        id="schedule-add-class"
                        class="swal2-select"
                        style="
                            width:100%;
                            margin:0;
                        "
                    >

                        <option value="">
                            -- เลือกห้องเรียน --
                        </option>

                        ${options}

                    </select>

                `,

                showCancelButton: true,

                confirmButtonText:
                    "＋ เพิ่มห้องเรียน",

                cancelButtonText:
                    "ยกเลิก",

                reverseButtons: true,

                focusConfirm: false,


                // ------------------------------------------------
                // 10. Validation
                // ------------------------------------------------

                preConfirm: () => {

                    const roomId =
                        document.getElementById(
                            "schedule-add-class"
                        )?.value;


                    if (!roomId) {

                        Swal.showValidationMessage(
                            "กรุณาเลือกห้องเรียน"
                        );

                        return false;
                    }


                    return roomId;

                }

            });


        // ----------------------------------------------------
        // 11. ยกเลิก
        // ----------------------------------------------------

        if (!result.isConfirmed) {
            return;
        }


        const roomId =
            result.value;


        // ----------------------------------------------------
        // 12. สร้าง / หา Subject Assignment
        // ----------------------------------------------------

const {
    data: assignmentId,
    error: assignmentError
} = await supabaseClient.rpc(
    "schedule_get_or_create_assignment_for_room",
    {
        p_source_assignment_id:
            currentAssignment.id,

        p_room_id:
            roomId
    }
);

if (assignmentError) {
    throw assignmentError;
}

if (!assignmentId) {
    throw new Error(
        "ไม่สามารถสร้างหรือค้นหาการมอบหมายวิชาได้"
    );
}

const subjectAssignment = {
    id: assignmentId
};

        // ----------------------------------------------------
        // 13. สร้าง Schedule ใหม่
        //
        // สำคัญ:
        // ใช้ข้อมูลหลักของ Card เดิมทั้งหมด
        // ----------------------------------------------------

        await createClassSchedule({

            subjectAssignmentId:
                subjectAssignment.id,

            weekday:
                group.weekday,

            lessonNo:
                group.lessonNo,

            startTime:
                group.startTime,

            endTime:
                group.endTime,

            validFrom:
                group.validFrom,

            validUntil:
                group.validUntil,

            scheduleGroupId:
                group.scheduleGroupId,

            teachingRoomId:
                group.teachingRoomId

        });


        // ----------------------------------------------------
        // 14. แจ้งสำเร็จ
        // ----------------------------------------------------

        await Swal.fire({

            icon: "success",

            title:
                "เพิ่มสำเร็จ",

            text:
                "เพิ่มห้องเรียนเข้าคาบนี้แล้ว",

            confirmButtonText:
                "ตกลง"

        });


        // ----------------------------------------------------
        // 15. ปิด Modal
        // ----------------------------------------------------

        closeScheduleEditGroup();


        // ----------------------------------------------------
        // 16. โหลดข้อมูลใหม่
        // ----------------------------------------------------

        await loadScheduleManage();


    } catch (error) {

        console.error(
            "Add Schedule Class Error:",
            error
        );


        await Swal.fire({

            icon: "error",

            title:
                "เพิ่มไม่สำเร็จ",

            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการเพิ่มห้องเรียน",

            confirmButtonText:
                "ตกลง"

        });

    }

}

function selectScheduleClassToEdit(scheduleId) {

    const groups =
        window.scheduleManageGroups || [];

    let targetGroup = null;
    let targetRecord = null;


    // --------------------------------------------------------
    // 1. หา Record ที่เลือก
    // --------------------------------------------------------

    for (const group of groups) {

        const record =
            (group.classRecords || []).find(
                item =>
                    item.scheduleId === scheduleId
            );

        if (record) {

            targetGroup = group;
            targetRecord = record;

            break;
        }
    }


    // --------------------------------------------------------
    // 2. ตรวจสอบ
    // --------------------------------------------------------

    if (!targetGroup || !targetRecord) {

        console.error(
            "Schedule record not found:",
            scheduleId
        );

        Swal.fire(
            "ไม่พบข้อมูล",
            "ไม่พบตารางสอนที่ต้องการแก้ไข",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // 3. เก็บข้อมูล Record ที่เลือก
    // --------------------------------------------------------

    window.currentScheduleEdit = {

        scheduleId:
            targetRecord.scheduleId,

        className:
            targetRecord.className,

        subjectAssignmentId:
            targetRecord.subjectAssignmentId,

        validFrom:
            targetRecord.validFrom,

        validUntil:
            targetRecord.validUntil,

        subjectCode:
            targetGroup.subjectCode,

        subjectName:
            targetGroup.subjectName,

        teacherId:
            targetGroup.teacherId,

        teacherName:
            targetGroup.teacherName,

        weekday:
            targetGroup.weekday,

        lessonNo:
            targetGroup.lessonNo,

        startTime:
            targetGroup.startTime,

        endTime:
            targetGroup.endTime,

        scheduleGroupId:
            targetGroup.scheduleGroupId,

        teachingRoom:
            targetGroup.teachingRoom,

        teachingRoomId:
            targetGroup.teachingRoomId

    };


    console.log(
        "Current Schedule Edit:",
        window.currentScheduleEdit
    );


    // --------------------------------------------------------
    // 4. เปิดฟอร์มแก้ไขจริงทันที
    // --------------------------------------------------------

    openScheduleEditForm();

}

function openScheduleEditForm() {

    // --------------------------------------------------------
    // 1. ตรวจสอบข้อมูลที่กำลังแก้ไข
    // --------------------------------------------------------

    const data =
        window.currentScheduleEdit;


    if (!data) {

        Swal.fire(
            "ไม่พบข้อมูล",
            "ไม่พบข้อมูลตารางสอนที่กำลังแก้ไข",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // 2. ลบ Edit Form เดิม ถ้ามี
    // --------------------------------------------------------

    const oldModal =
        document.getElementById(
            "schedule-edit-form-modal"
        );


    if (oldModal) {
        oldModal.remove();
    }


    // --------------------------------------------------------
    // 3. ชื่อวัน
    // --------------------------------------------------------

    const weekdayNames = {

        1: "จันทร์",
        2: "อังคาร",
        3: "พุธ",
        4: "พฤหัสบดี",
        5: "ศุกร์"

    };


    const weekdayName =
        weekdayNames[data.weekday] || "-";


    // --------------------------------------------------------
    // 4. สร้าง Modal
    // --------------------------------------------------------

    const modal =
        document.createElement("div");


    modal.id =
        "schedule-edit-form-modal";


    modal.innerHTML = `

        <div class="schedule-modal-backdrop">

            <div class="schedule-modal">

                <!-- =========================================
                     HEADER
                     ========================================= -->

                <div class="schedule-modal-header">

                    <div>

                        <h2>
                            ✏️ แก้ไขตารางสอน
                        </h2>

                        <p>
                            แก้ไขเฉพาะห้องเรียน
                            ${data.className || "-"}
                        </p>

                    </div>


                    <button
                        type="button"
                        class="schedule-modal-close"
                        onclick="closeScheduleEditForm()"
                    >
                        ✕
                    </button>

                </div>


                <!-- =========================================
                     BODY
                     ========================================= -->

                <div class="schedule-modal-body">


                    <!-- SUBJECT -->

                    <div class="schedule-form-group">

                        <label>
                            วิชา
                        </label>

                        <div>

                            <strong>
                                ${data.subjectCode || "-"}
                            </strong>

                            —
                            ${data.subjectName || "-"}

                        </div>

                    </div>


                    <!-- CLASS -->

                    <div class="schedule-form-group">

                        <label>
                            👨‍🎓 ห้องเรียน
                        </label>

                        <div>

                            <strong>
                                ${data.className || "-"}
                            </strong>

                        </div>

                        <small>
                            การแก้ไขครั้งนี้จะกระทบเฉพาะ
                            ${data.className || "-"}
                        </small>

                    </div>


                    <!-- DAY + LESSON -->

                    <div class="schedule-form-row">


                        <div class="schedule-form-group">

                            <label for="schedule-edit-weekday">
                                วัน
                            </label>

                            <select
                                id="schedule-edit-weekday"
                            >

                                <option value="1">
                                    จันทร์
                                </option>

                                <option value="2">
                                    อังคาร
                                </option>

                                <option value="3">
                                    พุธ
                                </option>

                                <option value="4">
                                    พฤหัสบดี
                                </option>

                                <option value="5">
                                    ศุกร์
                                </option>

                            </select>

                        </div>


                        <div class="schedule-form-group">

                            <label for="schedule-edit-lesson">
                                คาบ
                            </label>

                            <select
                                id="schedule-edit-lesson"
                            >

                                <option value="">
                                    -- เลือกคาบ --
                                </option>

                                ${
                                    SCHEDULE_PERIODS
                                        .map(
                                            period => `
                                                <option
                                                    value="${period.lessonNo}"
                                                >
                                                    ${period.label}
                                                    —
                                                    ${period.start}
                                                    –
                                                    ${period.end}
                                                </option>
                                            `
                                        )
                                        .join("")
                                }

                            </select>

                        </div>

                    </div>


                    <!-- TIME -->

                    <div class="schedule-form-group">

                        <label>
                            🕐 เวลาเรียน
                        </label>

                        <div
                            id="schedule-edit-time-display"
                            style="
                                padding:10px 12px;
                                border-radius:8px;
                                background:#f8fafc;
                                border:1px solid #e2e8f0;
                                font-weight:600;
                            "
                        >
                            ${data.startTime || "-"}
                            –
                            ${data.endTime || "-"}
                        </div>

                    </div>


                    <!-- TEACHING ROOM -->

                    <div class="schedule-form-group">

                        <label for="schedule-edit-teaching-room">
                            🏫 ห้องสอน
                        </label>

                        <select
                            id="schedule-edit-teaching-room"
                        >

                            <option value="">
                                กำลังโหลดห้องสอน...
                            </option>

                        </select>

                    </div>


                    <!-- VALID DATE -->

                    <div class="schedule-form-row">


                        <div class="schedule-form-group">

                            <label for="schedule-edit-valid-from">
                                เริ่มใช้วันที่
                            </label>

                            <input
                                type="date"
                                id="schedule-edit-valid-from"
                                value="${data.validFrom || ""}"
                            >

                        </div>


                        <div class="schedule-form-group">

                            <label for="schedule-edit-valid-until">
                                สิ้นสุดวันที่
                            </label>

                            <input
                                type="date"
                                id="schedule-edit-valid-until"
                                value="${data.validUntil || ""}"
                            >

                            <small>
                                เว้นว่างได้ หากยังไม่กำหนดวันสิ้นสุด
                            </small>

                        </div>

                    </div>


                </div>


                <!-- =========================================
                     FOOTER
                     ========================================= -->

                <div class="schedule-modal-footer">


                    <button
                        type="button"
                        class="schedule-modal-cancel"
                        onclick="closeScheduleEditForm()"
                    >
                        ยกเลิก
                    </button>


                    <button
                        type="button"
                        class="schedule-modal-save"
                        onclick="saveScheduleEdit()"
                    >
                        💾 บันทึกการแก้ไข
                    </button>


                </div>

            </div>

        </div>

    `;


    // --------------------------------------------------------
    // 5. ใส่ Modal ลงหน้าเว็บ
    // --------------------------------------------------------

    document.body.appendChild(modal);


    // --------------------------------------------------------
    // 6. ตั้งค่า วัน / คาบ เดิม
    // --------------------------------------------------------

    const weekdaySelect =
        document.getElementById(
            "schedule-edit-weekday"
        );


    const lessonSelect =
        document.getElementById(
            "schedule-edit-lesson"
        );


    if (weekdaySelect) {

        weekdaySelect.value =
            String(data.weekday);

    }


    if (lessonSelect) {

        lessonSelect.value =
            String(data.lessonNo);

    }


    // --------------------------------------------------------
    // 7. โหลดห้องสอน
    // --------------------------------------------------------

    const teachingRoomSelect =
        document.getElementById(
            "schedule-edit-teaching-room"
        );


    if (teachingRoomSelect) {

        loadScheduleEditTeachingRooms(
            teachingRoomSelect,
            data.teachingRoomId
        );

    }


    // --------------------------------------------------------
    // 8. เปลี่ยนเวลาอัตโนมัติตามคาบ
    // --------------------------------------------------------

    if (lessonSelect) {

        lessonSelect.addEventListener(
            "change",
            function () {

                const lessonNo =
                    Number(this.value);


                const period =
                    SCHEDULE_PERIODS.find(
                        p =>
                            Number(p.lessonNo) ===
                            lessonNo
                    );


                const timeDisplay =
                    document.getElementById(
                        "schedule-edit-time-display"
                    );


                if (!timeDisplay) {
                    return;
                }


                if (!period) {

                    timeDisplay.textContent =
                        "-";

                    return;

                }


                timeDisplay.textContent =
                    `${period.start} – ${period.end}`;

            }
        );

    }

}

async function loadScheduleEditTeachingRooms(
    selectElement,
    selectedRoomId
) {

    if (!selectElement) {
        return;
    }

    try {

        const { data, error } =
            await supabaseClient

                .from("teaching_rooms")

                .select(`
                    id,
                    room_code,
                    room_name
                `)

                .order(
                    "room_code",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }

        selectElement.innerHTML = `

            <option value="">
                -- เลือกห้องสอน --
            </option>

        `;


        data.forEach(room => {

            const option =
                document.createElement("option");


            option.value =
                room.id;

            option.textContent =
                room.room_name ||
                room.room_code;


            if (
                room.id ===
                selectedRoomId
            ) {

                option.selected = true;

            }


            selectElement.appendChild(
                option
            );

        });

    } catch (error) {

        console.error(
            "Load Edit Teaching Rooms Error:",
            error
        );


        selectElement.innerHTML = `

            <option value="">
                ❌ โหลดห้องสอนไม่สำเร็จ
            </option>

        `;

    }

}

function closeScheduleEditForm() {

    const modal =
        document.getElementById(
            "schedule-edit-form-modal"
        );


    if (modal) {

        modal.remove();

    }

}

// ============================================================
// Close Edit Group Modal
// ============================================================

function closeScheduleEditGroup() {

    const modal =
        document.getElementById(
            "schedule-edit-modal"
        );

    if (modal) {
        modal.remove();
    }
}

// ============================================================
// DELETE CLASS FROM SCHEDULE GROUP
// ลบเฉพาะห้องเรียนที่เลือก
// ============================================================

async function deleteScheduleClassFromGroup(
    scheduleId,
    className
) {

    if (!scheduleId) {

        await Swal.fire(
            "ไม่พบข้อมูล",
            "ไม่พบรหัสตารางสอนที่ต้องการลบ",
            "error"
        );

        return;
    }
    const result =
        await Swal.fire({

            icon: "warning",

            title:
                `ต้องการลบ ${className} ออกจากคาบเรียน?`,

            html: `
                <div style="
                    text-align:center;
                    line-height:1.8;
                ">

                    การลบจะไม่กระทบ
                    ห้องเรียนอื่นในคาบนี้

                </div>
            `,

            showCancelButton: true,

            confirmButtonText:
                "🗑️ ลบตาราง",

            cancelButtonText:
                "ยกเลิก",

            reverseButtons: true

        });


    if (!result.isConfirmed) {
        return;
    }


    try {

        await deleteClassSchedule(
            scheduleId
        );


        await Swal.fire({

            icon: "success",

            title: "ลบสำเร็จ",

            text:
                `ลบ ${className} ออกจากคาบเรียนแล้ว`,

            confirmButtonText: "ตกลง"

        });


        closeScheduleEditGroup();


        await loadScheduleManage();


    } catch (error) {

        console.error(
            "Delete Schedule Class Error:",
            error
        );


        await Swal.fire({

            icon: "error",

            title: "ลบไม่สำเร็จ",

            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการลบตารางสอน",

            confirmButtonText: "ตกลง"

        });

    }

}

function renderScheduleTimetable(
    schedules,
    activitySchedules = []
) {

    const content = document.getElementById('schedule-content');

    if (!content) return;

    // ============================================================
    // LESSON TIMES
    // ============================================================

    const lessonTimes = {};

// ============================================================
// CLASS SCHEDULE → เวลาแต่ละคาบ
// ============================================================

schedules.forEach(schedule => {

    if (
        schedule.lessonNo &&
        !lessonTimes[schedule.lessonNo]
    ) {

        lessonTimes[schedule.lessonNo] = {
            lessonNo: schedule.lessonNo,
            startTime: schedule.startTime,
            endTime: schedule.endTime
        };

    }

});


// ============================================================
// ACTIVITY SCHEDULE → เติมคาบที่อาจไม่มีใน Class Schedule
// ============================================================

activitySchedules.forEach(activity => {

    if (
        activity.lessonNo &&
        !lessonTimes[activity.lessonNo]
    ) {

        lessonTimes[activity.lessonNo] = {
            lessonNo: activity.lessonNo,
            startTime: activity.startTime,
            endTime: activity.endTime
        };

    }

});

    const lessonNumbers = [1, 2, 3, 4, 6, 7, 8, 9];

if (!lessonTimes[9]) {
    lessonTimes[9] = {
        lessonNo: 9,
        startTime: "15:30",
        endTime: "16:00"
    };
}

const lessons = lessonNumbers
    .filter(no => lessonTimes[no])
    .map(no => lessonTimes[no]);


    // ============================================================
    // WEEKDAYS
    // ============================================================

    const weekdays = [
        { value: 1, label: "จันทร์" },
        { value: 2, label: "อังคาร" },
        { value: 3, label: "พุธ" },
        { value: 4, label: "พฤหัสบดี" },
        { value: 5, label: "ศุกร์" }
    ];
        // ============================================================
    // GROUP SCHEDULE CARDS
    // รวมหลายห้องเรียนที่เรียนวิชาเดียวกัน
    // กับครูและห้องสอนเดียวกัน ให้เป็น Card เดียว
    // ============================================================

    function groupScheduleCards(daySchedules) {

        const groups = new Map();

        daySchedules.forEach(schedule => {

            const key = [
                schedule.subjectCode || "",
                schedule.subjectName || "",
                schedule.teacherId || "",
                schedule.teachingRoom || "",
                schedule.scheduleGroupId || ""
            ].join("|");


            if (!groups.has(key)) {

                groups.set(key, {
                    ...schedule,
                    classNames: []
                });

            }


            const group = groups.get(key);

            if (
                schedule.className &&
                !group.classNames.includes(schedule.className)
            ) {

                group.classNames.push(schedule.className);

            }

        });


        return Array.from(groups.values());

    }

// ============================================================
// ACTIVITY CARDS
// แสดง Activity แยกจาก Class Schedule
// ห้ามแตะ Logic ของวิชาปกติ
// ============================================================

function renderActivityCards(dayActivities, lessonNo) {

    return dayActivities
        .filter(activity =>
            Number(activity.lessonNo) === Number(lessonNo) &&
            activity.activityTypeCode !== "FLAG" &&
            activity.activityTypeCode !== "HOMEROOM"
        )
        .map(activity => `
            <div
                class="schedule-card schedule-activity-card"
                data-activity-id="${activity.activityId}"
            >
                <div class="schedule-card-subject">
                    ${activity.activityTypeCode || "ACTIVITY"}
                </div>

                <div class="schedule-card-name">
                    ${activity.activityName || "-"}
                </div>

                <div class="schedule-card-class">
                    🎯 กิจกรรม
                </div>

                <div class="schedule-card-room">
                    🕐 ${activity.startTime?.slice(0, 5) || "-"}
                    –
                    ${activity.endTime?.slice(0, 5) || "-"}
                </div>
            </div>
        `)
        .join("");
}
    // ============================================================
// SCHEDULE MANAGE GROUP
// STEP 5B.9.3A
// แยกจาก groupScheduleCards()
// เพื่อเก็บ schedule.id ของแต่ละห้องอย่างปลอดภัย
// ============================================================

function groupScheduleManageRecords(daySchedules) {

    const groups = new Map();

    daySchedules.forEach(schedule => {

        const key = [
            schedule.subjectCode || "",
            schedule.subjectName || "",
            schedule.teacherId || "",
            schedule.teachingRoom || "",
            schedule.scheduleGroupId || ""
        ].join("|");


        if (!groups.has(key)) {

            groups.set(key, {

                subjectCode:
                    schedule.subjectCode || "",

                subjectName:
                    schedule.subjectName || "",

                teacherId:
                    schedule.teacherId || "",

                teacherName:
                    schedule.teacherName || "",

                weekday:
                    schedule.weekday,

                lessonNo:
                    schedule.lessonNo,

                startTime:
                    schedule.startTime,

                endTime:
                    schedule.endTime,

                teachingRoom:
                    schedule.teachingRoom || "",

                scheduleGroupId:
                    schedule.scheduleGroupId || null,

                classRecords: []

            });

        }


        const group =
            groups.get(key);


        // ----------------------------------------------------
        // เก็บ Record ของแต่ละห้องแบบจับคู่กับ schedule.id
        // ----------------------------------------------------

        if (
            schedule.id &&
            schedule.className
        ) {

            group.classRecords.push({

                scheduleId:
                    schedule.id,

                className:
                    schedule.className,

                validFrom:
                    schedule.validFrom,

                validUntil:
                    schedule.validUntil,

                subjectAssignmentId:
                    schedule.subjectAssignmentId || null

            });

        }

    });


    return Array.from(
        groups.values()
    );
}

    // ============================================================
    // TABLE HEADER
    // ============================================================

    let html = `
        <div class="schedule-timetable-wrapper">

            <table class="schedule-timetable">

                <thead>

                    <tr>

                        <th class="schedule-day-column">
                            วัน
                        </th>

                        <th class="schedule-flag-column">
                            🚩 หน้าเสาธง
                        <span>08:00–08:20</span>
                        </th>

                        <th class="schedule-special-column">
                            🏫 โฮมรูม
                            <span>08:20–08:30</span>
                        </th>
    `;


    // คาบ 1–4
    lessons.forEach(lesson => {

        if (lesson.lessonNo > 4) return;

        html += `
            <th class="schedule-lesson-column">

                <div>
                    คาบที่ ${lesson.lessonNo}
                </div>

                <span>
                    ${lesson.startTime.slice(0, 5)}
                    –
                    ${lesson.endTime.slice(0, 5)}
                </span>

            </th>
        `;

    });


    // พักเที่ยง — อยู่ตรงนี้
    html += `
        <th class="schedule-lunch-column">

            <div>🍽️ พักเที่ยง</div>

            <span>
                12:00–13:00
            </span>

        </th>
    `;


    // คาบ 6–8
    lessons.forEach(lesson => {

        if (lesson.lessonNo < 6) return;

        html += `
            <th class="schedule-lesson-column">

                <div>
                    คาบที่ ${lesson.lessonNo}
                </div>

                <span>
                    ${lesson.startTime.slice(0, 5)}
                    –
                    ${lesson.endTime.slice(0, 5)}
                </span>

            </th>
        `;

    });


    // กิจกรรม
    html += `

                    </tr>

                </thead>

                <tbody>
    `;


    // ============================================================
    // ROWS — วันเรียงลงด้านล่าง
    // ============================================================

    weekdays.forEach(day => {

        const dayActivities =
    activitySchedules.filter(
        activity =>
            activity.weekday === day.value
    );

        html += `
            <tr>

                <th class="schedule-day-cell">
                    ${day.label}
                </th>

                <!-- FLAG -->
<td class="schedule-special-cell">
    ${
        dayActivities
            .filter(activity =>
                activity.activityTypeCode === "FLAG"
            )
            .map(activity => `
                <div class="schedule-mini-activity">
                    🚩 ${activity.activityName}
                </div>
            `)
            .join("") || "—"
    }
</td>

                <!-- HOMEROOM -->

<td class="schedule-special-cell">

    ${
        dayActivities
            .filter(activity =>
                activity.activityTypeCode === "HOMEROOM"
            )
            .map(activity => `

                <div class="schedule-mini-activity">
                    🏫 ${activity.activityName}
                </div>

            `)
            .join("") || "—"
    }

</td>
        `;


        // ========================================================
        // LESSON 1–4
        // ========================================================

        lessons.forEach(lesson => {

            if (lesson.lessonNo > 4) return;

            const daySchedules = schedules.filter(schedule =>
                schedule.weekday === day.value &&
                schedule.lessonNo === lesson.lessonNo
            );

            html += `
                <td class="schedule-slot">
            `;

            const groupedSchedules = groupScheduleCards(daySchedules);
            const activityCards =
    renderActivityCards(
        dayActivities,
        lesson.lessonNo
    );

if (
    groupedSchedules.length === 0 &&
    !activityCards
) {

    html += `
        <div class="schedule-slot-empty">
            —
        </div>
    `;

} else {

    groupedSchedules.forEach(schedule => {

        html += `
            <div class="schedule-card">

                <div class="schedule-card-subject">
                    ${schedule.subjectCode}
                </div>

                <div class="schedule-card-name">
                    ${schedule.subjectName}
                </div>

                <div class="schedule-card-class">
                    👨‍🎓 ${schedule.classNames.join(", ")}
                </div>

                <div class="schedule-card-room">
                    🏫 ห้องสอน ${schedule.teachingRoom}
                </div>

                <div class="schedule-card-teacher">
                    👤 ${schedule.teacherName}
                </div>

            </div>
        `;

    });
html += activityCards;
}
});
        // ========================================================
        // LUNCH
        // ========================================================

        html += `
            <td class="schedule-lunch-cell">

                <div class="schedule-mini-activity">
                    🍽️ พักเที่ยง
                </div>

            </td>
        `;


        // ========================================================
        // LESSON 6–8
        // ========================================================

        lessons.forEach(lesson => {

            if (lesson.lessonNo < 6) return;

            const daySchedules = schedules.filter(schedule =>
                schedule.weekday === day.value &&
                schedule.lessonNo === lesson.lessonNo
            );

            html += `
                <td class="schedule-slot">
            `;

            const groupedSchedules = groupScheduleCards(daySchedules);
            const activityCards =
    renderActivityCards(
        dayActivities,
        lesson.lessonNo
    );

if (
    groupedSchedules.length === 0 &&
    !activityCards
) {

    html += `
        <div class="schedule-slot-empty">
            —
        </div>
    `;

} else {

    groupedSchedules.forEach(schedule => {

        html += `
            <div class="schedule-card">

                <div class="schedule-card-subject">
                    ${schedule.subjectCode}
                </div>

                <div class="schedule-card-name">
                    ${schedule.subjectName}
                </div>

                <div class="schedule-card-class">
                    👨‍🎓 ${schedule.classNames.join(", ")}
                </div>

                <div class="schedule-card-room">
                    🏫 ห้องสอน ${schedule.teachingRoom}
                </div>

                <div class="schedule-card-teacher">
                    👤 ${schedule.teacherName}
                </div>

            </div>
        `;

    });
html += activityCards;
}


        // ========================================================
        // END-OF-DAY ACTIVITY
        // ========================================================

        html += `
`;

    });
});

    html += `
                </tbody>

            </table>

        </div>
    `;

    content.innerHTML = html;
}

// ============================================================
// SCHEDULE PERIOD DEFINITIONS
// STEP 5B.8.6
// ============================================================

const SCHEDULE_PERIODS = [
    {
        lessonNo: 1,
        label: "คาบที่ 1",
        start: "08:30",
        end: "09:20"
    },
    {
        lessonNo: 2,
        label: "คาบที่ 2",
        start: "09:20",
        end: "10:10"
    },
    {
        lessonNo: 3,
        label: "คาบที่ 3",
        start: "10:20",
        end: "11:10"
    },
    {
        lessonNo: 4,
        label: "คาบที่ 4",
        start: "11:10",
        end: "12:00"
    },
    {
        lessonNo: 6,
        label: "คาบที่ 6",
        start: "13:00",
        end: "13:50"
    },
    {
        lessonNo: 7,
        label: "คาบที่ 7",
        start: "13:50",
        end: "14:40"
    },
    {
        lessonNo: 8,
        label: "คาบที่ 8",
        start: "14:40",
        end: "15:30"
    },
    {
        lessonNo: 9,
        label: "คาบที่ 9",
        start: "15:30",
        end: "16:00"
    }
];

async function saveActivityScheduleCreate() {

    const activityId =
        document.getElementById(
            "activity-schedule-activity"
        )?.value;

    const weekday =
        document.getElementById(
            "activity-schedule-day"
        )?.value;

    const lessonValue =
        document.getElementById(
            "activity-schedule-lesson"
        )?.value;

    const startTime =
        document.getElementById(
            "activity-schedule-start-time"
        )?.value;

    const endTime =
        document.getElementById(
            "activity-schedule-end-time"
        )?.value;

    const validFrom =
        document.getElementById(
            "activity-schedule-valid-from"
        )?.value;

    const validUntil =
        document.getElementById(
            "activity-schedule-valid-until"
        )?.value;


    // ========================================================
    // VALIDATION
    // ========================================================

    if (!activityId) {

        await Swal.fire({
            icon: "warning",
            title: "กรุณาเลือกกิจกรรม",
            confirmButtonText: "ตกลง"
        });

        return;
    }

    if (!weekday) {

        await Swal.fire({
            icon: "warning",
            title: "กรุณาเลือกวัน",
            confirmButtonText: "ตกลง"
        });

        return;
    }

    if (!validFrom) {

        await Swal.fire({
            icon: "warning",
            title: "กรุณาระบุวันที่เริ่มใช้",
            confirmButtonText: "ตกลง"
        });

        return;
    }

    let semesterRangeText = "";

    try {

        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้เพิ่มตารางกิจกรรม"
            );
        }

        const formatDate = value => {
            if (!value) return "-";
            const [year, month, day] = value.split("-");
            return `${day}/${month}/${year}`;
        };

        semesterRangeText =
            `ช่วงวันที่ของภาคเรียน: ` +
            `${formatDate(semester.start_date)} ถึง ` +
            `${formatDate(semester.end_date)} (ค.ศ.)`;

        if (
            validFrom < semester.start_date ||
            validFrom > semester.end_date
        ) {
            throw new Error(
                `วันที่เริ่มใช้ ${formatDate(validFrom)} ` +
                `อยู่นอกช่วงภาคเรียน\n` +
                `${semesterRangeText}\n` +
                "กรุณาตรวจสอบวันที่และปี ค.ศ. อีกครั้ง"
            );
        }

        if (validUntil && validUntil < validFrom) {
            throw new Error(
                "วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มใช้ " +
                "กรุณาตรวจสอบวันที่อีกครั้ง"
            );
        }

        if (
            validUntil &&
            validUntil > semester.end_date
        ) {
            throw new Error(
                `วันที่สิ้นสุด ${formatDate(validUntil)} ` +
                `อยู่นอกช่วงภาคเรียน\n` +
                `${semesterRangeText}\n` +
                "กรุณาตรวจสอบวันที่และปี ค.ศ. อีกครั้ง"
            );
        }

        await createActivitySchedule({

            activityId:
                activityId,

            weekday:
                Number(weekday),

            lessonNo:
                lessonValue
                    ? Number(lessonValue)
                    : null,

            startTime:
                startTime || null,

            endTime:
                endTime || null,

            validFrom:
                validFrom,

            validUntil:
                validUntil || null
        });


        await Swal.fire({
            icon: "success",
            title: "เพิ่มตารางกิจกรรมสำเร็จ",
            confirmButtonText: "ตกลง"
        });

        // B57-01 — Switch to the correct tab after saving
        closeActivityScheduleCreate();

        switchScheduleTab("timetable");

    } catch (error) {

        console.error(
            "Activity Schedule Create Error:",
            error
        );

        const rawMessage = String(error?.message || "");
        let message = rawMessage ||
            "เกิดข้อผิดพลาดในการบันทึก";

        if (rawMessage.includes("ACTIVITY_SCHEDULE_OVERLAP")) {
            message =
                "กิจกรรมนี้มีตารางในวันและช่วงเวลา " +
                "หรือหมายเลขคาบดังกล่าวอยู่แล้ว\n" +
                "กรุณาตรวจสอบตารางเดิมก่อนเพิ่มรายการใหม่";

        } else if (
            rawMessage.includes("ACTIVITY_START_OUTSIDE_SEMESTER")
        ) {
            message =
                "วันที่เริ่มใช้อยู่นอกช่วงภาคเรียน\n" +
                semesterRangeText + "\n" +
                "กรุณาตรวจสอบวันที่และปี ค.ศ. อีกครั้ง";

        } else if (
            rawMessage.includes("ACTIVITY_END_OUTSIDE_SEMESTER")
        ) {
            message =
                "วันที่สิ้นสุดไม่ถูกต้องหรืออยู่นอกช่วงภาคเรียน\n" +
                semesterRangeText + "\n" +
                "กรุณาตรวจสอบวันที่และปี ค.ศ. อีกครั้ง";

        } else if (
            rawMessage.includes(
                "ACTIVITY_SCHEDULE_INVALID_TIME_OR_DATE"
            )
        ) {
            message =
                "ข้อมูลวันหรือเวลาไม่ถูกต้อง\n" +
                "กรุณาตรวจสอบวัน เวลาเริ่มต้น " +
                "และเวลาสิ้นสุดอีกครั้ง";
        }

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเพิ่มตารางกิจกรรมได้",
            text: message,
            confirmButtonText: "ตกลง"
        });
    }

}
async function openActivityScheduleCreate() {

    const oldModal =
        document.getElementById(
            "activity-schedule-create-modal"
        );

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id =
        "activity-schedule-create-modal";

    modal.innerHTML = `
        <div class="schedule-modal-backdrop">

            <div class="schedule-modal">

                <div class="schedule-modal-header">

                    <div>
                        <h2>＋ เพิ่มตารางกิจกรรม</h2>

                        <p>
                            กำหนดกิจกรรม วัน และคาบ
                        </p>
                    </div>

                    <button
                        type="button"
                        class="schedule-modal-close"
                        onclick="
                            closeActivityScheduleCreate()
                        "
                    >
                        ✕
                    </button>

                </div>


                <div class="schedule-modal-body">

                    <!-- Activity -->

                    <div class="schedule-form-group">

                        <label for="activity-schedule-activity">
                            กิจกรรม
                        </label>

<select
    id="activity-schedule-activity"
>
    <option value="">
        -- เลือกกิจกรรม --
    </option>
</select>

<div style="
    display:flex;
    justify-content:flex-end;
    margin-top:10px;
">
    <button
        type="button"
        class="schedule-add-btn"
        onclick="openTeacherActivityCreateForm()"
    >
        ＋ เพิ่ม/จัดการชุมนุม
    </button>
</div>

</div>

                    <!-- Day / Lesson -->

                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                1fr 1fr;
                            gap:14px;
                        "
                    >

                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-day
                                "
                            >
                                วัน
                            </label>

                            <select
                                id="activity-schedule-day"
                            >

                                <option value="1">
                                    จันทร์
                                </option>

                                <option value="2">
                                    อังคาร
                                </option>

                                <option value="3">
                                    พุธ
                                </option>

                                <option value="4">
                                    พฤหัสบดี
                                </option>

                                <option value="5">
                                    ศุกร์
                                </option>

                            </select>

                        </div>


                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-lesson
                                "
                            >
                                คาบ
                            </label>

                            <select
                                id="activity-schedule-lesson"
                            >

                                <option value="">
                                    ไม่ระบุคาบ
                                </option>

                                ${SCHEDULE_PERIODS.map(
                                    period => `
                                        <option
                                            value="
                                                ${period.lessonNo}
                                            "
                                        >
                                            ${period.label}
                                        </option>
                                    `
                                ).join("")}

                            </select>

                        </div>

                    </div>


                    <!-- Time -->

                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                1fr 1fr;
                            gap:14px;
                        "
                    >

                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-start-time
                                "
                            >
                                เวลาเริ่ม
                            </label>

                            <input
                                type="time"
                                id="activity-schedule-start-time"
                            >

                        </div>


                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-end-time
                                "
                            >
                                เวลาสิ้นสุด
                            </label>

                            <input
                                type="time"
                                id="activity-schedule-end-time"
                            >

                        </div>

                    </div>


                    <!-- Validity -->

                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                1fr 1fr;
                            gap:14px;
                        "
                    >

                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-valid-from
                                "
                            >
                                เริ่มใช้วันที่ (ค.ศ.)
                            </label>

                            <input
                                type="date"
                                id="activity-schedule-valid-from"
                            >

                        </div>


                        <div class="schedule-form-group">

                            <label
                                for="
                                    activity-schedule-valid-until
                                "
                            >
                                สิ้นสุดวันที่ (ค.ศ.)
                            </label>

                            <input
                                type="date"
                                id="activity-schedule-valid-until"
                            >

                        </div>

                    </div>

                </div>


                <div class="schedule-modal-footer">

                    <button
                        type="button"
                        class="schedule-modal-cancel"
                        onclick="
                            closeActivityScheduleCreate()
                        "
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        class="schedule-modal-save"
                        onclick="saveActivityScheduleCreate()"
                    >
                        💾 บันทึก
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    // B53 — Load Activity options ตามภาคเรียนและครู
    try {

        const activeSemester =
            await getScheduleManageActiveSemester();

        if (!activeSemester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้เพิ่มตารางกิจกรรม"
            );
        }

        const role =
            await getCurrentUserRole();

        let selectedTeacherId = "";

        if (role === "Teacher") {

            const context =
                await getCurrentTeacherContext();

            if (!context?.teacherId) {
                throw new Error(
                    "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
                );
            }

            selectedTeacherId = context.teacherId;

        } else if (role === "Admin") {

            selectedTeacherId =
                window.activityManageTeacherFilterId || "";

        } else {

            throw new Error(
                "ไม่มีสิทธิ์เพิ่มตารางกิจกรรม"
            );
        }

        const allActivities =
            await getActivitiesForScheduleCreate();

        const activities = (allActivities || [])
            .filter(activity =>
                activity.semesterId === activeSemester.id
            )
            .filter(activity =>
                !selectedTeacherId ||
                (
                    Array.isArray(activity.teacherIds) &&
                    activity.teacherIds.includes(
                        selectedTeacherId
                    )
                )
            );

        const select =
            document.getElementById(
                "activity-schedule-activity"
            );

        if (!select) return;

        select.replaceChildren();

        const placeholder =
            document.createElement("option");

        placeholder.value = "";
        placeholder.textContent =
            "-- เลือกกิจกรรม --";

        select.appendChild(placeholder);

        activities.forEach(activity => {

            const option =
                document.createElement("option");

            option.value = activity.activityId;

const activityName =
    String(activity.activityName || "").trim();

const typeName =
    String(activity.activityTypeName || "").trim();

option.textContent =
    !activityName
        ? (typeName || "ไม่ระบุชื่อกิจกรรม")
        : (
            !typeName || activityName === typeName
                ? activityName
                : `${activityName} — ${typeName}`
        );

            select.appendChild(option);
        });

        if (activities.length === 0) {

            placeholder.textContent =
                "-- ไม่มีกิจกรรมที่เลือกได้ --";

            select.disabled = true;
        }

    } catch (error) {

        console.error(
            "Activity Schedule Create Load Error:",
            error
        );

        const select =
            document.getElementById(
                "activity-schedule-activity"
            );

        if (select) {
            select.replaceChildren();

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "ไม่สามารถโหลดกิจกรรมได้";

            select.appendChild(option);
            select.disabled = true;
        }

        await Swal.fire(
            "ไม่สามารถโหลดกิจกรรม",
            error?.message || "กรุณาลองใหม่อีกครั้ง",
            "error"
        );
    }

}
const lessonSelect =
    document.getElementById(
        "activity-schedule-lesson"
    );

const startTimeInput =
    document.getElementById(
        "activity-schedule-start-time"
    );

const endTimeInput =
    document.getElementById(
        "activity-schedule-end-time"
    );

if (
    lessonSelect &&
    startTimeInput &&
    endTimeInput
) {

    lessonSelect.addEventListener(
        "change",
        () => {

            const lessonNo =
                Number(lessonSelect.value);

            const period =
                SCHEDULE_PERIODS.find(
                    item =>
                        item.lessonNo === lessonNo
                );

            if (!period) {

                startTimeInput.value = "";
                endTimeInput.value = "";

                return;
            }

            startTimeInput.value =
                period.start;

            endTimeInput.value =
                period.end;
        }
    );
}

async function openTeacherActivityCreateForm() {
    try {
        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้จัดการชุมนุม"
            );
        }

        const role = await getCurrentUserRole();
        let teacherId = null;

        if (role === "Teacher") {
            const context =
                await getCurrentTeacherContext();

            teacherId = context?.teacherId || null;

        } else if (role === "Admin") {
            teacherId =
                window.activityManageTeacherFilterId || null;

            if (!teacherId) {
                await Swal.fire(
                    "กรุณาเลือกครู",
                    "เลือกครูในตัวกรองกิจกรรมก่อน",
                    "info"
                );
                return;
            }
        } else {
            throw new Error("ไม่มีสิทธิ์จัดการชุมนุม");
        }

        if (!teacherId) {
            throw new Error("ไม่พบข้อมูลครู");
        }

        const types = await getActiveActivityTypes();
        const clubType = types.find(
            type => type.code === "CLUB"
        );

        if (!clubType) {
            throw new Error(
                "ไม่พบประเภทกิจกรรม CLUB"
            );
        }

        const activities =
            await getActivitiesForScheduleCreate();

        const clubs = (activities || []).filter(
            activity =>
                activity.semesterId === semester.id &&
                activity.activityTypeCode === "CLUB" &&
                Array.isArray(activity.teacherIds) &&
                activity.teacherIds.includes(teacherId)
        );

        if (clubs.length > 1) {
            throw new Error(
                "ครูมีชุมนุมมากกว่าหนึ่งรายการ " +
                "กรุณาให้ Admin ตรวจสอบ"
            );
        }

        const existingClub = clubs[0] || null;

        const oldName =
            (existingClub?.activityName || "").trim();

        const unnamed =
            !oldName || oldName === "ชุมนุม";

        // ------------------------------------------
        // กรณีมีชุมนุมแล้ว
        // ------------------------------------------
        if (existingClub) {
            const result = await Swal.fire({
                title: unnamed
                    ? "กำหนดชื่อชุมนุม"
                    : "เปลี่ยนชื่อชุมนุม",

                text: unnamed
                    ? "มีชุมนุมเดิมอยู่แล้ว กรุณาตั้งชื่อเมื่อพร้อม"
                    : `ชื่อปัจจุบัน: ${oldName}`,

                input: "text",
                inputValue: unnamed ? "" : oldName,
                inputPlaceholder: "ชื่อชุมนุม",
                inputAttributes: {
                    maxlength: "30"
                },

                showCancelButton: true,
                confirmButtonText: "บันทึกชื่อ",
                cancelButtonText: "ยกเลิก",

                inputValidator: value => {
                    const name = String(value || "").trim();

                    if (!name) {
                        return "กรุณากรอกชื่อชุมนุม";
                    }

                    if (name.length > 30) {
                        return "ชื่อชุมนุมต้องไม่เกิน 30 ตัวอักษร";
                    }
                }
            });

            if (!result.isConfirmed) return;

            const newName = result.value.trim();

            if (newName === oldName) {
                await Swal.fire(
                    "ไม่มีการเปลี่ยนแปลง",
                    "ชื่อชุมนุมยังเหมือนเดิม",
                    "info"
                );
                return;
            }

            const confirmation = await Swal.fire({
                icon: "question",
                title: unnamed
                    ? "ยืนยันการกำหนดชื่อชุมนุม?"
                    : "ยืนยันการเปลี่ยนชุมนุม?",
                text: unnamed
                    ? `กำหนดชื่อเป็น "${newName}" โดยใช้ชุมนุมเดิม`
                    : `เปลี่ยนจาก "${oldName}" เป็น "${newName}" โดยคงสมาชิกและคาบเดิม`,
                showCancelButton: true,
                confirmButtonText: "ยืนยันบันทึก",
                cancelButtonText: "ยกเลิก"
            });

            if (!confirmation.isConfirmed) return;

            const reason = unnamed
                ? "กำหนดชื่อชุมนุมครั้งแรก"
                : "เปลี่ยนชุมนุมกลางภาคเรียน";

            const { error } = await supabaseClient.rpc(
                "teacher_change_club_name",
                {
                    p_activity_id: existingClub.activityId,
                    p_new_name: newName,
                    p_reason: reason
                }
            );

            if (error) throw error;

            await Swal.fire({
                icon: "success",
                title: "บันทึกชื่อชุมนุมสำเร็จ",
                text: "ใช้ชุมนุมเดิม คาบและสมาชิกไม่เปลี่ยน"
            });

            await openActivityScheduleCreate();
            await loadActivityScheduleManage();
            return;
        }

        // ------------------------------------------
        // กรณียังไม่มีชุมนุม
        // ------------------------------------------
        const result = await Swal.fire({
            title: "＋ เพิ่มชุมนุมใหม่",
            text: "เว้นชื่อว่างไว้ก่อนได้ และกลับมาตั้งชื่อภายหลัง",
            input: "text",
            inputPlaceholder: "ชื่อชุมนุม (ไม่บังคับ)",
            inputAttributes: {
                maxlength: "30"
            },
            showCancelButton: true,
            confirmButtonText: "สร้างชุมนุม",
            cancelButtonText: "ยกเลิก",
            inputValidator: value => {
                if (String(value || "").trim().length > 30) {
                    return "ชื่อชุมนุมต้องไม่เกิน 30 ตัวอักษร";
                }
            }
        });

        if (!result.isConfirmed) return;

        const clubName = String(result.value || "").trim();

        const confirmation = await Swal.fire({
            icon: "question",
            title: "ยืนยันสร้างชุมนุม?",
            text: clubName
                ? `ชื่อชุมนุม: ${clubName}`
                : "สร้างชุมนุมโดยยังไม่กำหนดชื่อ",
            showCancelButton: true,
            confirmButtonText: "ยืนยันบันทึก",
            cancelButtonText: "ยกเลิก"
        });

        if (!confirmation.isConfirmed) return;

        const activityId = await createTeacherActivity({
            activityTypeId: clubType.id,
            activityName: clubName,
            teacherId: role === "Admin" ? teacherId : null
        });

        await Swal.fire({
            icon: "success",
            title: "สร้างชุมนุมสำเร็จ",
            text: "สามารถเลือกชุมนุมเพื่อเพิ่มคาบได้แล้ว"
        });

        await openActivityScheduleCreate();

        const activitySelect =
            document.getElementById(
                "activity-schedule-activity"
            );

        if (activitySelect) {
            activitySelect.value = activityId;
        }

        await loadActivityScheduleManage();

    } catch (error) {
        console.error(
            "Club Management Error:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถจัดการชุมนุม",
            text: error?.message ||
                "เกิดข้อผิดพลาด"
        });
    }
}

function closeActivityScheduleCreate() {

    const modal =
        document.getElementById(
            "activity-schedule-create-modal"
        );

    if (modal) {
        modal.remove();
    }
}
// ============================================================
// B57-03 — Teacher Subject Permissions
// อ่านรายวิชาที่ Admin มอบหมายให้ครู
// READ ONLY — ไม่เปลี่ยนข้อมูล Supabase
// ============================================================

async function getTeacherAssignedSubjects() {
    const role = await getCurrentUserRole();

    if (role !== "Teacher") {
        throw new Error(
            "ฟังก์ชันนี้ใช้สำหรับบัญชีครูผู้สอนเท่านั้น"
        );
    }

    const semester = await getScheduleManageActiveSemester();

    if (!semester || !semester.id) {
        throw new Error(
            "ไม่พบภาคเรียนที่เปิดให้จัดการตารางสอน"
        );
    }

    const context = await getCurrentTeacherContext();
    const teacherId = context?.teacherId || null;

    if (!teacherId) {
        throw new Error(
            "ไม่พบข้อมูลครูของบัญชีที่เข้าสู่ระบบ"
        );
    }

    // อ่านสิทธิ์สอนของครูในภาคเรียนปัจจุบัน
    // แบ่งการอ่านเป็นชุดเพื่อไม่ให้ขาดรายการ
    const permissions = [];
    const pageSize = 500;
    let offset = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from("teacher_subject_permissions")
            .select("id, teacher_id, subject_id, semester_id")
            .eq("teacher_id", teacherId)
            .eq("semester_id", semester.id)
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (error) {
            throw error;
        }

        const page = data || [];
        permissions.push(...page);

        if (page.length < pageSize) {
            break;
        }

        offset += pageSize;
    }

    if (permissions.length === 0) {
        return [];
    }

    // ใช้ทะเบียนรายวิชากลางเดิม
    // ไม่สร้างรายวิชาใหม่
    const subjects = await getSubjects();

    const subjectMap = new Map(
        (subjects || []).map(subject => [
            subject.id,
            subject
        ])
    );

    const assignedSubjects = permissions
        .map(permission => {
            const subject = subjectMap.get(
                permission.subject_id
            );

            if (!subject || subject.deleted_at != null) {
                return null;
            }

            return {
                permissionId: permission.id,
                subjectId: permission.subject_id,
                subjectCode: subject.subject_code,
                subjectName: subject.subject_name,
                credit: subject.credit,
                semesterId: permission.semester_id
            };
        })
        .filter(Boolean);

    assignedSubjects.sort((a, b) =>
        String(a.subjectCode).localeCompare(
            String(b.subjectCode),
            "th"
        )
    );

    return assignedSubjects;
}
// ============================================================
// B57-03 — Check Existing Teacher Assignment
// ตรวจสอบวิชาและกลุ่มนักเรียนที่มีอยู่แล้ว
// READ ONLY — ไม่เปลี่ยนข้อมูลจริง
// ============================================================

async function checkTeacherAssignmentFromPermission(
    permissionId,
    roomId
) {
    if (!permissionId || !roomId) {
        throw new Error(
            "กรุณาเลือกรายวิชาและกลุ่มนักเรียนให้ครบ"
        );
    }

    const role = await getCurrentUserRole();

    if (role !== "Teacher") {
        throw new Error(
            "เฉพาะบัญชีครูผู้สอนเท่านั้น"
        );
    }

    const semester =
        await getScheduleManageActiveSemester();

    if (!semester) {
        throw new Error(
            "ไม่มีภาคเรียนที่เปิดให้จัดการ"
        );
    }

    const context =
        await getCurrentTeacherContext();

    const teacherId = context?.teacherId;

    if (!teacherId) {
        throw new Error(
            "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
        );
    }

    // ตรวจว่าครูมีสิทธิ์ในรายวิชานี้จริง
    const { data: permission, error: permissionError } =
        await supabaseClient
            .from("teacher_subject_permissions")
            .select("id, teacher_id, subject_id, semester_id")
            .eq("id", permissionId)
            .eq("teacher_id", teacherId)
            .eq("semester_id", semester.id)
            .maybeSingle();

    if (permissionError) {
        throw permissionError;
    }

    if (!permission) {
        throw new Error(
            "ไม่พบสิทธิ์สอนรายวิชานี้ กรุณาติดต่อ Admin"
        );
    }

    // ตรวจว่าห้องเรียนเป็นของปีการศึกษาปัจจุบัน
    const { data: room, error: roomError } =
        await supabaseClient
            .from("rooms")
            .select("id")
            .eq("id", roomId)
            .eq("academic_year_id", semester.academic_year_id)
            .is("deleted_at", null)
            .maybeSingle();

    if (roomError) {
        throw roomError;
    }

    if (!room) {
        throw new Error(
            "กลุ่มนักเรียนนี้ไม่อยู่ในปีการศึกษาปัจจุบัน"
        );
    }

    // ตรวจ Assignment เดิมโดยไม่แก้ไขข้อมูล
    const { data: existingAssignment, error: assignmentError } =
        await supabaseClient
            .from("subject_assignments")
            .select("id")
            .eq("teacher_id", teacherId)
            .eq("subject_id", permission.subject_id)
            .eq("room_id", roomId)
            .eq("semester_id", semester.id)
            .eq("academic_year_id", semester.academic_year_id)
            .maybeSingle();

    if (assignmentError) {
        throw assignmentError;
    }

    return {
        exists: !!existingAssignment,
        assignmentId: existingAssignment?.id || null,
        permissionId: permission.id,
        roomId: room.id
    };
}
// ============================================================
// B57-03 — Teacher Assignment From Permission
// ใช้ RPC ที่ตรวจสิทธิ์ฝั่งฐานข้อมูล
// ยังไม่เชื่อมปุ่มบันทึกจริง
// ============================================================

async function createTeacherAssignmentFromPermission(
    permissionId,
    roomId
) {
    // 1. ตรวจข้อมูลเบื้องต้น
    if (
        typeof permissionId !== "string" ||
        !permissionId.trim() ||
        typeof roomId !== "string" ||
        !roomId.trim()
    ) {
        throw new Error(
            "กรุณาเลือกรายวิชาและกลุ่มนักเรียนให้ครบ"
        );
    }

    // 2. ตรวจบทบาทผู้ใช้งาน
    const role = await getCurrentUserRole();

    if (role !== "Teacher") {
        throw new Error(
            "เฉพาะบัญชีครูผู้สอนเท่านั้นที่ใช้ขั้นตอนนี้ได้"
        );
    }

    // 3. ส่งคำขอให้ฐานข้อมูลตรวจสอบและสร้าง Assignment
    // RPC เป็นผู้ตรวจเจ้าของสิทธิ์ วิชา ห้อง และภาคเรียน
    const { data: assignmentId, error } =
        await supabaseClient.rpc(
            "teacher_create_assignment_from_permission",
            {
                p_permission_id: permissionId.trim(),
                p_room_id: roomId.trim()
            }
        );

    if (error) {
        throw error;
    }

    // 4. ตรวจผลตอบกลับ
    if (
        typeof assignmentId !== "string" ||
        !assignmentId
    ) {
        throw new Error(
            "ไม่สามารถยืนยันรหัส Assignment ที่ได้รับ"
        );
    }

    return assignmentId;
}
// ============================================================
// B57-03 — Open Schedule After Teacher Assignment
// เปิดหน้าจัดตารางสอนเดิมและเลือกรายการที่สร้างแล้ว
// ยังไม่เชื่อมปุ่มบันทึกจริง
// ============================================================

async function openScheduleForTeacherAssignment(assignmentId) {
    // 1. ตรวจสอบรหัส Assignment
    if (
        typeof assignmentId !== "string" ||
        !assignmentId.trim()
    ) {
        throw new Error(
            "ไม่พบรหัส Assignment สำหรับเปิดตารางสอน"
        );
    }

    // 2. เปิดฟอร์มเพิ่มตารางสอนเดิม
    await openScheduleCreate();

    // 3. ค้นหาช่องเลือกรายวิชา / ห้องเรียน
    const assignmentSelect = document.getElementById(
        "schedule-assignment"
    );

    if (!assignmentSelect) {
        throw new Error(
            "ไม่พบช่องเลือกรายวิชาในหน้าต่างเพิ่มตารางสอน"
        );
    }

    // 4. ตรวจว่ารายการที่ต้องการมีอยู่ในตัวเลือก
    const assignmentOption = Array.from(
        assignmentSelect.options
    ).find(option => option.value === assignmentId.trim());

    if (!assignmentOption) {
        throw new Error(
            "เปิดหน้าต่างเพิ่มตารางสอนแล้ว " +
            "แต่ยังไม่พบวิชาและกลุ่มนักเรียนที่เลือก " +
            "กรุณาปิดหน้าต่างและเปิดใหม่อีกครั้ง"
        );
    }

    // 5. เลือก Assignment ที่ได้รับ
    assignmentSelect.value = assignmentId.trim();

    // แจ้งส่วนอื่นของฟอร์มว่ามีการเลือกค่า
    assignmentSelect.dispatchEvent(
        new Event("change", { bubbles: true })
    );

    // 6. เลื่อนโฟกัสไปยังช่องที่เลือก
    assignmentSelect.focus();

    return true;
}
// ============================================================
// B57-03 — Teacher Assigned Subject Selection
// เลือกรายวิชาจากสิทธิ์ที่ Admin มอบหมาย
// Preview Only — ยังไม่บันทึกฐานข้อมูล
// ============================================================

async function openTeacherAssignedSubjectPreview() {
    try {
        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้จัดการตารางสอน"
            );
        }

        const assignedSubjects =
            await getTeacherAssignedSubjects();

        if (assignedSubjects.length === 0) {
            await Swal.fire({
                icon: "info",
                title: "ยังไม่มีรายวิชาที่ได้รับมอบหมาย",
                text:
                    "กรุณาติดต่อ Admin " +
                    "เพื่อมอบหมายรายวิชาในภาคเรียนนี้",
                confirmButtonText: "ตกลง"
            });

            return;
        }

        // อ่านห้องเรียนจากปีการศึกษาที่เปิดใช้งาน
        const { data: rooms, error: roomError } =
            await supabaseClient
                .from("rooms")
                .select("id, room_name")
                .eq(
                    "academic_year_id",
                    semester.academic_year_id
                )
                .is("deleted_at", null)
                .order("room_name", {
                    ascending: true
                });

        if (roomError) {
            throw roomError;
        }

        if (!rooms || rooms.length === 0) {
            throw new Error(
                "ไม่พบห้องเรียนในปีการศึกษาปัจจุบัน"
            );
        }

        const result = await Swal.fire({
            title: "📚 เลือกรายวิชาที่ได้รับมอบหมาย",
            width: 580,

            html: `
                <div style="
                    text-align:left;
                    display:grid;
                    gap:16px;
                ">

                    <div style="
                        padding:12px 14px;
                        border:1px solid #dbeafe;
                        border-radius:10px;
                        background:#eff6ff;
                        color:#1d4ed8;
                        font-size:14px;
                    ">
                        แสดงเฉพาะรายวิชาที่ Admin
                        มอบหมายให้คุณในภาคเรียนนี้
                    </div>

                    <div>
                        <label
                            for="teacher-permission-subject"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            รายวิชาที่ได้รับมอบหมาย
                        </label>

                        <select
                            id="teacher-permission-subject"
                            style="
                                width:100%;
                                min-width:0;
                                padding:11px 12px;
                                border:1px solid #cbd5e1;
                                border-radius:10px;
                                font-family:inherit;
                            "
                        ></select>
                    </div>

                    <div>
                        <label
                            for="teacher-permission-room"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            กลุ่มนักเรียน / ชั้นเรียน
                        </label>

                        <select
                            id="teacher-permission-room"
                            style="
                                width:100%;
                                min-width:0;
                                padding:11px 12px;
                                border:1px solid #cbd5e1;
                                border-radius:10px;
                                font-family:inherit;
                            "
                        ></select>
                    </div>

                    <div
                        id="teacher-permission-subject-info"
                        style="
                            padding:12px;
                            border-radius:10px;
                            background:#f8fafc;
                            color:#475569;
                            font-size:14px;
                            line-height:1.7;
                        "
                    ></div>

                    <p style="
                        margin:0;
                        font-size:13px;
                        color:#64748b;
                        line-height:1.7;
                    ">
                        ขั้นตอนนี้เป็นการตรวจสอบข้อมูล
                        ยังไม่มีการสร้าง Assignment
                        หรือบันทึกข้อมูลลงฐานข้อมูล
                    </p>

                </div>
            `,

            didOpen: () => {
                const subjectSelect =
                    document.getElementById(
                        "teacher-permission-subject"
                    );

                const roomSelect =
                    document.getElementById(
                        "teacher-permission-room"
                    );

                const info =
                    document.getElementById(
                        "teacher-permission-subject-info"
                    );

                if (
                    !subjectSelect ||
                    !roomSelect ||
                    !info
                ) {
                    return;
                }

                subjectSelect.add(
                    new Option("-- เลือกรายวิชา --", "")
                );

                assignedSubjects.forEach(subject => {
                    subjectSelect.add(
                        new Option(
                            `${subject.subjectCode} — ${subject.subjectName}`,
                            subject.permissionId
                        )
                    );
                });

                roomSelect.add(
                    new Option("-- เลือกกลุ่มนักเรียน --", "")
                );

                rooms.forEach(room => {
                    roomSelect.add(
                        new Option(
                            room.room_name,
                            room.id
                        )
                    );
                });

                function updateSubjectInfo() {
                    const selected =
                        assignedSubjects.find(
                            subject =>
                                subject.permissionId ===
                                subjectSelect.value
                        );

                    if (!selected) {
                        info.textContent =
                            "กรุณาเลือกรายวิชาที่ได้รับมอบหมาย";
                        return;
                    }

                    info.textContent =
                        `รหัสวิชา: ${selected.subjectCode}\n` +
                        `ชื่อวิชา: ${selected.subjectName}\n` +
                        `หน่วยกิต: ${
                            selected.credit == null
                                ? "ไม่ระบุ"
                                : selected.credit
                        }`;

                    info.style.whiteSpace = "pre-line";
                }

                subjectSelect.onchange = updateSubjectInfo;
                updateSubjectInfo();
            },

            showCancelButton: true,
            confirmButtonText: "ตรวจสอบรายการที่เลือก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,

            preConfirm: () => {
                const permissionId =
                    document.getElementById(
                        "teacher-permission-subject"
                    )?.value || "";

                const roomId =
                    document.getElementById(
                        "teacher-permission-room"
                    )?.value || "";

                const subject =
                    assignedSubjects.find(
                        item =>
                            item.permissionId === permissionId
                    );

                const room =
                    rooms.find(
                        item => item.id === roomId
                    );

                if (!subject) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกรายวิชา"
                    );
                    return false;
                }

                if (!room) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกกลุ่มนักเรียน"
                    );
                    return false;
                }

                return {
                    subject,
                    room
                };
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        const { subject, room } = result.value;

        // B57-03 — ตรวจสอบ Assignment เดิม
        // READ ONLY — ไม่สร้างหรือเปลี่ยนข้อมูล
        const assignmentCheck =
            await checkTeacherAssignmentFromPermission(
                subject.permissionId,
                room.id
            );

        // แสดงข้อมูลด้วย textContent
        // ไม่แทรกข้อมูลจากฐานข้อมูลเป็น HTML โดยตรง
            const summaryResult = await Swal.fire({
            icon: "info",
            title: "ตรวจสอบข้อมูลการสอน",
            html: `
                <div style="
                    text-align:left;
                    display:grid;
                    gap:10px;
                    padding:14px;
                    background:#f8fafc;
                    border-radius:12px;
                ">
                    <div>
                        รหัสวิชา:
                        <strong id="preview-subject-code"></strong>
                    </div>

                    <div>
                        ชื่อวิชา:
                        <strong id="preview-subject-name"></strong>
                    </div>

                    <div>
                        หน่วยกิต:
                        <strong id="preview-subject-credit"></strong>
                    </div>

                    <div>
                        กลุ่มนักเรียน:
                        <strong id="preview-subject-room"></strong>
                    </div>

                    <div style="
                        margin-top:8px;
                        padding:12px;
                        border:1px solid #cbd5e1;
                        border-radius:10px;
                        background:#ffffff;
                    ">
                        <strong>สถานะการมอบหมาย:</strong>
                        <div
                            id="preview-assignment-status"
                            style="
                                margin-top:6px;
                                line-height:1.6;
                            "
                        ></div>
                    </div>
                </div>

                <p style="
                    margin-top:16px;
                    color:#64748b;
                    font-size:13px;
                    line-height:1.7;
                ">
                    ${
                        assignmentCheck.exists
                            ? "ระบบพบกลุ่มเรียนนี้แล้ว สามารถไปจัดตารางสอนได้โดยไม่สร้างรายการซ้ำ"
                            : "หากเลือกสร้างกลุ่มเรียน ระบบจะขอให้ยืนยันอีกครั้งก่อนบันทึกข้อมูลจริง"
                    }
                </p>
            `,

            didOpen: () => {
                const values = {
                    "preview-subject-code":
                        subject.subjectCode,

                    "preview-subject-name":
                        subject.subjectName,

                    "preview-subject-credit":
                        subject.credit == null
                            ? "ไม่ระบุ"
                            : String(subject.credit),

                        "preview-subject-room":
                        room.room_name,

                    "preview-assignment-status":
                        assignmentCheck.exists
                            ? "มี Assignment นี้อยู่แล้ว สามารถนำไปจัดตารางสอนได้"
                            : "ยังไม่มี Assignment สำหรับวิชาและกลุ่มนักเรียนนี้"
                };

                Object.entries(values).forEach(
                    ([id, value]) => {
                        const element =
                            document.getElementById(id);

                        if (element) {
                            element.textContent = value;
                        }
                    }
                );
            },

            confirmButtonText: assignmentCheck.exists
                ? "ไปจัดตารางสอน"
                : "สร้างกลุ่มเรียนนี้",

            showCancelButton: true,
            cancelButtonText: "ยกเลิก"
        });

        // B57-03 — ผู้ใช้ยกเลิก ไม่ดำเนินการใด ๆ
        if (!summaryResult.isConfirmed) {
            return;
        }

        // กรณีมี Assignment เดิม ใช้รายการเดิมทันที
        if (
            assignmentCheck.exists &&
            assignmentCheck.assignmentId
        ) {
            await openScheduleForTeacherAssignment(
                assignmentCheck.assignmentId
            );

            return;
        }

        // กรณียังไม่มี Assignment ต้องยืนยันก่อนสร้างจริง
        const confirmation = await Swal.fire({
            icon: "question",
            title: "ยืนยันสร้างกลุ่มเรียน?",
            text:
                `${subject.subjectCode} — ${subject.subjectName}\n` +
                `กลุ่มนักเรียน: ${room.room_name}\n\n` +
                "ระบบจะบันทึกการมอบหมายการสอนลงฐานข้อมูลจริง",
            showCancelButton: true,
            confirmButtonText: "ยืนยันสร้างกลุ่มเรียน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2563eb",
            reverseButtons: true,
            didOpen: () => {
                const content = Swal.getHtmlContainer();

                if (content) {
                    content.style.whiteSpace = "pre-line";
                }
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        // RPC ตรวจสิทธิ์และป้องกัน Assignment ซ้ำอีกชั้น
        let assignmentId;

        try {
            assignmentId =
                await createTeacherAssignmentFromPermission(
                    subject.permissionId,
                    room.id
                );

        } catch (saveError) {
            console.error(
                "Teacher Assignment Save Error:",
                saveError
            );

            // ไม่เรียก RPC สร้างซ้ำ
            // อ่านข้อมูลจริงเพื่อตรวจว่ามี Assignment แล้วหรือไม่
            let verified = null;
            let verificationError = null;

            try {
                verified =
                    await checkTeacherAssignmentFromPermission(
                        subject.permissionId,
                        room.id
                    );

            } catch (readError) {
                verificationError = readError;

                console.error(
                    "Teacher Assignment Verification Error:",
                    readError
                );
            }

            if (verified?.exists && verified.assignmentId) {
                const result = await Swal.fire({
                    icon: "warning",
                    title: "พบกลุ่มเรียนในฐานข้อมูลแล้ว",
                    text:
                        "แม้คำขอบันทึกจะเกิดข้อผิดพลาด " +
                        "แต่ตรวจพบ Assignment สำหรับวิชาและกลุ่มนี้แล้ว " +
                        "ไม่จำเป็นต้องสร้างรายการซ้ำ",
                    showCancelButton: true,
                    confirmButtonText: "ไปจัดตารางสอน",
                    cancelButtonText: "ปิด"
                });

                if (result.isConfirmed) {
                    try {
                        await openScheduleForTeacherAssignment(
                            verified.assignmentId
                        );

                    } catch (scheduleError) {
                        console.error(
                            "Teacher Schedule Open Error:",
                            scheduleError
                        );

                        await Swal.fire({
                            icon: "warning",
                            title: "พบกลุ่มเรียนแล้ว",
                            text:
                                "ไม่สามารถเปิดหน้าจัดตารางสอนได้ " +
                                "กรุณาเปิดเมนูจัดตารางสอนอีกครั้ง " +
                                "โดยไม่ต้องสร้างกลุ่มเรียนซ้ำ",
                            confirmButtonText: "รับทราบ"
                        });
                    }
                }

                return;
            }

            await Swal.fire({
                icon: "warning",
                title: "ยังยืนยันผลการบันทึกไม่ได้",
                text: verificationError
                    ? "คำขอบันทึกเกิดข้อผิดพลาด และไม่สามารถอ่านข้อมูลยืนยันได้ กรุณาตรวจสอบรายการในระบบเมื่อการเชื่อมต่อกลับมาปกติ ก่อนลองสร้างอีกครั้ง"
                    : "คำขอบันทึกเกิดข้อผิดพลาด และยังไม่พบ Assignment จากการตรวจล่าสุด กรุณาตรวจสอบรายการอีกครั้งก่อนลองสร้างใหม่",
                confirmButtonText: "รับทราบ"
            });

            return;
        }

        await Swal.fire({
            icon: "success",
            title: "บันทึกกลุ่มเรียนสำเร็จ",
            text:
                "บันทึกการมอบหมายการสอนแล้ว " +
                "ขั้นต่อไปสามารถกำหนดวันและคาบสอนได้",
            confirmButtonText: "ไปจัดตารางสอน"
        });

        // B57-03 — Assignment บันทึกสำเร็จแล้ว
        // แยกข้อผิดพลาดในการเปิดหน้าจัดตารางสอน
        // เพื่อไม่ให้ครูเข้าใจว่าการบันทึกล้มเหลว
        try {
            await openScheduleForTeacherAssignment(
                assignmentId
            );

        } catch (scheduleError) {
            console.error(
                "Teacher Schedule Open Error:",
                scheduleError
            );

            await Swal.fire({
                icon: "warning",
                title: "บันทึกกลุ่มเรียนแล้ว",
                text:
                    "บันทึก Assignment สำเร็จแล้ว " +
                    "แต่ไม่สามารถเปิดหน้าจัดตารางสอนได้ " +
                    "กรุณากลับไปเปิดเมนูจัดตารางสอนอีกครั้ง " +
                    "โดยไม่ต้องสร้างกลุ่มเรียนซ้ำ",
                confirmButtonText: "รับทราบ"
            });
        }

        return;

    } catch (error) {
        console.error(
            "Teacher Assigned Subject Preview Error:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถโหลดรายวิชาได้",
            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการอ่านข้อมูล",
            confirmButtonText: "ตกลง"
        });
    }
}
 // ============================================================
 // B55 — Teacher Subject Create Form
 // UI Preview Only: ยังไม่บันทึกฐานข้อมูล
 // ============================================================

async function openTeacherSubjectCreateForm() {
    try {
        // 1. ตรวจภาคเรียนที่เปิดให้จัดการ
        const semester =
            await getScheduleManageActiveSemester();

        if (!semester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้จัดการตารางสอน"
            );
        }

        // 2. ตรวจสิทธิ์และครูผู้รับผิดชอบ
        const role = await getCurrentUserRole();

        if (role !== "Teacher" && role !== "Admin") {
            throw new Error("ไม่มีสิทธิ์เพิ่มวิชา");
        }

        const context =
            await getCurrentTeacherContext();

        const teacherId = context?.teacherId || null;

        if (!teacherId) {
            throw new Error(
                "ไม่พบข้อมูลครูผู้รับผิดชอบ " +
                "ฟอร์มนี้ต้องผูกวิชากับครูที่เข้าสู่ระบบ"
            );
        }

        // RPC เดิมสร้าง Assignment ให้ครูที่เข้าสู่ระบบ
        // ห้าม Admin เลือกครูอื่นแล้วสร้างผิดคน
        if (role === "Admin") {
            const selectedTeacherId =
                window.scheduleManageTeacherFilterId || "";

            if (
                selectedTeacherId &&
                selectedTeacherId !== teacherId
            ) {
                throw new Error(
                    "ฟอร์มนี้สร้างวิชาให้ครูคนอื่นไม่ได้ " +
                    "กรุณาเลือกครูเจ้าของบัญชี หรือใช้ระบบ Admin"
                );
            }
        }

        // 3. โหลดห้องเรียนจากปีการศึกษาปัจจุบัน
        const { data: rooms, error: roomError } =
            await supabaseClient
                .from("rooms")
                .select("id, room_name")
                .eq(
                    "academic_year_id",
                    semester.academic_year_id
                )
                .is("deleted_at", null)
                .order("room_name", {
                    ascending: true
                });

        if (roomError) throw roomError;

        if (!rooms || rooms.length === 0) {
            throw new Error(
                "ไม่พบห้องเรียนในปีการศึกษาปัจจุบัน"
            );
        }

        const availableRoomIds = new Set(
            rooms.map(room => room.id)
        );

        // 4. เปิดแบบฟอร์มเพิ่มวิชา
        const result = await Swal.fire({
            title: "＋ เพิ่มวิชาใหม่",

            html: `
                <div style="text-align:left;">

                    <label for="new-subject-code">
                        รหัสวิชา
                    </label>
                    <input
                        id="new-subject-code"
                        class="swal2-input"
                        maxlength="50"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 14px;
                        "
                        placeholder="เช่น อ21101"
                    >

                    <label for="new-subject-name">
                        ชื่อวิชา
                    </label>
                    <input
                        id="new-subject-name"
                        class="swal2-input"
                        maxlength="255"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 14px;
                        "
                        placeholder="เช่น ภาษาอังกฤษพื้นฐาน"
                    >

                    <label for="new-subject-credit">
                        หน่วยกิต
                    </label>
                    <input
                        id="new-subject-credit"
                        class="swal2-input"
                        type="number"
                        min="0"
                        max="9.5"
                        step="0.5"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 14px;
                        "
                        placeholder="เช่น 1.0"
                    >

                    <label for="new-subject-room">
                        ชั้น/ห้องเริ่มต้น
                    </label>
                    <select
                        id="new-subject-room"
                        class="swal2-select"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            margin:6px 0 14px;
                            padding:10px;
                        "
                    ></select>

                    <p style="
                        color:#64748b;
                        font-size:13px;
                        margin-top:8px;
                    ">
                        เมื่อสร้างวิชาแล้ว
                        จะกลับไปกำหนดวัน คาบ เวลา
                        และห้องสอนในหน้าต่างเดิม
                    </p>

                </div>
            `,

            didOpen: () => {
                const roomSelect =
                    document.getElementById(
                        "new-subject-room"
                    );

                if (!roomSelect) return;

                const placeholder =
                    document.createElement("option");

                placeholder.value = "";
                placeholder.textContent =
                    "-- เลือกชั้น/ห้อง --";

                roomSelect.appendChild(placeholder);

                rooms.forEach(room => {
                    const option =
                        document.createElement("option");

                    option.value = room.id;
                    option.textContent = room.room_name;

                    roomSelect.appendChild(option);
                });
            },

            showCancelButton: true,
            confirmButtonText: "สร้างวิชา",
            cancelButtonText: "ยกเลิก",
            showLoaderOnConfirm: false,

            preConfirm: () => {
                const code =
                    document.getElementById(
                        "new-subject-code"
                    )?.value.trim() || "";

                const name =
                    document.getElementById(
                        "new-subject-name"
                    )?.value.trim() || "";

                const creditText =
                    document.getElementById(
                        "new-subject-credit"
                    )?.value.trim() || "";

                const roomId =
                    document.getElementById(
                        "new-subject-room"
                    )?.value || "";

                if (!code || !name) {
                    Swal.showValidationMessage(
                        "กรุณากรอกรหัสวิชาและชื่อวิชา"
                    );
                    return false;
                }

                if (
                    code.length > 50 ||
                    name.length > 255
                ) {
                    Swal.showValidationMessage(
                        "รหัสวิชาหรือชื่อวิชายาวเกินกำหนด"
                    );
                    return false;
                }

                if (!availableRoomIds.has(roomId)) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกห้องเรียนเริ่มต้น"
                    );
                    return false;
                }

                if (creditText === "") {
                    Swal.showValidationMessage(
                        "กรุณาระบุหน่วยกิต"
                    );
                    return false;
                }

                const credit = Number(creditText);

                if (
                    !Number.isFinite(credit) ||
                    credit < 0 ||
                    credit > 9.5 ||
                    !Number.isInteger(credit * 2)
                ) {
                    Swal.showValidationMessage(
                        "หน่วยกิตต้องเป็น 0 ถึง 9.5 " +
                        "โดยเพิ่มทีละ 0.5"
                    );
                    return false;
                }

                return {
                    code,
                    name,
                    credit,
                    roomId
                };
            }
        });

        if (!result.isConfirmed) return;

        const input = result.value;

        // 5. ตรวจข้อมูลปีการศึกษาจาก DB ก่อนแสดงหน้าสรุป
        const selectedRoom = rooms.find(
            room => room.id === input.roomId
        );

        if (!selectedRoom) {
            throw new Error("ไม่พบชั้น/ห้องที่เลือก");
        }

        const { data: currentYears, error: yearError } =
            await supabaseClient
                .from("academic_years")
                .select("id, year")
                .eq("is_current", true);

        if (yearError) throw yearError;

        if (!currentYears || currentYears.length !== 1) {
            throw new Error(
                "ไม่พบปีการศึกษาปัจจุบันที่ถูกต้องเพียงหนึ่งปี"
            );
        }

        const currentYear = currentYears[0];

        if (currentYear.id !== semester.academic_year_id) {
            throw new Error(
                "ปีการศึกษาและภาคเรียนไม่ตรงกัน กรุณาตรวจสอบข้อมูล"
            );
        }

        const teacherName = [
            context.firstName,
            context.lastName
        ].filter(Boolean).join(" ") || context.nickname;

        if (!teacherName) {
            throw new Error("ไม่พบชื่อครูผู้สอน");
        }

        // แสดงค่าด้วย textContent เพื่อป้องกัน HTML Injection
        const summary = {
            "subject-confirm-code": input.code,
            "subject-confirm-name": input.name,
            "subject-confirm-credit": `${input.credit} หน่วยกิต`,
            "subject-confirm-room": selectedRoom.room_name,
            "subject-confirm-teacher": teacherName,
            "subject-confirm-year": String(currentYear.year),
            "subject-confirm-semester": String(semester.semester_no)
        };

        const confirmation = await Swal.fire({
            icon: "question",
            title: "ยืนยันเพิ่มวิชา?",
            width: 520,
            html: `
                <p style="color:#64748b;margin:0 0 16px;">
                    กรุณาตรวจสอบข้อมูลก่อนบันทึกลงระบบ
                </p>
                <div style="
                    text-align:left;
                    background:#f8fafc;
                    border:1px solid #e2e8f0;
                    border-radius:12px;
                    padding:16px;
                    display:grid;
                    gap:12px;
                ">
                    <div>รหัสวิชา: <strong id="subject-confirm-code"></strong></div>
                    <div>ชื่อวิชา: <strong id="subject-confirm-name"></strong></div>
                    <div>หน่วยกิต: <strong id="subject-confirm-credit"></strong></div>
                    <div>ชั้น/ห้องเริ่มต้น: <strong id="subject-confirm-room"></strong></div>
                    <div>ครูผู้สอน: <strong id="subject-confirm-teacher"></strong></div>
                    <hr style="width:100%;border:0;border-top:1px solid #e2e8f0;">
                    <div>ปีการศึกษา: <strong id="subject-confirm-year"></strong></div>
                    <div>ภาคเรียน: <strong id="subject-confirm-semester"></strong></div>
                </div>
            `,
            didOpen: () => {
                Object.entries(summary).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) element.textContent = value;
                });
            },
            showCancelButton: true,
            confirmButtonText: "ยืนยันบันทึก",
            cancelButtonText: "ยกเลิก",
            reverseButtons: true
        });

        if (!confirmation.isConfirmed) return;

        // 6. บันทึกผ่าน RPC เดิมใน Supabase
        // RPC เป็นผู้ตรวจวิชาและ Assignment ซ้ำ
        const { data: assignmentId, error } =
            await supabaseClient.rpc(
                "teacher_create_subject_assignment",
                {
                    p_subject_code: input.code,
                    p_subject_name: input.name,
                    p_credit: input.credit,
                    p_room_id: input.roomId
                }
            );

        if (error) throw error;

        if (
            typeof assignmentId !== "string" ||
            !assignmentId
        ) {
            throw new Error(
                "RPC ไม่ส่งรหัส Subject Assignment กลับมา"
            );
        }

        await Swal.fire({
            icon: "success",
            title: "บันทึกวิชาสำเร็จ",
            text:
                "สร้างหรือพบวิชาและห้องเรียนเดิมแล้ว " +
                "ขั้นต่อไปกำหนดวันและคาบสอน",
            confirmButtonText: "กำหนดตารางสอน"
        });

        // 7. ใช้ฟอร์มเพิ่มตารางสอนเดิม
        // ไม่สร้างระบบวัน/คาบ/ห้องสอนใหม่
        await openScheduleCreate();

        const assignmentSelect =
            document.getElementById(
                "schedule-assignment"
            );

        if (!assignmentSelect) {
            throw new Error(
                "ไม่พบช่องเลือกวิชาในหน้าต่างเพิ่มตารางสอน"
            );
        }

        // ยืนยันว่า Assignment ใหม่โหลดมาแล้วจริง
        const assignmentOption =
            Array.from(assignmentSelect.options)
                .find(option =>
                    option.value === assignmentId
                );

        if (!assignmentOption) {
            throw new Error(
                "บันทึกวิชาสำเร็จแล้ว แต่ยังไม่พบวิชา " +
                "ในรายการ กรุณาเปิดหน้าต่างเพิ่มตารางสอนใหม่"
            );
        }

        assignmentSelect.value = assignmentId;

        // ครูกรอกวัน คาบ ห้องสอน และวันที่ต่อเอง
        assignmentSelect.focus();

    } catch (error) {
        console.error(
            "Teacher Subject Create Error:",
            error
        );

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถดำเนินการได้",
            text:
                error?.message ||
                "เกิดข้อผิดพลาดในการเพิ่มวิชา"
        });
    }
}
// ============================================================
// B57-03 — Teacher Subject Entry
// เปิดหน้าต่างเลือกรายวิชาที่ Admin มอบหมาย
// ============================================================

async function openScheduleSubjectAddEntry() {
    try {
        const role = await getCurrentUserRole();

        if (role === "Teacher") {
            await openTeacherAssignedSubjectPreview();
            return;
        }

        if (role === "Admin") {
            await Swal.fire({
                icon: "info",
                title: "การมอบหมายรายวิชา",
                text:
                    "Admin สามารถมอบหมายรายวิชาให้ครูได้ที่เมนู " +
                    "การมอบหมายการสอน ส่วนครูผู้สอนจะเลือกกลุ่มนักเรียน " +
                    "จากรายวิชาที่ได้รับมอบหมาย",
                confirmButtonText: "รับทราบ"
            });
            return;
        }

        await Swal.fire({
            icon: "warning",
            title: "ไม่มีสิทธิ์ดำเนินการ",
            text: "เมนูนี้สำหรับครูผู้สอนและ Admin เท่านั้น",
            confirmButtonText: "ตกลง"
        });

    } catch (error) {
        console.error("Schedule Subject Entry Error:", error);

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเปิดรายการวิชาได้",
            text: error?.message || "เกิดข้อผิดพลาด",
            confirmButtonText: "ตกลง"
        });
    }
}
// ============================================================
// SCHEDULE CREATE
// STEP 5B.8.5 — Create Schedule Form
// ============================================================

async function openScheduleCreate() {

    const oldModal = document.getElementById("schedule-create-modal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal = document.createElement("div");

    modal.id = "schedule-create-modal";

    modal.innerHTML = `
        <div class="schedule-modal-backdrop">

            <div class="schedule-modal">

                <div class="schedule-modal-header">

                    <div>
                        <h2>＋ เพิ่มตารางสอน</h2>
                        <p>กำหนดวิชา ห้องเรียน วัน และคาบสอน</p>
                    </div>

                    <button
                        type="button"
                        class="schedule-modal-close"
                        onclick="closeScheduleCreate()"
                    >
                        ✕
                    </button>

                </div>


                <div class="schedule-modal-body">

                    <div class="schedule-form-group">

                        <label for="schedule-assignment">
                            วิชา / ห้องเรียน
                        </label>

<select id="schedule-assignment">
    <option value="">
        กำลังโหลดข้อมูล...
    </option>
</select>

<button
    type="button"
    class="schedule-add-btn"
    style="margin-top:10px;"
    onclick="openScheduleSubjectAddEntry()"
>
    ＋ เลือกรายวิชาที่ได้รับมอบหมาย
</button>

</div>

                    <div class="schedule-form-row">

                        <div class="schedule-form-group">

                            <label for="schedule-weekday">
                                วัน
                            </label>

                            <select id="schedule-weekday">

                                <option value="1">
                                    จันทร์
                                </option>

                                <option value="2">
                                    อังคาร
                                </option>

                                <option value="3">
                                    พุธ
                                </option>

                                <option value="4">
                                    พฤหัสบดี
                                </option>

                                <option value="5">
                                    ศุกร์
                                </option>

                            </select>

                        </div>


                        <div class="schedule-form-group">

                            <label for="schedule-lesson">
                                คาบ
                            </label>

                            <select id="schedule-lesson">
    <option value="">
        -- เลือกคาบ --
    </option>

    ${SCHEDULE_PERIODS.map(period => `
        <option value="${period.lessonNo}">
            ${period.label} — ${period.start}–${period.end}
        </option>
    `).join("")}

</select>

                        </div>

                    </div>


                    <div class="schedule-form-group">

                        <label for="schedule-teaching-room">
                            🏫 ห้องสอน
                        </label>

                        <select id="schedule-teaching-room">
                            <option value="">
                                กำลังโหลดห้องสอน...
                            </option>
                        </select>

                    </div>


                    <div class="schedule-form-row">

                        <div class="schedule-form-group">

                            <label for="schedule-valid-from">
                                เริ่มใช้วันที่
                            </label>

                            <input
                                type="date"
                                id="schedule-valid-from"
                            >

                        </div>


                        <div class="schedule-form-group">

                            <label for="schedule-valid-until">
                                สิ้นสุดวันที่
                            </label>

                            <input
                                type="date"
                                id="schedule-valid-until"
                            >

                            <small>
                                เว้นว่างได้ หากยังไม่กำหนดวันสิ้นสุด
                            </small>

                        </div>

                    </div>

                </div>


                <div class="schedule-modal-footer">

                    <button
                        type="button"
                        class="schedule-modal-cancel"
                        onclick="closeScheduleCreate()"
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        class="schedule-modal-save"
                        onclick="saveScheduleCreate()"
                    >
                        💾 บันทึก
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);


    // --------------------------------------------------------
    // Load Subject Assignments
    // --------------------------------------------------------

    const assignmentSelect =
        document.getElementById("schedule-assignment");

    try {

        // B53 — จำกัดวิชาให้ตรงกับภาคเรียนและครู
        const activeSemester =
            await getScheduleManageActiveSemester();

        if (!activeSemester) {
            throw new Error(
                "ไม่มีภาคเรียนที่เปิดให้จัดการตารางสอน"
            );
        }

        const role = await getCurrentUserRole();

        let selectedTeacherId = "";

        if (role === "Teacher") {

            const context =
                await getCurrentTeacherContext();

            if (!context?.teacherId) {
                throw new Error(
                    "ไม่พบข้อมูลครูผู้เข้าสู่ระบบ"
                );
            }

            selectedTeacherId = context.teacherId;

        } else if (role === "Admin") {

            selectedTeacherId =
                window.scheduleManageTeacherFilterId || "";

        } else {

            throw new Error(
                "ไม่มีสิทธิ์เพิ่มตารางสอน"
            );
        }

        // Query เฉพาะ Assignment ของภาคเรียนปัจจุบัน
        let query = supabaseClient
            .from("subject_assignments")
            .select(`
                id,
                teacher_id,
                subject_id,
                room_id,

                subjects!subject_id(
                    subject_code,
                    subject_name
                ),

                rooms!room_id(
                    room_name
                )
            `)
            .eq("semester_id", activeSemester.id);

        // Teacher เห็นเฉพาะวิชาของตนเอง
        // Admin เห็นเฉพาะครูที่เลือก หรือทุกคน
        if (selectedTeacherId) {
            query = query.eq(
                "teacher_id",
                selectedTeacherId
            );
        }

        const { data, error } = await query
            .order("subject_id", {
                ascending: true
            });

        if (error) throw error;


        assignmentSelect.innerHTML = `
            <option value="">
                -- เลือกวิชา / ห้องเรียน --
            </option>
        `;


        data.forEach(assignment => {

            const subject =
                assignment.subjects || {};

            const room =
                assignment.rooms || {};


            const option =
                document.createElement("option");


            option.value =
                assignment.id;


            option.textContent =
                `${subject.subject_code || ""} — ` +
                `${subject.subject_name || ""} — ` +
                `${room.room_name || ""}`;


            assignmentSelect.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Load Subject Assignments Error:",
            error
        );

        assignmentSelect.innerHTML = `
            <option value="">
                ❌ โหลดข้อมูลวิชาไม่สำเร็จ
            </option>
        `;

    }


    // --------------------------------------------------------
    // Load Teaching Rooms
    // --------------------------------------------------------

    const teachingRoomSelect =
        document.getElementById(
            "schedule-teaching-room"
        );


    try {

        const { data, error } = await supabaseClient

            .from("teaching_rooms")

            .select(`
                id,
                room_code,
                room_name
            `)

            .order("room_code", {
                ascending: true
            });


        if (error) throw error;


        teachingRoomSelect.innerHTML = `
            <option value="">
                -- เลือกห้องสอน --
            </option>
        `;


        data.forEach(room => {

            const option =
                document.createElement("option");


            option.value =
                room.id;


            option.textContent =
                room.room_name ||
                room.room_code;


            teachingRoomSelect.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Load Teaching Rooms Error:",
            error
        );

        teachingRoomSelect.innerHTML = `
            <option value="">
                ❌ โหลดห้องสอนไม่สำเร็จ
            </option>
        `;

    }


    // --------------------------------------------------------
    // Default Start Date
    // --------------------------------------------------------

    const validFrom =
        document.getElementById(
            "schedule-valid-from"
        );


    if (validFrom && !validFrom.value) {

        const today =
            new Date();

        const yyyy =
            today.getFullYear();

        const mm =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");

        const dd =
            String(
                today.getDate()
            ).padStart(2, "0");


        validFrom.value =
            `${yyyy}-${mm}-${dd}`;

    }

}


// ============================================================
// Close Create Schedule Modal
// ============================================================

function closeScheduleCreate() {

    const modal =
        document.getElementById(
            "schedule-create-modal"
        );


    if (modal) {

        modal.remove();

    }

}

// ============================================================
// SAVE CREATE SCHEDULE
// STEP 5B.8.9 — Validation
// ============================================================

async function saveScheduleCreate() {

    try {

        // ============================================
        // 1. อ่านค่าจาก Form
        // ============================================

        const subjectAssignmentId =
            document.getElementById("schedule-assignment")?.value;

        const weekday =
            Number(
                document.getElementById("schedule-weekday")?.value
            );

        const lessonNo =
            Number(
                document.getElementById("schedule-lesson")?.value
            );

        const validFrom =
            document.getElementById("schedule-valid-from")?.value;

        const validUntil =
            document.getElementById("schedule-valid-until")?.value || null;

        // ========================================================
// Schedule Group
// ยังไม่มี UI ในตอนนี้
// เตรียมไว้สำหรับ Combined Class / Schedule Group
// ========================================================

// const scheduleGroupId =
//     document.getElementById("schedule-group")?.value || null;

        const scheduleGroupId = crypto.randomUUID();

        const teachingRoomId =
            document.getElementById("schedule-teaching-room")?.value;


        // ============================================
        // 2. ตรวจสอบข้อมูลเบื้องต้น
        // ============================================

        if (!subjectAssignmentId) {
            Swal.fire(
                "ข้อมูลไม่ครบ",
                "กรุณาเลือกวิชา / กลุ่มการสอน",
                "warning"
            );
            return;
        }

        if (!weekday) {
            Swal.fire(
                "ข้อมูลไม่ครบ",
                "กรุณาเลือกวัน",
                "warning"
            );
            return;
        }

        if (!lessonNo) {
            Swal.fire(
                "ข้อมูลไม่ครบ",
                "กรุณาเลือกคาบเรียน",
                "warning"
            );
            return;
        }

        if (!validFrom) {
            Swal.fire(
                "ข้อมูลไม่ครบ",
                "กรุณาระบุวันที่เริ่มใช้ตาราง",
                "warning"
            );
            return;
        }

        if (!teachingRoomId) {
            Swal.fire(
                "ข้อมูลไม่ครบ",
                "กรุณาเลือกห้องสอน",
                "warning"
            );
            return;
        }


        // ============================================
        // 3. หาเวลาเริ่ม / สิ้นสุดจากคาบ
        // ============================================

        const period =
            SCHEDULE_PERIODS.find(
                p => Number(p.lessonNo) === lessonNo
            );

        if (!period) {
            Swal.fire(
                "ไม่พบข้อมูลคาบ",
                `ไม่พบเวลาของคาบที่ ${lessonNo}`,
                "error"
            );
            return;
        }


        // ============================================
        // 4. เตรียมข้อมูลสำหรับ API
        // ============================================

        const scheduleData = {

            subjectAssignmentId:
                subjectAssignmentId,

            weekday:
                weekday,

            lessonNo:
                lessonNo,

            startTime:
                period.start,

            endTime:
                period.end,

            validFrom:
                validFrom,

            validUntil:
                validUntil,

            scheduleGroupId:
                scheduleGroupId,

            teachingRoomId:
                teachingRoomId
        };


        console.log(
            "CREATE SCHEDULE:",
            scheduleData
        );

        // ========================================================
// STEP 5B.8.10C
// Debug before INSERT
// ========================================================

console.table({
    subjectAssignmentId:
        scheduleData.subjectAssignmentId,

    weekday:
        scheduleData.weekday,

    lessonNo:
        scheduleData.lessonNo,

    startTime:
        scheduleData.startTime,

    endTime:
        scheduleData.endTime,

    validFrom:
        scheduleData.validFrom,

    validUntil:
        scheduleData.validUntil,

    scheduleGroupId:
        scheduleData.scheduleGroupId,

    teachingRoomId:
        scheduleData.teachingRoomId
});

        // ============================================
        // 5. เรียก API
        // ============================================

        await createClassSchedule(
            scheduleData
        );


        // ============================================
        // 6. สำเร็จ
        // ============================================

        await Swal.fire(
            "บันทึกสำเร็จ",
            "เพิ่มตารางสอนเรียบร้อยแล้ว",
            "success"
        );
closeScheduleCreate();

        // ============================================
        // B57-01 — Switch to timetable after saving
        // ============================================

        switchScheduleTab("timetable");

    } catch (error) {

    console.error(
        "Create Schedule Error:",
        error
    );

    const errorMessage =
        error?.message || "";

    // ========================================================
    // 1. Teaching Room Conflict
    // ========================================================

    if (
        errorMessage.includes(
            "same physical teaching room"
        )
    ) {

        await Swal.fire({
            icon: "warning",
            title: "ชั้นเรียนชนกัน",
            text: "ชั้นเรียนนี้มีตารางสอนอยู่แล้วในคาบนี้",
            confirmButtonText: "ตกลง"
        });

        return;
    }


    // ========================================================
    // 2. Student Class Conflict
    // ========================================================

    if (
        errorMessage.includes(
            "same student class"
        )
    ) {

        await Swal.fire({
            icon: "warning",
            title: "ห้องสอนชนกัน",
            text: "ห้องสอนนี้ถูกใช้งานอยู่แล้วในคาบนี้",
            confirmButtonText: "ตกลง"
        });

        return;
    }


    // ========================================================
    // 3. Teacher Conflict
    // ========================================================

    if (
        errorMessage.includes(
            "same teacher"
        )
    ) {

        await Swal.fire({
            icon: "warning",
            title: "ครูมีตารางสอนแล้ว",
            text: "ครูผู้สอนมีตารางสอนในช่วงคาบนี้แล้ว",
            confirmButtonText: "ตกลง"
        });

        return;
    }


    // ========================================================
    // 4. Other / Unknown Error
    // ========================================================

    await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text:
            errorMessage ||
            "เกิดข้อผิดพลาดในการบันทึกตารางสอน",
        confirmButtonText: "ตกลง"
    });
}
}

/* ============================================================
   ADMIN ACADEMIC MANAGEMENT
   Module 1.3 — Academic Overview Renderer
   READ ONLY
   ============================================================ */

async function loadAdminAcademicOverview() {

    const status = document.getElementById(
        "admin-academic-status"
    );

    const tbody = document.getElementById(
        "admin-academic-table-body"
    );

    if (!status || !tbody) return;

    status.textContent = "กำลังโหลดข้อมูล...";
    tbody.replaceChildren();

    try {

        const result = await getAdminAcademicOverview();

        const years = result.academicYears || [];
        const semesters = result.semesters || [];

        const appendRow = (values, semester = null) => {
            const tr = document.createElement("tr");

            values.forEach(value => {
                const td = document.createElement("td");
                td.textContent = String(value ?? "-");
                tr.appendChild(td);
            });

            const actionCell = document.createElement("td");

            if (semester?.id) {

    const todayBangkok = new Date().toLocaleDateString(
        "sv-SE",
        { timeZone: "Asia/Bangkok" }
    );

    const isLocked =
        semester.schedule_locked_at != null;

    const isExpired =
        semester.end_date < todayBangkok;

    if (isLocked || isExpired) {

        actionCell.textContent = isLocked
            ? "🔒 ล็อกแล้ว"
            : "⏳ หมดอายุ";

        actionCell.title =
            "ภาคเรียนนี้ไม่สามารถแก้ไขผ่านหน้าจอปกติได้";

    } else {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn";
        button.textContent = "✏️ แก้ไข";

        button.addEventListener("click", () => {
            openAdminSemesterDetails(semester);
        });

        actionCell.appendChild(button);
    }

} else {
    actionCell.textContent = "-";
}

            tr.appendChild(actionCell);
            tbody.appendChild(tr);
        };

        // เรียงปีจากน้อยไปมาก แล้วเรียงภาคเรียนภายในปี
        [...years]
            .sort((a, b) => a.year - b.year)
            .forEach(year => {

                const yearSemesters = semesters
                    .filter(semester =>
                        semester.academic_year_id === year.id
                    )
                    .sort((a, b) =>
                        a.semester_no - b.semester_no
                    );

                if (yearSemesters.length === 0) {
                    appendRow([
                        year.year,
                        year.is_current
                            ? "ปีปัจจุบัน"
                            : "ไม่ใช่ปีปัจจุบัน",
                        "ยังไม่มีภาคเรียน",
                        "-",
                        "-"
                    ]);
                    return;
                }

                yearSemesters.forEach(semester => {

    const todayBangkok = new Date().toLocaleDateString(
        "sv-SE",
        { timeZone: "Asia/Bangkok" }
    );

    const isPermanentlyLocked =
        semester.schedule_locked_at != null;

    const isExpired =
        !isPermanentlyLocked &&
        semester.end_date < todayBangkok;

    const semesterStatus = isPermanentlyLocked
        ? "🔒 ล็อกแล้ว"
        : isExpired
            ? "⏳ หมดอายุ"
            : "🟢 เปิดใช้งาน";

    appendRow([
        year.year,
        year.is_current
            ? "ปีปัจจุบัน"
            : "ไม่ใช่ปีปัจจุบัน",
        `${semester.semester_no} ${semesterStatus}`,
        semester.start_date,
        semester.end_date
    ], {
        ...semester,
        academicYear: year.year
    });
});

            });

        if (tbody.children.length === 0) {
            appendRow([
                "ไม่พบข้อมูล",
                "-",
                "-",
                "-",
                "-"
            ]);
        }

        status.textContent =
            `โหลดสำเร็จ: ${years.length} ปีการศึกษา / ` +
            `${semesters.length} ภาคเรียน`;

    } catch (error) {

        console.error(
            "Admin Academic Overview:",
            error
        );

        status.textContent =
            "ไม่สามารถโหลดข้อมูลได้: " +
            (error.message || "เกิดข้อผิดพลาด");

        const tr = document.createElement("tr");
        const td = document.createElement("td");

        td.colSpan = 6;
        td.textContent = "ไม่สามารถแสดงข้อมูลได้";

        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}


/* ============================================================
   MODULE 2.9 — ADMIN SEMESTER DATE MANAGEMENT
   Scoped module / regression-safe
   ============================================================ */

// false = ทดลองกระบวนการโดยไม่เขียนฐานข้อมูล
// true  = เปิดบันทึกจริง (ต้องได้รับอนุมัติก่อน)
const SEMESTER_LIVE_WRITE_ENABLED = true;

const semesterEditState = {
    revision: 0,
    previewBusy: false,
    saving: false
};

function semesterElements() {
    const id = name => document.getElementById(name);

    return {
        modal: id("admin-semester-edit-modal"),
        year: id("admin-semester-year"),
        number: id("admin-semester-number"),
        start: id("admin-semester-start-date"),
        end: id("admin-semester-end-date"),
        reason: id("admin-semester-reason"),
        reasonGroup: id("admin-semester-reason-group"),
        status: id("admin-semester-impact-status"),
        preview: id("admin-semester-preview-btn"),
        save: id("admin-semester-save-btn"),
        cancel: id("admin-semester-cancel-btn"),
        form: id("admin-semester-edit-form")
    };
}

function semesterSetStatus(message, type = "warning") {
    const { status } = semesterElements();
    if (!status) return;

    const colors = {
        warning: ["#fffbeb", "#f59e0b", "#92400e"],
        success: ["#f0fdf4", "#22c55e", "#15803d"],
        error: ["#fef2f2", "#ef4444", "#b91c1c"],
        info: ["#eff6ff", "#93c5fd", "#1d4ed8"]
    };

    const [background, border, color] =
        colors[type] || colors.warning;

    status.textContent = message;
    status.style.background = background;
    status.style.borderColor = border;
    status.style.color = color;
    status.style.fontWeight = "600";
}

function semesterSignature() {
    const e = semesterElements();

    return JSON.stringify({
        semesterId: e.modal?.dataset.semesterId || "",
        startDate: e.start?.value || "",
        endDate: e.end?.value || ""
    });
}

function semesterInvalidatePreview() {
    const e = semesterElements();
    semesterEditState.revision++;

    if (!e.modal) return;

    delete e.modal.dataset.previewApproved;
    delete e.modal.dataset.previewSignature;

    if (e.reasonGroup) {
        e.reasonGroup.style.display = "none";
    }

    if (e.reason) e.reason.value = "";

    semesterSetStatus(
        "⚠️ วันที่มีการเปลี่ยนแปลง กรุณาตรวจสอบผลกระทบใหม่"
    );

    checkAdminSemesterSaveReadiness();
}

function openAdminSemesterDetails(semester) {
    if (!semester?.id) {
        Swal.fire("ไม่พบข้อมูล", "ไม่พบภาคเรียนที่เลือก", "error");
        return;
    }

    const e = semesterElements();
    if (!e.modal || !e.form) return;

    if (semesterEditState.saving) return;

    semesterEditState.revision++;

    e.form.reset();

    e.modal.dataset.semesterId = semester.id;
    e.modal.dataset.originalStartDate =
        semester.start_date || "";
    e.modal.dataset.originalEndDate =
        semester.end_date || "";

    delete e.modal.dataset.previewApproved;
    delete e.modal.dataset.previewSignature;

    e.year.value = semester.academicYear ?? "-";
    e.number.value = semester.semester_no ?? "-";
    e.start.value = semester.start_date || "";
    e.end.value = semester.end_date || "";
    e.reason.value = "";

    e.reasonGroup.style.display = "none";
    e.modal.style.display = "flex";

    semesterSetStatus(
        "⚠️ กรุณาตรวจสอบผลกระทบก่อนบันทึก"
    );

    checkAdminSemesterSaveReadiness();
}

function closeAdminSemesterDetails() {
    if (semesterEditState.saving) return;

    const e = semesterElements();

    semesterEditState.revision++;

    if (e.modal) {
        e.modal.style.display = "none";
        delete e.modal.dataset.previewApproved;
        delete e.modal.dataset.previewSignature;
    }

    if (e.reasonGroup) {
        e.reasonGroup.style.display = "none";
    }

    checkAdminSemesterSaveReadiness();
}

function checkAdminSemesterSaveReadiness() {
    const e = semesterElements();

    if (!e.modal || !e.save) return null;

    const semesterId = e.modal.dataset.semesterId;
    const startDate = e.start?.value || "";
    const endDate = e.end?.value || "";
    const reason = e.reason?.value.trim() || "";

    const datesValid =
        /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
        endDate >= startDate;

    const datesChanged =
        startDate !== e.modal.dataset.originalStartDate ||
        endDate !== e.modal.dataset.originalEndDate;

    const previewValid =
        e.modal.dataset.previewApproved === "true" &&
        e.modal.dataset.previewSignature ===
            semesterSignature();

    const reasonValid =
        reason.length >= 5 && reason.length <= 2000;

    const readyForSave = Boolean(
        semesterId &&
        datesValid &&
        datesChanged &&
        previewValid &&
        reasonValid &&
        !semesterEditState.previewBusy &&
        !semesterEditState.saving
    );

    // ในโหมดทดลอง ปุ่มเปิดได้แต่ไม่มีการเขียนฐานข้อมูล
    e.save.disabled = !readyForSave;

    e.save.textContent = SEMESTER_LIVE_WRITE_ENABLED
        ? "💾 บันทึกการเปลี่ยนแปลง"
        : "🧪 ทดลองยืนยัน (ไม่บันทึก)";

    e.save.setAttribute(
        "aria-disabled",
        String(!readyForSave)
    );

    e.save.style.background =
        readyForSave ? "#2563eb" : "#94a3b8";
    e.save.style.opacity = readyForSave ? "1" : "0.55";
    e.save.style.cursor =
        readyForSave ? "pointer" : "not-allowed";

    return {
        readyForSave,
        previewValid,
        reasonValid,
        datesChanged
    };
}

async function runAdminSemesterImpactPreview() {
    const e = semesterElements();

    if (
        !e.modal || !e.start || !e.end ||
        !e.preview || semesterEditState.previewBusy ||
        semesterEditState.saving
    ) return;

    semesterEditState.revision++;
    const revision = semesterEditState.revision;

    delete e.modal.dataset.previewApproved;
    delete e.modal.dataset.previewSignature;

    e.reasonGroup.style.display = "none";
    e.reason.value = "";

    const semesterId = e.modal.dataset.semesterId;
    const startDate = e.start.value;
    const endDate = e.end.value;

    if (!semesterId || !startDate || !endDate) {
        semesterSetStatus("⚠️ กรุณาระบุวันที่ให้ครบ");
        checkAdminSemesterSaveReadiness();
        return;
    }

    if (endDate < startDate) {
        semesterSetStatus(
            "❌ วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น",
            "error"
        );
        checkAdminSemesterSaveReadiness();
        return;
    }

    if (
        startDate === e.modal.dataset.originalStartDate &&
        endDate === e.modal.dataset.originalEndDate
    ) {
        semesterSetStatus(
            "ℹ️ ไม่มีการเปลี่ยนแปลง ไม่จำเป็นต้องบันทึก",
            "info"
        );
        checkAdminSemesterSaveReadiness();
        return;
    }

    semesterEditState.previewBusy = true;
    e.preview.disabled = true;
    checkAdminSemesterSaveReadiness();

    semesterSetStatus(
        "กำลังตรวจสอบผลกระทบ...",
        "info"
    );

    try {
        const result = await previewAdminSemesterDateImpact({
            semesterId,
            startDate,
            endDate
        });

        if (
            revision !== semesterEditState.revision ||
            e.modal.style.display === "none" ||
            e.modal.dataset.semesterId !== semesterId ||
            e.start.value !== startDate ||
            e.end.value !== endDate
        ) return;

        const subject =
            Number(result.subject_sessions_outside) || 0;
        const activity =
            Number(result.activity_sessions_outside) || 0;
        const total =
            Number(result.total_affected_sessions) || 0;

        if (
            result.has_overlap === true ||
            result.can_proceed !== true ||
            total > 0
        ) {
            semesterSetStatus(
                `❌ ไม่ผ่านการตรวจสอบ — ` +
                `รายวิชา ${subject} รอบ, ` +
                `กิจกรรม ${activity} รอบ` +
                (result.has_overlap
                    ? " และวันที่ทับซ้อนกับภาคเรียนอื่น"
                    : ""),
                "error"
            );
            return;
        }

        e.modal.dataset.previewApproved = "true";
        e.modal.dataset.previewSignature =
            semesterSignature();

        e.reasonGroup.style.display = "";

        semesterSetStatus(
            "✅ ผ่านการตรวจสอบผลกระทบ " +
            "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
            "success"
        );

    } catch (error) {
        if (revision === semesterEditState.revision) {
            console.error("Semester Preview:", error);
            semesterSetStatus(
                "❌ ตรวจสอบไม่สำเร็จ: " +
                (error.message || "เกิดข้อผิดพลาด"),
                "error"
            );
        }
    } finally {
        semesterEditState.previewBusy = false;
        e.preview.disabled = false;
        checkAdminSemesterSaveReadiness();
    }
}

async function showAdminSemesterSaveConfirmation() {
    if (semesterEditState.saving) return;

    const readiness =
        checkAdminSemesterSaveReadiness();

    if (!readiness?.readyForSave) {
        await Swal.fire(
            "ยังไม่พร้อมบันทึก",
            "กรุณาตรวจสอบผลกระทบและระบุเหตุผล",
            "warning"
        );
        return;
    }

    const e = semesterElements();

    // ล็อกสถานะก่อนเปิดหน้าต่างยืนยัน
    semesterEditState.saving = true;
    checkAdminSemesterSaveReadiness();

    const semesterId = e.modal.dataset.semesterId;
    const startDate = e.start.value;
    const endDate = e.end.value;
    const reason = e.reason.value.trim();
    const signature = semesterSignature();

    const confirmationText = [
        `ปีการศึกษา: ${e.year.value}`,
        `ภาคเรียน: ${e.number.value}`,
        `วันเริ่มต้นเดิม: ${e.modal.dataset.originalStartDate}`,
        `วันเริ่มต้นใหม่: ${startDate}`,
        `วันสิ้นสุดเดิม: ${e.modal.dataset.originalEndDate}`,
        `วันสิ้นสุดใหม่: ${endDate}`,
        `เหตุผล: ${reason}`,
        "",
        SEMESTER_LIVE_WRITE_ENABLED
            ? "การยืนยันจะบันทึกลง Supabase จริง"
            : "โหมดทดลอง: ไม่มีการเปลี่ยนข้อมูลจริง"
    ].join("\n");

    try {
        const confirmation = await Swal.fire({
            icon: "question",
            title: "ยืนยันการเปลี่ยนวันที่ภาคเรียน?",
            text: confirmationText,
            showCancelButton: true,
            confirmButtonText:
                SEMESTER_LIVE_WRITE_ENABLED
                    ? "ยืนยันบันทึกจริง"
                    : "ทดลองยืนยัน",
            cancelButtonText: "ยกเลิก",
            didOpen: () => {
                const container =
                    Swal.getHtmlContainer();

                if (container) {
                    container.style.whiteSpace = "pre-line";
                    container.style.textAlign = "left";
                }
            }
        });

        if (!confirmation.isConfirmed) return;

        // จุดป้องกัน: โหมดทดลองไม่เรียก RPC เขียนข้อมูล
        if (!SEMESTER_LIVE_WRITE_ENABLED) {
            await Swal.fire({
                icon: "info",
                title: "ทดลองสำเร็จ",
                text: "ตรวจขั้นตอนยืนยันแล้ว " +
                      "ไม่มีการบันทึกลงฐานข้อมูล",
                confirmButtonText: "ตกลง"
            });
            return;
        }

        // ยืนยันสถานะ Preview อีกครั้ง
        if (
            e.modal.dataset.previewApproved !== "true" ||
            e.modal.dataset.previewSignature !== signature ||
            semesterSignature() !== signature ||
            e.reason.value.trim() !== reason
        ) {
            throw new Error(
                "ข้อมูลเปลี่ยนแปลง กรุณาตรวจสอบใหม่"
            );
        }

        // ตรวจผลกระทบซ้ำก่อนส่งคำสั่งบันทึก
        const impact =
            await previewAdminSemesterDateImpact({
                semesterId,
                startDate,
                endDate
            });

        if (
            impact.can_proceed !== true ||
            impact.has_overlap === true ||
            Number(impact.total_affected_sessions) !== 0
        ) {
            throw new Error(
                "ผลกระทบเปลี่ยนแปลง กรุณาตรวจสอบใหม่"
            );
        }

        // RPC ฝั่งฐานข้อมูลตรวจสิทธิ์และผลกระทบซ้ำ
        await updateAdminSemesterDates({
            semesterId,
            startDate,
            endDate,
            reason
        });

        closeAdminSemesterDetailsAfterSave();

        await Swal.fire({
            icon: "success",
            title: "บันทึกสำเร็จ",
            text: "ปรับวันที่ภาคเรียนเรียบร้อยแล้ว",
            confirmButtonText: "ตกลง"
        });

        await loadAdminAcademicOverview();

    } catch (error) {
        console.error("Semester Save:", error);

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถบันทึกได้",
            text: error.message || "เกิดข้อผิดพลาด",
            confirmButtonText: "ตกลง"
        });

        semesterInvalidatePreview();

    } finally {
        semesterEditState.saving = false;
        checkAdminSemesterSaveReadiness();
    }
}

function closeAdminSemesterDetailsAfterSave() {
    const e = semesterElements();

    semesterEditState.revision++;

    if (e.modal) {
        e.modal.style.display = "none";
        delete e.modal.dataset.previewApproved;
        delete e.modal.dataset.previewSignature;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const e = semesterElements();

    if (
        !e.modal || !e.form || !e.preview ||
        !e.save || !e.cancel
    ) {
        console.warn("Semester Management: missing elements");
        return;
    }

    e.cancel.addEventListener(
        "click",
        closeAdminSemesterDetails
    );

    e.modal.addEventListener("click", event => {
        if (event.target === e.modal) {
            closeAdminSemesterDetails();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            e.modal.style.display !== "none"
        ) {
            closeAdminSemesterDetails();
        }
    });

    e.start.addEventListener(
        "input",
        semesterInvalidatePreview
    );

    e.end.addEventListener(
        "input",
        semesterInvalidatePreview
    );

    e.reason.addEventListener("input", () => {
        const result =
            checkAdminSemesterSaveReadiness();

        if (!result?.previewValid) return;

        semesterSetStatus(
            result.reasonValid
                ? "✅ ผ่านการตรวจสอบ พร้อมยืนยัน"
                : "⚠️ กรุณาระบุเหตุผล 5–2,000 ตัวอักษร",
            result.reasonValid ? "success" : "warning"
        );
    });

    e.preview.addEventListener(
        "click",
        runAdminSemesterImpactPreview
    );

    e.form.addEventListener("submit", event => {
        event.preventDefault();
        showAdminSemesterSaveConfirmation();
    });

    checkAdminSemesterSaveReadiness();
});

/* =====================================================
   MODULE 3.0 — ACADEMIC YEAR / SEMESTER CREATION
   ===================================================== */

const ACADEMIC_CREATE_LIVE_ENABLED = true;

const academicCreateState = {
    busy: false
};

function academicCreateText(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[ch]
    );
}

async function academicConfirmCreation(title, details, saveAction) {
    if (academicCreateState.busy) return;

    academicCreateState.busy = true;

    const buttons = [
        document.getElementById("admin-add-year-btn"),
        document.getElementById("admin-add-semester-btn")
    ];

    buttons.forEach(button => {
        if (button) button.disabled = true;
    });

    try {
        const confirmation = await Swal.fire({
            icon: "question",
            title,
            text: details +
                (ACADEMIC_CREATE_LIVE_ENABLED
                    ? "\n\nการยืนยันจะเพิ่มข้อมูลจริง"
                    : "\n\nโหมดทดลอง: ไม่เพิ่มข้อมูลจริง"),
            showCancelButton: true,
            confirmButtonText: ACADEMIC_CREATE_LIVE_ENABLED
                ? "ยืนยันเพิ่มข้อมูลจริง"
                : "ทดลองยืนยัน",
            cancelButtonText: "ยกเลิก",
            didOpen: () => {
                const el = Swal.getHtmlContainer();
                if (el) {
                    el.style.whiteSpace = "pre-line";
                    el.style.textAlign = "left";
                }
            }
        });

        if (!confirmation.isConfirmed) return;

        if (!ACADEMIC_CREATE_LIVE_ENABLED) {
            await Swal.fire({
                icon: "info",
                title: "ทดลองสำเร็จ",
                text: "ไม่มีการเพิ่มข้อมูลลง Supabase",
                confirmButtonText: "ตกลง"
            });
            return;
        }

        await saveAction();

        await loadAdminAcademicOverview();

        await Swal.fire({
            icon: "success",
            title: "เพิ่มข้อมูลสำเร็จ",
            confirmButtonText: "ตกลง"
        });

    } catch (error) {
        console.error("Academic Create:", error);

        await Swal.fire({
            icon: "error",
            title: "ไม่สามารถเพิ่มข้อมูลได้",
            text: error.message || "เกิดข้อผิดพลาด",
            confirmButtonText: "ตกลง"
        });

    } finally {
        academicCreateState.busy = false;
        buttons.forEach(button => {
            if (button) button.disabled = false;
        });
    }
}

async function openAdminCreateAcademicYear() {
    if (academicCreateState.busy) return;

    try {
        const data = await getAdminAcademicOverview();
        const existingYears = new Set(
            data.academicYears.map(y => Number(y.year))
        );

        const result = await Swal.fire({
            title: "＋ เพิ่มปีการศึกษา",
            html: `
                <div class="academic-create-form">
                    <label>ปีการศึกษา (พ.ศ.)</label>
                    <input id="new-academic-year"
                           class="swal2-input"
                           type="number"
                           min="1901"
                           max="9999"
                           placeholder="เช่น 2575">

                    <label>เหตุผลในการเพิ่ม</label>
                    <textarea id="new-academic-year-reason"
                              class="swal2-textarea"
                              maxlength="2000"
                              placeholder="ระบุเหตุผลอย่างน้อย 5 ตัวอักษร"></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบข้อมูล",
            cancelButtonText: "ยกเลิก",
            focusConfirm: false,
            preConfirm: () => {
                const popup = Swal.getPopup();
                const rawYear = popup.querySelector(
                    "#new-academic-year"
                ).value.trim();

                const year = Number(rawYear);
                const reason = popup.querySelector(
                    "#new-academic-year-reason"
                ).value.trim();

                if (
                    !/^\d{4}$/.test(rawYear) ||
                    year <= 1900 ||
                    year > 9999
                ) {
                    Swal.showValidationMessage(
                        "กรุณาระบุปีการศึกษา พ.ศ. ให้ถูกต้อง"
                    );
                    return false;
                }

                if (existingYears.has(year)) {
                    Swal.showValidationMessage(
                        "ปีการศึกษานี้มีอยู่แล้ว"
                    );
                    return false;
                }

                if (
                    reason.length < 5 ||
                    reason.length > 2000
                ) {
                    Swal.showValidationMessage(
                        "กรุณาระบุเหตุผล 5–2,000 ตัวอักษร"
                    );
                    return false;
                }

                return { year, reason };
            }
        });

        if (!result.isConfirmed) return;

        const { year, reason } = result.value;

        await academicConfirmCreation(
            "ยืนยันเพิ่มปีการศึกษา?",
            `ปีการศึกษา: ${year}\nสถานะ: ไม่ใช่ปีปัจจุบัน\nเหตุผล: ${reason}`,
            () => createAdminAcademicYear({
                year,
                reason
            })
        );

    } catch (error) {
        await Swal.fire(
            "ไม่สามารถเตรียมข้อมูลได้",
            error.message || "เกิดข้อผิดพลาด",
            "error"
        );
    }
}

async function openAdminCreateSemester() {
    if (academicCreateState.busy) return;

    try {
        const data = await getAdminAcademicOverview();
        const years = [...data.academicYears]
            .sort((a, b) => a.year - b.year);

        if (years.length === 0) {
            await Swal.fire(
                "ยังไม่มีปีการศึกษา",
                "กรุณาเพิ่มปีการศึกษาก่อน",
                "warning"
            );
            return;
        }

        const yearOptions = years.map(year => `
            <option value="${academicCreateText(year.id)}">
                ${academicCreateText(year.year)}
            </option>
        `).join("");

        const result = await Swal.fire({
            title: "＋ เพิ่มภาคเรียน",
            html: `
                <div class="academic-create-form">
                    <label>ปีการศึกษา</label>
                    <select id="new-semester-year"
                            class="swal2-select">
                        ${yearOptions}
                    </select>

                    <label>ภาคเรียน</label>
                    <select id="new-semester-number"
                            class="swal2-select">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                    </select>

                    <label>วันเริ่มต้น</label>
                    <input id="new-semester-start"
                           type="date"
                           class="swal2-input">

                    <label>วันสิ้นสุด</label>
                    <input id="new-semester-end"
                           type="date"
                           class="swal2-input">

                    <label>เหตุผลในการเพิ่ม</label>
                    <textarea id="new-semester-reason"
                              class="swal2-textarea"
                              maxlength="2000"></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบข้อมูล",
            cancelButtonText: "ยกเลิก",
            focusConfirm: false,
            preConfirm: () => {
                const popup = Swal.getPopup();
                const get = id =>
                    popup.querySelector("#" + id).value;

                const academicYearId =
                    get("new-semester-year");
                const semesterNo =
                    Number(get("new-semester-number"));
                const startDate =
                    get("new-semester-start");
                const endDate =
                    get("new-semester-end");
                const reason =
                    get("new-semester-reason").trim();

                if (!startDate || !endDate ||
                    endDate < startDate) {
                    Swal.showValidationMessage(
                        "กรุณาตรวจสอบช่วงวันที่ภาคเรียน"
                    );
                    return false;
                }

                if (
                    data.semesters.some(s =>
                        s.academic_year_id === academicYearId &&
                        Number(s.semester_no) === semesterNo
                    )
                ) {
                    Swal.showValidationMessage(
                        "ภาคเรียนนี้มีอยู่แล้วในปีที่เลือก"
                    );
                    return false;
                }

                // MODULE 3.0 — ตรวจปีการศึกษากับปีของวันที่
                const selectedYear = years.find(
                    y => y.id === academicYearId
                );

                if (!selectedYear) {
                    Swal.showValidationMessage(
                        "ไม่พบปีการศึกษาที่เลือก"
                    );
                    return false;
                }

                const firstADYear =
                    Number(selectedYear.year) - 543;

                const lastADYear = firstADYear + 1;

                const startADYear =
                    Number(startDate.slice(0, 4));

                const endADYear =
                    Number(endDate.slice(0, 4));

                if (
                    startADYear < firstADYear ||
                    startADYear > lastADYear ||
                    endADYear < firstADYear ||
                    endADYear > lastADYear
                ) {

                Swal.showValidationMessage(
    `ปีการศึกษา ${selectedYear.year} ` +
    `ต้องเลือกวันที่ในช่วง พ.ศ. ` +
    `${selectedYear.year}–${Number(selectedYear.year) + 1} ` +
    `(ค.ศ. ${firstADYear}–${lastADYear}) เท่านั้น`
                );

                    return false;
                }

                const overlapping = data.semesters.some(s =>
                    s.academic_year_id === academicYearId &&
                    s.start_date &&
                    s.end_date &&
                    s.start_date <= endDate &&
                    s.end_date >= startDate
                );

                if (overlapping) {
                    Swal.showValidationMessage(
                        "ช่วงวันที่ทับซ้อนภาคเรียนอื่นในปีเดียวกัน"
                    );
                    return false;
                }

                if (
                    reason.length < 5 ||
                    reason.length > 2000
                ) {
                    Swal.showValidationMessage(
                        "กรุณาระบุเหตุผล 5–2,000 ตัวอักษร"
                    );
                    return false;
                }

                return {
                    academicYearId,
                    semesterNo,
                    startDate,
                    endDate,
                    reason
                };
            }
        });

        if (!result.isConfirmed) return;

        const values = result.value;
        const year = years.find(
            y => y.id === values.academicYearId
        );

        await academicConfirmCreation(
            "ยืนยันเพิ่มภาคเรียน?",
            [
                `ปีการศึกษา: ${year?.year ?? "-"}`,
                `ภาคเรียน: ${values.semesterNo}`,
                `วันเริ่มต้น: ${values.startDate}`,
                `วันสิ้นสุด: ${values.endDate}`,
                `เหตุผล: ${values.reason}`
            ].join("\n"),
            () => createAdminSemester(values)
        );

    } catch (error) {
        await Swal.fire(
            "ไม่สามารถเตรียมข้อมูลได้",
            error.message || "เกิดข้อผิดพลาด",
            "error"
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("admin-add-year-btn")
        ?.addEventListener(
            "click",
            openAdminCreateAcademicYear
        );

    document.getElementById("admin-add-semester-btn")
        ?.addEventListener(
            "click",
            openAdminCreateSemester
        );
});