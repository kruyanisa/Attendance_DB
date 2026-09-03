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

// ============================================================
// Student Management
// ============================================================

async function getStudentManagementList({
    academicYearId,
    gradeLevel = "",
    roomId = "",
    statuses = [],
    search = ""
} = {}) {

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    // --------------------------------------------------------
    // 1. ดึงประวัติการเรียนของปีการศึกษาที่เลือก
    //    student_no และ room ต้องอิงจาก history
    // --------------------------------------------------------

    let historyQuery = supabaseClient
    .from("student_academic_history")
    .select(`
        id,
        student_id,
        academic_year_id,
        room_id,
        student_no
    `);

if (academicYearId !== "ALL") {
    historyQuery = historyQuery.eq(
        "academic_year_id",
        academicYearId
    );
}

    if (roomId !== "") {
        historyQuery = historyQuery.eq("room_id", roomId);
    }

    // --------------------------------------------------------
    // 2. ถ้าเลือกชั้นเรียน ให้หา Rooms ก่อน
    // --------------------------------------------------------

    if (gradeLevel !== "") {

        let gradeRoomQuery = supabaseClient
    .from("rooms")
    .select("id")
    .eq("grade_level", Number(gradeLevel))
    .is("deleted_at", null);

if (academicYearId !== "ALL") {
    gradeRoomQuery = gradeRoomQuery.eq(
        "academic_year_id",
        academicYearId
    );
}

const {
    data: gradeRooms,
    error: gradeRoomError
} = await gradeRoomQuery;

        if (gradeRoomError) {
            throw gradeRoomError;
        }

        const gradeRoomIds =
            (gradeRooms || []).map(room => room.id);

        if (gradeRoomIds.length === 0) {
            return [];
        }

        historyQuery = historyQuery.in(
            "room_id",
            gradeRoomIds
        );
    }

    const {
        data: histories,
        error: historyError
    } = await historyQuery
        .order("room_id", { ascending: true })
        .order("student_no", { ascending: true });

    if (historyError) {
        throw historyError;
    }

    const historyList = histories || [];

if (
    historyList.length === 0 &&
    (roomId !== "" || gradeLevel !== "")
) {
    return [];
}

    // --------------------------------------------------------
    // 3. รวบรวม Student IDs และ Room IDs
    // --------------------------------------------------------

    const studentIds = [
        ...new Set(
            historyList
                .map(row => row.student_id)
                .filter(Boolean)
        )
    ];

    const roomIds = [
        ...new Set(
            historyList
                .map(row => row.room_id)
                .filter(Boolean)
        )
    ];

   // --------------------------------------------------------
// 4. ดึงข้อมูล Student
// --------------------------------------------------------

let studentQuery = supabaseClient
    .from("students")
    .select(`
        id,
        student_code,
        first_name,
        last_name,
        nickname,
        prefix,
        current_status
    `)
    .in("id", studentIds)
    .is("deleted_at", null);

if (Array.isArray(statuses) && statuses.length > 0) {
    studentQuery = studentQuery.in(
        "current_status",
        statuses
    );
}

if (search.trim() !== "") {

    const keyword = search.trim();

    studentQuery = studentQuery.or(
        `student_code.ilike.%${keyword}%,` +
        `first_name.ilike.%${keyword}%,` +
        `last_name.ilike.%${keyword}%,` +
        `nickname.ilike.%${keyword}%`
    );
}

const {
    data: studentRows,
    error: studentError
} = await studentQuery;

if (studentError) {
    throw studentError;
}
// --------------------------------------------------------
// 4.5 ดึงนักเรียน TRANSFERRED ที่ยังไม่มี History
//
// ใช้สำหรับกรณีนักเรียนย้ายเข้าจากโรงเรียนอื่น
// และยังไม่เคยมีประวัติที่โรงเรียนนี้
// --------------------------------------------------------

let transferInStudentRows = [];

const canLoadHistorylessTransferred =
    roomId === "" &&
    gradeLevel === "" &&
    (
        !Array.isArray(statuses) ||
        statuses.length === 0 ||
        statuses.includes("TRANSFERRED")
    );

if (canLoadHistorylessTransferred) {

    let transferInQuery = supabaseClient
        .from("students")
        .select(`
            id,
            student_code,
            first_name,
            last_name,
            nickname,
            prefix,
            current_status
        `)
        .eq("current_status", "TRANSFERRED")
        .is("deleted_at", null);

    if (search.trim() !== "") {

        const keyword = search.trim();

        transferInQuery = transferInQuery.or(
            `student_code.ilike.%${keyword}%,` +
            `first_name.ilike.%${keyword}%,` +
            `last_name.ilike.%${keyword}%,` +
            `nickname.ilike.%${keyword}%`
        );
    }

    const {
        data: transferredRows,
        error: transferredError
    } = await transferInQuery;

    if (transferredError) {
        throw transferredError;
    }

    transferInStudentRows =
        (transferredRows || []).filter(student =>
            !studentIds.includes(student.id)
        );
}
    // --------------------------------------------------------
    // 5. ดึงข้อมูล Rooms
    // --------------------------------------------------------

    const {
        data: roomRows,
        error: roomError
    } = await supabaseClient
        .from("rooms")
        .select(`
            id,
            room_name,
            grade_level,
            academic_year_id
        `)
        .in("id", roomIds)
        .is("deleted_at", null);

    if (roomError) {
        throw roomError;
    }

    // --------------------------------------------------------
    // 6. สร้าง Map
    // --------------------------------------------------------

    const studentsById = new Map(
        (studentRows || []).map(student => [
            student.id,
            student
        ])
    );

    const roomsById = new Map(
        (roomRows || []).map(room => [
            room.id,
            room
        ])
    );
    // --------------------------------------------------------
// 6.5 ดึง Academic History ทั้งหมดของนักเรียนที่พบ
//
// สำคัญ:
// ใช้สำหรับหา Academic Context ล่าสุดจาก DB
// ไม่อิงจากปีที่ User กรองบนหน้าจอ
// --------------------------------------------------------

let allStudentHistories = [];

if (studentIds.length > 0) {

    const {
        data: allHistoryRows,
        error: allHistoryError
    } = await supabaseClient
        .from("student_academic_history")
        .select(`
            id,
            student_id,
            academic_year_id,
            room_id,
            student_no
        `)
        .in("student_id", studentIds);

    if (allHistoryError) {
        throw allHistoryError;
    }

    allStudentHistories = allHistoryRows || [];
}

// --------------------------------------------------------
// 6.6 ดึงข้อมูลปีการศึกษาของ History ทั้งหมด
// --------------------------------------------------------

const allAcademicYearIds = [
    ...new Set(
        allStudentHistories
            .map(row => row.academic_year_id)
            .filter(Boolean)
    )
];

let academicYearsById = new Map();

if (allAcademicYearIds.length > 0) {

    const {
        data: academicYearRows,
        error: academicYearError
    } = await supabaseClient
        .from("academic_years")
        .select("id, year")
        .in("id", allAcademicYearIds);

    if (academicYearError) {
        throw academicYearError;
    }

    academicYearsById = new Map(
        (academicYearRows || []).map(year => [
            year.id,
            year
        ])
    );
}

// --------------------------------------------------------
// 6.7 หา Academic Context ของปีการศึกษาปัจจุบัน
//
// ใช้ academic_years.is_current เป็นตัวตัดสิน
// ไม่ใช้ปีที่มีตัวเลขสูงที่สุด
// --------------------------------------------------------

const {
    data: currentAcademicYear,
    error: currentAcademicYearError
} = await supabaseClient
    .from("academic_years")
    .select(`
        id,
        year,
        is_current
    `)
    .eq("is_current", true)
    .maybeSingle();

if (currentAcademicYearError) {
    throw currentAcademicYearError;
}

const currentAcademicYearId =
    currentAcademicYear?.id || null;

    // --------------------------------------------------------
    // 7. รวม History + Student + Room
    // --------------------------------------------------------

    const historyResult = historyList
    .map(history => {

        const student =
            studentsById.get(history.student_id);

        const room =
            roomsById.get(history.room_id);

        if (!student || !room) {
            return null;
        }

        return {
            id: student.id,

                academic_year_id:
        history.academic_year_id,

    academic_year:
        academicYearsById.get(
            history.academic_year_id
        )?.year ?? null,

        is_latest_academic_context:
    currentAcademicYearId !== null &&
    history.academic_year_id ===
        currentAcademicYearId,

            student_code:
                student.student_code,

            student_no:
                history.student_no,

            prefix:
                student.prefix,

            first_name:
                student.first_name,

            last_name:
                student.last_name,

            nickname:
                student.nickname,

            current_status:
                student.current_status,

            current_room_id:
                history.room_id,

            room: room
        };
    })
    .filter(Boolean);

const historylessTransferResult =
    transferInStudentRows.map(student => ({
        id: student.id,

        student_code:
            student.student_code,

        student_no:
            null,

        prefix:
            student.prefix,

        first_name:
            student.first_name,

        last_name:
            student.last_name,

        nickname:
            student.nickname,

        current_status:
            student.current_status,

        current_room_id:
            null,

        room: {
            id: "",
            room_name: "",
            grade_level: null,
            academic_year_id: academicYearId
        }
    }));

return [
    ...historyResult,
    ...historylessTransferResult
];
}
async function searchStudentDetailCandidates({
    roomId = "",
    search = ""
} = {}) {

    const keyword = search.trim();

    const roleName =
        await getCurrentUserRole();

    // ========================================================
    // Current Academic Year
    // ========================================================

    const {
        data: currentAcademicYear,
        error: academicYearError
    } = await supabaseClient
        .from("academic_years")
        .select("id")
        .eq("is_current", true)
        .maybeSingle();

    if (academicYearError) {
        throw academicYearError;
    }

    if (!currentAcademicYear?.id) {
        return [];
    }

    // ========================================================
    // หา Student IDs ตาม Scope
    // ========================================================

    let allowedStudentIds = null;

    // --------------------------------------------------------
    // ADMIN
    // → นักเรียนทั้งหมด
    // --------------------------------------------------------

    if (roleName === "Admin") {
        allowedStudentIds = null;
    }

    // --------------------------------------------------------
    // TEACHER
    // → นักเรียนในห้องที่มี Subject Assignment
    // --------------------------------------------------------

    else if (roleName === "Teacher") {

        const teacherContext =
            await getCurrentTeacherContext();

        if (!teacherContext?.teacherId) {
            return [];
        }

        const {
            data: assignments,
            error: assignmentError
        } = await supabaseClient
            .from("subject_assignments")
            .select("room_id")
            .eq(
                "teacher_id",
                teacherContext.teacherId
            )
            .eq(
                "academic_year_id",
                currentAcademicYear.id
            );

        if (assignmentError) {
            throw assignmentError;
        }

        const allowedRoomIds = [
            ...new Set(
                (assignments || [])
                    .map(row => row.room_id)
                    .filter(Boolean)
            )
        ];

        if (allowedRoomIds.length === 0) {
            return [];
        }

        let historyQuery = supabaseClient
            .from("student_academic_history")
            .select(
                "student_id, room_id, student_no"
            )
            .eq(
                "academic_year_id",
                currentAcademicYear.id
            )
            .in("room_id", allowedRoomIds);

        if (roomId) {
            if (!allowedRoomIds.includes(roomId)) {
                return [];
            }

            historyQuery =
                historyQuery.eq(
                    "room_id",
                    roomId
                );
        }

        const {
            data: histories,
            error: historyError
        } = await historyQuery;

        if (historyError) {
            throw historyError;
        }

        allowedStudentIds = (histories || [])
            .map(row => row.student_id)
            .filter(Boolean);
    }

    // --------------------------------------------------------
    // PARENT
    // → เฉพาะบุตรที่ผูกไว้
    // --------------------------------------------------------

    else if (roleName === "Parent") {

        const parentStudents =
            await getCurrentParentStudents();

        allowedStudentIds = (parentStudents || [])
            .map(student => student.id)
            .filter(Boolean);

        if (allowedStudentIds.length === 0) {
            return [];
        }
    }

    // --------------------------------------------------------
    // STUDENT
    // → ตัวเองเท่านั้น
    // --------------------------------------------------------

    else if (roleName === "Student") {

        const currentStudent =
            await getCurrentStudent();

        if (!currentStudent?.id) {
            return [];
        }

        allowedStudentIds = [
            currentStudent.id
        ];
    }

    // --------------------------------------------------------
    // ROLE อื่น
    // --------------------------------------------------------

    else {
        return [];
    }

    // ========================================================
    // ดึงประวัตินักเรียน
    // ========================================================

    let historyQuery =
        supabaseClient
            .from("student_academic_history")
            .select(
                "student_id, room_id, student_no"
            )
            .eq(
                "academic_year_id",
                currentAcademicYear.id
            );

    if (allowedStudentIds !== null) {
        historyQuery =
            historyQuery.in(
                "student_id",
                allowedStudentIds
            );
    }

    if (roomId) {
        historyQuery =
            historyQuery.eq(
                "room_id",
                roomId
            );
    }

    const {
        data: histories,
        error: historyError
    } = await historyQuery;

    if (historyError) {
        throw historyError;
    }

    const historyList =
        histories || [];

    if (historyList.length === 0) {
        return [];
    }

    // ========================================================
    // Student IDs
    // ========================================================

    const studentIds = [
        ...new Set(
            historyList
                .map(row => row.student_id)
                .filter(Boolean)
        )
    ];

    // ========================================================
    // Student Query
    // ========================================================

    let studentQuery =
        supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                prefix,
                first_name,
                last_name,
                nickname,
                current_status
            `)
            .in("id", studentIds)
            .is("deleted_at", null);

    if (keyword) {

        studentQuery =
            studentQuery.or(
                `student_code.ilike.%${keyword}%,` +
                `first_name.ilike.%${keyword}%,` +
                `last_name.ilike.%${keyword}%,` +
                `nickname.ilike.%${keyword}%`
            );
    }

    const {
        data: students,
        error: studentError
    } = await studentQuery
        .order(
            "student_code",
            { ascending: true }
        )
        .limit(20);

    if (studentError) {
        throw studentError;
    }

    // ========================================================
    // Room
    // ========================================================

    const historyByStudentId =
        new Map(
            historyList.map(row => [
                row.student_id,
                row
            ])
        );

    const roomIds = [
        ...new Set(
            historyList
                .map(row => row.room_id)
                .filter(Boolean)
        )
    ];

    const {
        data: rooms,
        error: roomError
    } = await supabaseClient
        .from("rooms")
        .select(
            "id, room_name"
        )
        .in("id", roomIds)
        .is("deleted_at", null);

    if (roomError) {
        throw roomError;
    }

    const roomById =
        new Map(
            (rooms || []).map(room => [
                room.id,
                room.room_name
            ])
        );

    // ========================================================
    // Result
    // ========================================================

    return (students || []).map(student => {

        const history =
            historyByStudentId.get(
                student.id
            );

        return {
            ...student,

            student_no:
                history?.student_no ?? null,

            room_id:
                history?.room_id ?? null,

            room_name:
                roomById.get(
                    history?.room_id
                ) || "-"
        };
    });
}

async function getStudentDetailRooms() {

    const roleName =
        await getCurrentUserRole();

    const {
        data: academicYear,
        error: academicYearError
    } = await supabaseClient
        .from("academic_years")
        .select("id, year")
        .eq("is_current", true)
        .maybeSingle();

    if (academicYearError) {
        throw academicYearError;
    }

    if (!academicYear?.id) {
        return {
            academicYear: null,
            rooms: []
        };
    }

    // ========================================================
    // ADMIN
    // → ทุกห้องในปีการศึกษาปัจจุบัน
    // ========================================================

    if (roleName === "Admin") {

        const {
            data: rooms,
            error: roomError
        } = await supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level,
                academic_year_id
            `)
            .eq("academic_year_id", academicYear.id)
            .is("deleted_at", null)
            .order("room_name", { ascending: true });

        if (roomError) {
            throw roomError;
        }

        return {
            academicYear: academicYear.year,
            rooms: rooms || []
        };
    }

    // ========================================================
    // TEACHER
    // → เฉพาะห้องที่มี Subject Assignment ของ Teacher
    // ========================================================

    if (roleName === "Teacher") {

        const teacherContext =
            await getCurrentTeacherContext();

        if (!teacherContext?.teacherId) {
            return {
                academicYear: academicYear.year,
                rooms: []
            };
        }

        const {
            data: assignments,
            error: assignmentError
        } = await supabaseClient
            .from("subject_assignments")
            .select(`
                room_id
            `)
            .eq(
                "teacher_id",
                teacherContext.teacherId
            )
            .eq(
                "academic_year_id",
                academicYear.id
            );

        if (assignmentError) {
            throw assignmentError;
        }

        const roomIds = [
            ...new Set(
                (assignments || [])
                    .map(row => row.room_id)
                    .filter(Boolean)
            )
        ];

        if (roomIds.length === 0) {
            return {
                academicYear: academicYear.year,
                rooms: []
            };
        }

        const {
            data: rooms,
            error: roomError
        } = await supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level,
                academic_year_id
            `)
            .in("id", roomIds)
            .eq("academic_year_id", academicYear.id)
            .is("deleted_at", null)
            .order("room_name", { ascending: true });

        if (roomError) {
            throw roomError;
        }

        return {
            academicYear: academicYear.year,
            rooms: rooms || []
        };
    }

    // ========================================================
    // PARENT
    // → ห้องที่มีบุตรของ Parent อยู่
    // ========================================================

    if (roleName === "Parent") {

        const parentStudents =
            await getCurrentParentStudents();

        const studentIds = [
            ...new Set(
                (parentStudents || [])
                    .map(student => student.id)
                    .filter(Boolean)
            )
        ];

        if (studentIds.length === 0) {
            return {
                academicYear: academicYear.year,
                rooms: []
            };
        }

        const {
            data: histories,
            error: historyError
        } = await supabaseClient
            .from("student_academic_history")
            .select(`
                student_id,
                room_id
            `)
            .in("student_id", studentIds)
            .eq(
                "academic_year_id",
                academicYear.id
            );

        if (historyError) {
            throw historyError;
        }

        const roomIds = [
            ...new Set(
                (histories || [])
                    .map(row => row.room_id)
                    .filter(Boolean)
            )
        ];

        if (roomIds.length === 0) {
            return {
                academicYear: academicYear.year,
                rooms: []
            };
        }

        const {
            data: rooms,
            error: roomError
        } = await supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level,
                academic_year_id
            `)
            .in("id", roomIds)
            .eq("academic_year_id", academicYear.id)
            .is("deleted_at", null)
            .order("room_name", { ascending: true });

        if (roomError) {
            throw roomError;
        }

        return {
            academicYear: academicYear.year,
            rooms: rooms || []
        };
    }

    // ========================================================
    // STUDENT / ROLE อื่น
    // → ไม่มีรายการห้อง
    // ========================================================

    return {
        academicYear: academicYear.year,
        rooms: []
    };
}

// ============================================================
// Student Lifecycle — Promote
// ============================================================

async function promoteStudents({
    studentIds,
    sourceAcademicYearId,
    targetAcademicYearId,
    targetRoomId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!sourceAcademicYearId) {
        throw new Error("Source academic year is required.");
    }

    if (!targetAcademicYearId) {
        throw new Error("Target academic year is required.");
    }

    if (!targetRoomId) {
        throw new Error("Target room is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "promote_students",
        {
            p_student_ids:
                studentIds,

            p_source_academic_year_id:
                sourceAcademicYearId,

            p_target_academic_year_id:
                targetAcademicYearId,

            p_target_room_id:
                targetRoomId
        }
    );

    if (error) {
        console.error(
            "promoteStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}
window.promoteStudents = promoteStudents;

// ============================================================
// Student Lifecycle — Repeat
// ============================================================

async function repeatStudents({
    studentIds,
    sourceAcademicYearId,
    targetAcademicYearId,
    targetRoomId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!sourceAcademicYearId) {
        throw new Error("Source academic year is required.");
    }

    if (!targetAcademicYearId) {
        throw new Error("Target academic year is required.");
    }

    if (!targetRoomId) {
        throw new Error("Target room is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "repeat_students",
        {
            p_student_ids:
                studentIds,

            p_source_academic_year_id:
                sourceAcademicYearId,

            p_target_academic_year_id:
                targetAcademicYearId,

            p_target_room_id:
                targetRoomId
        }
    );

    if (error) {
        console.error(
            "repeatStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}
// ============================================================
// Student Lifecycle — Transfer Out
// ============================================================

async function transferOutStudents({
    studentIds,
    academicYearId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "transfer_out_students",
        {
            p_student_ids:
                studentIds,

            p_academic_year_id:
                academicYearId
        }
    );

    if (error) {
        console.error(
            "transferOutStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}

window.transferOutStudents = transferOutStudents;

// ============================================================
// Student Lifecycle — Transfer In
// ============================================================

async function transferInStudents({
    studentIds,
    academicYearId,
    roomId,
    sourceSchoolName
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    if (!roomId) {
        throw new Error("Target room is required.");
    }

    if (
        !sourceSchoolName ||
        sourceSchoolName.trim() === ""
    ) {
        throw new Error(
            "Source school is required."
        );
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "transfer_in_students",
        {
            p_student_ids:
                studentIds,

            p_academic_year_id:
                academicYearId,

            p_room_id:
                roomId,

            p_source_school_name:
                sourceSchoolName.trim()
        }
    );

    if (error) {
        console.error(
            "transferInStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}

window.transferInStudents = transferInStudents;

// ============================================================
// Student Lifecycle — Deceased
// ============================================================

async function deceasedStudents({
    studentIds,
    academicYearId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "deceased_students",
        {
            p_student_ids:
                studentIds,

            p_academic_year_id:
                academicYearId
        }
    );

    if (error) {
        console.error(
            "deceasedStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}

window.deceasedStudents = deceasedStudents;

// ============================================================
// Student Lifecycle — Withdraw
// ============================================================

async function withdrawStudents({
    studentIds,
    academicYearId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "withdraw_students",
        {
            p_student_ids:
                studentIds,

            p_academic_year_id:
                academicYearId
        }
    );

    if (error) {
        console.error(
            "withdrawStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}

window.withdrawStudents = withdrawStudents;

// ============================================================
// Student Lifecycle — Graduate
// ============================================================

async function graduateStudents({
    studentIds,
    academicYearId
}) {

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students selected.");
    }

    if (!academicYearId) {
        throw new Error("Academic year is required.");
    }

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "graduate_students",
        {
            p_student_ids:
                studentIds,

            p_academic_year_id:
                academicYearId
        }
    );

    if (error) {
        console.error(
            "graduateStudents RPC:",
            error
        );

        throw error;
    }

    return data;
}

window.graduateStudents = graduateStudents;

// ==============================
// Attendance Session - Class
// ==============================
async function createAttendanceSession(
    classScheduleId,
    roomId,
    subjectId,
    attendanceDate
) {
    const { data, error } = await supabaseClient
        .from("attendance_sessions")
        .insert({
            class_schedule_id: classScheduleId,
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
// Get Class Attendance Session
// ============================================================
async function getClassAttendanceSession(
    classScheduleId,
    attendanceDate
) {
    const { data, error } = await supabaseClient
        .from("attendance_sessions")
        .select("*")
        .eq("class_schedule_id", classScheduleId)
        .eq("attendance_date", attendanceDate)
        .is("deleted_at", null)
        .maybeSingle();

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

    if(!studentId){
        throw new Error("Student ID is required.");
    }

    const {
        data: student,
        error: studentError
    } = await supabaseClient
        .from("students")
        .select("*")
        .eq("id",studentId)
        .single();

    if(studentError) throw studentError;

    const {
        data: academicYear,
        error: academicYearError
    } = await supabaseClient
        .from("academic_years")
        .select("id, year")
        .eq("is_current",true)
        .maybeSingle();

    if(academicYearError) throw academicYearError;

    let history = null;

    if(academicYear?.id){
        const {
            data: historyData,
            error: historyError
        } = await supabaseClient
            .from("student_academic_history")
            .select(`
                student_id,
                academic_year_id,
                room_id,
                student_no
            `)
            .eq("student_id",studentId)
            .eq("academic_year_id",academicYear.id)
            .maybeSingle();

        if(historyError) throw historyError;

        history = historyData;
    }

    let room = null;

    if(history?.room_id){
        const {
            data: roomData,
            error: roomError
        } = await supabaseClient
            .from("rooms")
            .select(`
                id,
                room_name,
                grade_level,
                academic_year_id
            `)
            .eq("id",history.room_id)
            .maybeSingle();

        if(roomError) throw roomError;

        room = roomData;
    }

    return {
        ...student,
        academic_year_id:
            history?.academic_year_id || academicYear?.id || null,
        academic_year:
            academicYear?.year || null,
        student_no:
            history?.student_no ?? null,
        current_room_id:
            history?.room_id || null,
        room_name:
            room?.room_name || null,
        grade_level:
            room?.grade_level || null
    };
}
// ============================================================
// STUDENT DETAIL SCOPE
// ------------------------------------------------------------
// Admin   → นักเรียนทั้งหมด
// Teacher → นักเรียนในห้องที่มี Subject Assignment ของ Teacher
// Student → ตัวเอง
// Parent  → บุตรที่ผูกไว้
// ============================================================

async function getStudentDetailScope(studentId) {

    if (!studentId) {
        return {
            allowed: false,
            role: null,
            reason: "Student ID is required."
        };
    }

    // --------------------------------------------------------
    // 1. ตรวจสอบ Role ปัจจุบัน
    // --------------------------------------------------------

    const roleName =
        await getCurrentUserRole();

    if (!roleName) {
        return {
            allowed: false,
            role: null,
            reason: "ไม่พบ Role ของผู้ใช้งาน"
        };
    }

    // --------------------------------------------------------
    // 2. Admin
    // → เข้าถึงนักเรียนทั้งหมด
    // --------------------------------------------------------

    if (roleName === "Admin") {

        return {
            allowed: true,
            role: "Admin"
        };

    }

    // --------------------------------------------------------
    // 3. Student
    // → เข้าถึงได้เฉพาะข้อมูลของตัวเอง
    // --------------------------------------------------------

    if (roleName === "Student") {

        const currentStudent =
            await getCurrentStudent();

        return {
            allowed:
                !!currentStudent &&
                currentStudent.id === studentId,

            role: "Student",

            studentId:
                currentStudent?.id || null
        };

    }

    // --------------------------------------------------------
    // 4. Parent
    // → เข้าถึงได้เฉพาะบุตรที่ผูกไว้
    // --------------------------------------------------------

    if (roleName === "Parent") {

        const parentStudents =
            await getCurrentParentStudents();

        const allowedStudent =
            (parentStudents || []).some(
                student =>
                    student.id === studentId
            );

        return {
            allowed: allowedStudent,
            role: "Parent",
            studentId: allowedStudent
                ? studentId
                : null
        };

    }

    // --------------------------------------------------------
    // 5. Teacher
    // → ตรวจหาห้องปัจจุบันของนักเรียน
    // → แล้วตรวจ Subject Assignment ของ Teacher
    // --------------------------------------------------------

    if (roleName === "Teacher") {

        // 5.1 Current Teacher Context
        const teacherContext =
            await getCurrentTeacherContext();

        if (!teacherContext?.teacherId) {

            return {
                allowed: false,
                role: "Teacher",
                reason: "ไม่พบข้อมูล Teacher"
            };

        }

        // ----------------------------------------------------
        // 5.2 Current Academic Year
        // ----------------------------------------------------

        const {
            data: academicYear,
            error: academicYearError
        } = await supabaseClient
            .from("academic_years")
            .select("id")
            .eq("is_current", true)
            .maybeSingle();

        if (academicYearError) {
            throw academicYearError;
        }

        if (!academicYear?.id) {

            return {
                allowed: false,
                role: "Teacher",
                reason: "ไม่พบปีการศึกษาปัจจุบัน"
            };

        }

        // ----------------------------------------------------
        // 5.3 หาห้องปัจจุบันของนักเรียน
        // ----------------------------------------------------

        const {
            data: studentHistory,
            error: historyError
        } = await supabaseClient
            .from("student_academic_history")
            .select(`
                student_id,
                room_id,
                academic_year_id
            `)
            .eq("student_id", studentId)
            .eq("academic_year_id", academicYear.id)
            .maybeSingle();

        if (historyError) {
            throw historyError;
        }

        if (!studentHistory?.room_id) {

            return {
                allowed: false,
                role: "Teacher",
                reason: "นักเรียนไม่มีห้องเรียนในปีการศึกษาปัจจุบัน"
            };

        }

        // ----------------------------------------------------
        // 5.4 ตรวจ Subject Assignment
        //
        // Teacher มีสิทธิ์เมื่อมี Assignment
        // ในห้องเดียวกับนักเรียน
        // และอยู่ในปีการศึกษาปัจจุบัน
        // ----------------------------------------------------

        const {
            data: assignment,
            error: assignmentError
        } = await supabaseClient
            .from("subject_assignments")
            .select(`
                id,
                teacher_id,
                room_id,
                academic_year_id
            `)
            .eq(
                "teacher_id",
                teacherContext.teacherId
            )
            .eq(
                "room_id",
                studentHistory.room_id
            )
            .eq(
                "academic_year_id",
                academicYear.id
            )
            .limit(1)
            .maybeSingle();

        if (assignmentError) {
            throw assignmentError;
        }

        // ----------------------------------------------------
        // 5.5 มี Assignment → อนุญาต
        // ไม่มี Assignment → ปฏิเสธ
        // ----------------------------------------------------

        return {
            allowed: !!assignment,
            role: "Teacher",
            teacherId: teacherContext.teacherId,
            roomId: studentHistory.room_id,
            assignmentId: assignment?.id || null
        };
    }

    // --------------------------------------------------------
    // 6. Role อื่นที่ไม่ได้อยู่ใน Scope
    // --------------------------------------------------------

    return {
        allowed: false,
        role: roleName,
        reason: "Role นี้ไม่มีสิทธิ์เข้าถึง Student Detail"
    };
}

window.getStudentDetailScope =
    getStudentDetailScope;

async function getStudentPhotoUrl(photoPath) {
    if (!photoPath) {
        return null;
    }

    const {
        data,
        error
    } = await supabaseClient
        .storage
        .from("student-photos")
        .createSignedUrl(photoPath, 3600);

    if (error) {
        console.error(
            "getStudentPhotoUrl:",
            error
        );
        throw error;
    }

    return data?.signedUrl || null;
}

window.getStudentPhotoUrl =
    getStudentPhotoUrl;

async function updateStudentIdentity({
    studentId,
    prefix,
    firstName,
    lastName,
    nickname,
    gender,
    birthDate
} = {}) {

    if (!studentId) {
        throw new Error("Student ID is required.");
    }

    // 1. ตรวจสอบผู้ใช้งาน
    const context = await getCurrentTeacherContext();

    if (!context) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
    }

    // 2. Edit นักเรียนได้เฉพาะ Admin
    if (context.role !== "Admin") {
        throw new Error(
            "ไม่มีสิทธิ์แก้ไขข้อมูลนักเรียน ต้องเป็น Admin เท่านั้น"
        );
    }

    // 3. ตรวจสอบ Current Academic Context
    const {
        data: studentContext,
        error: contextError
    } = await supabaseClient
        .from("students")
        .select(`
            id,
            current_status,
            student_academic_history!inner(
                academic_year_id,
                academic_years!inner(
                    id,
                    is_current
                )
            )
        `)
        .eq("id", studentId)
        .is("deleted_at", null)
        .eq(
            "student_academic_history.academic_years.is_current",
            true
        )
        .maybeSingle();

    if (contextError) {
        console.error(
            "updateStudentIdentity context check:",
            contextError
        );
        throw contextError;
    }

    // ไม่มี Academic Context ของปีปัจจุบัน
    if (!studentContext) {
        throw new Error(
            "ไม่สามารถแก้ไขได้ เนื่องจากนักเรียนไม่ได้อยู่ในปีการศึกษาปัจจุบัน"
        );
    }

    // 4. GRADUATED ห้ามแก้
    if (studentContext.current_status === "GRADUATED") {
        throw new Error(
            "ไม่สามารถแก้ไขข้อมูลนักเรียนที่สำเร็จการศึกษาแล้ว"
        );
    }

    // 5. Normalize ข้อมูล
    const normalizedFirstName =
        String(firstName ?? "").trim();

    const normalizedLastName =
        String(lastName ?? "").trim();

    const normalizedPrefix =
        String(prefix ?? "").trim();

    const normalizedNickname =
        String(nickname ?? "").trim();

    const normalizedGender =
        String(gender ?? "").trim();

    const normalizedBirthDate =
        String(birthDate ?? "").trim();

    // 6. Validate
    if (!normalizedFirstName) {
        throw new Error("กรุณาระบุชื่อ");
    }

    if (!normalizedLastName) {
        throw new Error("กรุณาระบุนามสกุล");
    }

    if (
        normalizedGender !== "" &&
        !["M", "F"].includes(normalizedGender)
    ) {
        throw new Error("ข้อมูลเพศไม่ถูกต้อง");
    }

    // 7. Identity fields เท่านั้น
    const updates = {
        prefix: normalizedPrefix || null,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        nickname: normalizedNickname || null,
        gender: normalizedGender || null,
        birth_date: normalizedBirthDate || null
    };

    // 8. Update
    const {
        data,
        error
    } = await supabaseClient
        .from("students")
        .update(updates)
        .eq("id", studentId)
        .select()
        .single();

    if (error) {
        console.error(
            "updateStudentIdentity:",
            error
        );
        throw error;
    }

    return data;
}

window.updateStudentIdentity =
    updateStudentIdentity;
async function deleteStudentPhoto(photoPath) {
    if (!photoPath) {
        return true;
    }

    const {
        error
    } = await supabaseClient
        .storage
        .from("student-photos")
        .remove([photoPath]);

    if (error) {
        console.error(
            "deleteStudentPhoto:",
            error
        );
        throw error;
    }

    return true;
}

window.deleteStudentPhoto =
    deleteStudentPhoto;

async function updateStudentPhoto({
    studentId,
    studentCode,
    photoFile
} = {}) {

    if (!studentId) {
        throw new Error("Student ID is required.");
    }

    if (!studentCode) {
        throw new Error("Student Code is required.");
    }

    if (!photoFile) {
        throw new Error("กรุณาเลือกรูปนักเรียน");
    }

    if (!photoFile.type.startsWith("image/")) {
        throw new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
    }

    if (photoFile.size > 5 * 1024 * 1024) {
        throw new Error("รูปภาพมีขนาดเกิน 5 MB");
    }

    const context = await getCurrentTeacherContext();

    if (!context || context.role !== "Admin") {
        throw new Error(
            "ไม่มีสิทธิ์แก้ไขรูปนักเรียน ต้องเป็น Admin เท่านั้น"
        );
    }

    const {
    data: student,
    error: studentError
} = await supabaseClient
    .from("students")
    .select("photo_url")
    .eq("id", studentId)
    .single();

if (studentError) {
    throw studentError;
}

const oldPhotoPath =
    student?.photo_url || null;

    const extension =
        photoFile.name.split(".").pop().toLowerCase();

    const photoPath =
        `${studentId}/${studentCode}.${extension}`;

    const { error: uploadError } =
        await supabaseClient
            .storage
            .from("student-photos")
            .upload(photoPath, photoFile, {
                upsert: true,
                contentType: photoFile.type
            });

    if (uploadError) {
        console.error(
            "updateStudentPhoto upload:",
            uploadError
        );
        throw uploadError;
    }

    const { data, error } =
        await supabaseClient
            .from("students")
            .update({
                photo_url: photoPath
            })
            .eq("id", studentId)
            .select()
            .single();

    if (error) {
    console.error(
        "updateStudentPhoto DB:",
        error
    );
    throw error;
}

if (
    oldPhotoPath &&
    oldPhotoPath !== photoPath
) {
    await deleteStudentPhoto(
        oldPhotoPath
    );
}

    return data;
}

window.updateStudentPhoto =
    updateStudentPhoto;

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
// ============================================================
// STUDENT DETAIL — Attendance History
// ------------------------------------------------------------
// ใช้สำหรับแสดงรายละเอียดวันที่นักเรียน
// สาย / ลากิจ / ลาป่วย / ขาด
// ============================================================

async function getStudentAttendanceHistory(studentId) {

    if (!studentId) {
        throw new Error("Student ID is required.");
    }

    const { data, error } = await supabaseClient
        .from("attendance")
        .select(`
            id,
            student_id,
            status,
            attendance_type,
            check_in_time,
            remark,
            attendance_sessions!inner(
                id,
                attendance_date,
                room_id,
                subject_id,
                class_schedule_id,
                activity_schedule_id,
                class_schedules!class_schedule_id(lesson_no),
                subjects!subject_id(
                    subject_code,
                    subject_name
                )
            )
        `)
        .eq("student_id", studentId)
        .is("deleted_at", null)
        .is("attendance_sessions.deleted_at", null)
        .not("attendance_sessions.subject_id", "is", null)
        .order(
            "attendance_date",
            {
                foreignTable: "attendance_sessions",
                ascending: false
            }
        );

    if (error) {
        throw error;
    }

    return (data || []).map(record => {

        const session =
            record.attendance_sessions || {};

        const subject =
            session.subjects || {};

        return {
            attendanceId:
                record.id,

            studentId:
                record.student_id,

            status:
                record.status || "",

            attendanceType:
                record.attendance_type || "",

            checkInTime:
                record.check_in_time || null,

            remark:
                record.remark || "",

            attendanceDate:
                session.attendance_date || null,

            roomId:
                session.room_id || null,

            subjectId:
                session.subject_id || null,

            classScheduleId:
                session.class_schedule_id || null,

            lessonNo:
                session.class_schedules?.lesson_no ?? null,

            subjectCode:
                subject.subject_code || "",

            subjectName:
                subject.subject_name || ""
        };
    });
}

window.getStudentAttendanceHistory =
    getStudentAttendanceHistory;

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
// CURRENT USER ROLE
// ============================================================

async function getCurrentUserRole() {

    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        return "";
    }

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(`
            role:roles(
                name
            )
        `)
        .eq("id", user.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }

    return profile?.role?.name || "";
}

window.getCurrentUserRole =
    getCurrentUserRole;

async function getCurrentParentStudents() {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("No authenticated user.");

    const role = await getCurrentUserRole();

    if (role !== "Parent") {
        throw new Error("Only Parent can access parent students.");
    }

    const { data: parent, error: parentError } =
        await supabaseClient
            .from("parents")
            .select("id")
            .eq("profile_id", user.id)
            .is("deleted_at", null)
            .maybeSingle();

    if (parentError) throw parentError;

    if (!parent) {
        throw new Error("Parent profile not found.");
    }

    const { data: links, error: linkError } =
        await supabaseClient
            .from("parent_students")
            .select("student_id")
            .eq("parent_id", parent.id)
            .is("deleted_at", null);

    if (linkError) throw linkError;

    const studentIds =
        (links || [])
            .map(link => link.student_id)
            .filter(Boolean);

    if (studentIds.length === 0) {
        return [];
    }

    const { data: students, error: studentError } =
        await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                prefix,
                first_name,
                last_name,
                nickname,
                gender,
                birth_date,
                photo_url
            `)
            .in("id", studentIds)
            .is("deleted_at", null);

    if (studentError) throw studentError;

    return students || [];
}

window.getCurrentParentStudents =
    getCurrentParentStudents;

async function getCurrentStudent() {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("No authenticated user.");

    const role = await getCurrentUserRole();

    if (role !== "Student") {
        throw new Error("Only Student can access own student data.");
    }

    const { data: student, error: studentError } =
        await supabaseClient
            .from("students")
            .select(`
                id,
                student_code,
                prefix,
                first_name,
                last_name,
                nickname,
                gender,
                birth_date,
                photo_url
            `)
            .eq("profile_id", user.id)
            .is("deleted_at", null)
            .maybeSingle();

    if (studentError) throw studentError;

    if (!student) {
        throw new Error("Student profile not found.");
    }

    return student;
}

window.getCurrentStudent = getCurrentStudent;
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
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) throw authError;
    if (!user) return;

    document.getElementById("profile-email").textContent =
        user.email || "";

    const role = await getCurrentUserRole();

    document.getElementById("profile-role").textContent =
        role || "ไม่พบ Role";

    let displayName = "";

    if (role === "Teacher" || role === "Admin") {
        const { data: teacher, error } =
            await supabaseClient
                .from("teachers")
                .select(`
                    first_name,
                    last_name
                `)
                .eq("profile_id", user.id)
                .maybeSingle();

        if (error) throw error;

        if (teacher) {
            displayName =
                `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();
        }
    }

    if (role === "Student") {
        const { data: student, error } =
            await supabaseClient
                .from("students")
                .select(`
                    first_name,
                    last_name,
                    nickname
                `)
                .eq("profile_id", user.id)
                .maybeSingle();

        if (error) throw error;

        if (student) {
            displayName =
                `${student.first_name || ""} ${student.last_name || ""}`.trim();
        }
    }

    if (role === "Parent") {
    const { data: parent, error } =
        await supabaseClient
            .from("parents")
            .select(`
                first_name,
                last_name,
                nickname
            `)
            .eq("profile_id", user.id)
            .maybeSingle();

    if (error) throw error;

    if (parent) {
        displayName =
            `${parent.first_name || ""} ${parent.last_name || ""}`.trim();
    }
    }

    if (!displayName) {
        displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "";
    }

    document.getElementById("profile-name").textContent =
        displayName;
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
async function getActivitiesForScheduleCreate() {

    const { data, error } =
        await supabaseClient
            .from("activities")
            .select(`
                id,
                activity_name,
                activity_types!activity_type_id(
                    code,
                    name
                )
            `)
            .is("deleted_at", null)
            .order(
                "activity_name",
                {
                    ascending: true
                }
            );

    if (error) {
        throw error;
    }

    return (data || []).map(
        activity => ({
            activityId:
                activity.id,

            activityName:
                activity.activity_name || "",

            activityTypeCode:
                activity.activity_types?.code || "",

            activityTypeName:
                activity.activity_types?.name || ""
        })
    );
}
// ============================================================
// Activity Schedule
// CREATE Activity Schedule
// ============================================================

async function createActivitySchedule(scheduleData) {

    const { data, error } =
        await supabaseClient
            .from("activity_schedules")
            .insert({
                activity_id:
                    scheduleData.activityId,

                weekday:
                    scheduleData.weekday,

                lesson_no:
                    scheduleData.lessonNo ?? null,

                start_time:
                    scheduleData.startTime ?? null,

                end_time:
                    scheduleData.endTime ?? null,

                valid_from:
                    scheduleData.validFrom,

                valid_until:
                    scheduleData.validUntil || null
            })
            .select()
            .single();

    if (error) {
        throw error;
    }

    return data;
}

// ============================================================
// Activity Schedule
// DELETE Activity Schedule
// ============================================================

async function deleteActivitySchedule(scheduleId) {

    if (!scheduleId) {
        throw new Error(
            "ไม่พบ Activity Schedule ID"
        );
    }

    // --------------------------------------------------------
    // 1. ตรวจว่ามี Attendance Session ใช้ Schedule นี้หรือไม่
    // --------------------------------------------------------

    const { count, error: countError } =
        await supabaseClient
            .from("attendance_sessions")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "activity_schedule_id",
                scheduleId
            );

    if (countError) {
        throw countError;
    }

    // --------------------------------------------------------
    // 2. ถ้ามีประวัติ Attendance แล้ว ห้ามลบ
    // --------------------------------------------------------

    if (count > 0) {
        throw new Error(
            "ไม่สามารถลบตารางกิจกรรมนี้ได้ เนื่องจากมีประวัติการเช็คชื่อแล้ว"
        );
    }

    // --------------------------------------------------------
    // 3. ยังไม่มี Attendance → ลบ Schedule ได้
    // --------------------------------------------------------

    const { error } =
        await supabaseClient
            .from("activity_schedules")
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
// ============================================================
// STUDENT IMPORT API
// ============================================================

async function getStudentImportContext(academicYear) {

    if (!academicYear) {
        throw new Error("Academic Year is required.");
    }

    const {
        data: academicYearRow,
        error: academicYearError
    } = await supabaseClient
        .from("academic_years")
        .select("id, year")
        .eq("year", Number(academicYear))
        .maybeSingle();

    if (academicYearError) {
        throw academicYearError;
    }

    if (!academicYearRow) {
        throw new Error(
            `ไม่พบปีการศึกษา ${academicYear}`
        );
    }

    const {
        data: rooms,
        error: roomError
    } = await supabaseClient
        .from("rooms")
        .select(`
            id,
            room_name,
            grade_level,
            academic_year_id
        `)
        .eq(
            "academic_year_id",
            academicYearRow.id
        );

    if (roomError) {
        throw roomError;
    }

    const roomsByName = {};

    (rooms || []).forEach(room => {
        roomsByName[
            String(room.room_name || "").trim()
        ] = room;
    });

    return {
        academicYear: academicYearRow,
        rooms: rooms || [],
        roomsByName
    };
}


async function getStudentsByCodes(studentCodes) {

    const codes = [
        ...new Set(
            (studentCodes || [])
                .map(code =>
                    String(code ?? "").trim()
                )
                .filter(Boolean)
        )
    ];

    if (codes.length === 0) {
        return [];
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("students")
        .select(`
            id,
            student_code,
            prefix,
            first_name,
            last_name,
            nickname,
            gender,
            birth_date,
            current_room_id,
            current_status
        `)
        .in("student_code", codes)
        .is("deleted_at", null);

    if (error) {
        throw error;
    }

    return data || [];
}


async function validateStudentImport(
    rows,
    mode
) {

    if (!Array.isArray(rows)) {
        throw new Error(
            "Student Import rows must be an array."
        );
    }

    if (!["NEW", "UPDATE"].includes(mode)) {
        throw new Error(
            "Import mode must be NEW or UPDATE."
        );
    }

    if (rows.length === 0) {
        throw new Error(
            "ไม่พบข้อมูลสำหรับ Import"
        );
    }

    const normalizedRows = rows.map(row => ({
        academic_year:
            String(
                row.academic_year ?? ""
            ).trim(),

        student_code:
            String(
                row.student_code ?? ""
            ).trim(),

        student_no:
            String(
                row.student_no ?? ""
            ).trim(),

        prefix:
            String(
                row.prefix ?? ""
            ).trim(),

        first_name:
            String(
                row.first_name ?? ""
            ).trim(),

        last_name:
            String(
                row.last_name ?? ""
            ).trim(),

        nickname:
            String(
                row.nickname ?? ""
            ).trim(),

        gender:
            String(
                row.gender ?? ""
            ).trim(),

        birth_date:
            String(
                row.birth_date ?? ""
            ).trim(),

        room_name:
            String(
                row.room_name ?? ""
            ).trim()
    }));


    const academicYears = [
        ...new Set(
            normalizedRows
                .map(row => row.academic_year)
                .filter(Boolean)
        )
    ];

    if (academicYears.length !== 1) {

        return {
            valid: false,
            total: normalizedRows.length,
            validRows: [],
            invalidRows:
                normalizedRows.map(
                    (row, index) => ({
                        rowNumber: index + 2,
                        row,
                        errors: [
                            "ไฟล์ต้องมีปีการศึกษาเดียวกันทั้งหมด"
                        ]
                    })
                )
        };
    }


    const {
        academicYear,
        roomsByName
    } = await getStudentImportContext(
        academicYears[0]
    );


    const studentCodes =
        normalizedRows.map(
            row => row.student_code
        );

    const students =
        await getStudentsByCodes(
            studentCodes
        );


    const studentsByCode =
        Object.fromEntries(
            students.map(student => [
                student.student_code,
                student
            ])
        );

        const studentIds = students.map(student => student.id);

const {
    data: histories,
    error: historyError
} = await supabaseClient
    .from("student_academic_history")
    .select(`
        student_id,
        room_id,
        student_no
    `)
    .eq("academic_year_id", academicYear.id)
    .in("student_id", studentIds);

if (historyError) {
    throw historyError;
}

const historyByStudentId =
    Object.fromEntries(
        (histories || []).map(history => [
            history.student_id,
            history
        ])
    );

    const seenCodes = new Set();

    const seenRosterKeys = new Set();

    const validRows = [];
    const invalidRows = [];


    normalizedRows.forEach(
        (row, index) => {

            const rowNumber = index + 2;
            const errors = [];

            if (!row.academic_year) {
                errors.push(
                    "academic_year ว่าง"
                );
            }

            if (
                row.academic_year &&
                !/^\d{4}$/.test(
                    row.academic_year
                )
            ) {
                errors.push(
                    "academic_year ต้องเป็นปี 4 หลัก"
                );
            }


            if (!row.student_code) {

                errors.push(
                    "student_code ว่าง"
                );

            } else if (
                !/^\d{5}$/.test(
                    row.student_code
                )
            ) {

                errors.push(
                    "student_code ต้องเป็นตัวเลข 5 หลัก"
                );

            }


            if (!row.student_no) {

                errors.push(
                    "student_no ว่าง"
                );

            } else if (
                !/^\d+$/.test(
                    row.student_no
                )
            ) {

                errors.push(
                    "student_no ต้องเป็นตัวเลข"
                );

            }


            if (!row.prefix) {
                errors.push(
                    "prefix ว่าง"
                );
            }

            if (!row.first_name) {
                errors.push(
                    "first_name ว่าง"
                );
            }

            if (!row.last_name) {
                errors.push(
                    "last_name ว่าง"
                );
            }

            if (!row.room_name) {

                errors.push(
                    "room_name ว่าง"
                );

            } else if (
                !roomsByName[row.room_name]
            ) {

                errors.push(
                    `ไม่พบห้อง ${row.room_name} ในปีการศึกษา ${row.academic_year}`
                );

            }


            if (
                row.student_code &&
                seenCodes.has(
                    row.student_code
                )
            ) {

                errors.push(
                    "student_code ซ้ำในไฟล์"
                );

            }

            if (row.student_code) {
                seenCodes.add(
                    row.student_code
                );
            }


            if (
                row.room_name &&
                row.student_no
            ) {

                const rosterKey =
                    `${row.academic_year}|${row.room_name}|${row.student_no}`;

                if (
                    seenRosterKeys.has(
                        rosterKey
                    )
                ) {

                    errors.push(
                        "student_no ซ้ำในห้องและปีการศึกษาเดียวกัน"
                    );

                }

                seenRosterKeys.add(
                    rosterKey
                );
            }


            const existing =
                studentsByCode[
                    row.student_code
                ];


            if (
                mode === "NEW" &&
                existing
            ) {

                errors.push(
                    "student_code มีอยู่ในระบบแล้ว"
                );

            }


            if (
                mode === "UPDATE" &&
                !existing
            ) {

                errors.push(
                    "ไม่พบ student_code นี้ในระบบ"
                );

            }

const resultRow = {
    ...row,
    rowNumber,
    student_id: existing?.id || null,
    room_id:
        roomsByName[
            row.room_name
        ]?.id || null,
    academic_year_id:
        academicYear.id,
    import_action:
        existing
            ? "UPDATE"
            : "NEW",
    existing_student: existing
    ? {
        ...existing,
        student_no:
            historyByStudentId[existing.id]?.student_no ?? null,
        history_room_id:
            historyByStudentId[existing.id]?.room_id ?? null,
        history_room_name:
            Object.values(roomsByName).find(
                room =>
                    room.id ===
                    historyByStudentId[existing.id]?.room_id
            )?.room_name || ""
    }
    : null,
    errors
};

            if (errors.length > 0) {

                invalidRows.push(
                    resultRow
                );

            } else {

                validRows.push(
                    resultRow
                );

            }

        }
    );


    return {
        valid:
            invalidRows.length === 0,

        total:
            normalizedRows.length,

        validRows,

        invalidRows,

        academicYear,

        mode
    };
}


async function prepareStudentImport(
    rows,
    mode,
    sourceFileName = ""
) {

    const validation =
        await validateStudentImport(
            rows,
            mode
        );

    const readyRows =
        validation.validRows || [];

    const errorRows =
        validation.invalidRows || [];

    const newCount =
        readyRows.filter(
            row =>
                row.import_action === "NEW"
        ).length;

    const updateCount =
        readyRows.filter(
            row =>
                row.import_action === "UPDATE"
        ).length;

    return {

        mode,

        sourceFileName,

        totalRows:
            validation.total,

        readyCount:
            readyRows.length,

        errorCount:
            errorRows.length,

        newCount,

        updateCount,

        reviewCount: 0,

        unchangedCount: 0,

        valid:
            validation.valid,

        rows: [
            ...readyRows,
            ...errorRows
        ],

        validRows:
            readyRows,

        invalidRows:
            errorRows,

        academicYear:
            validation.academicYear
    };
}

async function createStudentImportAttempt({
    mode,
    academicYearId,
    sourceFileName = "",
    totalRows = 0
}) {
    if (!["NEW", "UPDATE"].includes(mode)) {
        throw new Error("Import mode ไม่ถูกต้อง");
    }

    if (!academicYearId) {
        throw new Error("ไม่พบ Academic Year ID");
    }

    const { data, error } = await supabaseClient.rpc(
        "create_student_import_attempt",
        {
            p_mode: mode,
            p_academic_year_id: academicYearId,
            p_source_file_name: sourceFileName,
            p_total_rows: totalRows
        }
    );

    if (error) {
        throw error;
    }

    return data;
}
async function commitStudentImport(payload) {

    if (!payload) {
        throw new Error("Import payload is required.");
    }

    const {
        rows,
        mode,
        academicYearId,
        sourceFileName = "",
        attemptId = null
    } = payload;

    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("ไม่พบข้อมูลสำหรับ Commit");
    }

    if (!["NEW", "UPDATE"].includes(mode)) {
        throw new Error("Import mode ไม่ถูกต้อง");
    }

    if (!academicYearId) {
        throw new Error("ไม่พบ Academic Year ID");
    }

    /*
     * IMPORTANT
     *
     * Full name parsing is NOT handled here.
     *
     * UI must already split:
     * full_name
     * → prefix
     * → first_name
     * → last_name
     *
     * API only validates / commits
     * the normalized fields.
     */

    const validation = await validateStudentImport(
        rows,
        mode
    );

    if (!validation.valid) {
        throw new Error(
            "ไม่สามารถ Commit ได้ เนื่องจากข้อมูลยังไม่ผ่าน Validation"
        );
    }

    /*
     * Import Attempt must exist BEFORE commit.
     *
     * If UI has not created one yet,
     * create it here as a safety fallback.
     */

    let currentAttemptId = attemptId;

    if (!currentAttemptId) {
        currentAttemptId =
            await createStudentImportAttempt({
                mode,
                academicYearId,
                sourceFileName,
                totalRows: validation.total
            });
    }

    /*
     * Only normalized rows go to PostgreSQL.
     *
     * Do NOT send invalid rows.
     */

    const commitRows =
        validation.validRows.map(row => ({
            academic_year: row.academic_year,
            academic_year_id: row.academic_year_id,

            student_code: row.student_code,
            student_no: row.student_no,

            prefix: row.prefix,
            first_name: row.first_name,
            last_name: row.last_name,
            nickname: row.nickname,

            gender: row.gender,
            birth_date: row.birth_date,

            room_name: row.room_name,
            room_id: row.room_id,

            student_id: row.student_id,
            import_action: row.import_action
        }));


    const {
        data,
        error
    } = await supabaseClient.rpc(
        "commit_student_import",
        {
            p_attempt_id: currentAttemptId,
            p_rows: commitRows
        }
    );


    if (error) {
        throw error;
    }


    return {
        ...data,
        attemptId: currentAttemptId
    };
}