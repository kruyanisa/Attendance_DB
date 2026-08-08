async function loadDashboard() {

    console.log("Dashboard Loaded");

    const today = new Date().toISOString().split("T")[0];

    document.getElementById("dashboard-start-date").value = today;
    document.getElementById("dashboard-end-date").value = today;

await loadDashboardFilter();

await loadDashboardKPI(today);

await loadDashboardAnalytics(
    today,
    today,
    "",
    ""
);

}

function updateDashboardKPI() {

    if (!window.displayedStudents) return;

    let total = displayedStudents.length;

    let present = 0;
    let late = 0;
    let absent = 0;
    let personal = 0;
    let sick = 0;

    displayedStudents.forEach((student, index) => {

        const status =
            document.getElementById(`status-${index}`)?.value;

        switch (status) {

            case "มา":
                present++;
                break;

            case "สาย":
                late++;
                break;

            case "ขาด":
                absent++;
                break;

        }

    });

    document.getElementById("kpi-total").textContent = total;
    document.getElementById("kpi-present").textContent = present;
    document.getElementById("kpi-late").textContent = late;
    document.getElementById("kpi-personal").textContent = personal;
    document.getElementById("kpi-sick").textContent = sick;
    document.getElementById("kpi-absent").textContent = absent;
    
}

async function loadDashboardKPI(attendanceDate, roomId="", subjectId=""){

    const data = await getDashboardAttendance(attendanceDate, roomId, subjectId);
if (data.length === 0) {

        Swal.fire({
            icon: "info",
            title: "ไม่พบข้อมูล",
            text: "ไม่มีข้อมูลการเช็กชื่อตามเงื่อนไขที่เลือก"
        });

        document.getElementById("kpi-total").textContent = 0;
        document.getElementById("kpi-present").textContent = 0;
        document.getElementById("kpi-late").textContent = 0;
        document.getElementById("kpi-absent").textContent = 0;
        document.getElementById("kpi-personal").textContent = 0;
        document.getElementById("kpi-sick").textContent = 0;
        if(window.attendanceChart){window.attendanceChart.destroy();window.attendanceChart=null;}

        return;
    }
    let total = data.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let personal = 0;
    let sick = 0;

    data.forEach(item => {

        switch(item.status){

            case "PRESENT":
                present++;
                break;

            case "LATE":
                late++;
                break;

            case "ABSENT":
                absent++;
                break;

            case "PERSONAL":
            personal++;
            break;

            case "SICK":
            sick++;
            break;
        }

    });

    document.getElementById("kpi-total").textContent = total;
    document.getElementById("kpi-present").textContent = present;
    document.getElementById("kpi-late").textContent = late;
    document.getElementById("kpi-personal").textContent = personal;
    document.getElementById("kpi-sick").textContent = sick;
    document.getElementById("kpi-absent").textContent = absent;
    console.log("Chart called",present,late,personal,sick,absent);updateAttendanceChart(present,late,personal,sick,absent);

}
async function loadDashboardFilter(){

    // โหลดห้อง
    const rooms = await getRooms();

    const roomSelect =
        document.getElementById("dashboard-room");

    roomSelect.innerHTML =
        `<option value="">ทั้งหมด</option>`;

    rooms.forEach(room=>{

        roomSelect.innerHTML +=
        `<option value="${room.id}">
            ${room.room_name}
        </option>`;

    });

    // โหลดวิชา
    const subjects = await getSubjects();

    const subjectSelect =
        document.getElementById("dashboard-subject");

    subjectSelect.innerHTML =
        `<option value="">ทั้งหมด</option>`;

    subjects.forEach(subject=>{

        subjectSelect.innerHTML +=
        `<option value="${subject.id}">
            ${subject.subject_code}
        </option>`;

    });

}

async function reloadDashboard(){

    const startDate =
    document.getElementById("dashboard-start-date").value;

const endDate =
    document.getElementById("dashboard-end-date").value;
        if(!startDate || !endDate){
        Swal.fire({
            icon: "warning",
            title: "กรุณาเลือกวันที่",
            text: "กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด"
        });
        return;
    }

    if(startDate > endDate){
        Swal.fire({
            icon: "warning",
            title: "ช่วงวันที่ไม่ถูกต้อง",
            text: "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด"
        });
        return;
    }

const roomId =
    document.getElementById("dashboard-room").value;

const subjectId =
    document.getElementById("dashboard-subject").value;

    

    await loadDashboardKPI(
    startDate,
    roomId,
    subjectId
);

    await loadDashboardAnalytics(
    startDate,
    endDate,
    roomId,
    subjectId
);

await loadDashboardStudentView(
    startDate,
    endDate,
    roomId,
    subjectId
);

await loadDashboardSessionView(
    startDate,
    endDate,
    roomId,
    subjectId
);

}
async function showAttendanceList(status){

    const startDate = document.getElementById("dashboard-start-date").value;
    const endDate = document.getElementById("dashboard-end-date").value;
    const roomId = document.getElementById("dashboard-room").value;
    const subjectId = document.getElementById("dashboard-subject").value;

    const data = await getAttendanceByStatus(
        startDate,
        endDate,
        roomId,
        subjectId,
        status
    );

    const title =
        status === "LATE" ? "นักเรียนมาสาย" :
        status === "PERSONAL" ? "นักเรียนลากิจ" :
        status === "SICK" ? "นักเรียนลาป่วย" :
        "นักเรียนขาด";

    const studentList = data
        .sort((a,b) =>
            a.students.student_code.localeCompare(
                b.students.student_code
            )
        )
        .map(s => `
            <div style="padding:8px 12px;border-bottom:1px solid #eee;">
                ${s.students.student_code}
                ${s.students.prefix || ""}
                ${s.students.first_name}
                ${s.students.last_name}
            </div>
        `)
        .join("");

    Swal.fire({
        title: `${title} (${data.length} คน)`,
        html: `
            <div style="
                max-height:400px;
                overflow-y:auto;
                text-align:left;
            ">
                ${studentList || "ไม่พบข้อมูล"}
            </div>
        `,
        width: 600
    });
}
function updateAttendanceChart(present,late,personal,sick,absent){const ctx=document.getElementById("attendance-chart");if(window.attendanceChart)window.attendanceChart.destroy();window.attendanceChart=new Chart(ctx,{type:"doughnut",data:{labels:["มาเรียน","สาย","ลากิจ","ลาป่วย","ขาด"],datasets:[{data:[present,late,personal,sick,absent],backgroundColor:["#10b981","#f59e0b","#facc15","#8b5cf6","#991b1b"]}]},options:{responsive:true,plugins:{legend:{position:"bottom"}}}});}