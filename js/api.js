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