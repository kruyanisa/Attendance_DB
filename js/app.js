// ฟังก์ชันสลับหน้าจอ และไฮไลต์เมนูที่เลือก
function switchView(view) {
    // ซ่อน Navigation Placeholder เมื่อกลับเข้าสู่ View จริง
const navigationPlaceholder =
    document.getElementById("view-navigation-placeholder");

if (navigationPlaceholder) {
    navigationPlaceholder.style.display = "none";
}
  const views = ['attendance', 'homework', 'qrcode', 'guidance', 'study', 'scholarship', 'pdf', 'settings', 'portal', 'dashboard', 'schedule'];
  
  views.forEach(v => {
    // ซ่อน/แสดง เนื้อหา
    const viewElement = document.getElementById(`view-${v}`);
    if(viewElement) {
      viewElement.style.display = (v === view) ? 'block' : 'none';
    }
    
    // เติม/ลบ แถบ Active ที่เมนู
    const menuBtn = document.getElementById(`menu-${v}`);
    if (menuBtn) {
      if (v === view) menuBtn.classList.add('active');
      else menuBtn.classList.remove('active');
    }
  });
     if(view === "settings"){
    showSetting("profile");
    loadProfile();
}
if(view === "dashboard"){
    loadDashboard();
}

if(view === "schedule"){
    switchScheduleTab("timetable");
}

/* =========================================================
   Navigation — Auto Open Active Group
   ========================================================= */

const activeMenu = document.getElementById(`menu-${view}`);

if (activeMenu) {

    const parentGroup = activeMenu.closest('.nav-group');

    if (parentGroup) {
        parentGroup.classList.add('open');
    }
}
  
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
        "schedule"
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

            <button
                type="button"
                class="schedule-add-btn"
                onclick="openScheduleCreate()"
            >
                ＋ เพิ่มตารางสอน
            </button>

        </div>

        <div id="schedule-manage-list">
            <div class="schedule-loading-state">
                <div class="schedule-empty-icon">🗂️</div>
                <h2>กำลังโหลดตารางสอน...</h2>
            </div>
        </div>
    `;

    loadScheduleManage();

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

async function loadScheduleView() {

    const content = document.getElementById('schedule-content');

    if (!content) return;

    content.innerHTML = `
        <div class="schedule-loading-state">
            <div class="schedule-empty-icon">📅</div>
            <h2>กำลังโหลดตารางสอน...</h2>
        </div>
    `;

    try {

        const rawSchedules = await getClassSchedules();

        const schedules = rawSchedules.map(mapScheduleData);

        renderScheduleTimetable(schedules);

    } catch (error) {

        console.error("Schedule Load Error:", error);

        content.innerHTML = `
            <div class="schedule-empty-state">
                <div class="schedule-empty-icon">⚠️</div>
                <h2>ไม่สามารถโหลดตารางสอนได้</h2>
                <p>กรุณาลองใหม่อีกครั้ง</p>
            </div>
        `;

    }
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


        // ====================================================
        // 2. แปลงข้อมูลด้วย mapper เดิม
        // ====================================================

        const schedules =
            rawSchedules.map(mapScheduleData);


        // ====================================================
        // 3. ไม่มีข้อมูล
        // ====================================================

        if (schedules.length === 0) {

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


        schedules.forEach(schedule => {

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

        const subjectAssignment =
            await getOrCreateSubjectAssignment({

                teacherId:
                    currentAssignment.teacher_id,

                subjectId:
                    currentAssignment.subject_id,

                roomId:
                    roomId,

                academicYearId:
                    currentAssignment.academic_year_id,

                semesterId:
                    currentAssignment.semester_id

            });


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

function renderScheduleTimetable(schedules) {

    const content = document.getElementById('schedule-content');

    if (!content) return;

    // ============================================================
    // LESSON TIMES
    // ============================================================

    const lessonTimes = {};

    schedules.forEach(schedule => {

        if (!lessonTimes[schedule.lessonNo]) {

            lessonTimes[schedule.lessonNo] = {
                lessonNo: schedule.lessonNo,
                startTime: schedule.startTime,
                endTime: schedule.endTime
            };

        }

    });

    const lessonNumbers = [1, 2, 3, 4, 6, 7, 8];

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
        <th class="schedule-activity-column">

            <div>📋 กิจกรรม</div>

            <span>
                15:30–16:00
            </span>

        </th>

                    </tr>

                </thead>

                <tbody>
    `;


    // ============================================================
    // ROWS — วันเรียงลงด้านล่าง
    // ============================================================

    weekdays.forEach(day => {

        html += `
            <tr>

                <th class="schedule-day-cell">
                    ${day.label}
                </th>


                <!-- HOMEROOM -->

                <td class="schedule-special-cell">

                    <div class="schedule-mini-activity">
                        🏫 โฮมรูม
                    </div>

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

if (groupedSchedules.length === 0) {

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

}

            html += `
                </td>
            `;

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
           
            if (groupedSchedules.length === 0) {

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

            }

            html += `
                </td>
            `;

        });


        // ========================================================
        // END-OF-DAY ACTIVITY
        // ========================================================

        let activity = "";

        if (day.value >= 1 && day.value <= 4) {

            activity = "📋 PLC";

        } else if (day.value === 5) {

            activity = "⭐ ส่งเสริมคุณธรรม";

        }

        html += `
                <td class="schedule-activity-cell">

                    <div class="schedule-mini-activity">
                        ${activity}
                    </div>

                </td>

            </tr>
        `;

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
    }
];

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

        const { data, error } = await supabaseClient

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
        // 7. กลับไปโหลด Timetable ใหม่
        // ============================================

        await loadScheduleView();


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