/* ============================================================
   Student Detail
   ------------------------------------------------------------
   หน้าที่:
   - แสดงรายละเอียดนักเรียนแบบ View Only
   - รับ student.id จาก Student Management
   - แสดงข้อมูลประจำตัว
   - จัดการ 3 Tabs ของ Student Detail
   - ไม่มี Edit
   ============================================================ */

const StudentDetail = (() => {
    let currentStudentId = null;
    let currentStudent = null;
    let returnView = "student-management";
    async function open(studentId) {
            const detailView =
        document.getElementById("view-student-detail");

    if (!detailView || detailView.style.display === "none") {
        const currentVisibleView =
            [...document.querySelectorAll('[id^="view-"]')]
                .find(el =>
                    el.id !== "view-student-detail" &&
                    getComputedStyle(el).display !== "none"
                );

        if (currentVisibleView) {
            returnView =
                currentVisibleView.id.replace("view-", "");
        }
    }

// ============================================================
// Permission Guard
// ============================================================

const authUser = await supabaseClient.auth.getUser();

if (authUser.error || !authUser.data?.user) {
    showError("กรุณาเข้าสู่ระบบ");
    return;
}

// ------------------------------------------------------------
// ถ้าเปิด Student Detail จากเมนูโดยไม่มี studentId
// ------------------------------------------------------------

if (!studentId) {

    const roleName = await getCurrentUserRole();

    // Student → เปิดข้อมูลของตัวเองทันที
    if (roleName === "Student") {

        const currentStudent =
            await getCurrentStudent();

        if (!currentStudent?.id) {
            showError("ไม่พบข้อมูลนักเรียนของผู้ใช้งาน");
            return;
        }

        studentId = currentStudent.id;

        } else if (roleName === "Parent") {

        const parentStudents =
            await getCurrentParentStudents();

        switchView("student-detail");

        await renderParentStudentList(
            parentStudents || []
        );

        return;

    } else {

        // Admin / Teacher
        // ใช้ Selector เดิม ห้ามเปลี่ยนพฤติกรรม
        switchView("student-detail");
        await renderStudentSelector();
        return;
    }
}

// ------------------------------------------------------------
// ตรวจ Scope ของนักเรียนที่กำลังเปิด
// ------------------------------------------------------------

const scope =
    await getStudentDetailScope(studentId);

if (!scope?.allowed) {

    showError(
        "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนักเรียนรายนี้"
    );

    return;
}

    // =========================================================
    // Student ID
    // =========================================================
    if (!studentId) {
        showError("ไม่พบรหัสอ้างอิงนักเรียน");
        return;
    }

    currentStudentId = studentId;

    try {

        switchView("student-detail");

        renderLoading();

        currentStudent =
    await getStudentById(studentId);

if (!currentStudent) {
    throw new Error(
        "ไม่พบข้อมูลนักเรียน"
    );
}

if (currentStudent.photo_url) {
    const { data, error } = await supabaseClient
        .storage
        .from("student-photos")
        .createSignedUrl(currentStudent.photo_url, 3600);

    if (!error && data?.signedUrl) {
        currentStudent.photo_url = data.signedUrl;
    } else {
        console.warn("[Student Detail] Photo URL error:", error);
        currentStudent.photo_url = null;
    }
}

renderStudentDetail(
    currentStudent
);

    } catch (error) {

        console.error(
            "[Student Detail] Load error:",
            error
        );

        renderError(
            error.message ||
            "ไม่สามารถโหลดข้อมูลนักเรียนได้"
        );
    }
}
async function searchStudents() {
    const roomId =
        document.getElementById("student-detail-room")?.value || "";

    const search =
        document.getElementById("student-detail-search")?.value.trim() || "";

    const results =
        document.getElementById("student-detail-search-results");

    if (!results) return;

    if (!roomId && !search) {
        results.innerHTML = `
            <div style="text-align:center;color:#777;padding:20px;">
                กรุณาเลือกห้องหรือกรอกคำค้นหา
            </div>
        `;
        return;
    }

    results.innerHTML = `
        <div style="text-align:center;color:#777;padding:20px;">
            ⏳ กำลังค้นหา...
        </div>
    `;

    try {
        const students =
            await searchStudentDetailCandidates({
                roomId,
                search
            });

        if (!students || students.length === 0) {
            results.innerHTML = `
                <div style="text-align:center;color:#777;padding:20px;">
                    ไม่พบข้อมูลนักเรียน
                </div>
            `;
            return;
        }

                results.innerHTML = students.map(student => {
            const fullName = [
                student.prefix,
                student.first_name,
                student.last_name
            ].filter(Boolean).join(" ");

            return `
                <div
                    class="student-detail-search-result"
                    style="display:grid;grid-template-columns:100px 1fr 100px 110px 100px auto;gap:12px;align-items:center;padding:12px 16px;margin-bottom:8px;border:1px solid #ddd;border-radius:8px;background:#fff;"
                >
                    <div>
                        <strong>${escapeHtml(student.student_code || "-")}</strong>
                    </div>

                    <div>
                        <div style="font-weight:600;">
                            ${escapeHtml(fullName || "-")}
                        </div>
                        <div style="font-size:12px;color:#777;">
                            ชื่อเล่น: ${escapeHtml(student.nickname || "-")}
                        </div>
                    </div>

                    <div style="color:#666;">
                        เลขที่ ${escapeHtml(student.student_no ?? "-")}
                    </div>

                    <div style="color:#666;">
                        ${escapeHtml(student.room_name || "-")}
                    </div>

                    <div>
                        <span class="student-detail-status ${String(student.current_status || "").toLowerCase()}">
                            ${escapeHtml(student.current_status || "-")}
                        </span>
                    </div>

                    <div>
                        <button
                            type="button"
                            class="btn btn-primary student-detail-view-btn"
                            data-student-id="${escapeHtml(student.id)}"
                        >
                            👁 รายละเอียด
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        results
            .querySelectorAll(".student-detail-view-btn")
            .forEach(button => {
                button.addEventListener("click", () => {
                    open(button.dataset.studentId);
                });
            });

    } catch (error) {
        console.error(
            "[Student Detail] Search error:",
            error
        );

        results.innerHTML = `
            <div style="text-align:center;color:#c00;padding:20px;">
                ไม่สามารถค้นหาข้อมูลนักเรียนได้
            </div>
        `;
    }
}
async function renderParentStudentList(parentStudents) {

    const container =
        document.getElementById(
            "student-detail-container"
        );

    if (!container) return;

    // --------------------------------------------------------
    // ไม่มีบุตรที่ผูกไว้
    // --------------------------------------------------------

    if (
        !Array.isArray(parentStudents) ||
        parentStudents.length === 0
    ) {

        container.innerHTML = `
            <div class="student-detail-error">
                <div class="student-detail-error-icon">⚠️</div>

                <h3>ไม่พบข้อมูลบุตร</h3>

                <p>
                    ไม่พบข้อมูลนักเรียนที่ผูกกับบัญชีผู้ปกครอง
                </p>
            </div>
        `;

        return;
    }

    // --------------------------------------------------------
    // แสดงเฉพาะบุตรที่ getCurrentParentStudents() คืนมา
    // --------------------------------------------------------

    container.innerHTML = `
        <div class="student-detail-section">

            <div class="student-detail-section-title">

                <span>👨‍👩‍👧</span>

                <div>
                    <h3>นักเรียนในความดูแล</h3>

                    <p>
                        รายการบุตรที่ผูกกับบัญชีผู้ปกครอง
                    </p>
                </div>

            </div>

            <div style="margin-top:20px;">

                ${parentStudents.map(student => {

                    const fullName = [
                        student.prefix,
                        student.first_name,
                        student.last_name
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return `
                        <div
                            class="student-detail-search-result"
                            style="
                                display:grid;
                                grid-template-columns:120px 1fr auto;
                                gap:16px;
                                align-items:center;
                                padding:16px;
                                margin-bottom:10px;
                                border:1px solid #ddd;
                                border-radius:8px;
                                background:#fff;
                            "
                        >

                            <div>
                                <strong>
                                    ${escapeHtml(
                                        student.student_code || "-"
                                    )}
                                </strong>
                            </div>

                            <div>

                                <div style="font-weight:600;">
                                    ${escapeHtml(
                                        fullName || "-"
                                    )}
                                </div>

                                <div
                                    style="
                                        font-size:12px;
                                        color:#777;
                                    "
                                >
                                    ชื่อเล่น:
                                    ${escapeHtml(
                                        student.nickname || "-"
                                    )}
                                </div>

                            </div>

                            <div>

                                <button
                                    type="button"
                                    class="btn btn-primary parent-student-detail-btn"
                                    data-student-id="${escapeHtml(
                                        student.id
                                    )}"
                                >
                                    👁 รายละเอียด
                                </button>

                            </div>

                        </div>
                    `;

                }).join("")}

            </div>

        </div>
    `;

    // --------------------------------------------------------
    // ปุ่มเปิดรายละเอียด
    // --------------------------------------------------------

    container
        .querySelectorAll(
            ".parent-student-detail-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    open(
                        button.dataset.studentId
                    );

                }
            );

        });
}

async function renderStudentSelector() {
    const container = document.getElementById("student-detail-container");
    if (!container) return;

    let roomData = {
        academicYear: null,
        rooms: []
    };

    try {
        roomData = await getStudentDetailRooms();
    } catch (error) {
        console.error(
            "[Student Detail] Room load error:",
            error
        );
    }

    const academicYear =
        roomData?.academicYear || "-";

    const rooms =
        roomData?.rooms || [];

    container.innerHTML = `
        <div class="student-detail-section">
            <div class="student-detail-section-title">
                <span>🔎</span>
                <div>
                    <h3>ค้นหานักเรียน</h3>
                    <p>
                        ปีการศึกษา ${escapeHtml(academicYear)}
                        · เลือกห้องหรือค้นหาด้วยรหัส เลขที่ ชื่อ หรือนามสกุล
                    </p>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:220px 1fr auto;gap:12px;align-items:end;">
                <div>
                    <label class="student-detail-info-label">ห้องเรียน</label>
                    <select id="student-detail-room" class="form-control">
                        <option value="">ทุกห้อง</option>
                        ${rooms.map(room => `
                            <option value="${escapeHtml(room.id)}">
                                ${escapeHtml(room.room_name || "-")}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div>
                    <label class="student-detail-info-label">ค้นหานักเรียน</label>
                    <input
                        type="text"
                        id="student-detail-search"
                        class="form-control"
                        placeholder="รหัส / เลขที่ / ชื่อ / นามสกุล"
                    >
                </div>

                <button
                    type="button"
                    id="student-detail-search-btn"
                    class="btn btn-primary"
                >
                    🔎 ค้นหา
                </button>
            </div>

            <div id="student-detail-search-results" style="margin-top:20px;">
                <div style="text-align:center;color:#777;padding:20px;">
                    กรุณาเลือกห้องหรือกรอกคำค้นหา แล้วกดค้นหา
                </div>
            </div>
        </div>
    `;

    document
        .getElementById("student-detail-search-btn")
        ?.addEventListener("click", searchStudents);

    document
        .getElementById("student-detail-search")
        ?.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                searchStudents();
            }
        });
}

    // =========================================================
    // Render Loading
    // =========================================================
    function renderLoading() {
        const container = document.getElementById("student-detail-container");
        if (!container) return;
        container.innerHTML = `
            <div class="student-detail-loading">
                <div class="student-detail-loading-icon">⏳</div>
                <div>กำลังโหลดข้อมูลนักเรียน...</div>
            </div>
        `;
    }

    // =========================================================
    // Render Error
    // =========================================================
    function renderError(message) {
        const container = document.getElementById("student-detail-container");
        if (!container) return;
        container.innerHTML = `
            <div class="student-detail-error">
                <div class="student-detail-error-icon">⚠️</div>
                <h3>ไม่สามารถแสดงข้อมูลได้</h3>
                <p>${escapeHtml(message)}</p>
                <button type="button" class="btn" onclick="StudentDetail.back()">
                    ← กลับรายชื่อนักเรียน
                </button>
            </div>
        `;
    }

    function getStatusLabel(status) {
    const labels = {
        ACTIVE: "กำลังศึกษา (Active)",
        GRADUATED: "สำเร็จการศึกษา (Graduated)",
        WITHDRAWN: "ลาออก (Withdrawn)",
        TRANSFERRED: "ย้ายสถานศึกษา (Transferred)",
        DECEASED: "เสียชีวิต (Deceased)"
    };

    return labels[status] || status || "-";
    }
    // =========================================================
    // Render Main
    // =========================================================
    function renderStudentDetail(student) {
        const container = document.getElementById("student-detail-container");
        if (!container) return;

        const fullName = [student.prefix, student.first_name, student.last_name].filter(Boolean).join(" ");
        const initials = getInitials(student.first_name, student.last_name);
        const status = student.current_status || "-";
        const statusLabel = getStatusLabel(status);
        const statusClass = String(status).toLowerCase().replace(/[^a-z0-9_-]/g, "");

        container.innerHTML = `
            <!-- Student Header -->
            <div class="student-detail-header">
                <div class="student-detail-profile">
                    <div class="student-detail-avatar">
                        ${student.photo_url 
                            ? `<img src="${escapeHtml(student.photo_url)}" alt="รูปนักเรียน">` 
                            : `<span>${escapeHtml(initials)}</span>`
                        }
                    </div>
                    <div class="student-detail-identity">
                        <h2>${escapeHtml(fullName || "-")}</h2>
                        <div class="student-detail-meta">
                            <span>รหัสนักเรียน: <strong>${escapeHtml(student.student_code || "-")}</strong></span>
                            <span>เลขที่: <strong>${escapeHtml(student.student_no ?? "-")}</strong></span>
                            <span>ห้อง: <strong>${escapeHtml(student.room_name || "-")}</strong></span>
                        </div>
                    </div>
                    ${escapeHtml(statusLabel)}
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="student-detail-tabs">
                <button type="button" class="student-detail-tab active" data-tab="overview" onclick="StudentDetail.switchTab('overview')">📊 ภาพรวม</button>
                <button type="button" class="student-detail-tab" data-tab="attendance" onclick="StudentDetail.switchTab('attendance')">📅 การมาเรียน</button>
                <button type="button" class="student-detail-tab" data-tab="education" onclick="StudentDetail.switchTab('education')">🎓 การศึกษา / ประวัติ</button>
            </div>

            <!-- Tab Content -->
            <div class="student-detail-tab-content">
                <section id="student-detail-tab-overview" class="student-detail-tab-panel active">
                    ${renderOverview(student)}
                </section>
                <section id="student-detail-tab-attendance" class="student-detail-tab-panel" style="display:none;">
                    ${renderAttendancePlaceholder()}
                </section>
                <section id="student-detail-tab-education" class="student-detail-tab-panel" style="display:none;">
                    ${renderEducationPlaceholder()}
                </section>
            </div>

            <!-- Back -->
            <div class="student-detail-footer">
                <button type="button" class="btn" onclick="StudentDetail.back()">← กลับรายชื่อนักเรียน</button>
            </div>
        `;
    }

    // =========================================================
    // Overview
    // =========================================================
    function renderOverview(student) {
        const fullName = [student.prefix, student.first_name, student.last_name].filter(Boolean).join(" ");
        return `
            <div class="student-detail-section">
                <div class="student-detail-section-title">
                    <span>👤</span>
                    <div>
                        <h3>ข้อมูลประจำตัว</h3>
                        <p>ข้อมูลพื้นฐานของนักเรียน</p>
                    </div>
                </div>
                <div class="student-detail-info-grid">
                    ${infoItem("ชื่อ - นามสกุล", fullName || "-")}
                    ${infoItem("ชื่อเล่น", student.nickname || "-")}
                    ${infoItem("เพศ", formatGender(student.gender))}
                    ${infoItem("วันเกิด", formatBirthDate(student.birth_date))}
                    ${infoItem("รหัสนักเรียน", student.student_code || "-")}
                    ${infoItem("เลขที่", student.student_no ?? "-")}
                    ${infoItem("ห้องเรียน", student.room_name || "-")}
                    ${infoItem("สถานะปัจจุบัน", getStatusLabel(student.current_status))}
                </div>
            </div>
            <div class="student-detail-section">
                <div class="student-detail-section-title">
                    <span>📌</span>
                    <div>
                        <h3>ข้อมูลการศึกษา</h3>
                        <p>ข้อมูลส่วนนี้จะเชื่อมกับประวัติการศึกษาในขั้นถัดไป</p>
                    </div>
                </div>
                <div class="student-detail-coming-soon">
                    <div class="student-detail-coming-icon">🎓</div>
                    <div>
                        <strong>เตรียมเชื่อมข้อมูลการศึกษา</strong>
                        <p>ระบบจะนำประวัติการศึกษา และผลการเรียนของนักเรียนมาแสดงในส่วนนี้</p>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // Attendance Placeholder
    // =========================================================
    function renderAttendancePlaceholder() {
        return `
            <div class="student-detail-section">
                <div class="student-detail-section-title">
                    <span>📅</span>
                    <div>
                        <h3>การมาเรียน</h3>
                        <p>สรุปประวัติการมาเรียนของนักเรียน</p>
                    </div>
                </div>
                <div class="student-detail-coming-soon">
                    <div class="student-detail-coming-icon">📅</div>
                    <div>
                        <strong>เตรียมเชื่อมข้อมูลการมาเรียน</strong>
                        <p>ส่วนนี้จะดึงข้อมูลจากระบบ Attendance โดยไม่สร้างข้อมูลการมาเรียนซ้ำ</p>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // Education Placeholder
    // =========================================================
    function renderEducationPlaceholder() {
        return `
            <div class="student-detail-section">
                <div class="student-detail-section-title">
                    <span>🎓</span>
                    <div>
                        <h3>การศึกษา / ประวัติ</h3>
                        <p>ประวัติการศึกษาและผลการเรียน</p>
                    </div>
                </div>
                <div class="student-detail-coming-soon">
                    <div class="student-detail-coming-icon">🎓</div>
                    <div>
                        <strong>เตรียมเชื่อมข้อมูลการศึกษา</strong>
                        <p>เราจะตรวจสอบโครงสร้างฐานข้อมูลผลการเรียนก่อน แล้วจึงเชื่อมข้อมูลจริงเข้ามา</p>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // Info Item
    // =========================================================
    function infoItem(label, value) {
        return `
            <div class="student-detail-info-item">
                <div class="student-detail-info-label">${escapeHtml(label)}</div>
                <div class="student-detail-info-value">${escapeHtml(value)}</div>
            </div>
        `;
    }

    // =========================================================
    // Switch Tab
    // =========================================================
    function switchTab(tabName) {
        const validTabs = ["overview", "attendance", "education"];
        if (!validTabs.includes(tabName)) return;

        document.querySelectorAll(".student-detail-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.tab === tabName);
        });

        document.querySelectorAll(".student-detail-tab-panel").forEach(panel => {
            panel.style.display = "none";
            panel.classList.remove("active");
        });

        const target = document.getElementById(`student-detail-tab-${tabName}`);
        if (target) {
            target.style.display = "block";
            target.classList.add("active");
        }
    }

    // =========================================================
    // Back
    // =========================================================
    async function back() {
    currentStudentId = null;
    currentStudent = null;

    await open();
    }

    // =========================================================
    // Helpers
    // =========================================================
    function formatGender(gender) {
        if (gender === "M") return "ชาย";
        if (gender === "F") return "หญิง";
        return "-";
    }

    function formatBirthDate(date) {
        if (!date) return "-";
        const parts = String(date).split("-");
        if (parts.length !== 3) return date;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function getInitials(firstName, lastName) {
        const first = String(firstName || "").trim().charAt(0);
        const last = String(lastName || "").trim().charAt(0);
        return first + last || "👤";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showError(message) {
        if (typeof Swal !== "undefined") {
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
        } else {
            alert(message);
        }
    }

    // =========================================================
    // Public API
    // =========================================================
    return {
        open,
        switchTab,
        back
    };
})();