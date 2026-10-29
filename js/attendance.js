let displayedStudents = [];
let attendanceMode = "class";

async function initSystem() {

    Swal.fire({
        title: 'กำลังโหลดข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const role = await getCurrentUserRole();

if (
    role === "Student" ||
    role === "Parent"
) {
    Swal.close();
    return;
}

    try {

        // ============================================
        // 1. ตั้งค่าวันที่เป็นวันนี้
        // ============================================

        const attendanceDate =
            new Date().toISOString().split("T")[0];

        document.getElementById("attendance-date").value =
            attendanceDate;

        // ============================================
        // 2. โหลดข้อมูลที่ยังจำเป็น
        //    - Schedule สำหรับ Attendance
        //    - Rooms สำหรับ QR
        // ============================================

        const [schedules, rooms] =
            await Promise.all([
                getAttendanceSchedules(attendanceDate),
                getRooms()
            ]);

        // ============================================
        // 3. เตรียม Schedule สำหรับเลือกคาบ
        // ============================================

        const scheduleSelect =
            document.getElementById(
                "attendance-schedule"
            );

        scheduleSelect.onchange =
    handleAttendanceScheduleChange;

        const classSelect =
       document.getElementById(
        "attendance-class"
    );

        classSelect.onchange =
    handleAttendanceClassChange;

    // ============================================
// Reload Schedule เมื่อเปลี่ยนวันที่
// ============================================

document.getElementById("attendance-date")
    .addEventListener("change", async function () {

        const newDate = this.value;

        if (!newDate) {
            return;
        }
        // ============================================
// Activity Mode
// เปลี่ยนวันที่แล้วให้โหลด Activity แทน
// ไม่ให้ Logic ตารางสอนเขียนทับ Dropdown
// ============================================

if (attendanceMode === "activity") {

    await loadActivityAttendanceOptions();

    return;
}

        try {

            Swal.fire({
                title: "กำลังโหลดตารางสอน...",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // --------------------------------------------
            // โหลด Schedule ของวันที่ใหม่
            // --------------------------------------------

            const schedules =
                await getAttendanceSchedules(newDate);

            // --------------------------------------------
            // เก็บ Schedule ใหม่
            // --------------------------------------------

            window.attendanceSchedules =
                schedules || [];

            // --------------------------------------------
            // ล้าง Schedule ที่เลือกไว้เดิม
            // --------------------------------------------

            window.selectedAttendanceSchedule =
                null;
// ============================================
// ล้าง Attendance เดิมเมื่อเปลี่ยนวันที่
// ============================================

displayedStudents = [];

attendanceCompleted = false;

// ล้างตารางนักเรียน
const tbody =
    document.getElementById("student-body");

if (tbody) {
    tbody.innerHTML = "";
}

// ซ่อนตาราง
const studentTable =
    document.getElementById("student-table");

if (studentTable) {
    studentTable.style.display = "none";
}

// ซ่อนปุ่มบันทึก
const saveButton =
    document.getElementById("save-btn");

if (saveButton) {
    saveButton.style.display = "none";
}

// ซ่อนปุ่ม Scanner
const scanButton =
    document.getElementById("scan-btn");

if (scanButton) {
    scanButton.style.display = "none";
}
            // --------------------------------------------
            // Reset คาบ
            // --------------------------------------------

            scheduleSelect.innerHTML =
                '<option value="">-- เลือกคาบเรียน --</option>';

            // --------------------------------------------
            // Reset ชั้นเรียน
            // --------------------------------------------

            classSelect.innerHTML =
                '<option value="">-- เลือกชั้นเรียน --</option>';

            // --------------------------------------------
// Reset รายละเอียดคาบ
// --------------------------------------------

document.getElementById(
    "attendance-class-group"
).style.display = "none";

const scheduleInfo =
    document.getElementById(
        "attendance-schedule-info"
    );

const scheduleDetails =
    document.getElementById(
        "attendance-schedule-details"
    );

// ล้างรายละเอียดคาบเดิม
if (scheduleDetails) {
    scheduleDetails.innerHTML = "";
}

// Card ยังอยู่ แต่แสดงสถานะว่ายังไม่มีข้อมูล
if (scheduleInfo) {
    scheduleInfo.style.display = "block";
}

            // --------------------------------------------
            // ปิดปุ่มโหลดรายชื่อ
            // --------------------------------------------

            document.getElementById(
                "load-btn"
            ).disabled = true;

            // --------------------------------------------
            // สร้างรายการคาบใหม่
            // --------------------------------------------

            const lessonMap =
                new Map();

            (schedules || []).forEach(
                schedule => {

                    if (
                        !lessonMap.has(
                            schedule.lessonNo
                        )
                    ) {

                        lessonMap.set(
                            schedule.lessonNo,
                            schedule
                        );

                    }

                }
            );

            [...lessonMap.entries()]
                .sort(
                    ([lessonA], [lessonB]) =>
                        lessonA - lessonB
                )
                .forEach(
                    ([lessonNo]) => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            lessonNo;

                        option.textContent =
                            `คาบ ${lessonNo}`;

                        scheduleSelect.appendChild(
                            option
                        );

                    }
                );

            Swal.close();

            console.log(
                "ATTENDANCE SCHEDULE RELOADED:",
                {
                    date: newDate,
                    count: schedules?.length || 0,
                    schedules: schedules
                }
            );

        } catch (error) {

            console.error(
                "RELOAD ATTENDANCE SCHEDULE ERROR:",
                error
            );

            Swal.close();

            Swal.fire(
                "เกิดข้อผิดพลาด",
                "ไม่สามารถโหลดตารางสอนของวันที่เลือกได้",
                "error"
            );

        }

    });

        scheduleSelect.innerHTML =
            '<option value="">-- เลือกคาบเรียน --</option>';


        // เก็บ Schedule ทั้งหมดไว้ใช้ตอนเลือกคาบ
        window.attendanceSchedules =
            schedules || [];


        // หาเฉพาะ "คาบ" ที่มี Schedule จริง
        const lessonMap =
            new Map();

        (schedules || []).forEach(schedule => {

            if (!lessonMap.has(schedule.lessonNo)) {

                lessonMap.set(
                    schedule.lessonNo,
                    schedule
                );

            }

        });


        // เรียงคาบจากน้อยไปมาก
        const lessons =
            [...lessonMap.entries()]
                .sort(
                    ([lessonA], [lessonB]) =>
                        lessonA - lessonB
                );


        lessons.forEach(
            ([lessonNo, schedule]) => {

                const option =
                    document.createElement("option");

                option.value =
                    lessonNo;

                option.textContent =
                    `คาบ ${lessonNo}`;

                scheduleSelect.appendChild(
                    option
                );

            }
        );


        // ============================================
        // 4. โหลดห้องสำหรับระบบ QR
        //    ส่วนนี้คง Logic เดิมไว้
        // ============================================

        const qrRoom =
            document.getElementById(
                "qr-room-filter"
            );

        if (qrRoom) {

            qrRoom.innerHTML =
                '<option value="">-- เลือกห้องเรียน --</option>';

            rooms.forEach(room => {

                const option =
                    document.createElement("option");

                option.value =
                    room.id;

                option.textContent =
                    room.room_name;

                qrRoom.appendChild(
                    option
                );

            });

        }


        // ============================================
        // 5. สถานะเริ่มต้น
        // ============================================

        const classGroup =
            document.getElementById(
                "attendance-class-group"
            );

        const scheduleInfo =
            document.getElementById(
                "attendance-schedule-info"
            );

        if (classGroup) {
            classGroup.style.display =
                "none";
        }

        if (scheduleInfo) {
            scheduleInfo.style.display =
                "none";
        }


        document.getElementById(
            "load-btn"
        ).disabled = false;


        Swal.close();

    } catch (error) {

        console.error(
            "initSystem ERROR:",
            error
        );

        Swal.close();

        Swal.fire(
            'เกิดข้อผิดพลาด',
            'ไม่สามารถโหลดข้อมูลเริ่มต้นได้',
            'error'
        );

    }

}
// ============================================================
// Reset รายชื่อนักเรียนเมื่อเปลี่ยนเงื่อนไข
// ต้องกด "โหลดรายชื่อ" ใหม่ทุกครั้ง
// ============================================================

function resetAttendanceList() {

    // ล้างข้อมูลนักเรียนในตัวแปร
    displayedStudents = [];

    // Reset สถานะเช็คชื่อครบ
    attendanceCompleted = false;

    // ล้างตารางนักเรียน
    const tbody =
        document.getElementById("student-body");

    if (tbody) {
        tbody.innerHTML = "";
    }

    // ซ่อนตาราง
    const studentTable =
        document.getElementById("student-table");

    if (studentTable) {
        studentTable.style.display = "none";
    }

    // ซ่อนปุ่มบันทึก
    const saveButton =
        document.getElementById("save-btn");

    if (saveButton) {
        saveButton.style.display = "none";
    }

    // ซ่อนปุ่ม Scanner
    const scanButton =
        document.getElementById("scan-btn");

    if (scanButton) {
        scanButton.style.display = "none";
    }

    // Reset Summary Cards
    if (typeof updateSummaryCards === "function") {
        updateSummaryCards();
    }
}
// ============================================================
// Attendance — Activity Options
// โหลดรายการกิจกรรมสำหรับวันที่เลือก
// ============================================================

async function loadActivityAttendanceOptions() {

    // Student / Parent ไม่ใช่ผู้เช็กชื่อ
    const role = await getCurrentUserRole();

    if (role === "Student" || role === "Parent") {
        resetAttendanceList();

        window.selectedAttendanceActivity = null;
        window.attendanceActivities = [];

        return;
    }

    // ล้างรายชื่อนักเรียนและสถานะเช็กชื่อของวันที่เดิม
    resetAttendanceList();

    // ล้างกิจกรรมที่เลือกไว้ก่อนหน้า
    window.selectedAttendanceActivity = null;
    window.attendanceActivities = [];

    const attendanceDate =
        document.getElementById(
            "attendance-date"
        ).value;

    const scheduleSelect =
        document.getElementById(
            "attendance-schedule"
        );

    const classGroup =
        document.getElementById(
            "attendance-class-group"
        );

    const scheduleInfo =
        document.getElementById(
            "attendance-schedule-info"
        );

    const scheduleDetails =
        document.getElementById(
            "attendance-schedule-details"
        );

    const loadButton =
        document.getElementById(
            "load-btn"
        );


    // ============================================
    // Reset UI
    // ============================================

    scheduleSelect.innerHTML =
        '<option value="">-- เลือกกิจกรรม --</option>';

    classGroup.style.display = "none";

    scheduleInfo.style.display = "none";

    scheduleDetails.innerHTML = "";

    loadButton.disabled = true;


    if (!attendanceDate) {
        return;
    }


    try {

        Swal.fire({
            title: "กำลังโหลดกิจกรรม...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });


        // ============================================
        // โหลดกิจกรรมของวันที่เลือก
        // ============================================

        const activities =
            await getAttendanceActivities(
                attendanceDate
            );


        console.log(
            "ATTENDANCE ACTIVITIES:",
            activities
        );


        // ============================================
        // ไม่มี Activity
        // ============================================

        if (
            !activities ||
            activities.length === 0
        ) {

            scheduleSelect.innerHTML =
                '<option value="">-- ไม่มีกิจกรรม --</option>';

            Swal.close();

            return;
        }


        // ============================================
        // เก็บข้อมูล Activity
        // ============================================

        window.attendanceActivities =
            activities;


        // ============================================
        // สร้างรายการ Activity
        // ============================================

        activities.forEach(activity => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                activity.activityId;

            option.textContent =
                activity.activityName;

            scheduleSelect.appendChild(
                option
            );

        });


        Swal.close();


        // ============================================
        // เปลี่ยน Event ของ Select
        // ============================================

        scheduleSelect.onchange =
            handleAttendanceActivityChange;


    } catch (error) {

        console.error(
            "LOAD ACTIVITY ATTENDANCE OPTIONS ERROR:",
            error
        );

        Swal.close();

        Swal.fire(
            "เกิดข้อผิดพลาด",
            "ไม่สามารถโหลดกิจกรรมได้",
            "error"
        );

    }

}

// ============================================================
// Attendance — Schedule Selection
// เลือกคาบ → แสดงชั้นเรียนที่มี Schedule ในคาบนั้น
// ============================================================

function handleAttendanceScheduleChange() {
    resetAttendanceList();

    const lessonNo =
        Number(
            document.getElementById(
                "attendance-schedule"
            ).value
        );

    const classGroup =
        document.getElementById(
            "attendance-class-group"
        );

    const classSelect =
        document.getElementById(
            "attendance-class"
        );

    const scheduleInfo =
        document.getElementById(
            "attendance-schedule-info"
        );

    const scheduleDetails =
        document.getElementById(
            "attendance-schedule-details"
        );

    const loadButton =
        document.getElementById(
            "load-btn"
        );


    // ============================================
    // ยังไม่ได้เลือกคาบ
    // ============================================

    if (!lessonNo) {

        classGroup.style.display = "none";

        scheduleInfo.style.display = "none";

        classSelect.innerHTML =
            '<option value="">-- เลือกชั้นเรียน --</option>';

        loadButton.disabled = true;
        window.selectedAttendanceSchedule = null;
        return;
    }


    // ============================================
    // หา Schedule ของคาบที่เลือก
    // ============================================
       window.selectedAttendanceSchedule = null;
    const schedules =
        (window.attendanceSchedules || [])
            .filter(
                schedule =>
                    Number(schedule.lessonNo) === lessonNo
            );


    // ============================================
    // สร้างรายการชั้นเรียน
    // ============================================

    classSelect.innerHTML =
        '<option value="">-- เลือกชั้นเรียน --</option>';


    const uniqueClasses =
        new Map();


    schedules.forEach(schedule => {

        if (!schedule.roomId) {
            return;
        }

        if (!uniqueClasses.has(schedule.roomId)) {

            uniqueClasses.set(
                schedule.roomId,
                schedule
            );

        }

    });


    [...uniqueClasses.values()]
        .sort(
            (a, b) =>
                a.className.localeCompare(
                    b.className,
                    "th"
                )
        )
        .forEach(schedule => {

            const option =
                document.createElement("option");

            option.value =
                schedule.roomId;

            option.textContent =
                schedule.className;

            classSelect.appendChild(
                option
            );

        });


    // ============================================
    // แสดงรายละเอียดของคาบ
    // ============================================

    if (schedules.length > 0) {

        const firstSchedule =
            schedules[0];

        scheduleDetails.innerHTML = `
            <div>
                <strong>คาบ ${lessonNo}</strong>
                ${firstSchedule.startTime || ""}
                -
                ${firstSchedule.endTime || ""}
            </div>

            <div>
                ครูผู้สอน:
                ${firstSchedule.teacherName || "-"}
            </div>

            <div>
                ${schedules.length} ห้องเรียน
            </div>
        `;

        scheduleInfo.style.display =
            "block";

    }


    // ============================================
    // แสดงตัวเลือกชั้นเรียน
    // ============================================

    classGroup.style.display =
        "block";

    loadButton.disabled = false;

}
// ============================================================
// Attendance — Activity Selection
// เลือกกิจกรรม → เตรียม Context สำหรับเช็กชื่อกิจกรรม
// ============================================================

async function handleAttendanceActivityChange() {

    // ล้างรายชื่อนักเรียนเดิมก่อน
    resetAttendanceList();

    const activityId =
        document.getElementById(
            "attendance-schedule"
        ).value;

    if (!activityId) {
        window.selectedAttendanceActivity = null;
        return;
    }

    // หา Activity จากข้อมูลที่โหลดไว้
    const activity =
        (window.attendanceActivities || [])
            .find(
                item =>
                    item.activityId === activityId
            );

    if (!activity) {
        console.error(
            "Activity not found:",
            activityId
        );

        window.selectedAttendanceActivity = null;

        return;
    }

    // เก็บ Activity Context
    window.selectedAttendanceActivity =
        activity;

    console.log(
        "ATTENDANCE ACTIVITY SELECTED:",
        activity
    );
    console.log(
    "ACTIVITY TEACHERS:",
    activity.teachers
);

    // แสดงรายละเอียดกิจกรรม
    const scheduleInfo =
        document.getElementById(
            "attendance-schedule-info"
        );

    const scheduleDetails =
        document.getElementById(
            "attendance-schedule-details"
        );

    // ============================================
// Activity Details
// ============================================

if (scheduleDetails) {

const activitySchedule =
    getActivityScheduleForDate(
        activity,
        document.getElementById("attendance-date").value
    );

    const teacherNames =
    activity.teachers &&
    activity.teachers.length > 0

        ? activity.teachers
            .map(t => {

                const firstName =
                    t.first_name || "";

                const lastName =
                    t.last_name || "";

                return `${firstName} ${lastName}`.trim();

            })
            .filter(Boolean)
            .join(", ")

        : "-";

    const participantCount = "-";

    const startTime =
        activitySchedule?.startTime ||
        activitySchedule?.start_time ||
        "-";


    const endTime =
        activitySchedule?.endTime ||
        activitySchedule?.end_time ||
        "-";


    const lessonNo =
        activitySchedule?.lessonNo ??
        activitySchedule?.lesson_no ??
        "-";


    const weekdayMap = {

        1: "จันทร์",
        2: "อังคาร",
        3: "พุธ",
        4: "พฤหัสบดี",
        5: "ศุกร์",
        6: "เสาร์",
        7: "อาทิตย์"

    };


    const weekday =
        activitySchedule?.weekday
            ? weekdayMap[
                activitySchedule.weekday
            ]
            : "-";


    scheduleDetails.innerHTML = `

        <div>
            <strong>กิจกรรม:</strong>
            ${activity.activityName || "-"}
        </div>

        <div>
            <strong>ประเภท:</strong>
            ${activity.activityTypeName || "-"}
        </div>

        <div>
            <strong>ครูผู้รับผิดชอบ:</strong>
            ${teacherNames}
        </div>

        <div>
            <strong>วัน:</strong>
            ${weekday}
        </div>

        <div>
            <strong>คาบ:</strong>
            ${lessonNo}
        </div>

        <div>
            <strong>เวลา:</strong>
            ${startTime}
            -
            ${endTime}
        </div>

        <div>
            <strong>จำนวนสมาชิก:</strong>
            <span id="activity-participant-count">
            ${participantCount} </span>
        </div>

    `;
}

    if (scheduleInfo) {
        scheduleInfo.style.display = "block";
    }

    // เปิดปุ่มโหลดรายชื่อ
    const loadButton =
        document.getElementById("load-btn");

    if (loadButton) {
        loadButton.disabled = false;
    }
}
// ============================================================
// Attendance — Class Selection
// เลือกชั้นเรียน → แสดงรายละเอียด Schedule
// ============================================================

function handleAttendanceClassChange() {
    resetAttendanceList();
    const lessonNo =
        Number(
            document.getElementById(
                "attendance-schedule"
            ).value
        );

    const roomId =
        document.getElementById(
            "attendance-class"
        ).value;

    const scheduleInfo =
        document.getElementById(
            "attendance-schedule-info"
        );

    const scheduleDetails =
        document.getElementById(
            "attendance-schedule-details"
        );

    const loadButton =
        document.getElementById(
            "load-btn"
        );


    // ============================================
    // ยังเลือกข้อมูลไม่ครบ
    // ============================================

    if (!lessonNo || !roomId) {

        scheduleInfo.style.display =
            "none";

        loadButton.disabled =
            true;

        return;
    }


    // ============================================
    // หา Schedule ที่ตรงกับ
    // คาบ + ชั้นเรียน
    // ============================================

    const schedule =
        (window.attendanceSchedules || [])
            .find(item =>
                Number(item.lessonNo) === lessonNo &&
                item.roomId === roomId
            );


    // ============================================
    // ไม่พบ Schedule
    // ============================================

    if (!schedule) {

        console.warn(
            "Attendance schedule not found:",
            {
                lessonNo,
                roomId
            }
        );

        scheduleInfo.style.display =
            "none";

        loadButton.disabled =
            true;

        return;
    }


    // ============================================
    // เก็บ Schedule ที่เลือกไว้
    // ============================================

    window.selectedAttendanceSchedule =
        schedule;


    // ============================================
    // แสดงรายละเอียด
    // ============================================

    scheduleDetails.innerHTML = `

        <div>
            <strong>
                คาบ ${schedule.lessonNo}
            </strong>

            ${schedule.startTime || ""}
            -
            ${schedule.endTime || ""}
        </div>

        <div>
            <strong>
                ชั้นเรียน:
            </strong>

            ${schedule.className || "-"}
        </div>

        <div>
            <strong>
                วิชา:
            </strong>

            ${schedule.subjectCode || "-"}
            -
            ${schedule.subjectName || "-"}
        </div>

        <div>
            <strong>
                ครู:
            </strong>

            ${schedule.teacherName || "-"}
        </div>

        <div>
            <strong>
                ห้องสอน:
            </strong>

            ${schedule.teachingRoom || "-"}
        </div>

    `;


    scheduleInfo.style.display =
        "block";


    // ============================================
    // พร้อมเข้าสู่ Attendance Engine
    // ============================================

    loadButton.disabled =
        false;

}

function getActivityScheduleForDate(activity, attendanceDate) {

    if (!activity || !attendanceDate) {
        return null;
    }

    const schedules = activity.schedules || [];

    const date = new Date(
        `${attendanceDate}T12:00:00`
    );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const weekday = date.getDay() || 7;

    return schedules.find(schedule => {

        const validFrom =
            schedule.validFrom ?? schedule.valid_from;

        const validUntil =
            schedule.validUntil ?? schedule.valid_until;

        return (
            Number(schedule.weekday) === weekday &&
            (!validFrom || attendanceDate >= validFrom) &&
            (!validUntil || attendanceDate <= validUntil)
        );

    }) || null;
}

// ============================================================
// Attendance — Activity Participants
// โหลดนักเรียนที่เป็นสมาชิกของกิจกรรม
// ============================================================

async function loadActivityParticipantsAndRender() {

    const activity =
        window.selectedAttendanceActivity;

    if (!activity || !activity.activityId) {

        return Swal.fire(
            "แจ้งเตือน",
            "กรุณาเลือกกิจกรรมก่อนโหลดรายชื่อครับ",
            "warning"
        );

    }


    try {

        Swal.fire({
            title: "กำลังโหลดรายชื่อสมาชิก...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });


        console.log(
            "LOADING ACTIVITY PARTICIPANTS:",
            activity.activityId
        );


        // ============================================
        // โหลดสมาชิกกิจกรรม
        // ============================================

        displayedStudents =
        await getActivityParticipants(
        activity.activityId,
        document.getElementById("attendance-date").value
        );

        console.log(
            "ACTIVITY PARTICIPANTS:",
            displayedStudents
        );
// อัปเดตจำนวนสมาชิกจริง
const participantCountEl =
    document.getElementById(
        "activity-participant-count"
    );

if (participantCountEl) {
    participantCountEl.textContent =
        `${displayedStudents.length} คน`;
}
        // ============================================
// โหลด Activity Attendance Session เดิม
// ============================================

const attendanceDate =
    document.getElementById("attendance-date").value;


const activitySchedule =
    getActivityScheduleForDate(
        activity,
        document.getElementById("attendance-date").value
    );

let activityAttendanceMap = {};

if (activitySchedule?.id) {

    console.log(
        "LOADING ACTIVITY ATTENDANCE SESSION:",
        {
            activityScheduleId: activitySchedule.id,
            attendanceDate: attendanceDate
        }
    );

    const session =
        await getActivityAttendanceSession(
            activitySchedule.id,
            attendanceDate
        );

    console.log(
        "ACTIVITY ATTENDANCE SESSION:",
        session
    );

    if (session) {

        const attendanceData =
            await getAttendanceBySession(
                session.id
            );

        console.log(
            "ACTIVITY ATTENDANCE RECORDS:",
            attendanceData
        );

        (attendanceData || []).forEach(item => {

            activityAttendanceMap[
                item.student_id
            ] = item.status;

        });
    }
}


        // ============================================
        // ไม่มีนักเรียน
        // ============================================

        if (
            !displayedStudents ||
            displayedStudents.length === 0
        ) {

            Swal.close();

            return Swal.fire(
                "ไม่พบรายชื่อ",
                "กิจกรรมนี้ยังไม่มีนักเรียนที่เข้าร่วม",
                "info"
            );

        }


        // ============================================
        // สร้างตารางนักเรียน
        // ============================================

        const tbody =
            document.getElementById(
                "student-body"
            );

        tbody.innerHTML = "";


        const fragment =
            document.createDocumentFragment();


        displayedStudents.forEach(
            (row, i) => {

                const tr =
                    document.createElement("tr");


                tr.id =
                    `row-${i}`;


                tr.dataset.studentId =
                    row.studentId;
                const currentStatus =
                   activityAttendanceMap[row.studentId] ?? "";

                tr.innerHTML = `

                    <td>
                        <b>
                            ${row.studentNo ?? ""}
                        </b>
                    </td>


                    <td>
                        ${row.studentCode ?? ""}
                    </td>


                    <td>
                        <b>
                            ${row.prefix ?? ""}
                            ${row.firstName ?? ""}
                            ${row.lastName ?? ""}
                        </b>
                    </td>
                    <td>
                        <b>
                           ${row.roomName ?? "-"}
                        </b>
                    </td>

                    <td>
                        <span class="stats">
                            -
                        </span>
                    </td>


                    <td class="alert-text">
                        0 ครั้ง
                    </td>


                    <td>

                        <select
                            id="status-${i}"
                            onchange="updateSummaryCards()"
                            style="
                                padding:5px;
                                border-radius:5px;
                                border:1px solid #ccc;
                                font-family:'Prompt',sans-serif;
                            "
                        >

                            <option
                                value="รอเช็ค"
                                ${currentStatus === "" ? "selected" : ""}
                            >
                                -- รอเช็ค --
                            </option>


                            <option value="มา"
                            ${currentStatus === "PRESENT" ? "selected" : ""}
                            >
                                มา
                            </option>


                            <option value="สาย"
                            ${currentStatus === "LATE" ? "selected" : ""}
                            >
                                สาย
                            </option>


                            <option value="ลาป่วย"
                            ${currentStatus === "SICK" ? "selected" : ""}
                            >
                                ลาป่วย
                            </option>


                            <option value="ลากิจ"
                            ${currentStatus === "PERSONAL" ? "selected" : ""}
                            >
                                ลากิจ
                            </option>

                            <option value="ขาด"
                            ${currentStatus === "ABSENT" ? "selected" : ""}
                            >
                                ขาด
                            </option>

                        </select>

                    </td>


                    <td>

                        <button
                            class="btn-alert"
                            disabled
                            data-student-id="${row.studentId}"
                        >
                            🔔 Alert
                        </button>

                    </td>

                `;


                fragment.appendChild(tr);

            }
        );


        tbody.appendChild(
            fragment
        );


        // ============================================
        // แสดงตาราง
        // ============================================

        document.getElementById(
            "student-table"
        ).style.display =
            "table";


        document.getElementById(
            "save-btn"
        ).style.display =
            "block";


        document.getElementById(
            "scan-btn"
        ).style.display =
            "inline-block";


        attendanceCompleted =
            false;


        updateSummaryCards();


        Swal.close();


    } catch (error) {

        console.error(
            "LOAD ACTIVITY PARTICIPANTS ERROR:",
            error
        );


        Swal.close();


        Swal.fire(
            "เกิดข้อผิดพลาด",
            "ไม่สามารถโหลดรายชื่อสมาชิกกิจกรรมได้",
            "error"
        );

    }

}
// ============================================================
// Attendance — Class Options
// กลับจาก Activity Mode → Class Mode
// ============================================================
function loadClassAttendanceOptions() {

    console.log("LOADING CLASS ATTENDANCE OPTIONS");

    // ============================================
    // 1. ล้าง Activity Context
    // ============================================
    window.selectedAttendanceActivity = null;
    window.attendanceActivities = [];

    // ============================================
    // 2. ล้างรายชื่อนักเรียนเดิม
    // ============================================
    if (typeof resetAttendanceList === "function") {
        resetAttendanceList();
    }

    // ============================================
    // 3. Element ที่เกี่ยวข้อง
    // ============================================
    const scheduleSelect =
        document.getElementById("attendance-schedule");

    const classSelect =
        document.getElementById("attendance-class");

    const classGroup =
        document.getElementById("attendance-class-group");

    const scheduleInfo =
        document.getElementById("attendance-schedule-info");

    const scheduleDetails =
        document.getElementById("attendance-schedule-details");

    const loadButton =
        document.getElementById("load-btn");

    // ============================================
    // 4. คืน Dropdown "คาบเรียน"
    // ============================================
    if (scheduleSelect) {

        scheduleSelect.innerHTML =
            '<option value="">-- เลือกคาบเรียน --</option>';

        const lessonMap = new Map();

        (window.attendanceSchedules || []).forEach(
            schedule => {

                if (!lessonMap.has(schedule.lessonNo)) {

                    lessonMap.set(
                        schedule.lessonNo,
                        schedule
                    );

                }

            }
        );

        [...lessonMap.entries()]
            .sort(
                ([lessonA], [lessonB]) =>
                    lessonA - lessonB
            )
            .forEach(
                ([lessonNo]) => {

                    const option =
                        document.createElement("option");

                    option.value =
                        lessonNo;

                    option.textContent =
                        `คาบ ${lessonNo}`;

                    scheduleSelect.appendChild(
                        option
                    );

                }
            );

        // คืน Event ของ Class Mode
        scheduleSelect.onchange =
            handleAttendanceScheduleChange;
    }

    // ============================================
    // 5. Reset ชั้นเรียน
    // ============================================
    if (classSelect) {

        classSelect.innerHTML =
            '<option value="">-- เลือกชั้นเรียน --</option>';

        classSelect.onchange =
            handleAttendanceClassChange;
    }

    // ============================================
    // 6. Reset รายละเอียด
    // ============================================
    if (classGroup) {
        classGroup.style.display = "none";
    }

    if (scheduleInfo) {
        scheduleInfo.style.display = "none";
    }

    if (scheduleDetails) {
        scheduleDetails.innerHTML = "";
    }

    // ============================================
    // 7. Reset Schedule Context
    // ============================================
    window.selectedAttendanceSchedule = null;

    // ============================================
    // 8. ปิดปุ่มโหลดจนกว่าจะเลือกคาบ + ชั้น
    // ============================================
    if (loadButton) {
        loadButton.disabled = true;
    }

    console.log(
        "CLASS ATTENDANCE OPTIONS READY:",
        {
            schedules:
                window.attendanceSchedules?.length || 0
        }
    );
}
async function filterAndLoad() {
        // ============================================
    // Activity Mode
    // ใช้รายชื่อจาก activity_participants
    // ไม่แตะ Logic ตารางสอนเดิม
    // ============================================

    if (attendanceMode === "activity") {

        await loadActivityParticipantsAndRender();

        return;
    }

    const attendanceDate =
        document.getElementById(
            "attendance-date"
        ).value;

    const selectedSchedule =
        window.selectedAttendanceSchedule;

    const lessonNo =
        document.getElementById(
            "attendance-schedule"
        ).value;

    const selectedRoomId =
        document.getElementById(
            "attendance-class"
        ).value;


    // ============================================
    // 1. ตรวจสอบการเลือกคาบ
    // ============================================

    if (!lessonNo) {

        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกคาบเรียนก่อนโหลดรายชื่อครับ',
            'warning'
        );

    }


    // ============================================
    // 2. ตรวจสอบการเลือกชั้นเรียน
    // ============================================

    if (!selectedRoomId) {

        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกชั้นเรียนที่ต้องการก่อนโหลดรายชื่อครับ',
            'warning'
        );

    }


    // ============================================
    // 3. ตรวจสอบ Schedule Context
    // ============================================

    if (!selectedSchedule) {

        console.error(
            "Attendance Schedule Context Missing:",
            {
                attendanceDate,
                lessonNo,
                selectedRoomId
            }
        );

        return Swal.fire(
            'ผิดพลาด',
            'ไม่พบข้อมูลตารางสอนของคาบและชั้นเรียนที่เลือก กรุณาเลือกใหม่ครับ',
            'error'
        );

    }


    // ============================================
    // 4. ใช้ข้อมูลจาก Schedule จริง
    // ============================================

    const roomId =
        selectedSchedule.roomId;

    const subjId =
        selectedSchedule.subjectId;


    if (!roomId || !subjId) {

        console.error(
            "Invalid attendance schedule:",
            selectedSchedule
        );

        return Swal.fire(
            'ผิดพลาด',
            'ข้อมูลตารางสอนไม่ครบ ไม่สามารถโหลดรายชื่อได้',
            'error'
        );

    }


    console.log(
        "ATTENDANCE CONTEXT:",
        {
            date: attendanceDate,
            lessonNo: selectedSchedule.lessonNo,
            roomId: roomId,
            className: selectedSchedule.className,
            subjectId: subjId,
            subjectCode: selectedSchedule.subjectCode,
            subjectName: selectedSchedule.subjectName,
            scheduleId: selectedSchedule.scheduleId
        }
    );


    try {

        // ============================================
        // 5. โหลดนักเรียน
        // ============================================

        displayedStudents =
            await getStudentsByRoom(roomId);


        // ============================================
        // 6. โหลด Attendance Session
        // ============================================

        const session =
    await getClassAttendanceSession(
        selectedSchedule.scheduleId,
        attendanceDate
    );

        let attendanceMap = {};


        if (session) {

            const attendanceData =
                await getAttendanceBySession(
                    session.id
                );


            attendanceData.forEach(item => {

                attendanceMap[item.student_id] =
                    item.status;

            });

        }


        // ============================================
        // 7. สร้างตารางนักเรียน
        // ============================================

        const tbody =
            document.getElementById(
                'student-body'
            );

        tbody.innerHTML = '';


        const fragment =
            document.createDocumentFragment();


        displayedStudents.forEach(
            (row, i) => {

                const tr =
                    document.createElement(
                        'tr'
                    );

                tr.id =
                    `row-${i}`;

                tr.dataset.studentId =
                    row.id;


                const currentStatus =
                    attendanceMap[row.id] ?? "";


                tr.innerHTML = `

                    <td>
                        <b>
                            ${row.student_no ?? ''}
                        </b>
                    </td>

                    <td>
                        ${row.student_code ?? ''}
                    </td>

                    <td>
                        <b>
                            ${row.prefix ?? ''}
                            ${row.first_name ?? ''}
                            ${row.last_name ?? ''}
                        </b>
                    </td>

                    <td>
                        <span class="stats">
                            -
                        </span>
                    </td>

                    <td class="alert-text">
                        0 ครั้ง
                    </td>

                    <td>

                        <select
                            id="status-${i}"
                            onchange="updateSummaryCards()"
                            style="
                                padding:5px;
                                border-radius:5px;
                                border:1px solid #ccc;
                                font-family:'Prompt',sans-serif;
                            "
                        >

                            <option
                                value="รอเช็ค"
                                ${currentStatus === ""
                                    ? "selected"
                                    : ""}
                            >
                                -- รอเช็ค --
                            </option>

                            <option
                                value="มา"
                                ${currentStatus === "PRESENT"
                                    ? "selected"
                                    : ""}
                            >
                                มา
                            </option>

                            <option
                                value="สาย"
                                ${currentStatus === "LATE"
                                    ? "selected"
                                    : ""}
                            >
                                สาย
                            </option>

                            <option
                                value="ลาป่วย"
                                ${currentStatus === "SICK"
                                    ? "selected"
                                    : ""}
                            >
                                ลาป่วย
                            </option>

                            <option
                                value="ลากิจ"
                                ${currentStatus === "PERSONAL"
                                    ? "selected"
                                    : ""}
                            >
                                ลากิจ
                            </option>

                            <option
                                value="ขาด"
                                ${currentStatus === "ABSENT"
                                    ? "selected"
                                    : ""}
                            >
                                ขาด
                            </option>

                        </select>

                    </td>

                    <td>

                        <button
                            class="btn-alert"
                            disabled
                            data-student-id="${row.id}"
                        >
                            🔔 Alert
                        </button>

                    </td>

                `;


                fragment.appendChild(tr);

            }
        );


        tbody.appendChild(
            fragment
        );


        // ============================================
        // 8. แสดง Attendance UI
        // ============================================

        document.getElementById(
            'student-table'
        ).style.display =
            'table';


        document.getElementById(
            'save-btn'
        ).style.display =
            'block';


        document.getElementById(
            'scan-btn'
        ).style.display =
            'inline-block';


        attendanceCompleted =
            false;


        updateSummaryCards();


    } catch (error) {

        console.error(
            "FILTER AND LOAD ERROR:",
            error
        );

        Swal.fire(
            'ผิดพลาด',
            'ไม่สามารถโหลดรายชื่อนักเรียนได้',
            'error'
        );

    }

}

let attendanceCompleted = false;
function updateSummaryCards() {

    const total = displayedStudents.length;

    let present = 0;
    let late = 0;
    let sick = 0;
    let leave = 0;
    let absent = 0;

    displayedStudents.forEach((_, index) => {

        const statusEl = document.getElementById(`status-${index}`);

        if (!statusEl) return;

        switch(statusEl.value){

            case "มา":
                present++;
                break;

            case "สาย":
                late++;
                break;

            case "ลาป่วย":
                sick++;
                break;

            case "ลากิจ":
                leave++;
                break;

            case "ขาด":
                absent++;
                break;
        }

    });

    document.getElementById("total-students").textContent = total;
    document.getElementById("present-students").textContent = present;
    document.getElementById("late-students").textContent = late;
    document.getElementById("sick-students").textContent = sick;
    document.getElementById("leave-students").textContent = leave;
    document.getElementById("absent-students").textContent = absent;
const checked = present + late + sick + leave + absent;

if (total > 0 && !attendanceCompleted && checked === total) {

    attendanceCompleted = true;

    Swal.fire({
        icon: "success",
        title: "🎉 เช็กชื่อครบแล้ว",
        text: 'กรุณาตรวจสอบข้อมูล แล้วกด "บันทึกข้อมูล"',
        confirmButtonText: "ตกลง"
    });

}

}
async function submitActivityAttendance() {

    const activity =
        window.selectedAttendanceActivity;

    const attendanceDate =
        document.getElementById(
            "attendance-date"
        ).value;


    // ============================================
    // ตรวจ Activity
    // ============================================

    if (!activity || !activity.activityId) {

        return Swal.fire(
            "แจ้งเตือน",
            "กรุณาเลือกกิจกรรมก่อนบันทึก",
            "warning"
        );

    }


    if (!attendanceDate) {

        return Swal.fire(
            "แจ้งเตือน",
            "กรุณาเลือกวันที่",
            "warning"
        );

    }


    // ============================================
    // หา Activity Schedule
    // ============================================

const activitySchedule =
    getActivityScheduleForDate(
        activity,
        document.getElementById("attendance-date").value
    );

    if (
    attendanceMode === "activity" &&
    !activity
) {

    console.error(
        "ACTIVITY NOT FOUND:",
        activity
    );

    return Swal.fire(
        "ผิดพลาด",
        "ไม่พบกิจกรรมที่เลือก",
        "error"
    );
}

const activityScheduleId =
    activitySchedule?.id ?? null;

if (!activityScheduleId) {
    return Swal.fire(
        "ไม่พบตารางกิจกรรม",
        "กิจกรรมนี้ไม่มีตารางที่ตรงกับวันที่เลือก จึงไม่สามารถบันทึกการเช็กชื่อได้",
        "warning"
    );
}

    console.log(
        "SUBMIT ACTIVITY ATTENDANCE CONTEXT:",
        {
            activityId:
                activity.activityId,

            activityName:
                activity.activityName,

            activityScheduleId:
                activityScheduleId,

            attendanceDate:
                attendanceDate
        }
    );


    try {

        // ========================================
        // ตรวจสถานะ "รอเช็ค"
        // ========================================

        const pendingCount =
            displayedStudents.filter(
                (_, index) => {

                    return (
                        document.getElementById(
                            `status-${index}`
                        )?.value === "รอเช็ค"
                    );

                }
            ).length;


        if (pendingCount > 0) {

            const result =
                await Swal.fire({

                    icon: "warning",

                    title: "⚠️ แจ้งเตือน",

                    html: `
                        ยังมีนักเรียน
                        <b>${pendingCount}</b> คน
                        <br>
                        ที่มีสถานะ
                        <b>"รอเช็ค"</b>
                        <br><br>
                        คุณต้องการดำเนินการอย่างไร?
                    `,

                    showCancelButton: true,

                    confirmButtonText:
                        "💾 ยืนยันบันทึก",

                    cancelButtonText:
                        "🔍 กลับไปตรวจสอบ",

                    reverseButtons: true

                });


            if (!result.isConfirmed) {
                return;
            }

        }


        // ========================================
        // สรุปผล
        // ========================================

        const summary = {

            "มา": 0,
            "สาย": 0,
            "ลาป่วย": 0,
            "ลากิจ": 0,
            "ขาด": 0

        };


        displayedStudents.forEach(
            (_, index) => {

                const status =
                    document.getElementById(
                        `status-${index}`
                    )?.value;


                if (
                    summary[status] !== undefined
                ) {

                    summary[status]++;

                }

            }
        );


        const summaryResult =
            await Swal.fire({

                icon: "question",

                title:
                    "📊 สรุปผลการเช็กชื่อกิจกรรม",

                html: `
                    <div style="text-align:left;font-size:16px">

                        🎯 กิจกรรม:
                        <b>
                            ${activity.activityName}
                        </b>

                        <br><br>

                        ✅ มา :
                        <b>${summary["มา"]}</b> คน
                        <br>

                        🟡 สาย :
                        <b>${summary["สาย"]}</b> คน
                        <br>

                        🤒 ลาป่วย :
                        <b>${summary["ลาป่วย"]}</b> คน
                        <br>

                        📝 ลากิจ :
                        <b>${summary["ลากิจ"]}</b> คน
                        <br>

                        ❌ ขาด :
                        <b>${summary["ขาด"]}</b> คน

                    </div>

                    <br>

                    ต้องการบันทึกข้อมูลใช่หรือไม่?
                `,

                showCancelButton: true,

                confirmButtonText:
                    "💾 ยืนยันบันทึก",

                cancelButtonText:
                    "✏️ กลับไปแก้ไข",

                reverseButtons: true

            });


        if (!summaryResult.isConfirmed) {
            return;
        }


        Swal.fire({

            title:
                "กำลังบันทึกการเช็คชื่อกิจกรรม...",

            allowOutsideClick: false,

            didOpen: () =>
                Swal.showLoading()

        });


        // ========================================
        // 1. หา / สร้าง Activity Session
        // ========================================

        let session =
            await getActivityAttendanceSession(
                activityScheduleId,
                attendanceDate
            );


        if (!session) {

            session =
                await createActivityAttendanceSession(
                    activityScheduleId,
                    attendanceDate
                );

        }


        console.log(
            "ACTIVITY ATTENDANCE SESSION:",
            session
        );


        // ========================================
        // 2. เตรียม Attendance Records
        // ========================================

        const records = [];

        const deleteStudentIds = [];


        displayedStudents.forEach(
            (student, index) => {

                const uiStatus =
                    document.getElementById(
                        `status-${index}`
                    )?.value;


                if (uiStatus === "รอเช็ค") {

                    deleteStudentIds.push(
                        student.studentId
                    );

                    return;

                }


                const statusMap = {

                    "มา":
                        "PRESENT",

                    "สาย":
                        "LATE",

                    "ลาป่วย":
                        "SICK",

                    "ลากิจ":
                        "PERSONAL",

                    "ขาด":
                        "ABSENT"

                };


                records.push({

                    attendance_session_id:
                        session.id,

                    student_id:
                        student.studentId,

                    attendance_type:
                        "MANUAL",

                    status:
                        statusMap[uiStatus],

                    check_in_time:
                        new Date().toISOString()

                });

            }
        );


        // ========================================
        // 3. ลบรายการเดิมที่ถูกเปลี่ยนกลับเป็น
        //    "รอเช็ค"
        // ========================================

        await deleteAttendance(
            session.id,
            deleteStudentIds
        );


        // ========================================
        // 4. บันทึก Attendance
        // ========================================

        if (records.length > 0) {

            await saveAttendance(
                records
            );

        }


        Swal.close();


        await Swal.fire(
            "สำเร็จ",
            "บันทึกการเช็คชื่อกิจกรรมเรียบร้อย",
            "success"
        );


        console.log(
            "ACTIVITY ATTENDANCE SAVED:",
            {
                sessionId: session.id,
                recordCount: records.length
            }
        );


    } catch (error) {

        console.error(
            "SUBMIT ACTIVITY ATTENDANCE ERROR:",
            error
        );


        Swal.close();


        Swal.fire(
            "เกิดข้อผิดพลาด",
            "ไม่สามารถบันทึกการเช็คชื่อกิจกรรมได้",
            "error"
        );

    }

}
async function submitAttendance() {
        // ============================================
    // Activity Mode
    // แยกออกจาก Attendance Engine เดิม
    // ============================================

    if (attendanceMode === "activity") {

        return await submitActivityAttendance();

    }

    const selectedSchedule =
        window.selectedAttendanceSchedule;

    const attendanceDate =
        document.getElementById(
            "attendance-date"
        ).value;


    // ============================================
    // ต้องมี Schedule Context
    // ============================================

    if (!selectedSchedule) {

        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกคาบเรียนและชั้นเรียนก่อนบันทึก',
            'warning'
        );

    }


    // ============================================
    // ใช้ข้อมูลจาก Schedule
    // 🔒 ยังคงใช้ Attendance Engine เดิม
    // ============================================

    const roomId =
        selectedSchedule.roomId;

    const subjectId =
        selectedSchedule.subjectId;


    if (!roomId || !subjectId) {

        return Swal.fire(
            'ผิดพลาด',
            'ข้อมูลตารางสอนไม่ครบ ไม่สามารถบันทึกข้อมูลได้',
            'error'
        );

    }


    console.log(
        "SUBMIT ATTENDANCE CONTEXT:",
        {
            date: attendanceDate,
            lessonNo: selectedSchedule.lessonNo,
            roomId: roomId,
            className: selectedSchedule.className,
            subjectId: subjectId,
            subjectCode: selectedSchedule.subjectCode,
            subjectName: selectedSchedule.subjectName,
            scheduleId: selectedSchedule.scheduleId
        }
    );


    try {
    
// =========================
// ตรวจสอบสถานะ "รอเช็ค"
// =========================
const pendingCount = displayedStudents.filter((_, index) => {
    return document.getElementById(`status-${index}`)?.value === "รอเช็ค";
}).length;

if (pendingCount > 0) {
    const result = await Swal.fire({
    icon: "warning",
    title: "⚠️ แจ้งเตือน",
    html: `
        ยังมีนักเรียน <b>${pendingCount}</b> คน<br>
        ที่มีสถานะ <b>"รอเช็ค"</b><br><br>
        คุณต้องการดำเนินการอย่างไร?
    `,
    showCancelButton: true,
    confirmButtonText: "💾 ยืนยันบันทึก",
    cancelButtonText: "🔍 กลับไปตรวจสอบ",
    reverseButtons: true
});

// ถ้ากดกลับไปตรวจสอบ
if (!result.isConfirmed) {
    return;
}

}

// =========================
// สรุปผลก่อนบันทึก (Manual)
// =========================

if (pendingCount === 0) {

    const summary = {
        "มา": 0,
        "สาย": 0,
        "ลาป่วย": 0,
        "ลากิจ": 0,
        "ขาด": 0
    };

    displayedStudents.forEach((student, index) => {

        const status =
            document.getElementById(`status-${index}`)?.value;

        if(summary[status] !== undefined){
            summary[status]++;
        }

    });

    const result = await Swal.fire({

        icon: "question",

        title: "📊 สรุปผลการเช็กชื่อ",

        html: `
            <div style="text-align:left;font-size:16px">

            ✅ มา : <b>${summary["มา"]}</b> คน<br>
            🟡 สาย : <b>${summary["สาย"]}</b> คน<br>
            🤒 ลาป่วย : <b>${summary["ลาป่วย"]}</b> คน<br>
            📝 ลากิจ : <b>${summary["ลากิจ"]}</b> คน<br>
            ❌ ขาด : <b>${summary["ขาด"]}</b> คน

            </div>

            <br>

            ต้องการบันทึกข้อมูลใช่หรือไม่?
        `,

        showCancelButton: true,

        confirmButtonText: "💾 ยืนยันบันทึก",

        cancelButtonText: "✏️ กลับไปแก้ไข",

        reverseButtons: true

    });

    if (!result.isConfirmed) {
        return;
    }

}

        Swal.fire({
            title: 'กำลังบันทึกข้อมูล...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // 1. สร้าง Attendance Session
        const classScheduleId = selectedSchedule.scheduleId;

let session = await getClassAttendanceSession(
    classScheduleId,
    attendanceDate
);

if (!session) {
    session = await createAttendanceSession(
        classScheduleId,
        roomId,
        subjectId,
        attendanceDate
    );
}

        // 2. เตรียมข้อมูล Attendance
        const records = [];
const deleteStudentIds = [];

displayedStudents.forEach((student, index) => {

    const uiStatus =
        document.getElementById(`status-${index}`)?.value;

    if (uiStatus === "รอเช็ค") {

        deleteStudentIds.push(student.id);
        return;

    }

    const statusMap = {
        "มา": "PRESENT",
        "สาย": "LATE",
        "ลาป่วย": "SICK",
        "ลากิจ": "PERSONAL",
        "ขาด": "ABSENT"
    };

    records.push({

        attendance_session_id: session.id,

        student_id: student.id,

        attendance_type: "MANUAL",

        status: statusMap[uiStatus],

        check_in_time: new Date().toISOString()

    });

});

        // 3. บันทึก Attendance
        await deleteAttendance(session.id,deleteStudentIds);
const result = await saveAttendance(records);

        Swal.fire(
            'สำเร็จ',
            'บันทึกการเช็คชื่อเรียบร้อย',
            'success'
        );

    }
    catch (error) {

        console.error(error);

        Swal.fire(
            'ผิดพลาด',
            error.message,
            'error'
        );

    }

}

document.addEventListener('DOMContentLoaded', initSystem);