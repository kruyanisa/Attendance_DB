let displayedStudents = [];

async function initSystem() {
    Swal.fire({
        title: 'กำลังโหลดข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // ตั้งค่าวันที่เป็นวันนี้
document.getElementById("attendance-date").value =
    new Date().toISOString().split("T")[0];
        const [rooms, subjects] = await Promise.all([
            getRooms(),
            getSubjects()
        ]);
        
        const roomFilter = document.getElementById('room-filter');
        roomFilter.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
        
        const roomFragment = document.createDocumentFragment();
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.room_name;
            roomFragment.appendChild(option);
        });
        roomFilter.appendChild(roomFragment);
        const qrRoom=document.getElementById("qr-room-filter");

if(qrRoom){

    qrRoom.innerHTML='<option value="">-- เลือกห้องเรียน --</option>';

    rooms.forEach(room=>{

        const option=document.createElement("option");

        option.value=room.id;

        option.textContent=room.room_name;

        qrRoom.appendChild(option);

    });

}

        const subjDropdown = document.getElementById('subject-dropdown');
        subjDropdown.innerHTML = '<option value="">-- เลือกวิชา --</option>';
        
        const subjFragment = document.createDocumentFragment();
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${subject.subject_code} - ${subject.subject_name}`;
            subjFragment.appendChild(option);
        });
        subjDropdown.appendChild(subjFragment);

        document.getElementById('load-btn').disabled = false;
        Swal.close();
    } catch (error) {
        console.error(error);
        Swal.close();
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลเริ่มต้นได้', 'error');
    }
}

async function filterAndLoad() {
    const roomId = document.getElementById('room-filter').value;
    const subjId = document.getElementById('subject-dropdown').value;
    const attendanceDate = document.getElementById("attendance-date").value;

    if (!roomId || !subjId) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกห้องและวิชาก่อนโหลดครับ', 'warning');
    }

    try {
        displayedStudents = await getStudentsByRoom(roomId);
        const session = await getAttendanceSession(roomId,subjId,attendanceDate);
        let attendanceMap = {};

if (session) {

    const attendanceData =
        await getAttendanceBySession(session.id);

    attendanceData.forEach(item => {
        attendanceMap[item.student_id] = item.status;
    });
}
        const tbody = document.getElementById('student-body');
        tbody.innerHTML = '';
        
        const fragment = document.createDocumentFragment();

        displayedStudents.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.id = `row-${i}`;
            tr.dataset.studentId = row.id; 
            const currentStatus = attendanceMap[row.id] ?? "";
            tr.innerHTML = `
                <td><b>${row.student_no ?? ''}</b></td>
                <td>${row.student_code ?? ''}</td>
                <td><b>${row.prefix ?? ''} ${row.first_name ?? ''} ${row.last_name ?? ''}</b></td>
                <td><span class="stats">-</span></td>
                <td class="alert-text">0 ครั้ง</td>
                <td>
                    <select id="status-${i}" onchange="updateSummaryCards()" style="padding:5px;border-radius:5px;border:1px solid #ccc;font-family:'Prompt',sans-serif;">
                        <option value="รอเช็ค" ${currentStatus==="" ? "selected" : ""}>-- รอเช็ค --</option>

<option value="มา" ${currentStatus==="PRESENT" ? "selected" : ""}>มา</option>

<option value="สาย" ${currentStatus==="LATE" ? "selected" : ""}>สาย</option>

<option value="ลาป่วย" ${currentStatus==="SICK" ? "selected" : ""}>ลาป่วย</option>

<option value="ลากิจ" ${currentStatus==="PERSONAL" ? "selected" : ""}>ลากิจ</option>

<option value="ขาด" ${currentStatus==="ABSENT" ? "selected" : ""}>ขาด</option>
                    </select>
                </td>
                <td>
                    <button class="btn-alert" disabled data-student-id="${row.id}">🔔 Alert</button>
                </td>
            `;
            fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);

        document.getElementById('student-table').style.display = 'table';
        document.getElementById('save-btn').style.display = 'block';
        document.getElementById('scan-btn').style.display = 'inline-block';
        
        updateSummaryCards();
    } catch (error) {
        console.error(error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดรายชื่อนักเรียนได้', 'error');
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

if (!attendanceCompleted && checked === total) {

    attendanceCompleted = true;

    Swal.fire({
        icon: "success",
        title: "🎉 เช็กชื่อครบแล้ว",
        text: 'กรุณาตรวจสอบข้อมูล แล้วกด "บันทึกข้อมูล"',
        confirmButtonText: "ตกลง"
    });

}

}

async function submitAttendance() {

    const roomId = document.getElementById('room-filter').value;
    const subjectId = document.getElementById('subject-dropdown').value;
    const attendanceDate = document.getElementById("attendance-date").value;
    if (!roomId || !subjectId) {
        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกห้องและวิชาก่อนบันทึก',
            'warning'
        );
    }

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
        let session = await getAttendanceSession(roomId,subjectId,attendanceDate);

if (!session) {

    session = await createAttendanceSession(roomId,subjectId,attendanceDate);

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