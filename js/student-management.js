/* =========================================================
   Student Management
   ---------------------------------------------------------
   หน้าที่:
   - โหลดปีการศึกษา
   - Filter ชั้น / ห้อง / Status
   - ค้นหานักเรียน
   - โหลดรายชื่อนักเรียน
   - Select All / Select รายคน
   ========================================================= */

const StudentManagement = (() => {

    let students = [];
    let selectedStudentIds = new Set();
    let initialized = false;

    async function init() {

        if (!initialized) {
            bindEvents();
            initialized = true;
        }

        await loadAcademicYears();
        await loadRooms();
    }

    function bindEvents() {

        const yearSelect = document.getElementById("student-academic-year");
        const gradeSelect = document.getElementById("student-grade");
        const roomSelect = document.getElementById("student-room");
        const loadButton = document.getElementById("btn-load-students");

        if (yearSelect) {
            yearSelect.addEventListener("change", async () => {
                await loadRooms();
            });
        }

        if (gradeSelect) {
            gradeSelect.addEventListener("change", () => {
                filterRoomsByGrade();
            });
        }

        if (loadButton) {
            loadButton.addEventListener("click", loadStudents);
        }
    }

    // -----------------------------------------------------
    // Academic Years
    // -----------------------------------------------------

    async function loadAcademicYears() {

        const select = document.getElementById("student-academic-year");

        if (!select) return;

        try {

            const { data, error } = await supabaseClient
                .from("academic_years")
                .select("id, year, is_current")
                .order("year", { ascending: false });

            if (error) throw error;

            select.innerHTML = `
    <option value="ALL">ทุกปี</option>
    <option value="">-- เลือกปีการศึกษา --</option>
`;

            data.forEach(item => {

                const option = document.createElement("option");

                option.value = item.id;
                option.textContent = item.year;

                if (item.is_current) {
                    option.selected = true;
                }

                select.appendChild(option);
            });

        } catch (error) {

            console.error("loadAcademicYears:", error);

            showError("ไม่สามารถโหลดปีการศึกษาได้");
        }
    }

    // -----------------------------------------------------
// Rooms
// -----------------------------------------------------

async function loadRooms() {

    const yearSelect = document.getElementById("student-academic-year");
    const roomSelect = document.getElementById("student-room");

    if (!yearSelect || !roomSelect) return;

    const academicYearId = yearSelect.value;

    roomSelect.innerHTML = `
        <option value="">ทุกห้อง</option>
    `;

    if (!academicYearId) return;

    try {

        let query = supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level,
                academic_year_id
            `)
            .is("deleted_at", null);

        // ถ้าเลือกปีจริง → กรองเฉพาะห้องของปีนั้น
        // ถ้าเลือก ALL → ไม่กรอง academic_year_id
        if (academicYearId !== "ALL") {
            query = query.eq("academic_year_id", academicYearId);
        }

        const { data, error } = await query
            .order("grade_level", { ascending: true })
            .order("room_name", { ascending: true });

        if (error) throw error;

        roomSelect.dataset.rooms = JSON.stringify(data || []);

        renderRoomOptions(data || []);

    } catch (error) {

        console.error("loadRooms:", error);

        showError("ไม่สามารถโหลดห้องเรียนได้");
    }
}

    function filterRoomsByGrade() {

        const gradeSelect = document.getElementById("student-grade");
        const roomSelect = document.getElementById("student-room");

        if (!gradeSelect || !roomSelect) return;

        const rooms = JSON.parse(roomSelect.dataset.rooms || "[]");

        renderRoomOptions(
            rooms.filter(room => {
                if (!gradeSelect.value) return true;

                return String(room.grade_level) === String(gradeSelect.value);
            })
        );
    }

    function renderRoomOptions(rooms) {

        const roomSelect = document.getElementById("student-room");

        if (!roomSelect) return;

        roomSelect.innerHTML = `
            <option value="">ทุกห้อง</option>
        `;

        rooms.forEach(room => {

            const option = document.createElement("option");

            option.value = room.id;
            option.textContent = room.room_name;

            roomSelect.appendChild(option);
        });
    }

    // -----------------------------------------------------
    // Load Students
    // -----------------------------------------------------

    async function loadStudents() {

    const academicYearId =
        document.getElementById("student-academic-year")?.value;

    const gradeLevel =
        document.getElementById("student-grade")?.value;

    const roomId =
        document.getElementById("student-room")?.value;

    const search =
        document.getElementById("student-search")?.value.trim();

    const statusValues = [
        ...document.querySelectorAll(
            ".student-status-filter input[type='checkbox']:checked"
        )
    ].map(input => input.value);

    if (!academicYearId) {
        showWarning("กรุณาเลือกปีการศึกษาก่อน");
        return;
    }

    if (statusValues.length === 0) {
        showWarning("กรุณาเลือกสถานะอย่างน้อย 1 รายการ");
        return;
    }

    try {

        setLoading(true);

        students = await getStudentManagementList({
    academicYearId,
    gradeLevel,
    roomId,
    statuses: statusValues,
    search
});
// -------------------------------------------------
// Sort students by Academic Year
// ใหม่ → เก่า
// ใช้เฉพาะลำดับการแสดงผลใน Student Management
// -------------------------------------------------

students.sort((a, b) => {
    const yearA = Number(a.academic_year ?? 0);
    const yearB = Number(b.academic_year ?? 0);

    return yearB - yearA;
});

// -------------------------------------------------
// Load lower-secondary completion events
// เพื่อใช้แสดงผลใน UI เท่านั้น
// -------------------------------------------------

const studentIdsForStatus =
    (students || []).map(student => student.id);

let completedLowerSecondaryIds = new Set();

if (studentIdsForStatus.length > 0) {

    let completionQuery = supabaseClient
        .from("student_lifecycle_events")
        .select(`
            student_id
        `)
        .eq(
            "event_type",
            "COMPLETED_LOWER_SECONDARY"
        )
        .in(
            "student_id",
            studentIdsForStatus
        );

    // ถ้าเลือกปีจริง → ดู event ของปีนั้น
    // ถ้าเลือก ALL → ดู event ของทุกปี
    if (academicYearId !== "ALL") {
        completionQuery = completionQuery.eq(
            "academic_year_id",
            academicYearId
        );
    }

    const {
        data: completionEvents,
        error: completionError
    } = await completionQuery;

    if (completionError) {
        throw completionError;
    }

    completedLowerSecondaryIds =
        new Set(
            (completionEvents || []).map(
                event => event.student_id
            )
        );
}

// -------------------------------------------------
// Attach UI-only completion flag
// -------------------------------------------------

students = (students || []).map(student => ({
    ...student,

    completedLowerSecondary:
        completedLowerSecondaryIds.has(
            student.id
        )
}));

selectedStudentIds.clear();
renderStudentList();

    } catch (error) {

        console.error("loadStudents:", error);

        showError(
            error.message ||
            "ไม่สามารถโหลดรายชื่อนักเรียนได้"
        );

    } finally {

        setLoading(false);
    }
}

    // -----------------------------------------------------
    // Render
    // -----------------------------------------------------

    function renderStudentList() {

        const container =
            document.getElementById("student-list-container");

        if (!container) return;

        if (students.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก
                </div>
            `;

            return;
        }

        container.innerHTML = `

            <div class="student-list-toolbar">

                <label>
                    <input
                        type="checkbox"
                        id="student-select-all"
                    >
                    เลือกทั้งหมด
                </label>

                <span>
                    พบ ${students.length} คน
                    |
                    เลือก <strong id="student-selected-count">0</strong> คน
                </span>

            </div>

            <div class="student-table-wrapper">

                <table class="student-management-table">

                    <thead>
                        <tr>
                            <th></th>
                            <th>ปีการศึกษา</th>
                            <th>เลขที่</th>
                            <th>รหัส</th>
                            <th>ชื่อ-สกุล</th>
                            <th>ห้อง</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${students.map(student => `
                            <tr>

                                <td>
                                    <input
                                        type="checkbox"
                                        class="student-select"
                                        value="${student.id}"
                                    >
                                </td>

                                <td>
                                    ${student.academic_year ?? "-"}
                                </td>

                                <td>
                                    ${student.student_no ?? "-"}
                                </td>

                                <td>
                                    ${escapeHtml(student.student_code)}
                                </td>

                                <td>
                                    ${escapeHtml(student.first_name)}
                                    ${escapeHtml(student.last_name)}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        student.room?.room_name || "-"
                                    )}
                                </td>

                                <td>
    ${
        student.current_status === "ACTIVE" &&
        student.completedLowerSecondary
            ? `
                <strong>ACTIVE</strong>
                <div style="
                    margin-top:3px;
                    font-size:12px;
                    color:#666;
                ">
                    (สำเร็จ ม.ต้น)
                </div>
              `
            : escapeHtml(
                student.current_status || "-"
              )
    }
</td>
<td>
    ${
        student.is_latest_academic_context === true &&
        student.current_status !== "GRADUATED"
            ? `
                <button
    type="button"
    class="student-edit-btn"
    data-student-id="${student.id}"
>
    <span class="student-edit-icon">✏</span>
    <span>แก้ไข</span>
                </button>
              `
            : ""
    }
</td>
                            </tr>
                        `).join("")}

                    </tbody>

                </table>

            </div>

            <div class="student-selection-actions">

                <span>
                    เลือกแล้ว
                    <strong id="student-selected-count-bottom">0</strong>
                    คน
                </span>

                <button
                    type="button"
                    id="btn-student-lifecycle"
                    disabled
                >
                    ดำเนินการ Lifecycle
                </button>

            </div>
        `;

        bindStudentSelection();
    }

    // -----------------------------------------------------
    // Selection
    // -----------------------------------------------------

    function bindStudentSelection() {

        const selectAll =
            document.getElementById("student-select-all");

        const checkboxes =
            document.querySelectorAll(".student-select");

        if (selectAll) {

            selectAll.addEventListener("change", event => {

                const checked = event.target.checked;

                checkboxes.forEach(checkbox => {

                    checkbox.checked = checked;

                    if (checked) {
                        selectedStudentIds.add(checkbox.value);
                    } else {
                        selectedStudentIds.delete(checkbox.value);
                    }
                });

                updateSelectionUI();
            });
        }

        checkboxes.forEach(checkbox => {

            checkbox.addEventListener("change", event => {

                if (event.target.checked) {
                    selectedStudentIds.add(event.target.value);
                } else {
                    selectedStudentIds.delete(event.target.value);
                }

                updateSelectionUI();
            });
        });
document
    .querySelectorAll(".student-edit-btn")
    .forEach(button => {
        button.addEventListener("click", async () => {

            const studentId = button.dataset.studentId;

            try {

                const student = await getStudentById(studentId);

                const editResult = await Swal.fire({
                    title: "แก้ไขข้อมูลนักเรียน",
                    width: 700,
                    customClass: {
                    title: "student-edit-title"
                     },
                    html: `
    <div style="
        text-align:left;
        padding: 4px 8px 0;
    ">

        <!-- Section Header -->
        <div style="
            font-size:16px;
            font-weight:700;
            color:#555;
            margin-bottom:16px;
            padding-bottom:10px;
            border-bottom:1px solid #e5e7eb;
        ">
            ข้อมูลประจำตัว
        </div>

        <!-- Student Code -->
        <div style="
            margin-bottom:16px;
        ">
            <label style="
                display:block;
                font-size:13px;
                font-weight:600;
                color:#555;
                margin-bottom:6px;
            ">
                รหัสนักเรียน 🔒
            </label>

            <input
                id="edit-student-code"
                type="text"
                value="${escapeHtml(student.student_code || "")}"
                disabled
                style="
    width:100%;
    box-sizing:border-box;
    margin:0;
    background:#f3f4f6;
    color:#6b7280;
    border:1px solid #d1d5db;
    cursor:not-allowed;
    font-size:16px;
    font-weight:500;
    line-height:1.5;
"
            >

            <div style="
                font-size:12px;
                color:#9ca3af;
                margin-top:5px;
            ">
                รหัสนักเรียนไม่สามารถแก้ไขได้
            </div>
        </div>

        <!-- Identity Grid -->
        <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:14px 18px;
        ">

            <!-- Prefix -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    คำนำหน้า
                </label>

                <input
                    id="edit-prefix"
                    type="text"
                    class="swal2-input"
                    value="${escapeHtml(student.prefix || "")}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
            </div>

            <!-- First Name -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    ชื่อ
                </label>

                <input
                    id="edit-first-name"
                    type="text"
                    class="swal2-input"
                    value="${escapeHtml(student.first_name || "")}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
            </div>

            <!-- Last Name -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    นามสกุล
                </label>

                <input
                    id="edit-last-name"
                    type="text"
                    class="swal2-input"
                    value="${escapeHtml(student.last_name || "")}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
            </div>

            <!-- Nickname -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    ชื่อเล่น
                </label>

                <input
                    id="edit-nickname"
                    type="text"
                    class="swal2-input"
                    value="${escapeHtml(student.nickname || "")}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
            </div>

            <!-- Gender -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    เพศ
                </label>

                <select
                    id="edit-gender"
                    class="swal2-select"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
                    <option value="">-- เลือก --</option>

                    <option
                        value="M"
                        ${student.gender === "M" ? "selected" : ""}
                    >
                        ชาย
                    </option>

                    <option
                        value="F"
                        ${student.gender === "F" ? "selected" : ""}
                    >
                        หญิง
                    </option>
                </select>
            </div>

            <!-- Birth Date -->
            <div>
                <label style="
                    display:block;
                    font-size:13px;
                    font-weight:600;
                    color:#555;
                    margin-bottom:6px;
                ">
                    วันเกิด
                </label>

                <input
                    id="edit-birth-date"
                    type="date"
                    class="swal2-input"
                    value="${student.birth_date || ""}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        margin:0;
                    "
                >
            </div>

        </div>

    </div>
`,
                    showCancelButton: true,
                    confirmButtonText: "บันทึก",
                    cancelButtonText: "ยกเลิก",
                    reverseButtons: true,

preConfirm: async () => {

    const prefix =
        document.getElementById("edit-prefix")?.value.trim();

    const firstName =
        document.getElementById("edit-first-name")?.value.trim();

    const lastName =
        document.getElementById("edit-last-name")?.value.trim();

    const nickname =
        document.getElementById("edit-nickname")?.value.trim();

    const gender =
        document.getElementById("edit-gender")?.value || "";

    const birthDate =
        document.getElementById("edit-birth-date")?.value || "";

    if (!firstName) {
        Swal.showValidationMessage(
            "กรุณากรอกชื่อ"
        );
        return false;
    }

    if (!lastName) {
        Swal.showValidationMessage(
            "กรุณากรอกนามสกุล"
        );
        return false;
    }

    try {

        await updateStudentIdentity({
            studentId,
            prefix,
            firstName,
            lastName,
            nickname,
            gender,
            birthDate
        });

        return true;

    } catch (error) {

        console.error(
            "[Student Management] Edit save error:",
            error
        );

        Swal.showValidationMessage(
            error.message ||
            "ไม่สามารถบันทึกข้อมูลได้"
        );

        return false;
    }
}
});

if (editResult.isConfirmed) {

    await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว",
        confirmButtonText: "ตกลง"
    });

    await loadStudents();
}

} catch (error) {

                console.error(
                    "[Student Management] Edit load error:",
                    error
                );

                Swal.fire({
                    icon: "error",
                    title: "โหลดข้อมูลไม่สำเร็จ",
                    text: error.message || "ไม่สามารถโหลดข้อมูลนักเรียนได้"
                });

            }

        });
    });

                const lifecycleButton =
            document.getElementById("btn-student-lifecycle");

        if (lifecycleButton) {
            lifecycleButton.addEventListener(
                "click",
                openLifecycleModal
            );
        }
    }

    function updateSelectionUI() {

        const count = selectedStudentIds.size;

        const topCount =
            document.getElementById("student-selected-count");

        const bottomCount =
            document.getElementById("student-selected-count-bottom");

        const actionButton =
            document.getElementById("btn-student-lifecycle");

        if (topCount) {
            topCount.textContent = count;
        }

        if (bottomCount) {
            bottomCount.textContent = count;
        }

        if (actionButton) {
            actionButton.disabled = count === 0;
        }

        const selectAll =
            document.getElementById("student-select-all");

        if (selectAll) {

            selectAll.checked =
                students.length > 0 &&
                selectedStudentIds.size === students.length;

            selectAll.indeterminate =
                selectedStudentIds.size > 0 &&
                selectedStudentIds.size < students.length;
        }
    }
// -----------------------------------------------------
// Lifecycle Modal
// -----------------------------------------------------
function openLifecycleModal() {

    const selectedCount = selectedStudentIds.size;

    if (selectedCount === 0) {
        showWarning("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
        return;
    }

    if (typeof Swal === "undefined") {
        alert("ไม่พบ SweetAlert2");
        return;
    }

    Swal.fire({
        title: "จัดการ Lifecycle นักเรียน",
        html: `
            <div style="text-align:left;">

                <p style="margin-bottom:16px;">
                    เลือกแล้ว
                    <strong>${selectedCount}</strong>
                    คน
                </p>

                <label style="
                    display:block;
                    padding:10px;
                    margin-bottom:8px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    cursor:pointer;
                ">
                    <input
                        type="radio"
                        name="lifecycle-action"
                        value="PROMOTED"
                    >
                    ⬆️ Promote — เลื่อนชั้น
                </label>

                <label style="
                    display:block;
                    padding:10px;
                    margin-bottom:8px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    cursor:pointer;
                ">
                    <input
                        type="radio"
                        name="lifecycle-action"
                        value="REPEATED"
                    >
                    🔁 Repeat — เรียนซ้ำ
                </label>

                <label style="
    display:block;
    padding:10px;
    margin-bottom:8px;
    border:1px solid #ddd;
    border-radius:8px;
    cursor:pointer;
">
    <input
        type="radio"
        name="lifecycle-action"
        value="TRANSFER_OUT"
    >
    🔄 Transfer Out — ย้ายออก
</label>

<label style="
    display:block;
    padding:10px;
    margin-bottom:8px;
    border:1px solid #ddd;
    border-radius:8px;
    cursor:pointer;
">
    <input
        type="radio"
        name="lifecycle-action"
        value="TRANSFER_IN"
    >
    🔄 Transfer In — ย้ายเข้า
</label>

                <label style="
                    display:block;
                    padding:10px;
                    margin-bottom:8px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    cursor:pointer;
                ">
                    <input
                        type="radio"
                        name="lifecycle-action"
                        value="WITHDRAWN"
                    >
                    🚪 Withdraw — ลาออก
                </label>

                <label style="
                    display:block;
                    padding:10px;
                    margin-bottom:8px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    cursor:pointer;
                ">
                    <input
                        type="radio"
                        name="lifecycle-action"
                        value="DECEASED"
                    >
                    🕊️ Deceased — เสียชีวิต
                </label>

                <label style="
                    display:block;
                    padding:10px;
                    border:1px solid #ddd;
                    border-radius:8px;
                    cursor:pointer;
                ">
                    <input
                        type="radio"
                        name="lifecycle-action"
                        value="GRADUATED"
                    >
                    🎓 Graduate — สำเร็จการศึกษา
                </label>

            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "ดำเนินการต่อ",
        cancelButtonText: "ยกเลิก",
        focusConfirm: false,

        preConfirm: () => {

            const selectedAction =
                document.querySelector(
                    'input[name="lifecycle-action"]:checked'
                );

            if (!selectedAction) {
                Swal.showValidationMessage(
                    "กรุณาเลือกการดำเนินการ"
                );

                return false;
            }

            return selectedAction.value;
        }

    }).then(async result => {

    if (!result.isConfirmed) {
        return;
    }

    const action = result.value;

    // -------------------------------------------------
// Lifecycle Action Guard
// -------------------------------------------------

const selectedStudents =
    students.filter(student =>
        selectedStudentIds.has(student.id)
    );

    console.log(
        "Lifecycle action:",
        action
    );

    console.log(
        "Selected students:",
        [...selectedStudentIds]
    );

    if (action === "PROMOTED") {
        openPromoteForm();
        return;
    }

    if (action === "REPEATED") {
    openRepeatForm();
    return;
}

if (action === "TRANSFER_OUT") {
    openTransferOutForm();
    return;
}

if (action === "TRANSFER_IN") {
    openTransferInForm();
    return;
}

if (action === "GRADUATED") {
    openGraduateForm();
    return;
}

if (action === "DECEASED") {
    openDeceasedForm();
    return;
}

if (action === "WITHDRAWN") {
    openWithdrawForm();
    return;
}

    Swal.fire({
        icon: "info",
        title: "เตรียมดำเนินการ",
        text:
            `เลือก ${selectedCount} คน — ` +
            `Action: ${action}`,
        confirmButtonText: "ตกลง"
    });

});
}
// -----------------------------------------------------
// Promote Form
// -----------------------------------------------------
async function openPromoteForm() {

    try {

        // -------------------------------------------------
        // Load academic years
        // -------------------------------------------------
        const { data: academicYears, error: yearError } =
            await supabaseClient
                .from("academic_years")
                .select("id, year")
                .order("year", { ascending: false });

        if (yearError) {
            throw yearError;
        }

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------
        const studentIds = [...selectedStudentIds];

        const { data: selectedStudents, error: studentError } =
            await supabaseClient
                .from("students")
                .select(`
                    id,
                    student_code,
                    first_name,
                    last_name
                `)
                .in("id", studentIds)
                .is("deleted_at", null)
                .order("student_code", { ascending: true });

        if (studentError) {
            throw studentError;
        }

        if (!selectedStudents || selectedStudents.length === 0) {
            await showError("ไม่พบข้อมูลนักเรียนที่เลือก");
            return;
        }

        // -------------------------------------------------
        // Load current academic history
        // -------------------------------------------------
        const currentAcademicYearId =
    document.getElementById("student-academic-year")?.value;

        let studentHistory = [];

        if (currentAcademicYearId) {

            const { data: history, error: historyError } =
                await supabaseClient
                    .from("student_academic_history")
                    .select(`
                        student_id,
                        student_no,
                        academic_year_id,
                        room_id
                    `)
                    .eq(
                        "academic_year_id",
                        currentAcademicYearId
                    )
                    .in(
                        "student_id",
                        studentIds
                    );

            if (historyError) {
                throw historyError;
            }

            studentHistory = history || [];
        }

        // -------------------------------------------------
        // Create student rows
        // -------------------------------------------------
        const studentRows = selectedStudents.map(student => {

            const history =
                studentHistory.find(
                    item =>
                        item.student_id === student.id
                );

            const studentNo =
                history?.student_no ?? "";

            return `
                <div
                    class="promote-student-row"
                    data-student-id="${student.id}"
                    style="
                        display:grid;
                        grid-template-columns:
                            1fr 110px;
                        gap:12px;
                        align-items:center;
                        padding:10px 0;
                        border-bottom:1px solid #eee;
                    "
                >

                    <div>
                        <div style="
                            font-weight:600;
                        ">
                            ${escapeHtml(
                                student.student_code
                            )}
                        </div>

                        <div style="
                            font-size:14px;
                            color:#666;
                        ">
                            ${escapeHtml(
                                `${student.first_name} ${student.last_name}`
                            )}
                        </div>
                    </div>

                    <div>
                        <label style="
                            display:block;
                            font-size:12px;
                            margin-bottom:4px;
                            color:#666;
                        ">
                            เลขที่
                        </label>

                        <div style="
    font-size:18px;
    font-weight:600;
">
    ${studentNo || "-"}
</div>
                    </div>

                </div>
            `;
        }).join("");

        // -------------------------------------------------
        // Open Promote Form
        // -------------------------------------------------
        Swal.fire({

            title: "Promote — เลื่อนชั้น",

            width: 650,

            html: `
                <div style="text-align:left">

                    <div style="
                        margin-bottom:16px;
                        padding:10px 12px;
                        background:#f5f5f5;
                        border-radius:8px;
                    ">
                        เลือกนักเรียนแล้ว
                        <strong>
                            ${selectedStudents.length}
                        </strong>
                        คน
                    </div>

                    <label style="
                        display:block;
                        margin-bottom:6px;
                    ">
                        ปีการศึกษาปลายทาง
                    </label>

                    <select
                        id="promote-academic-year"
                        style="
                            width:100%;
                            padding:10px;
                            margin-bottom:16px;
                            box-sizing:border-box;
                        "
                    >
                        <option value="">
                            -- เลือกปีการศึกษา --
                        </option>

                        ${(academicYears || [])
                            .map(year => `
                                <option value="${year.id}">
                                    ${escapeHtml(
                                        year.year
                                    )}
                                </option>
                            `)
                            .join("")}
                    </select>

                    <label style="
                        display:block;
                        margin-bottom:6px;
                    ">
                        ห้องเรียนปลายทาง
                    </label>

                    <select
                        id="promote-room"
                        style="
                            width:100%;
                            padding:10px;
                            margin-bottom:18px;
                            box-sizing:border-box;
                        "
                        disabled
                    >
                        <option value="">
                            -- เลือกปีการศึกษาก่อน --
                        </option>
                    </select>

                    <div style="
                        font-weight:600;
                        margin-bottom:8px;
                    ">
                        นักเรียนและเลขที่
                    </div>

                    <div style="
                        font-size:13px;
                        color:#666;
                        margin-bottom:8px;
                    ">
                        ระบบใช้เลขที่เดิมของนักเรียนโดยอัตโนมัติ
                    </div>

                    <div>
                        ${studentRows}
                    </div>

                </div>
            `,

            showCancelButton: true,
            confirmButtonText: "ตรวจสอบรายการ",
            cancelButtonText: "ยกเลิก",

            didOpen: () => {

                const yearSelect =
                    document.getElementById(
                        "promote-academic-year"
                    );

                const roomSelect =
                    document.getElementById(
                        "promote-room"
                    );

                yearSelect?.addEventListener(
                    "change",
                    async () => {

                        const academicYearId =
                            yearSelect.value;

                        roomSelect.innerHTML = `
                            <option value="">
                                กำลังโหลดห้องเรียน...
                            </option>
                        `;

                        roomSelect.disabled = true;

                        if (!academicYearId) {

                            roomSelect.innerHTML = `
                                <option value="">
                                    -- เลือกปีการศึกษาก่อน --
                                </option>
                            `;

                            return;
                        }

                        try {

                            const { data: rooms, error } =
                                await supabaseClient
                                    .from("rooms")
                                    .select(`
                                        id,
                                        room_name,
                                        grade_level
                                    `)
                                    .eq(
                                        "academic_year_id",
                                        academicYearId
                                    )
                                    .is(
                                        "deleted_at",
                                        null
                                    )
                                    .order(
                                        "grade_level",
                                        {
                                            ascending: true
                                        }
                                    )
                                    .order(
                                        "room_name",
                                        {
                                            ascending: true
                                        }
                                    );

                            if (error) {
                                throw error;
                            }

                            if (!rooms || rooms.length === 0) {

                                roomSelect.innerHTML = `
                                    <option value="">
                                        ไม่พบห้องเรียน
                                    </option>
                                `;

                                return;
                            }

                            roomSelect.innerHTML = `
                                <option value="">
                                    -- เลือกห้องเรียน --
                                </option>

                                ${rooms.map(room => `
                                    <option value="${room.id}">
                                        ${escapeHtml(
                                            room.room_name
                                        )}
                                    </option>
                                `).join("")}
                            `;

                            roomSelect.disabled = false;

                        } catch (error) {

                            console.error(
                                "load promote rooms:",
                                error
                            );

                            roomSelect.innerHTML = `
                                <option value="">
                                    โหลดห้องเรียนไม่สำเร็จ
                                </option>
                            `;
                        }
                    }
                );
            },

            preConfirm: () => {

                const academicYearId =
                    document.getElementById(
                        "promote-academic-year"
                    )?.value;

                const roomId =
                    document.getElementById(
                        "promote-room"
                    )?.value;

                if (!academicYearId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกปีการศึกษาปลายทาง"
                    );

                    return false;
                }

                if (!roomId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกห้องเรียนปลายทาง"
                    );

                    return false;
                }

                return {
                    academicYearId,
                    roomId
                       };
}
        }).then(async result => {

            if (!result.isConfirmed) {
                return;
            }

            const {
                academicYearId,
                roomId,
            } = result.value;

// -------------------------------------------------
// STEP 1 — ตรวจว่ามีประวัติปีการศึกษาปลายทางแล้วหรือยัง
// -------------------------------------------------

const {
    data: existingTargetHistory,
    error: targetHistoryError
} = await supabaseClient
    .from("student_academic_history")
    .select(`
        student_id,
        student_no
    `)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds);

if (targetHistoryError) {
    throw targetHistoryError;
}

if (
    existingTargetHistory &&
    existingTargetHistory.length > 0
) {

    const existingIds = new Set(
        existingTargetHistory.map(
            item => item.student_id
        )
    );

    const alreadyPromoted =
        selectedStudents.filter(
            student =>
                existingIds.has(student.id)
        );

    const studentList =
        alreadyPromoted
            .map(student => `
                <li>
                    <strong>
                        ${escapeHtml(
                            student.student_code
                        )}
                    </strong>
                    —
                    ${escapeHtml(
                        `${student.first_name} ${student.last_name}`
                    )}
                </li>
            `)
            .join("");

    await Swal.fire({
        icon: "warning",

        title: "ไม่สามารถ Promote ได้",

        html: `
            <div style="text-align:left">

                <p>
                    พบนักเรียนที่มีประวัติ
                    ในปีการศึกษาปลายทางแล้ว
                </p>

                <ul>
                    ${studentList}
                </ul>

                <p style="
                    margin-top:12px;
                    color:#666;
                    font-size:13px;
                ">
                    ระบบจะไม่สร้างประวัติซ้ำ
                </p>

            </div>
        `,

        confirmButtonText: "ตกลง"
    });

    return;
}

            const selectedYear =
                academicYears.find(
                    year =>
                        year.id === academicYearId
                );

            const { data: room } =
                await supabaseClient
                    .from("rooms")
                    .select(`
                        id,
                        room_name,
                        grade_level
                    `)
                    .eq("id", roomId)
                    .maybeSingle();

            // ---------------------------------------------
            // Preview
            // ---------------------------------------------
            const previewRows =
                selectedStudents.map(student => {

                    const original =
                        studentHistory.find(
                            item =>
                                item.student_id ===
                                student.id
                        );

                    return `
                        <tr>
                            <td style="padding:8px;">
                                ${escapeHtml(
                                    student.student_code
                                )}
                            </td>

                            <td style="padding:8px;">
                                ${escapeHtml(
                                    `${student.first_name} ${student.last_name}`
                                )}
                            </td>

                            <td style="
                                padding:8px;
                                text-align:center;
                            ">
                                
                                <strong>
                                ${original?.student_no ?? "-"}
                                </strong>
                            </td>
                        </tr>
                    `;
                }).join("");

            const confirmResult = await Swal.fire({

                title: "ตรวจสอบรายการ Promote",

                width: 750,

                html: `
                    <div style="text-align:left">

                        <div style="
                            padding:12px;
                            background:#f5f5f5;
                            border-radius:8px;
                            margin-bottom:16px;
                        ">

                            <div>
                                <strong>
                                    ปีการศึกษาปลายทาง:
                                </strong>
                                ${escapeHtml(
                                    selectedYear?.year
                                )}
                            </div>

                            <div>
                                <strong>
                                    ห้องปลายทาง:
                                </strong>
                                ${escapeHtml(
                                    room?.room_name ||
                                    "-"
                                )}
                            </div>

                        </div>

                        <table style="
                            width:100%;
                            border-collapse:collapse;
                            text-align:left;
                        ">

                            <thead>
                                <tr>
                                    <th style="padding:8px;">
                                        รหัสนักเรียน
                                    </th>

                                    <th style="padding:8px;">
                                        ชื่อ
                                    </th>

                                    <th style="
                                        padding:8px;
                                        text-align:center;
                                    ">
                                        เลขที่
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${previewRows}
                            </tbody>

                        </table>

                        <p style="
                            margin-top:16px;
                            color:#666;
                            font-size:13px;
                        ">
                            ขณะนี้เป็นเพียง Preview
                            ยังไม่มีการเปลี่ยนแปลงข้อมูล
                        </p>

                    </div>
                `,

                confirmButtonText: "ยืนยัน Promote",
confirmButtonColor: "#4f46e5",
showCancelButton: true,
cancelButtonText: "ยกเลิก"

});

if (!confirmResult.isConfirmed) {
    return;
}

try {

    Swal.fire({
        title: "กำลังดำเนินการ Promote...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const result = await promoteStudents({
        studentIds: [...selectedStudentIds],
        sourceAcademicYearId: currentAcademicYearId,
        targetAcademicYearId: academicYearId,
        targetRoomId: roomId
    });

    console.log("Promote success:", result);

    await Swal.fire({
        icon: "success",
        title: "Promote สำเร็จ",
        text: `ดำเนินการ ${result.promoted_count} คนเรียบร้อยแล้ว`,
        confirmButtonText: "ตกลง"
    });

    selectedStudentIds.clear();

    await loadStudents();

} catch (error) {

    console.error("Promote:", error);

    let message =
        "ไม่สามารถดำเนินการ Promote ได้";

    // -------------------------------------------------
    // STEP 2 — แปลง Database Error
    // ให้เป็นข้อความที่ผู้ใช้เข้าใจ
    // -------------------------------------------------

    if (
        error?.message?.includes(
            "TARGET_HISTORY_ALREADY_EXISTS"
        )
    ) {
        message =
            "นักเรียนมีประวัติในปีการศึกษาปลายทางแล้ว " +
            "ระบบจึงไม่สามารถ Promote ซ้ำได้";
    }

    await Swal.fire({
        icon: "error",
        title: "Promote ไม่สำเร็จ",
        text: message,
        confirmButtonText: "ตกลง"
    });
}

        });

    } catch (error) {

        console.error(
            "openPromoteForm:",
            error
        );

        showError(
            "ไม่สามารถเปิดฟอร์ม Promote ได้"
        );
    }
}
// -----------------------------------------------------
// Repeat Form
// -----------------------------------------------------
async function openRepeatForm() {

    try {

        // -------------------------------------------------
        // Load academic years
        // -------------------------------------------------
        const { data: academicYears, error: yearError } =
            await supabaseClient
                .from("academic_years")
                .select("id, year")
                .order("year", { ascending: false });

        if (yearError) {
            throw yearError;
        }

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------
        const studentIds = [...selectedStudentIds];

        const { data: selectedStudents, error: studentError } =
            await supabaseClient
                .from("students")
                .select(`
                    id,
                    student_code,
                    first_name,
                    last_name
                `)
                .in("id", studentIds)
                .is("deleted_at", null)
                .order("student_code", { ascending: true });

        if (studentError) {
            throw studentError;
        }

        if (!selectedStudents || selectedStudents.length === 0) {
            await showError("ไม่พบข้อมูลนักเรียนที่เลือก");
            return;
        }

        // -------------------------------------------------
        // Load current academic history
        // -------------------------------------------------
        const currentAcademicYearId =
            document.getElementById("student-academic-year")?.value;

        const currentAcademicYear =
            academicYears.find(
        year => year.id === currentAcademicYearId
            );

        let studentHistory = [];

        if (currentAcademicYearId) {

            const { data: history, error: historyError } =
                await supabaseClient
                    .from("student_academic_history")
                    .select(`
                        student_id,
                        student_no,
                        academic_year_id,
                        room_id
                    `)
                    .eq(
                        "academic_year_id",
                        currentAcademicYearId
                    )
                    .in(
                        "student_id",
                        studentIds
                    );

            if (historyError) {
                throw historyError;
            }

            studentHistory = history || [];
        }

        // -------------------------------------------------
        // Create student rows
        // -------------------------------------------------
        const studentRows =
            selectedStudents.map(student => {

                const history =
                    studentHistory.find(
                        item =>
                            item.student_id === student.id
                    );

                const studentNo =
                    history?.student_no ?? "-";

                return `
                    <div
                        class="repeat-student-row"
                        data-student-id="${student.id}"
                        style="
                            display:grid;
                            grid-template-columns:1fr 110px;
                            gap:12px;
                            align-items:center;
                            padding:10px 0;
                            border-bottom:1px solid #eee;
                        "
                    >

                        <div>

                            <div style="
                                font-weight:600;
                            ">
                                ${escapeHtml(
                                    student.student_code
                                )}
                            </div>

                            <div style="
                                font-size:14px;
                                color:#666;
                            ">
                                ${escapeHtml(
                                    `${student.first_name} ${student.last_name}`
                                )}
                            </div>

                        </div>

                        <div>

                            <label style="
                                display:block;
                                font-size:12px;
                                margin-bottom:4px;
                                color:#666;
                            ">
                                เลขที่
                            </label>

                            <div style="
                                font-size:18px;
                                font-weight:600;
                            ">
                                ${studentNo}
                            </div>

                        </div>

                    </div>
                `;

            }).join("");

        // -------------------------------------------------
        // Open Repeat Form
        // -------------------------------------------------
        Swal.fire({

            title: "Repeat — เรียนซ้ำ",

            width: 650,

            html: `
                <div style="text-align:left">

                    <div style="
                        margin-bottom:16px;
                        padding:10px 12px;
                        background:#f5f5f5;
                        border-radius:8px;
                    ">
                        เลือกนักเรียนแล้ว
                        <strong>
                            ${selectedStudents.length}
                        </strong>
                        คน
                    </div>

                    <label style="
                        display:block;
                        margin-bottom:6px;
                    ">
                        ปีการศึกษาปลายทาง
                    </label>

                    <select
                        id="repeat-academic-year"
                        style="
                            width:100%;
                            padding:10px;
                            margin-bottom:16px;
                            box-sizing:border-box;
                        "
                    >
                        <option value="">
                            -- เลือกปีการศึกษา --
                        </option>

                        ${(academicYears || [])
                            .map(year => `
                                <option value="${year.id}">
                                    ${escapeHtml(
                                        year.year
                                    )}
                                </option>
                            `)
                            .join("")}

                    </select>

                    <label style="
                        display:block;
                        margin-bottom:6px;
                    ">
                        ห้องเรียนปลายทาง
                    </label>

                    <select
                        id="repeat-room"
                        style="
                            width:100%;
                            padding:10px;
                            margin-bottom:18px;
                            box-sizing:border-box;
                        "
                        disabled
                    >
                        <option value="">
                            -- เลือกปีการศึกษาก่อน --
                        </option>
                    </select>

                    <div style="
                        font-weight:600;
                        margin-bottom:8px;
                    ">
                        นักเรียนและเลขที่
                    </div>

                    <div style="
                        font-size:13px;
                        color:#666;
                        margin-bottom:8px;
                    ">
                        ระบบใช้เลขที่เดิมของนักเรียนโดยอัตโนมัติ
                    </div>

                    <div>
                        ${studentRows}
                    </div>

                </div>
            `,

            showCancelButton: true,
            confirmButtonText: "ตรวจสอบรายการ",
            cancelButtonText: "ยกเลิก",

            didOpen: () => {

                const yearSelect =
                    document.getElementById(
                        "repeat-academic-year"
                    );

                const roomSelect =
                    document.getElementById(
                        "repeat-room"
                    );

                yearSelect?.addEventListener(
                    "change",
                    async () => {

                        const academicYearId =
                            yearSelect.value;

                        roomSelect.innerHTML = `
                            <option value="">
                                กำลังโหลดห้องเรียน...
                            </option>
                        `;

                        roomSelect.disabled = true;

                        if (!academicYearId) {

                            roomSelect.innerHTML = `
                                <option value="">
                                    -- เลือกปีการศึกษาก่อน --
                                </option>
                            `;

                            return;
                        }

                        try {

                            const { data: rooms, error } =
                                await supabaseClient
                                    .from("rooms")
                                    .select(`
                                        id,
                                        room_name,
                                        grade_level
                                    `)
                                    .eq(
                                        "academic_year_id",
                                        academicYearId
                                    )
                                    .is(
                                        "deleted_at",
                                        null
                                    )
                                    .order(
                                        "grade_level",
                                        {
                                            ascending: true
                                        }
                                    )
                                    .order(
                                        "room_name",
                                        {
                                            ascending: true
                                        }
                                    );

                            if (error) {
                                throw error;
                            }

                            if (!rooms || rooms.length === 0) {

                                roomSelect.innerHTML = `
                                    <option value="">
                                        ไม่พบห้องเรียน
                                    </option>
                                `;

                                return;
                            }

                            roomSelect.innerHTML = `
                                <option value="">
                                    -- เลือกห้องเรียน --
                                </option>

                                ${rooms.map(room => `
                                    <option value="${room.id}">
                                        ${escapeHtml(
                                            room.room_name
                                        )}
                                    </option>
                                `).join("")}
                            `;

                            roomSelect.disabled = false;

                        } catch (error) {

                            console.error(
                                "load repeat rooms:",
                                error
                            );

                            roomSelect.innerHTML = `
                                <option value="">
                                    โหลดห้องเรียนไม่สำเร็จ
                                </option>
                            `;
                        }
                    }
                );
            },

            preConfirm: () => {

                const academicYearId =
                    document.getElementById(
                        "repeat-academic-year"
                    )?.value;

                const roomId =
                    document.getElementById(
                        "repeat-room"
                    )?.value;

                if (!academicYearId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกปีการศึกษาปลายทาง"
                    );

                    return false;
                }

                if (!roomId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกห้องเรียนปลายทาง"
                    );

                    return false;
                }

                return {
                    academicYearId,
                    roomId
                };
            }

        }).then(async result => {

            if (!result.isConfirmed) {
                return;
            }

            const {
                academicYearId,
                roomId
            } = result.value;

            console.log(
                "Repeat target:",
                academicYearId,
                roomId
            );
// -------------------------------------------------
// STEP 3C — Load target information + Preview
// -------------------------------------------------

const selectedYear =
    academicYears.find(
        year => year.id === academicYearId
    );

const { data: targetRoom, error: roomError } =
    await supabaseClient
        .from("rooms")
        .select(`
            id,
            room_name,
            grade_level
        `)
        .eq("id", roomId)
        .maybeSingle();

if (roomError) {
    throw roomError;
}

if (!targetRoom) {
    await showError(
        "ไม่พบข้อมูลห้องเรียนปลายทาง"
    );
    return;
}


// -------------------------------------------------
// ตรวจสอบประวัติปลายทางก่อน Preview
// -------------------------------------------------

const {
    data: existingTargetHistory,
    error: targetHistoryError
} = await supabaseClient
    .from("student_academic_history")
    .select(`
        student_id,
        student_no
    `)
    .eq(
        "academic_year_id",
        academicYearId
    )
    .in(
        "student_id",
        studentIds
    );

if (targetHistoryError) {
    throw targetHistoryError;
}

if (
    existingTargetHistory &&
    existingTargetHistory.length > 0
) {

    const existingIds =
        new Set(
            existingTargetHistory.map(
                item => item.student_id
            )
        );

    const alreadyRepeated =
        selectedStudents.filter(
            student =>
                existingIds.has(student.id)
        );

    const studentList =
        alreadyRepeated
            .map(student => `
                <li>
                    <strong>
                        ${escapeHtml(
                            student.student_code
                        )}
                    </strong>
                    —
                    ${escapeHtml(
                        `${student.first_name} ${student.last_name}`
                    )}
                </li>
            `)
            .join("");

    await Swal.fire({

        icon: "warning",

        title: "ไม่สามารถ Repeat ได้",

        html: `
            <div style="text-align:left">

                <p>
                    พบนักเรียนที่มีประวัติ
                    ในปีการศึกษาปลายทางแล้ว
                </p>

                <ul>
                    ${studentList}
                </ul>

                <p style="
                    margin-top:12px;
                    color:#666;
                    font-size:13px;
                ">
                    ระบบจะไม่สร้างประวัติซ้ำ
                </p>

            </div>
        `,

        confirmButtonText: "ตกลง"

    });

    return;
}


// -------------------------------------------------
// Preview Rows
// -------------------------------------------------

const previewRows =
    selectedStudents.map(student => {

        const original =
            studentHistory.find(
                item =>
                    item.student_id ===
                    student.id
            );

        return `
            <tr>

                <td style="padding:8px;">
                    ${escapeHtml(
                        student.student_code
                    )}
                </td>

                <td style="padding:8px;">
                    ${escapeHtml(
                        `${student.first_name} ${student.last_name}`
                    )}
                </td>

                <td style="
                    padding:8px;
                    text-align:center;
                ">
                    <strong>
                        ${original?.student_no ?? "-"}
                    </strong>
                </td>

            </tr>
        `;

    }).join("");


// -------------------------------------------------
// Preview Dialog
// -------------------------------------------------

const confirmResult =
    await Swal.fire({

        title: "ตรวจสอบรายการ Repeat",

        width: 750,

        html: `
            <div style="text-align:left">

                <div style="
                    padding:12px;
                    background:#f5f5f5;
                    border-radius:8px;
                    margin-bottom:16px;
                ">

                    <div>
                        <strong>
                            การดำเนินการ:
                        </strong>
                        Repeat — เรียนซ้ำ
                    </div>

                    <div style="
                        margin-top:8px;
                    ">
                        <strong>
                            จากปีการศึกษา:
                        </strong>
                        ${escapeHtml(
                        currentAcademicYear?.year ?? "-"
                        )}
                    </div>

                    <div style="
                        margin-top:8px;
                    ">
                        <strong>
                            ปีการศึกษาปลายทาง:
                        </strong>
                        ${escapeHtml(
                            selectedYear?.year
                        )}
                    </div>

                    <div style="
                        margin-top:8px;
                    ">
                        <strong>
                            ห้องปลายทาง:
                        </strong>
                        ${escapeHtml(
                            targetRoom.room_name
                        )}
                    </div>

                    <div style="
                        margin-top:12px;
                        padding-top:12px;
                        border-top:1px solid #ddd;
                        font-weight:600;
                    ">
                        ${escapeHtml(
                            `${selectedYear?.year || "-"} / ${targetRoom.room_name}`
                        )}
                    </div>

                </div>

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    text-align:left;
                ">

                    <thead>

                        <tr>

                            <th style="padding:8px;">
                                รหัสนักเรียน
                            </th>

                            <th style="padding:8px;">
                                ชื่อ
                            </th>

                            <th style="
                                padding:8px;
                                text-align:center;
                            ">
                                เลขที่
                            </th>

                        </tr>

                    </thead>

                    <tbody>
                        ${previewRows}
                    </tbody>

                </table>

                <p style="
                    margin-top:16px;
                    color:#666;
                    font-size:13px;
                ">
                    ขณะนี้เป็นเพียง Preview
                    ยังไม่มีการเปลี่ยนแปลงข้อมูล
                </p>

            </div>
        `,

        confirmButtonText:
            "ยืนยัน Repeat",

        confirmButtonColor:
            "#4f46e5",

        showCancelButton: true,

        cancelButtonText:
            "ยกเลิก"

    });

if (!confirmResult.isConfirmed) {
    return;
}


// -------------------------------------------------
// STEP 3C จบตรงนี้
if (!confirmResult.isConfirmed) {
    return;
}

try {

    Swal.fire({
        title: "กำลังดำเนินการ Repeat...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const result = await repeatStudents({
        studentIds: [...selectedStudentIds],
        sourceAcademicYearId: currentAcademicYearId,
        targetAcademicYearId: academicYearId,
        targetRoomId: roomId
    });

    console.log("Repeat success:", result);

    await Swal.fire({
        icon: "success",
        title: "Repeat สำเร็จ",
        text: `ดำเนินการ ${result.student_count} คนเรียบร้อยแล้ว`,
        confirmButtonText: "ตกลง"
    });

    selectedStudentIds.clear();

    await loadStudents();

} catch (error) {

    console.error("Repeat:", error);

    let message =
        "ไม่สามารถดำเนินการ Repeat ได้";

    if (
        error?.message?.includes(
            "TARGET_HISTORY_ALREADY_EXISTS"
        )
    ) {
        message =
            "นักเรียนมีประวัติในปีการศึกษาปลายทางแล้ว " +
            "ระบบจึงไม่สามารถ Repeat ซ้ำได้";
    }

    if (
        error?.message?.includes(
            "REPEAT_MUST_KEEP_SAME_GRADE"
        )
    ) {
        message =
            "Repeat ต้องอยู่ชั้นเดิม " +
            "ไม่สามารถเปลี่ยนระดับชั้นได้";
    }

    await Swal.fire({
        icon: "error",
        title: "Repeat ไม่สำเร็จ",
        text: message,
        confirmButtonText: "ตกลง"
    });
}

        });

    } catch (error) {

        console.error(
            "openRepeatForm:",
            error
        );

        showError(
            "ไม่สามารถเปิดฟอร์ม Repeat ได้"
        );
    }
}
// -----------------------------------------------------
// Transfer Out Form
// -----------------------------------------------------
async function openTransferOutForm() {

    try {

        const studentIds = [...selectedStudentIds];

        if (studentIds.length === 0) {
            await showWarning(
                "กรุณาเลือกนักเรียนก่อน"
            );
            return;
        }

        const academicYearId =
            document.getElementById(
                "student-academic-year"
            )?.value;

        if (!academicYearId) {
            await showWarning(
                "กรุณาเลือกปีการศึกษาก่อน"
            );
            return;
        }

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------

        const {
            data: selectedStudents,
            error: studentError
        } = await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                first_name,
                last_name,
                student_no
            `)
            .in("id", studentIds)
            .is("deleted_at", null)
            .order("student_code", {
                ascending: true
            });

        if (studentError) {
            throw studentError;
        }

        if (
            !selectedStudents ||
            selectedStudents.length === 0
        ) {
            await showError(
                "ไม่พบข้อมูลนักเรียนที่เลือก"
            );
            return;
        }

        // -------------------------------------------------
        // Load academic year
        // -------------------------------------------------

        const {
            data: academicYear,
            error: academicYearError
        } = await supabaseClient
            .from("academic_years")
            .select("id, year")
            .eq("id", academicYearId)
            .single();

        if (academicYearError) {
            throw academicYearError;
        }

        // -------------------------------------------------
        // Preview rows
        // -------------------------------------------------

        const previewRows =
            selectedStudents.map(student => `
                <tr>
                    <td style="padding:8px;">
                        ${escapeHtml(
                            student.student_code
                        )}
                    </td>

                    <td style="padding:8px;">
                        ${escapeHtml(
                            `${student.first_name} ${student.last_name}`
                        )}
                    </td>

                    <td style="
                        padding:8px;
                        text-align:center;
                    ">
                        ${student.student_no ?? "-"}
                    </td>
                </tr>
            `).join("");

        // -------------------------------------------------
        // Confirm Transfer Out
        // -------------------------------------------------

        const confirmResult =
            await Swal.fire({

                title:
                    "Transfer Out — ย้ายออก",

                width: 650,

                html: `
                    <div style="text-align:left">

                        <div style="
                            margin-bottom:16px;
                            padding:12px;
                            background:#fff7ed;
                            border-radius:8px;
                            border:1px solid #fed7aa;
                        ">
                            <strong>
                                ปีการศึกษา:
                            </strong>
                            ${escapeHtml(
                                academicYear.year
                            )}
                        </div>

                        <table style="
                            width:100%;
                            border-collapse:collapse;
                            text-align:left;
                        ">

                            <thead>
                                <tr>
                                    <th style="padding:8px;">
                                        รหัสนักเรียน
                                    </th>

                                    <th style="padding:8px;">
                                        ชื่อ
                                    </th>

                                    <th style="
                                        padding:8px;
                                        text-align:center;
                                    ">
                                        เลขที่
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${previewRows}
                            </tbody>

                        </table>

                        <p style="
                            margin-top:16px;
                            color:#b45309;
                            font-size:13px;
                        ">
                            นักเรียนจะถูกเปลี่ยนสถานะเป็น
                            <strong>TRANSFERRED_OUT</strong>
                            และบันทึกประวัติ
                            TRANSFER_OUT
                        </p>

                    </div>
                `,

                confirmButtonText:
                    "ยืนยัน Transfer Out",

                confirmButtonColor:
                    "#dc2626",

                showCancelButton: true,

                cancelButtonText:
                    "ยกเลิก"

            });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // -------------------------------------------------
        // Execute Transfer Out
        // -------------------------------------------------

        try {

            Swal.fire({
                title:
                    "กำลังดำเนินการ Transfer Out...",

                text:
                    "กรุณารอสักครู่",

                allowOutsideClick: false,

                allowEscapeKey: false,

                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const result =
                await transferOutStudents({

                    studentIds:
                        [...selectedStudentIds],

                    academicYearId:
                        academicYearId

                });

            console.log(
                "Transfer Out success:",
                result
            );

            await Swal.fire({

                icon: "success",

                title:
                    "Transfer Out สำเร็จ",

                text:
                    `ดำเนินการย้ายออก ${result.student_count} คนเรียบร้อยแล้ว`,

                confirmButtonText:
                    "ตกลง"

            });

            selectedStudentIds.clear();

            await loadStudents();

        } catch (error) {

            console.error(
                "Transfer Out:",
                error
            );

            let message =
                "ไม่สามารถดำเนินการ Transfer Out ได้";

            if (
                error?.message?.includes(
                    "UNAUTHORIZED"
                )
            ) {
                message =
                    "ไม่มีสิทธิ์ดำเนินการรายการนี้";
            }

            if (
                error?.message?.includes(
                    "FORBIDDEN"
                )
            ) {
                message =
                    "คุณไม่มีสิทธิ์ดำเนินการ Transfer Out";
            }

            if (
                error?.message?.includes(
                    "NO_STUDENTS_SELECTED"
                )
            ) {
                message =
                    "ไม่ได้เลือกนักเรียน";
            }

            if (
                error?.message?.includes(
                    "STUDENT_HISTORY_NOT_FOUND"
                )
            ) {
                message =
                    "ไม่พบประวัตินักเรียนในปีการศึกษาที่เลือก";
            }

            await Swal.fire({

                icon: "error",

                title:
                    "Transfer Out ไม่สำเร็จ",

                text: message,

                confirmButtonText:
                    "ตกลง"

            });
        }

    } catch (error) {

        console.error(
            "openTransferOutForm:",
            error
        );

        await showError(
            "ไม่สามารถเปิดฟอร์ม Transfer Out ได้"
        );
    }
}

// -----------------------------------------------------
// Transfer In Form
// -----------------------------------------------------
async function openTransferInForm() {

    try {

        const studentIds = [...selectedStudentIds];

        if (studentIds.length === 0) {
            await showWarning(
                "กรุณาเลือกนักเรียนก่อน"
            );
            return;
        }

        // -------------------------------------------------
        // Load academic years
        // -------------------------------------------------

        const {
            data: academicYears,
            error: yearError
        } = await supabaseClient
            .from("academic_years")
            .select("id, year")
            .order("year", {
                ascending: false
            });

        if (yearError) {
            throw yearError;
        }

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------

        const {
            data: selectedStudents,
            error: studentError
        } = await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                first_name,
                last_name,
                student_no
            `)
            .in("id", studentIds)
            .is("deleted_at", null)
            .order("student_code", {
                ascending: true
            });

        if (studentError) {
            throw studentError;
        }

        if (
            !selectedStudents ||
            selectedStudents.length === 0
        ) {
            await showError(
                "ไม่พบข้อมูลนักเรียนที่เลือก"
            );
            return;
        }

        // -------------------------------------------------
        // Transfer In Form
        // -------------------------------------------------

        const result = await Swal.fire({

            title:
                "Transfer In — ย้ายเข้า",

            width: 650,

            html: `
                <div style="text-align:left">

                    <div style="
                        margin-bottom:16px;
                        padding:12px;
                        background:#f5f5f5;
                        border-radius:8px;
                    ">
                        เลือกนักเรียนแล้ว
                        <strong>
                            ${selectedStudents.length}
                        </strong>
                        คน
                    </div>

                    <div style="
                        margin-bottom:16px;
                    ">
                        <label style="
                            display:block;
                            margin-bottom:6px;
                            font-weight:600;
                        ">
                            ปีการศึกษาที่เข้า
                        </label>

                        <select
                            id="transfer-in-academic-year"
                            style="
                                width:100%;
                                padding:10px;
                                box-sizing:border-box;
                            "
                        >
                            <option value="">
                                -- เลือกปีการศึกษา --
                            </option>

                            ${(academicYears || [])
                                .map(year => `
                                    <option value="${year.id}">
                                        ${escapeHtml(year.year)}
                                    </option>
                                `)
                                .join("")}
                        </select>
                    </div>

                    <div style="
                        margin-bottom:16px;
                    ">
                        <label style="
                            display:block;
                            margin-bottom:6px;
                            font-weight:600;
                        ">
                            ห้องเรียนปลายทาง
                        </label>

                        <select
                            id="transfer-in-room"
                            style="
                                width:100%;
                                padding:10px;
                                box-sizing:border-box;
                            "
                            disabled
                        >
                            <option value="">
                                -- เลือกปีการศึกษาก่อน --
                            </option>
                        </select>
                    </div>

                    <div style="
                        margin-bottom:16px;
                    ">
                        <label style="
                            display:block;
                            margin-bottom:6px;
                            font-weight:600;
                        ">
                            ย้ายมาจากโรงเรียน
                            <span style="color:#dc2626;">
                                *
                            </span>
                        </label>

                        <input
                            id="transfer-in-source-school"
                            type="text"
                            placeholder="เช่น โรงเรียนบ้านตัวอย่าง"
                            style="
                                width:100%;
                                padding:10px;
                                box-sizing:border-box;
                            "
                        >
                    </div>

                    <div style="
                        margin-top:18px;
                        padding:10px 12px;
                        background:#eff6ff;
                        border-radius:8px;
                        color:#1e40af;
                        font-size:13px;
                    ">
                        ระบบจะบันทึกชื่อโรงเรียนต้นทาง
                        ไว้กับประวัติ Transfer In
                    </div>

                </div>
            `,

            confirmButtonText:
                "ตรวจสอบข้อมูล",

            showCancelButton: true,

            cancelButtonText:
                "ยกเลิก",

            didOpen: () => {

                const yearSelect =
                    document.getElementById(
                        "transfer-in-academic-year"
                    );

                const roomSelect =
                    document.getElementById(
                        "transfer-in-room"
                    );

                yearSelect?.addEventListener(
                    "change",
                    async () => {

                        const academicYearId =
                            yearSelect.value;

                        roomSelect.innerHTML = `
                            <option value="">
                                -- กำลังโหลดห้อง --
                            </option>
                        `;

                        roomSelect.disabled = true;

                        if (!academicYearId) {
                            roomSelect.innerHTML = `
                                <option value="">
                                    -- เลือกปีการศึกษาก่อน --
                                </option>
                            `;
                            return;
                        }

                        const {
                            data: rooms,
                            error: roomError
                        } = await supabaseClient
                            .from("rooms")
                            .select(`
                                id,
                                room_name,
                                grade_level
                            `)
                            .eq(
                                "academic_year_id",
                                academicYearId
                            )
                            .order(
                                "grade_level",
                                {
                                    ascending: true
                                }
                            )
                            .order(
                                "room_name",
                                {
                                    ascending: true
                                }
                            );

                        if (roomError) {

                            console.error(
                                "Transfer In rooms:",
                                roomError
                            );

                            roomSelect.innerHTML = `
                                <option value="">
                                    โหลดห้องไม่สำเร็จ
                                </option>
                            `;

                            return;
                        }

                        roomSelect.innerHTML = `
                            <option value="">
                                -- เลือกห้องเรียน --
                            </option>

                            ${(rooms || [])
                                .map(room => `
                                    <option value="${room.id}">
                                        ${escapeHtml(
                                            room.room_name
                                        )}
                                    </option>
                                `)
                                .join("")}
                        `;

                        roomSelect.disabled = false;
                    }
                );
            },

            preConfirm: () => {

                const academicYearId =
                    document.getElementById(
                        "transfer-in-academic-year"
                    )?.value;

                const roomId =
                    document.getElementById(
                        "transfer-in-room"
                    )?.value;

                const sourceSchoolName =
                    document.getElementById(
                        "transfer-in-source-school"
                    )?.value
                    ?.trim();

                if (!academicYearId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกปีการศึกษา"
                    );

                    return false;
                }

                if (!roomId) {

                    Swal.showValidationMessage(
                        "กรุณาเลือกห้องเรียน"
                    );

                    return false;
                }

                if (!sourceSchoolName) {

                    Swal.showValidationMessage(
                        "กรุณากรอกโรงเรียนต้นทาง"
                    );

                    return false;
                }

                return {
                    academicYearId,
                    roomId,
                    sourceSchoolName
                };
            }

        });

        if (!result.isConfirmed) {
            return;
        }

        const {
            academicYearId,
            roomId,
            sourceSchoolName
        } = result.value;

        // -------------------------------------------------
        // Load selected year + room for preview
        // -------------------------------------------------

        const {
            data: selectedYear,
            error: selectedYearError
        } = await supabaseClient
            .from("academic_years")
            .select("id, year")
            .eq("id", academicYearId)
            .single();

        if (selectedYearError) {
            throw selectedYearError;
        }

        const {
            data: selectedRoom,
            error: selectedRoomError
        } = await supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level
            `)
            .eq("id", roomId)
            .single();

        if (selectedRoomError) {
            throw selectedRoomError;
        }

        const previewRows =
            selectedStudents
                .map(student => `
                    <tr>
                        <td style="padding:8px;">
                            ${escapeHtml(
                                student.student_code
                            )}
                        </td>

                        <td style="padding:8px;">
                            ${escapeHtml(
                                `${student.first_name} ${student.last_name}`
                            )}
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            ${student.student_no ?? "-"}
                        </td>
                    </tr>
                `)
                .join("");

        // -------------------------------------------------
        // Final Confirmation
        // -------------------------------------------------

        const confirmResult =
            await Swal.fire({

                title:
                    "ยืนยัน Transfer In",

                width: 700,

                html: `
                    <div style="text-align:left">

                        <div style="
                            padding:12px;
                            background:#f5f5f5;
                            border-radius:8px;
                            margin-bottom:14px;
                        ">

                            <div>
                                <strong>
                                    ปีการศึกษา:
                                </strong>
                                ${escapeHtml(
                                    selectedYear.year
                                )}
                            </div>

                            <div>
                                <strong>
                                    ห้องปลายทาง:
                                </strong>
                                ${escapeHtml(
                                    selectedRoom.room_name
                                )}
                            </div>

                            <div>
                                <strong>
                                    ย้ายมาจาก:
                                </strong>
                                ${escapeHtml(
                                    sourceSchoolName
                                )}
                            </div>

                        </div>

                        <table style="
                            width:100%;
                            border-collapse:collapse;
                            text-align:left;
                        ">

                            <thead>
                                <tr>

                                    <th style="padding:8px;">
                                        รหัสนักเรียน
                                    </th>

                                    <th style="padding:8px;">
                                        ชื่อ
                                    </th>

                                    <th style="
                                        padding:8px;
                                        text-align:center;
                                    ">
                                        เลขที่
                                    </th>

                                </tr>
                            </thead>

                            <tbody>
                                ${previewRows}
                            </tbody>

                        </table>

                    </div>
                `,

                confirmButtonText:
                    "ยืนยัน Transfer In",

                confirmButtonColor:
                    "#16a34a",

                showCancelButton: true,

                cancelButtonText:
                    "ยกเลิก"

            });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // -------------------------------------------------
        // Execute Transfer In
        // -------------------------------------------------

        try {

            Swal.fire({

                title:
                    "กำลังดำเนินการ Transfer In...",

                text:
                    "กรุณารอสักครู่",

                allowOutsideClick: false,

                allowEscapeKey: false,

                didOpen: () => {
                    Swal.showLoading();
                }

            });

            const rpcResult =
                await transferInStudents({

                    studentIds:
                        [...selectedStudentIds],

                    academicYearId:
                        academicYearId,

                    roomId:
                        roomId,

                    sourceSchoolName:
                        sourceSchoolName

                });

            console.log(
                "Transfer In success:",
                rpcResult
            );

            await Swal.fire({

                icon: "success",

                title:
                    "Transfer In สำเร็จ",

                text:
                    `ดำเนินการย้ายเข้า ${rpcResult.student_count} คนเรียบร้อยแล้ว`,

                confirmButtonText:
                    "ตกลง"

            });

            selectedStudentIds.clear();

            await loadStudents();

        } catch (error) {

            console.error(
                "Transfer In:",
                error
            );

            let message =
                "ไม่สามารถดำเนินการ Transfer In ได้";

            if (
                error?.message?.includes(
                    "SOURCE_SCHOOL_REQUIRED"
                )
            ) {
                message =
                    "กรุณาระบุโรงเรียนต้นทาง";
            }

            if (
                error?.message?.includes(
                    "TARGET_HISTORY_ALREADY_EXISTS"
                )
            ) {
                message =
                    "นักเรียนมีประวัติในปีการศึกษาปลายทางแล้ว";
            }

            if (
                error?.message?.includes(
                    "ROOM_NOT_FOUND"
                )
            ) {
                message =
                    "ไม่พบห้องเรียนปลายทาง";
            }

            if (
                error?.message?.includes(
                    "FORBIDDEN"
                )
            ) {
                message =
                    "คุณไม่มีสิทธิ์ดำเนินการ Transfer In";
            }

            await Swal.fire({

                icon: "error",

                title:
                    "Transfer In ไม่สำเร็จ",

                text:
                    message,

                confirmButtonText:
                    "ตกลง"

            });
        }

    } catch (error) {

        console.error(
            "openTransferInForm:",
            error
        );

        await showError(
            "ไม่สามารถเปิดฟอร์ม Transfer In ได้"
        );
    }
}
// -----------------------------------------------------
// Deceased Form
// -----------------------------------------------------
async function openDeceasedForm() {

    const studentIds = [...selectedStudentIds];

    if (studentIds.length === 0) {
        await showWarning("กรุณาเลือกนักเรียนก่อน");
        return;
    }

    const academicYearId =
        document.getElementById(
            "student-academic-year"
        )?.value;

    if (!academicYearId) {
        await showWarning(
            "กรุณาเลือกปีการศึกษาก่อน"
        );
        return;
    }

    try {

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------

        const {
            data: selectedStudents,
            error: studentError
        } = await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                first_name,
                last_name,
                student_no,
                current_status
            `)
            .in("id", studentIds)
            .is("deleted_at", null)
            .order("student_code", {
                ascending: true
            });

        if (studentError) {
            throw studentError;
        }

        if (
            !selectedStudents ||
            selectedStudents.length === 0
        ) {
            await showError(
                "ไม่พบข้อมูลนักเรียนที่เลือก"
            );
            return;
        }

        // -------------------------------------------------
        // Preview Rows
        // -------------------------------------------------

        const previewRows =
            selectedStudents.map(student => `
                <tr>
                    <td style="padding:8px;">
                        ${escapeHtml(
                            student.student_code
                        )}
                    </td>

                    <td style="padding:8px;">
                        ${escapeHtml(
                            `${student.first_name} ${student.last_name}`
                        )}
                    </td>

                    <td style="
                        padding:8px;
                        text-align:center;
                    ">
                        ${student.student_no ?? "-"}
                    </td>

                    <td style="
                        padding:8px;
                        text-align:center;
                    ">
                        ${escapeHtml(
                            student.current_status || "-"
                        )}
                    </td>
                </tr>
            `).join("");

        // -------------------------------------------------
        // Confirm
        // -------------------------------------------------

        const confirmResult =
            await Swal.fire({

                title:
                    "Deceased — เสียชีวิต",

                width: 750,

                html: `
                    <div style="text-align:left">

                        <div style="
                            padding:12px;
                            margin-bottom:16px;
                            background:#fef2f2;
                            border:1px solid #fecaca;
                            border-radius:8px;
                        ">
                            <strong>
                                ⚠️ การดำเนินการสำคัญ
                            </strong>

                            <div style="
                                margin-top:8px;
                                font-size:13px;
                            ">
                                นักเรียนจะเปลี่ยนสถานะเป็น
                                <strong>DECEASED</strong>
                                และระบบจะบันทึก
                                Lifecycle Event
                                <strong>DECEASED</strong>
                            </div>

                            <div style="
                                margin-top:8px;
                                font-size:13px;
                                color:#666;
                            ">
                                ประวัติการเรียนเดิมจะไม่ถูกลบ
                            </div>
                        </div>

                        <table style="
                            width:100%;
                            border-collapse:collapse;
                            text-align:left;
                        ">

                            <thead>
                                <tr>
                                    <th style="padding:8px;">
                                        รหัสนักเรียน
                                    </th>

                                    <th style="padding:8px;">
                                        ชื่อ
                                    </th>

                                    <th style="
                                        padding:8px;
                                        text-align:center;
                                    ">
                                        เลขที่
                                    </th>

                                    <th style="
                                        padding:8px;
                                        text-align:center;
                                    ">
                                        สถานะปัจจุบัน
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${previewRows}
                            </tbody>

                        </table>

                    </div>
                `,

                confirmButtonText:
                    "ยืนยัน Deceased",

                confirmButtonColor:
                    "#dc2626",

                showCancelButton: true,

                cancelButtonText:
                    "ยกเลิก"

            });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // -------------------------------------------------
        // Execute
        // -------------------------------------------------

        Swal.fire({
            title:
                "กำลังดำเนินการ Deceased...",

            text:
                "กรุณารอสักครู่",

            allowOutsideClick: false,

            allowEscapeKey: false,

            didOpen: () => {
                Swal.showLoading();
            }
        });

        const result =
            await deceasedStudents({

                studentIds:
                    [...selectedStudentIds],

                academicYearId:
                    academicYearId
            });

        console.log(
            "Deceased success:",
            result
        );

        await Swal.fire({
            icon: "success",

            title:
                "Deceased สำเร็จ",

            text:
                `ดำเนินการ ${result.student_count} คนเรียบร้อยแล้ว`,

            confirmButtonText:
                "ตกลง"
        });

        selectedStudentIds.clear();

        await loadStudents();

    } catch (error) {

        console.error(
            "Deceased:",
            error
        );

        let message =
            "ไม่สามารถดำเนินการ Deceased ได้";

        if (
            error?.message?.includes(
                "INVALID_STATUS_TRANSITION"
            )
        ) {
            message =
                "สามารถทำ Deceased ได้เฉพาะนักเรียนที่มีสถานะ ACTIVE เท่านั้น";
        }

        if (
            error?.message?.includes(
                "STUDENT_HISTORY_NOT_FOUND"
            )
        ) {
            message =
                "ไม่พบประวัตินักเรียนในปีการศึกษาที่เลือก";
        }

        await Swal.fire({
            icon: "error",

            title:
                "Deceased ไม่สำเร็จ",

            text:
                message,

            confirmButtonText:
                "ตกลง"
        });
    }
}

// -----------------------------------------------------
// Graduate Form
// -----------------------------------------------------
async function openGraduateForm() {

    const studentIds = [...selectedStudentIds];

    if (studentIds.length === 0) {
        await showWarning("กรุณาเลือกนักเรียนก่อน");
        return;
    }

    const academicYearId =
        document.getElementById(
            "student-academic-year"
        )?.value;

    if (!academicYearId) {
        await showWarning(
            "กรุณาเลือกปีการศึกษาก่อน"
        );
        return;
    }

    try {

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------

        const {
            data: selectedStudents,
            error: studentError
        } = await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                first_name,
                last_name,
                student_no,
                current_status
            `)
            .in("id", studentIds)
            .is("deleted_at", null)
            .order("student_code", {
                ascending: true
            });

        if (studentError) {
            throw studentError;
        }

        if (
            !selectedStudents ||
            selectedStudents.length === 0
        ) {
            await showError(
                "ไม่พบข้อมูลนักเรียนที่เลือก"
            );
            return;
        }


        // -------------------------------------------------
        // Load academic history + room
        // -------------------------------------------------

        const {
            data: studentHistory,
            error: historyError
        } = await supabaseClient
            .from("student_academic_history")
            .select(`
                student_id,
                student_no,
                academic_year_id,
                room_id,
                rooms (
                    room_name,
                    grade_level
                )
            `)
            .eq(
                "academic_year_id",
                academicYearId
            )
            .in(
                "student_id",
                studentIds
            );

        if (historyError) {
            throw historyError;
        }


        // -------------------------------------------------
        // Build History Map
        // -------------------------------------------------

        const historyMap =
            new Map(
                (studentHistory || []).map(
                    item => [
                        item.student_id,
                        item
                    ]
                )
            );


        // -------------------------------------------------
        // Validate
        // -------------------------------------------------
        // Graduate รองรับเฉพาะ ม.3 และ ม.6
        // และนักเรียนต้อง ACTIVE
        // -------------------------------------------------

        const invalidStudents =
            selectedStudents.filter(student => {

                const history =
                    historyMap.get(student.id);

                const gradeLevel =
                    Number(
                        history?.rooms?.grade_level
                    );

                return (
                    student.current_status !== "ACTIVE" ||
                    !history ||
                    ![3, 6].includes(gradeLevel)
                );
            });


        if (invalidStudents.length > 0) {

            const studentList =
                invalidStudents
                    .map(student => {

                        const history =
                            historyMap.get(student.id);

                        const gradeLevel =
                            history?.rooms?.grade_level;

                        let reason =
                            "ข้อมูลไม่ตรงเงื่อนไข";

                        if (
                            student.current_status !==
                            "ACTIVE"
                        ) {
                            reason =
                                `สถานะปัจจุบันคือ ${student.current_status}`;
                        } else if (!history) {
                            reason =
                                "ไม่พบประวัติในปีการศึกษาที่เลือก";
                        } else if (
                            ![3, 6].includes(
                                Number(gradeLevel)
                            )
                        ) {
                            reason =
                                `ระดับชั้น ม.${gradeLevel} ไม่รองรับ`;
                        }

                        return `
                            <li style="margin-bottom:6px;">
                                <strong>
                                    ${escapeHtml(
                                        student.student_code
                                    )}
                                </strong>
                                —
                                ${escapeHtml(
                                    `${student.first_name} ${student.last_name}`
                                )}
                                <span style="
                                    color:#666;
                                    font-size:12px;
                                ">
                                    (${escapeHtml(reason)})
                                </span>
                            </li>
                        `;
                    })
                    .join("");


            await Swal.fire({

                icon: "warning",

                title:
                    "ไม่สามารถ Graduate ได้",

                html: `
                    <div style="text-align:left">

                        <p>
                            Graduate รองรับเฉพาะ
                            นักเรียน <strong>ม.3 และ ม.6</strong>
                            ที่มีสถานะ <strong>ACTIVE</strong>
                            และมีประวัติในปีการศึกษาที่เลือก
                        </p>

                        <p style="
                            margin-top:12px;
                            margin-bottom:6px;
                            font-weight:600;
                        ">
                            นักเรียนที่ไม่ผ่านเงื่อนไข
                        </p>

                        <ul>
                            ${studentList}
                        </ul>

                    </div>
                `,

                confirmButtonText:
                    "ตกลง"

            });

            return;
        }


        // -------------------------------------------------
        // Build Preview
        // -------------------------------------------------

        const previewRows =
            selectedStudents.map(student => {

                const history =
                    historyMap.get(
                        student.id
                    );

                const gradeLevel =
                    Number(
                        history?.rooms?.grade_level
                    );

                const isLowerSecondary =
                    gradeLevel === 3;

                const eventType =
                    isLowerSecondary
                        ? "COMPLETED_LOWER_SECONDARY"
                        : "COMPLETED_UPPER_SECONDARY";

                const finalStatus =
                    isLowerSecondary
                        ? "ACTIVE"
                        : "GRADUATED";

                return `
                    <tr>

                        <td style="padding:8px;">
                            ${escapeHtml(
                                student.student_code
                            )}
                        </td>

                        <td style="padding:8px;">
                            ${escapeHtml(
                                `${student.first_name} ${student.last_name}`
                            )}
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            ม.${gradeLevel}
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            ${history?.student_no ?? "-"}
                        </td>

                        <td style="padding:8px;">
                            ${escapeHtml(
                                history?.rooms?.room_name || "-"
                            )}
                        </td>

                        <td style="padding:8px;">
                            <div>
    <strong>
        ${
            isLowerSecondary
                ? "สำเร็จการศึกษาระดับมัธยมศึกษาตอนต้น"
                : "สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย"
        }
    </strong>
</div>

<div style="
    margin-top:4px;
    font-size:12px;
    color:#666;
">
    Event →
    <strong>
        ${eventType}
    </strong>
</div>

<div style="
    margin-top:4px;
    font-size:12px;
    color:#666;
">
    สถานะปัจจุบัน →
    <strong>
        ${finalStatus}
    </strong>
</div>
                        </td>

                    </tr>
                `;
            })
            .join("");


        // -------------------------------------------------
        // Summary
        // -------------------------------------------------

        const lowerCount =
            selectedStudents.filter(student => {

                const history =
                    historyMap.get(student.id);

                return Number(
                    history?.rooms?.grade_level
                ) === 3;

            }).length;

        const upperCount =
            selectedStudents.filter(student => {

                const history =
                    historyMap.get(student.id);

                return Number(
                    history?.rooms?.grade_level
                ) === 6;

            }).length;


        // -------------------------------------------------
        // Confirmation
        // -------------------------------------------------

        const confirmResult =
            await Swal.fire({

                title:
                    "Graduate — สำเร็จการศึกษา",

                width: 1050,

                html: `
                    <div style="text-align:left">

                        <div style="
                            padding:14px;
                            margin-bottom:16px;
                            background:#f0fdf4;
                            border:1px solid #bbf7d0;
                            border-radius:8px;
                        ">

                            <strong>
                                🎓 ตรวจสอบรายการสำเร็จการศึกษา
                            </strong>

                            <div style="
                                margin-top:10px;
                                font-size:13px;
                            ">
                                ม.3:
                            <strong>
                               ${lowerCount}
                            </strong>
                                คน
                                →
                               สำเร็จการศึกษาระดับมัธยมศึกษาตอนต้น
                            </div>

                            <div style="
                                margin-top:6px;
                                font-size:13px;
                            ">
                                ม.6:
                                <strong>
                                    ${upperCount}
                                </strong>
                                คน
                                →
                                สำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย
                            </div>

                            <div style="
                                margin-top:10px;
                                font-size:12px;
                                color:#666;
                            ">
                                Academic History เดิมจะไม่ถูกลบ
                            </div>

                        </div>

                        <div style="
                            overflow-x:auto;
                            max-height:420px;
                            overflow-y:auto;
                        ">

                            <table style="
                                width:100%;
                                border-collapse:collapse;
                                text-align:left;
                                font-size:13px;
                            ">

                                <thead>

                                    <tr>

                                        <th style="padding:8px;">
                                            รหัสนักเรียน
                                        </th>

                                        <th style="padding:8px;">
                                            ชื่อ
                                        </th>

                                        <th style="
                                            padding:8px;
                                            text-align:center;
                                        ">
                                            ชั้น
                                        </th>

                                        <th style="
                                            padding:8px;
                                            text-align:center;
                                        ">
                                            เลขที่
                                        </th>

                                        <th style="padding:8px;">
                                            ห้อง
                                        </th>

                                        <th style="padding:8px;">
                                            ผลลัพธ์
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>
                                    ${previewRows}
                                </tbody>

                            </table>

                        </div>

                    </div>
                `,

                confirmButtonText:
                    "ยืนยัน Graduate",

                confirmButtonColor:
                    "#16a34a",

                showCancelButton: true,

                cancelButtonText:
                    "ยกเลิก"

            });


        if (!confirmResult.isConfirmed) {
            return;
        }


        // -------------------------------------------------
        // Execute
        // -------------------------------------------------

        Swal.fire({

            title:
                "กำลังดำเนินการ Graduate...",

            text:
                "กรุณารอสักครู่",

            allowOutsideClick: false,

            allowEscapeKey: false,

            didOpen: () => {
                Swal.showLoading();
            }

        });


        const result =
            await graduateStudents({

                studentIds:
                    [...selectedStudentIds],

                academicYearId:
                    academicYearId

            });


        console.log(
            "Graduate success:",
            result
        );


        await Swal.fire({

            icon: "success",

            title:
                "Graduate สำเร็จ",

            html: `
                <div>
                    ดำเนินการ
                    <strong>
                        ${result.student_count}
                    </strong>
                    คนเรียบร้อยแล้ว
                    <br><br>

                    ม.3:
                    <strong>
                        ${result.lower_secondary_count}
                    </strong>
                    คน
                    <br>

                    ม.6:
                    <strong>
                        ${result.upper_secondary_count}
                    </strong>
                    คน
                </div>
            `,

            confirmButtonText:
                "ตกลง"

        });


        selectedStudentIds.clear();

        await loadStudents();


    } catch (error) {

        console.error(
            "Graduate:",
            error
        );

        let message =
            "ไม่สามารถดำเนินการ Graduate ได้";


        if (
            error?.message?.includes(
                "INVALID_STATUS_TRANSITION"
            )
        ) {
            message =
                "สามารถ Graduate ได้เฉพาะนักเรียนที่มีสถานะ ACTIVE เท่านั้น";
        }


        if (
            error?.message?.includes(
                "STUDENT_HISTORY_NOT_FOUND"
            )
        ) {
            message =
                "ไม่พบประวัตินักเรียนในปีการศึกษาที่เลือก";
        }


        if (
            error?.message?.includes(
                "GRADUATE_ONLY_GRADE_3_OR_6"
            )
        ) {
            message =
                "Graduate ใช้ได้เฉพาะนักเรียนระดับชั้น ม.3 หรือ ม.6 เท่านั้น";
        }


        if (
            error?.message?.includes(
                "ALREADY_COMPLETED"
            )
        ) {
            message =
                "นักเรียนมีประวัติสำเร็จการศึกษาในปีการศึกษานี้แล้ว";
        }


        await Swal.fire({

            icon: "error",

            title:
                "Graduate ไม่สำเร็จ",

            text:
                message,

            confirmButtonText:
                "ตกลง"

        });

    }
}
// -----------------------------------------------------
// Withdraw Form
// -----------------------------------------------------
async function openWithdrawForm() {

    const studentIds = [...selectedStudentIds];

    if (studentIds.length === 0) {
        await showWarning("กรุณาเลือกนักเรียนก่อน");
        return;
    }

    const academicYearId =
        document.getElementById(
            "student-academic-year"
        )?.value;

    if (!academicYearId) {
        await showWarning(
            "กรุณาเลือกปีการศึกษาก่อน"
        );
        return;
    }

    try {

        // -------------------------------------------------
        // Load selected students
        // -------------------------------------------------

        const {
            data: selectedStudents,
            error: studentError
        } = await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                first_name,
                last_name,
                student_no,
                current_status
            `)
            .in("id", studentIds)
            .is("deleted_at", null)
            .order("student_code", {
                ascending: true
            });

        if (studentError) {
            throw studentError;
        }

        if (
            !selectedStudents ||
            selectedStudents.length === 0
        ) {
            await showError(
                "ไม่พบข้อมูลนักเรียนที่เลือก"
            );
            return;
        }

        // -------------------------------------------------
        // Validate ACTIVE
        // -------------------------------------------------

        const invalidStudents =
            selectedStudents.filter(
                student =>
                    student.current_status !== "ACTIVE"
            );

        if (invalidStudents.length > 0) {

            const studentList =
                invalidStudents
                    .map(student => `
                        <li>
                            <strong>
                                ${escapeHtml(
                                    student.student_code
                                )}
                            </strong>
                            —
                            ${escapeHtml(
                                `${student.first_name} ${student.last_name}`
                            )}
                            <span style="
                                color:#666;
                                font-size:12px;
                            ">
                                (${escapeHtml(
                                    student.current_status
                                )})
                            </span>
                        </li>
                    `)
                    .join("");

            await Swal.fire({
                icon: "warning",
                title: "ไม่สามารถ Withdraw ได้",
                html: `
                    <div style="text-align:left">
                        <p>
                            Withdraw ได้เฉพาะ
                            นักเรียนที่มีสถานะ
                            <strong>ACTIVE</strong>
                        </p>

                        <ul>
                            ${studentList}
                        </ul>
                    </div>
                `,
                confirmButtonText: "ตกลง"
            });

            return;
        }

        // -------------------------------------------------
        // Load Academic Year
        // -------------------------------------------------

        const {
            data: academicYear,
            error: academicYearError
        } = await supabaseClient
            .from("academic_years")
            .select("id, year")
            .eq("id", academicYearId)
            .single();

        if (academicYearError) {
            throw academicYearError;
        }

        // -------------------------------------------------
        // Preview
        // -------------------------------------------------

        const previewRows =
            selectedStudents
                .map(student => `
                    <tr>
                        <td style="padding:8px;">
                            ${escapeHtml(
                                student.student_code
                            )}
                        </td>

                        <td style="padding:8px;">
                            ${escapeHtml(
                                `${student.first_name} ${student.last_name}`
                            )}
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            ${student.student_no ?? "-"}
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            ACTIVE
                        </td>

                        <td style="
                            padding:8px;
                            text-align:center;
                        ">
                            WITHDRAWN
                        </td>
                    </tr>
                `)
                .join("");

        // -------------------------------------------------
        // Confirmation
        // -------------------------------------------------

        const confirmResult =
            await Swal.fire({

                title:
                    "Withdraw — ลาออก",

                width: 850,

                html: `
                    <div style="text-align:left">

                        <div style="
                            padding:14px;
                            margin-bottom:16px;
                            background:#fff7ed;
                            border:1px solid #fed7aa;
                            border-radius:8px;
                        ">

                            <strong>
                                🚪 ตรวจสอบรายการลาออก
                            </strong>

                            <div style="
                                margin-top:10px;
                                font-size:13px;
                            ">
                                ปีการศึกษา:
                                <strong>
                                    ${escapeHtml(
                                        academicYear?.year ?? "-"
                                    )}
                                </strong>
                            </div>

                            <div style="
                                margin-top:6px;
                                font-size:13px;
                            ">
                                จำนวน:
                                <strong>
                                    ${selectedStudents.length}
                                </strong>
                                คน
                            </div>

                            <div style="
                                margin-top:10px;
                                font-size:12px;
                                color:#666;
                            ">
                                Academic History เดิมจะไม่ถูกลบ
                            </div>

                        </div>

                        <div style="
                            overflow-x:auto;
                            max-height:400px;
                            overflow-y:auto;
                        ">

                            <table style="
                                width:100%;
                                border-collapse:collapse;
                                text-align:left;
                                font-size:13px;
                            ">

                                <thead>
                                    <tr>
                                        <th style="padding:8px;">
                                            รหัสนักเรียน
                                        </th>

                                        <th style="padding:8px;">
                                            ชื่อ
                                        </th>

                                        <th style="
                                            padding:8px;
                                            text-align:center;
                                        ">
                                            เลขที่
                                        </th>

                                        <th style="
                                            padding:8px;
                                            text-align:center;
                                        ">
                                            สถานะเดิม
                                        </th>

                                        <th style="
                                            padding:8px;
                                            text-align:center;
                                        ">
                                            สถานะใหม่
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    ${previewRows}
                                </tbody>

                            </table>

                        </div>

                    </div>
                `,

                confirmButtonText:
                    "ยืนยัน Withdraw",

                confirmButtonColor:
                    "#ea580c",

                showCancelButton: true,

                cancelButtonText:
                    "ยกเลิก"
            });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // -------------------------------------------------
        // Execute
        // -------------------------------------------------

        Swal.fire({
            title:
                "กำลังดำเนินการ Withdraw...",

            text:
                "กรุณารอสักครู่",

            allowOutsideClick: false,
            allowEscapeKey: false,

            didOpen: () => {
                Swal.showLoading();
            }
        });

        const result =
            await withdrawStudents({

                studentIds:
                    [...selectedStudentIds],

                academicYearId:
                    academicYearId
            });

        console.log(
            "Withdraw success:",
            result
        );

        await Swal.fire({

            icon: "success",

            title:
                "Withdraw สำเร็จ",

            text:
                `ดำเนินการ ${result.student_count} คนเรียบร้อยแล้ว`,

            confirmButtonText:
                "ตกลง"
        });

        selectedStudentIds.clear();

        await loadStudents();

    } catch (error) {

        console.error(
            "Withdraw:",
            error
        );

        let message =
            "ไม่สามารถดำเนินการ Withdraw ได้";

        if (
            error?.message?.includes(
                "INVALID_STATUS_TRANSITION"
            )
        ) {
            message =
                "สามารถ Withdraw ได้เฉพาะนักเรียนที่มีสถานะ ACTIVE เท่านั้น";
        }

        if (
            error?.message?.includes(
                "STUDENT_HISTORY_NOT_FOUND"
            )
        ) {
            message =
                "ไม่พบประวัตินักเรียนในปีการศึกษาที่เลือก";
        }

        await Swal.fire({

            icon: "error",

            title:
                "Withdraw ไม่สำเร็จ",

            text:
                message,

            confirmButtonText:
                "ตกลง"
        });
    }
}

    // -----------------------------------------------------
    // Helpers
    // -----------------------------------------------------

    function setLoading(isLoading) {

        const button =
            document.getElementById("btn-load-students");

        if (!button) return;

        button.disabled = isLoading;

        button.textContent =
            isLoading
                ? "กำลังโหลด..."
                : "🔍 โหลดรายชื่อ";
    }

    function showWarning(message) {

        if (typeof Swal !== "undefined") {

            Swal.fire({
                icon: "warning",
                title: "ตรวจสอบข้อมูล",
                text: message
            });

        } else {

            alert(message);
        }
    }

    function showError(message) {

        if (typeof Swal !== "undefined") {

            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message
            });

        } else {

            alert(message);
        }
    }

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    return {
        init
    };

})();