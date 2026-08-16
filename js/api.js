async function getRooms() {
    const { data, error } = await supabaseClient
        .from('rooms')
        .select('*')
        .order('room_name', { ascending: true });

    if (error) throw error;
    return data;
}

async function getSubjects() {
    const { data, error } = await supabaseClient
        .from('subjects')
        .select('*')
        .order('subject_code', { ascending: true });

    if (error) throw error;
    return data;
}

async function getStudentsByRoom(roomId) {
    const { data, error } = await supabaseClient
        .from('students')
        .select('*')
        .eq('current_room_id', roomId)
        .order('student_no', { ascending: true });

    if (error) throw error;
    return data;
}

// ==============================
// Attendance Session
// ==============================

async function createAttendanceSession(roomId,subjectId,attendanceDate) {

    const { data, error } = await supabaseClient
        .from("attendance_sessions")
        .insert({
            room_id: roomId,
            subject_id: subjectId,
            attendance_date: attendanceDate,
            session_status: "OPEN"
        })
        .select()
        .single();

    if (error) throw error;

    return data;

}
// ============================================================
// Activity Attendance Session
// STEP 3.5.7 — Create / Get Activity Attendance Session
// ============================================================
async function createActivityAttendanceSession(
    activityScheduleId,
    attendanceDate
) {

    // --------------------------------------------------------
    // ตรวจว่ามี Session ของกิจกรรมวันนี้อยู่แล้วหรือไม่
    // --------------------------------------------------------

    const existing =
        await getActivityAttendanceSession(
            activityScheduleId,
            attendanceDate
        );

    if (existing) {
        return existing;
    }

    // --------------------------------------------------------
    // สร้าง Activity Attendance Session ใหม่
    // --------------------------------------------------------

    const {
        data,
        error
    } = await supabaseClient
        .from("attendance_sessions")
        .insert({
            activity_schedule_id:
                activityScheduleId,

            attendance_date:
                attendanceDate,

            session_status:
                "OPEN"
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// ============================================================
// Get Activity Attendance Session
// ============================================================
async function getActivityAttendanceSession(
    activityScheduleId,
    attendanceDate
) {

    if (!attendanceDate) {
        throw new Error(
            "Attendance date is required."
        );
    }

    let query = supabaseClient
        .from("attendance_sessions")
        .select("*")
        .eq(
            "attendance_date",
            attendanceDate
        )
        .is(
            "deleted_at",
            null
        );

    if (activityScheduleId) {

        query = query.eq(
            "activity_schedule_id",
            activityScheduleId
        );

    } else {

        query = query.is(
            "activity_schedule_id",
            null
        );

    }

    const {
        data,
        error
    } = await query.maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

// ==============================
// Attendance
// ==============================

async function saveAttendance(records) {

    const { data, error } = await supabaseClient
        .from("attendance")
        .upsert(
            records,
            {
                onConflict: "attendance_session_id,student_id"
            }
        )
        .select();

    if (error) throw error;

    return data;

}

async function getStudentById(studentId){

    const {data,error}=await supabaseClient
        .from("students")
        .select("*")
        .eq("id",studentId)
        .single();

    if(error) throw error;

    return data;

}

async function getAttendanceSession(roomId, subjectId, attendanceDate) {

    const { data, error } = await supabaseClient
        .from("attendance_sessions")
        .select("*")
        .eq("room_id", roomId)
        .eq("subject_id", subjectId)
        .eq("attendance_date", attendanceDate)
        .is("deleted_at", null)
        .maybeSingle();

    if (error) throw error;

    return data;

}

async function getAttendanceBySession(sessionId) {

    const { data, error } = await supabaseClient
        .from("attendance")
        .select("*")
        .eq("attendance_session_id", sessionId)
        .is("deleted_at", null);

    if (error) throw error;

    return data;

}

async function getAttendanceSessionsByDate(attendanceDate){

    const { data, error } = await supabaseClient
        .from("attendance_sessions")
        .select("*")
        .eq("attendance_date", attendanceDate)
        .is("deleted_at", null);

    if(error) throw error;

    return data;

}

async function getDashboardAttendance(attendanceDate, roomId = "", subjectId = ""){

    let query = supabaseClient
        .from("attendance")
        .select(`
            status,
            attendance_sessions!inner(
                attendance_date,
                room_id,
                subject_id
            )
        `)
        .eq("attendance_sessions.attendance_date", attendanceDate)
        .is("deleted_at", null);
    if (roomId !== "") query = query.eq("attendance_sessions.room_id", roomId);
    if (subjectId !== "") query = query.eq("attendance_sessions.subject_id", subjectId);
const { data, error } = await query;

if(error) throw error;

return data;

}

async function getDashboardStudentAttendance(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    let query = supabaseClient
        .from("attendance")
        .select(`
            student_id,
            status,
            students!student_id(
    id,
    student_code,
                student_no,
                prefix,
                first_name,
                last_name,
                nickname
            ),
            attendance_sessions!inner(
                attendance_date,
                room_id,
                subject_id
            )
        `)
        .gte(
            "attendance_sessions.attendance_date",
            startDate
        )
        .lte(
            "attendance_sessions.attendance_date",
            endDate
        )
        .is("deleted_at", null)
        .is(
            "attendance_sessions.deleted_at",
            null
        );

    if(roomId !== ""){
        query = query.eq(
            "attendance_sessions.room_id",
            roomId
        );
    }

    if(subjectId !== ""){
        query = query.eq(
            "attendance_sessions.subject_id",
            subjectId
        );
    }

    const { data, error } = await query;

    if(error) throw error;

    return data;

}

async function getDashboardSessionAttendance(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    let query = supabaseClient
        .from("attendance_sessions")
        .select(`
            id,
            attendance_date,
            open_time,
            close_time,
            session_status,
            room_id,
            subject_id,

class_schedules!class_schedule_id(
    lesson_no,
    start_time,
    end_time,

    subject_assignments!subject_assignment_id(
        teacher_id,

        teachers!teacher_id(
            first_name,
            last_name,
            nickname
        )
    )
),

rooms!room_id(
    room_name
),
            subjects!subject_id(
                subject_code,
                subject_name
            ),
            attendance(
                status
            )
        `)
        .gte(
            "attendance_date",
            startDate
        )
        .lte(
            "attendance_date",
            endDate
        )
        .is("deleted_at", null);

    if(roomId !== ""){
        query = query.eq(
            "room_id",
            roomId
        );
    }

    if(subjectId !== ""){
        query = query.eq(
            "subject_id",
            subjectId
        );
    }

    const { data, error } = await query;

    if(error) throw error;

    return data;

}

async function deleteAttendance(sessionId, studentIds) {

    if (studentIds.length === 0) return;

    const { error } = await supabaseClient
        .from("attendance")
        .delete()
        .eq("attendance_session_id", sessionId)
        .in("student_id", studentIds);

    if (error) throw error;

}
async function logout() {

    const result = await Swal.fire({
        title: "🚪 ออกจากระบบ",
        text: "คุณต้องการออกจากระบบหรือไม่?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ออกจากระบบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280"
    });

    if (!result.isConfirmed) return;

    await supabaseClient.auth.signOut();

    sessionStorage.clear();

    window.location.href = "login.html";

}

// ============================================================
// CURRENT TEACHER CONTEXT
// STEP 4.1 — Identity Foundation
// ============================================================

async function getCurrentTeacherContext() {

    // 1. ตรวจสอบ Supabase Auth User ปัจจุบัน
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        throw new Error("No authenticated user.");
    }


    // 2. หา Teacher จาก Auth User
    const { data: teacher, error: teacherError } =
        await supabaseClient
            .from("teachers")
            .select(`
                id,
                profile_id,
                first_name,
                last_name,
                nickname,

                profile:profiles(
                    role:roles(
                        name
                    )
                )
            `)
            .eq("profile_id", user.id)
            .single();

    if (teacherError) {
        throw teacherError;
    }

    if (!teacher) {
        throw new Error(
            "Teacher profile not found for authenticated user."
        );
    }


    // 3. สร้าง Current Teacher Context
    return {

        authUserId:
            user.id,

        teacherId:
            teacher.id,

        role:
            teacher.profile?.role?.name || "",

        firstName:
            teacher.first_name || "",

        lastName:
            teacher.last_name || "",

        nickname:
            teacher.nickname || "",

        email:
            user.email || ""
    };
}

// ============================================================
// ATTENDANCE SCHEDULE ADAPTER
// STEP 4.3A — Load Teacher Schedules for Attendance
// ============================================================

async function getAttendanceSchedules(date) {

    if (!date) {
        throw new Error("Attendance schedule date is required.");
    }
const dateObject =
    new Date(`${date}T00:00:00`);

const weekday =
    dateObject.getDay();

    // ============================================
    // 1. Current Teacher Context
    // ============================================

    const context =
        await getCurrentTeacherContext();

    const isAdmin =
        context.role === "Admin";

    const teacherId =
        context.teacherId;


    // ============================================
    // 2. หา Schedule ของครูในวันที่เลือก
    // ============================================

    let query =
    supabaseClient
        .from("class_schedules")
        .select(`
            id,
            weekday,
            lesson_no,
            start_time,
            end_time,
            valid_from,
            valid_until,
            schedule_group_id,
            teaching_room_id,

            teaching_rooms!teaching_room_id(
                room_code,
                room_name
            ),

            subject_assignments!subject_assignment_id!inner(
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
                ),

                teachers!teacher_id(
                    first_name,
                    last_name,
                    nickname
                )
            )
        `)
        .eq(
            "weekday",
            weekday
        )
        .lte(
            "valid_from",
            date
        )
        .or(
            `valid_until.is.null,valid_until.gte.${date}`
        );


// ============================================
// Teacher Scope
// Admin → ทุกครู
// Teacher → เฉพาะตารางของตัวเอง
// ============================================

if (!isAdmin) {

    query = query.eq(
        "subject_assignments.teacher_id",
        teacherId
    );

}


const { data, error } =
    await query.order(
        "lesson_no",
        { ascending: true }
    );

    if (error) {
        throw error;
    }


    // ============================================
    // 3. แปลงข้อมูลให้ Attendance ใช้ง่าย
    // ============================================

    return (data || []).map(schedule => {

        const assignment =
            schedule.subject_assignments || {};

        const subject =
            assignment.subjects || {};

        const room =
            assignment.rooms || {};

        const teacher =
            assignment.teachers || {};

        const teachingRoom =
            schedule.teaching_rooms || {};

        const teacherName = [
            teacher.first_name,
            teacher.last_name
        ]
            .filter(Boolean)
            .join(" ");


        return {

            scheduleId:
                schedule.id,

            scheduleGroupId:
                schedule.schedule_group_id,

            subjectAssignmentId:
                schedule.subject_assignments
                    ? schedule.subject_assignments.id
                    : null,

            lessonNo:
                schedule.lesson_no,

            startTime:
                schedule.start_time,

            endTime:
                schedule.end_time,

            validFrom:
                schedule.valid_from,

            validUntil:
                schedule.valid_until,

            roomId:
                assignment.room_id || "",

            className:
                room.room_name || "",

            subjectId:
                assignment.subject_id || "",

            subjectCode:
                subject.subject_code || "",

            subjectName:
                subject.subject_name || "",

            teacherId:
                assignment.teacher_id || "",

            teacherName:
                teacherName,

            teachingRoomId:
                schedule.teaching_room_id || "",

            teachingRoom:
                teachingRoom.room_name || ""
        };
    });
}

async function loadProfile() {

    // ดึง User ที่ Login อยู่
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    // Email
    document.getElementById("profile-email").textContent = user.email;
    // ดึงข้อมูลครู
const { data: teacher, error } = await supabaseClient
    .from("teachers")
    .select(`
        first_name,
        last_name,
        profile:profiles(
            role:roles(name)
        )
    `)
    .eq("profile_id", user.id)
    .single();

if (error) {
    console.error(error);
    return;
}

// ชื่อ
document.getElementById("profile-name").textContent =
    `${teacher.first_name} ${teacher.last_name}`;

// Role
document.getElementById("profile-role").textContent =
    teacher.profile.role.name;

}

async function clearDeviceData() {

    const confirmResult = await Swal.fire({
        title: "ล้างข้อมูลเครื่อง?",
        text: "ระบบจะออกจากระบบและล้างข้อมูลเฉพาะเว็บไซต์นี้",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ล้างข้อมูล",
        cancelButtonText: "ยกเลิก"
    });

    if (!confirmResult.isConfirmed) return;

    // Logout จาก Supabase
    await supabaseClient.auth.signOut();

    // ล้างเฉพาะ Session ของ Browser
    sessionStorage.clear();

    // กลับหน้า Login
    window.location.href = "login.html";

}
async function getAttendanceByStatus(startDate, endDate, roomId="", subjectId="", status){

    let query = supabaseClient
        .from("attendance")
        .select(`
            status,
            students(
                student_code,
                prefix,
                first_name,
                last_name
            ),
            attendance_sessions!inner(
                attendance_date,
                room_id,
                subject_id
            )
        `)
        .gte("attendance_sessions.attendance_date", startDate)
        .lte("attendance_sessions.attendance_date", endDate)
        .eq("status", status)
        .is("deleted_at", null);

    if(roomId !== ""){
        query = query.eq(
            "attendance_sessions.room_id",
            roomId
        );
    }

    if(subjectId !== ""){
        query = query.eq(
            "attendance_sessions.subject_id",
            subjectId
        );
    }

    const { data, error } = await query;

    if(error) throw error;

    return data;
}
// ==============================
// Dashboard Analytics
// ==============================

async function getDashboardAnalytics(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    let query = supabaseClient
        .from("attendance_sessions")
        .select(`
            attendance_date,
            room_id,
            subject_id,

            rooms!room_id(
                room_name
            ),

            subjects!subject_id(
                subject_code,
                subject_name
            ),

            attendance(
                status
            )
        `)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .is("deleted_at", null);

    if(roomId !== ""){
        query = query.eq("room_id", roomId);
    }

    if(subjectId !== ""){
        query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;

    if(error) throw error;

    return data;
}

// ============================================================
// Class Schedule
// STEP 5B.7.2 — Read Schedule + Teaching Room
// ============================================================

async function getClassSchedules() {

    const { data, error } = await supabaseClient
        .from("class_schedules")
        .select(`
            id,
            subject_assignment_id,
            weekday,
            lesson_no,
            start_time,
            end_time,
            valid_from,
            valid_until,
            schedule_group_id,
            teaching_room_id,

            teaching_rooms!teaching_room_id(
                room_code,
                room_name
            ),

            subject_assignments!subject_assignment_id(
                teacher_id,
                subject_id,
                room_id,

                teachers!teacher_id(
                    first_name,
                    last_name,
                    nickname
                ),

                subjects!subject_id(
                    subject_code,
                    subject_name
                ),

                rooms!room_id(
                    room_name
                )
            )
        `)
        .order("weekday", { ascending: true })
        .order("lesson_no", { ascending: true });

    if (error) throw error;

    return data;
}
// ============================================================
// Activity Schedule
// ใช้สำหรับแสดงกิจกรรมในตารางสอน
// ============================================================

async function getActivitySchedules() {

    const { data, error } =
        await supabaseClient
            .from("activities")
            .select(`
                id,
                activity_name,

                activity_types!activity_type_id(
                    code,
                    name
                ),

                activity_teachers!activity_id(
                    teacher_id
                ),

                activity_schedules!activity_id(
                    id,
                    weekday,
                    lesson_no,
                    start_time,
                    end_time,
                    valid_from,
                    valid_until
                )
            `)
            .is("deleted_at", null);

    if (error) {
        throw error;
    }

    const result = [];

    (data || []).forEach(activity => {

        const activityType =
            activity.activity_types || {};

        const teachers =
            activity.activity_teachers || [];

        const schedules =
            activity.activity_schedules || [];

        schedules.forEach(schedule => {

            result.push({

                activityId:
                    activity.id,

                activityName:
                    activity.activity_name || "",

                activityTypeCode:
                    activityType.code || "",

                activityTypeName:
                    activityType.name || "",

                teacherIds:
                    teachers.map(
                        teacher => teacher.teacher_id
                    ),

                scheduleId:
                    schedule.id,

                weekday:
                    schedule.weekday,

                lessonNo:
                    schedule.lesson_no,

                startTime:
                    schedule.start_time,

                endTime:
                    schedule.end_time,

                validFrom:
                    schedule.valid_from,

                validUntil:
                    schedule.valid_until

            });

        });

    });

    return result;
}
// ============================================================
// Class Schedule
// STEP 5B.8.10A — Create Schedule
// ============================================================

async function createClassSchedule(scheduleData) {

    const { data, error } = await supabaseClient
        .from("class_schedules")
        .insert({
            subject_assignment_id:
                scheduleData.subjectAssignmentId,

            weekday:
                scheduleData.weekday,

            lesson_no:
                scheduleData.lessonNo,

            start_time:
                scheduleData.startTime,

            end_time:
                scheduleData.endTime,

            valid_from:
                scheduleData.validFrom,

            valid_until:
                scheduleData.validUntil || null,

            schedule_group_id:
                scheduleData.scheduleGroupId || null,

            teaching_room_id:
                scheduleData.teachingRoomId
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// ============================================================
// SUBJECT ASSIGNMENT
// STEP 17 — Get or Create Subject Assignment
// ============================================================

async function getOrCreateSubjectAssignment({
    teacherId,
    subjectId,
    roomId,
    academicYearId,
    semesterId
}) {

    // --------------------------------------------------------
    // 1. ตรวจข้อมูล
    // --------------------------------------------------------

    if (
        !teacherId ||
        !subjectId ||
        !roomId ||
        !academicYearId ||
        !semesterId
    ) {

        throw new Error(
            "ข้อมูลสำหรับสร้างกลุ่มการสอนไม่ครบ"
        );

    }


    // --------------------------------------------------------
    // 2. ค้นหา Subject Assignment เดิม
    // --------------------------------------------------------

    const {
        data: existingAssignment,
        error: findError
    } = await supabaseClient

        .from("subject_assignments")

        .select("*")

        .eq(
            "teacher_id",
            teacherId
        )

        .eq(
            "subject_id",
            subjectId
        )

        .eq(
            "room_id",
            roomId
        )

        .eq(
            "academic_year_id",
            academicYearId
        )

        .eq(
            "semester_id",
            semesterId
        )

        .maybeSingle();


    if (findError) {
        throw findError;
    }


    // --------------------------------------------------------
    // 3. ถ้ามีอยู่แล้ว → ใช้ของเดิม
    // --------------------------------------------------------

    if (existingAssignment) {

        return existingAssignment;

    }


    // --------------------------------------------------------
    // 4. ยังไม่มี → สร้างใหม่
    // --------------------------------------------------------

    const {
        data: newAssignment,
        error: createError
    } = await supabaseClient

        .from("subject_assignments")

        .insert({

            teacher_id:
                teacherId,

            subject_id:
                subjectId,

            room_id:
                roomId,

            academic_year_id:
                academicYearId,

            semester_id:
                semesterId

        })

        .select()

        .single();


    if (createError) {
        throw createError;
    }


    // --------------------------------------------------------
    // 5. คืน Assignment ที่สร้าง
    // --------------------------------------------------------

    return newAssignment;

}

async function updateClassSchedule(scheduleId, scheduleData) {

    const { data, error } = await supabaseClient
        .from("class_schedules")
        .update({
            subject_assignment_id:
                scheduleData.subjectAssignmentId,

            weekday:
                scheduleData.weekday,

            lesson_no:
                scheduleData.lessonNo,

            start_time:
                scheduleData.startTime,

            end_time:
                scheduleData.endTime,

            valid_from:
                scheduleData.validFrom,

            valid_until:
                scheduleData.validUntil || null,

            schedule_group_id:
                scheduleData.scheduleGroupId || null,

            teaching_room_id:
                scheduleData.teachingRoomId
        })
        .eq(
            "id",
            scheduleId
        )
        .select()
        .single();


    if (error) {

        throw error;

    }


    return data;
}

async function deleteClassSchedule(scheduleId) {

    const { error } = await supabaseClient
        .from("class_schedules")
        .delete()
        .eq(
            "id",
            scheduleId
        );


    if (error) {

        throw error;

    }


    return true;
}
// ============================================================
// DELETE SCHEDULE GROUP
// STEP 3 — Delete all schedules in one Card
// ============================================================

async function deleteClassScheduleGroup(scheduleGroupId) {

    if (!scheduleGroupId) {
        throw new Error(
            "ไม่พบ Schedule Group ID"
        );
    }


    const { error } =
        await supabaseClient

            .from("class_schedules")

            .delete()

            .eq(
                "schedule_group_id",
                scheduleGroupId
            );


    if (error) {
        throw error;
    }


    return true;
}
// ============================================================
// ACTIVITY ATTENDANCE
// STEP 3.5.1 — Get Activities for Attendance
// ============================================================

async function getAttendanceActivities(date) {

    if (!date) {
        throw new Error("Activity date is required.");
    }

    // ============================================
    // 1. Current Teacher
    // ============================================

    const context =
        await getCurrentTeacherContext();

    const isAdmin =
        context.role === "Admin";

    const teacherId =
        context.teacherId;


    // ============================================
    // 2. แปลงวันที่ → weekday ของ Database
    //
    // JS:
    // Sunday = 0
    // Monday = 1
    // ...
    // Saturday = 6
    //
    // DB:
    // Monday = 1
    // ...
    // Sunday = 7
    // ============================================

    const dateObject =
        new Date(`${date}T00:00:00`);

    const jsWeekday =
        dateObject.getDay();

    const dbWeekday =
        jsWeekday === 0
            ? 7
            : jsWeekday;


    // ============================================
    // 3. Query Activities
    // ============================================

    let query =
        supabaseClient
            .from("activities")
            .select(`
                id,
                activity_name,

                activity_types!activity_type_id(
                    code,
                    name
                ),

                academic_years!academic_year_id(
                    year,
                    is_current
                ),

                semesters!semester_id(
                    semester_no,
                    start_date,
                    end_date
                ),

                activity_teachers!activity_id(
                    teacher_id,

                    teachers!teacher_id(
                        id,
                        teacher_code,
                        first_name,
                        last_name,
                        nickname
                    )
                ),

                activity_schedules!activity_id(
                    id,
                    weekday,
                    lesson_no,
                    start_time,
                    end_time,
                    valid_from,
                    valid_until
                )
            `)
            .is("deleted_at", null);


    // ============================================
    // 4. Teacher Scope
    //
    // Admin → ทุกกิจกรรม
    // Teacher → เฉพาะกิจกรรมของตัวเอง
    // ============================================

    if (!isAdmin) {

        query =
            query.eq(
                "activity_teachers.teacher_id",
                teacherId
            );

    }


    const {
        data,
        error
    } = await query;


    if (error) {
        throw error;
    }


    // ============================================
    // 5. กรอง Schedule ตามวันที่
    // ============================================

    return (data || [])
        .map(activity => {

            const schedules =
                activity.activity_schedules || [];


            const validSchedules =
                schedules.filter(schedule => {

                    // วันไม่ตรง
                    if (
                        schedule.weekday !== dbWeekday
                    ) {
                        return false;
                    }


                    // ยังไม่ถึงวันเริ่มกิจกรรม
                    if (
                        schedule.valid_from &&
                        date < schedule.valid_from
                    ) {
                        return false;
                    }


                    // หมดอายุแล้ว
                    if (
                        schedule.valid_until &&
                        date > schedule.valid_until
                    ) {
                        return false;
                    }


                    return true;

                });

            const activityType =
                activity.activity_types || {};

           // เฉพาะกิจกรรมหน้าเสาธง

if (
    validSchedules.length === 0 &&
    activityType.code !== "FLAG"
) {
    return null;
}

            const academicYear =
                activity.academic_years || {};

            const semester =
                activity.semesters || {};


            const teacherLinks =
                activity.activity_teachers || [];


            const teachers =
                teacherLinks
                    .map(link =>
                        link.teachers
                    )
                    .filter(Boolean);


            return {

                activityId:
                    activity.id,

                activityName:
                    activity.activity_name || "",

                activityTypeCode:
                    activityType.code || "",

                activityTypeName:
                    activityType.name || "",

                academicYear:
                    academicYear.year || null,

                semesterNo:
                    semester.semester_no || null,

                teachers,

                schedules:
                    validSchedules

            };

        })
        .filter(Boolean);

}
// ============================================================
// ACTIVITY ATTENDANCE
// STEP 3.5.3 — Get Activity Participants
// ============================================================

async function getActivityParticipants(activityId) {

    if (!activityId) {
        throw new Error("Activity ID is required.");
    }


    // ========================================================
    // 1. ดึง Participants + Student
    //    ไม่ JOIN rooms ตรงนี้
    // ========================================================

    const {
        data: participants,
        error: participantError
    } = await supabaseClient
        .from("activity_participants")
        .select(`
            id,

            student:students!student_id(
                id,
                student_code,
                student_no,
                prefix,
                first_name,
                last_name,
                nickname,
                current_room_id
            )
        `)
        .eq(
            "activity_id",
            activityId
        )
        .order(
            "student_id",
            {
                ascending: true
            }
        );


    if (participantError) {
        throw participantError;
    }


    if (!participants || participants.length === 0) {
        return [];
    }


    // ========================================================
    // 2. รวบรวม current_room_id
    // ========================================================

    const roomIds =
        [
            ...new Set(
                participants
                    .map(item =>
                        item.student?.current_room_id
                    )
                    .filter(Boolean)
            )
        ];


    // ========================================================
    // 3. ดึง Rooms แยกต่างหาก
    // ========================================================

    let roomsById = {};


    if (roomIds.length > 0) {

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
            .in(
                "id",
                roomIds
            );


        if (roomError) {
            throw roomError;
        }


        roomsById =
            Object.fromEntries(
                (rooms || []).map(room => [
                    room.id,
                    room
                ])
            );

    }


    // ========================================================
    // 4. รวม Student + Room กลับเป็นข้อมูลสำหรับ Attendance
    // ========================================================

    return participants
        .map(item => {

            const student =
                item.student || {};

            const room =
                roomsById[
                    student.current_room_id
                ] || {};


            return {

                participantId:
                    item.id,

                studentId:
                    student.id || "",

                studentCode:
                    student.student_code || "",

                studentNo:
                    student.student_no ?? null,

                prefix:
                    student.prefix || "",

                firstName:
                    student.first_name || "",

                lastName:
                    student.last_name || "",

                nickname:
                    student.nickname || "",

                roomId:
                    room.id || "",

                roomName:
                    room.room_name || "",

                gradeLevel:
                    room.grade_level ?? null

            };

        });

}