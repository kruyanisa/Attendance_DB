/* =========================================================
   Dashboard Analytics
   ========================================================= */

let analyticsTrendChart = null;
let analyticsClassChart = null;


/* =========================================================
   Main
   ========================================================= */

async function loadDashboardAnalytics(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    try {

        const data = await getDashboardAnalytics(
            startDate,
            endDate,
            roomId,
            subjectId
        );

        renderAttendanceTrend(
            data,
            startDate,
            endDate
        );

        renderAttendanceRate(data);

        renderClassComparison(data);

    } catch(error){

        console.error(
            "Dashboard Analytics Error:",
            error
        );

    }

}

/* =========================================================
   Dashboard View Switcher
========================================================= */

function switchDashboardView(view){

    const buttons =
        document.querySelectorAll(
            ".dashboard-view-btn"
        );

    buttons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.view === view
        );

    });


    const studentView =
        document.getElementById(
            "dashboard-student-view"
        );

    const sessionView =
        document.getElementById(
            "dashboard-session-view"
        );


    if(view === "student"){

        studentView.style.display = "block";
        sessionView.style.display = "none";

    }


    if(view === "session"){

        studentView.style.display = "none";
        sessionView.style.display = "block";

    }


    console.log(
        "Dashboard View:",
        view
    );

}

async function loadDashboardStudentView(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    try {

        const data =
            await getDashboardStudentAttendance(
                startDate,
                endDate,
                roomId,
                subjectId
            );

        console.log(
            "Student Attendance Data:",
            data
        );

        const students = {};

        data.forEach(item => {

            const studentId =
                item.student_id;

            if(!students[studentId]){

                students[studentId] = {

                    student: item.students,

                    present: 0,
                    late: 0,
                    personal: 0,
                    sick: 0,
                    absent: 0

                };

            }

            switch(item.status){

                case "PRESENT":
                    students[studentId].present++;
                    break;

                case "LATE":
                    students[studentId].late++;
                    break;

                case "PERSONAL":
                    students[studentId].personal++;
                    break;

                case "SICK":
                    students[studentId].sick++;
                    break;

                case "ABSENT":
                    students[studentId].absent++;
                    break;

            }

        });

        const studentList =
            Object.values(students);

        console.log(
            "Student List:",
            studentList
        );


        document.getElementById(
            "student-total"
        ).textContent =
            studentList.length;
const presentStudents = new Set();
const lateStudents = new Set();
const absentStudents = new Set();

studentList.forEach(item => {

    const studentId = item.student?.id;

    if(item.present > 0){
        presentStudents.add(studentId);
    }

    if(item.late > 0){
        lateStudents.add(studentId);
    }

    if(item.absent > 0){
        absentStudents.add(studentId);
    }

});

document.getElementById(
    "student-present"
).textContent =
    presentStudents.size;

document.getElementById(
    "student-late"
).textContent =
    lateStudents.size;

document.getElementById(
    "student-absent"
).textContent =
    absentStudents.size;

        const tbody =
            document.getElementById(
                "student-attendance-body"
            );

        tbody.innerHTML = "";


        if(studentList.length === 0){

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        ไม่พบข้อมูลนักเรียน
                    </td>
                </tr>
            `;

            return;

        }


        studentList.forEach(item => {

            const student =
                item.student || {};

            const name = [

                student.prefix,
                student.first_name,
                student.last_name

            ].filter(Boolean).join(" ");


            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${name || "-"}
                </td>

                <td>
                    ${item.present}
                </td>

                <td>
                    ${item.late}
                </td>

                <td>
                    ${item.personal}
                </td>

                <td>
                    ${item.sick}
                </td>

                <td>
                    ${item.absent}
                </td>

                <td>
                    -
                </td>

            `;

            tbody.appendChild(row);

        });


    } catch(error){

        console.error(
            "Student View Error:",
            error
        );

    }

}

async function loadDashboardSessionView(
    startDate,
    endDate,
    roomId = "",
    subjectId = ""
){

    try {

        const data =
            await getDashboardSessionAttendance(
                startDate,
                endDate,
                roomId,
                subjectId
            );

        console.log(
            "Session Attendance Data:",
            data
        );

        const sessions = [];

        data.forEach(session => {

            const counts = {
                present: 0,
                late: 0,
                personal: 0,
                sick: 0,
                absent: 0
            };

            (session.attendance || []).forEach(item => {

                switch(item.status){

                    case "PRESENT":
                        counts.present++;
                        break;

                    case "LATE":
                        counts.late++;
                        break;

                    case "PERSONAL":
                        counts.personal++;
                        break;

                    case "SICK":
                        counts.sick++;
                        break;

                    case "ABSENT":
                        counts.absent++;
                        break;

                }

            });

            sessions.push({

    date:
        session.attendance_date,

    lessonNo:
        session.class_schedules?.lesson_no ?? "-",

    time:
        session.open_time
            ? new Date(session.open_time)
                .toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            : "-",

    room:
        session.rooms?.room_name || "-",

    subject:
        session.subjects
            ? `${session.subjects.subject_code} ${session.subjects.subject_name}`
            : "-",

    teacher:
        session.class_schedules
            ?.subject_assignments
            ?.teachers
            ? `${session.class_schedules.subject_assignments.teachers.first_name} ${session.class_schedules.subject_assignments.teachers.last_name}`
            : "-",

    status:
        session.session_status || "-",

                subject:
                    session.subjects
                        ? `${session.subjects.subject_code} ${session.subjects.subject_name}`
                        : "-",

                status:
                    session.session_status || "-",

                present:
                    counts.present,

                late:
                    counts.late,

                personal:
                    counts.personal,

                sick:
                    counts.sick,

                absent:
                    counts.absent

            });

        });

        console.log(
            "Session List:",
            sessions
        );


        const tbody =
            document.getElementById(
                "session-attendance-body"
            );

        if(!tbody){

            console.warn(
                "session-attendance-body not found"
            );

            return;

        }

        tbody.innerHTML = "";


        if(sessions.length === 0){

            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        ไม่พบข้อมูลรายคาบเรียน
                    </td>
                </tr>
            `;

            return;

        }


        sessions.forEach(session => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                   ${session.date}
                </td>

                <td>
                    ${session.lessonNo}
                </td>

                <td>
                    ${session.time}
                </td>

                <td>
                    ${session.room}
                </td>

                <td>
                    ${session.subject}
                </td>

                <td>
                    ${session.teacher}
                </td>

                <td>
                    ${session.present}
                </td>

                <td>
                    ${session.late}
                </td>

                <td>
                    ${session.personal}
                </td>

                <td>
                    ${session.sick}
                </td>

                <td>
                    ${session.absent}
                </td>

                <td>
                   ${session.status}
                </td>

            `;

            tbody.appendChild(row);

        });


    } catch(error){

        console.error(
            "Session View Error:",
            error
        );

    }

}

/* =========================================================
   Date Helper
   ========================================================= */

function getAnalyticsStartDate(endDate, daysBack){

    const date = new Date(endDate + "T00:00:00");

    date.setDate(
        date.getDate() - daysBack
    );

    return formatAnalyticsDate(date);
}


function formatAnalyticsDate(date){

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
        .padStart(2, "0");

    const day =
        String(date.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   Status Calculator
   ========================================================= */

function calculateAttendanceStats(records){

    let total = 0;
    let present = 0;
    let late = 0;
    let personal = 0;
    let sick = 0;
    let absent = 0;

    records.forEach(record => {

        total++;

        switch(record.status){

            case "PRESENT":
                present++;
                break;

            case "LATE":
                late++;
                break;

            case "PERSONAL":
                personal++;
                break;

            case "SICK":
                sick++;
                break;

            case "ABSENT":
                absent++;
                break;

        }

    });

    const attendanceCount =
        present + late;

    const rate =
        total > 0
            ? (attendanceCount / total) * 100
            : 0;

    return {
        total,
        present,
        late,
        personal,
        sick,
        absent,
        attendanceCount,
        rate
    };

}


/* =========================================================
   1. Attendance Trend
   ========================================================= */

function renderAttendanceTrend(
    data,
    startDate,
    endDate
){

    const canvas =
        document.getElementById(
            "attendance-trend-chart"
        );

    if(!canvas) return;

    if(analyticsTrendChart){
        analyticsTrendChart.destroy();
    }

    const dates = [];

    const start =
        new Date(startDate + "T00:00:00");

    const end =
        new Date(endDate + "T00:00:00");

    for(
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
    ){

        dates.push(
            formatAnalyticsDate(date)
        );

    }

    const rates = dates.map(date => {

        const records = [];

        data.forEach(session => {

            if(
                session.attendance_date === date
            ){

                if(session.attendance){

                    records.push(
                        ...session.attendance
                    );

                }

            }

        });

        return calculateAttendanceStats(records).rate;

    });


    analyticsTrendChart = new Chart(
        canvas,
        {
            type: "line",

            data: {

                labels: dates.map(
                    date => formatShortThaiDate(date)
                ),

                datasets: [
                    {
                        label: "Attendance Rate (%)",

                        data: rates,

                        tension: 0.35,

                        fill: false,

                        borderWidth: 3,

                        pointRadius: 4
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true,

                        max: 100,

                        ticks: {

                            callback: value =>
                                value + "%"

                        }

                    }

                },

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        callbacks: {

                            label: context =>
                                ` ${context.parsed.y.toFixed(1)}%`

                        }

                    }

                }

            }

        }
    );

}


/* =========================================================
   2. Attendance Rate
   ========================================================= */

function renderAttendanceRate(data){

    const element =
        document.getElementById(
            "analytics-rate"
        );

    if(!element) return;

    const records = [];

    data.forEach(session => {

        if(session.attendance){

            records.push(
                ...session.attendance
            );

        }

    });

    const stats =
        calculateAttendanceStats(records);

    element.textContent =
        stats.rate.toFixed(1) + "%";


    const detail =
        document.getElementById(
            "analytics-rate-detail"
        );

    if(detail){

        detail.textContent =
            `เข้าเรียน (รวมสาย) / ทั้งหมด: ${stats.attendanceCount} / ${stats.total} คน`;

    }

}


/* =========================================================
   3. Class Comparison
   ========================================================= */

function renderClassComparison(data){

    const canvas =
        document.getElementById(
            "attendance-class-chart"
        );

    const bestElement =
        document.getElementById(
            "analytics-best-class"
        );

    const watchElement =
        document.getElementById(
            "analytics-watch-class"
        );

    if(!canvas) return;

    if(analyticsClassChart){
        analyticsClassChart.destroy();
    }


    const roomMap = {};


    data.forEach(session => {

        const roomId =
            session.room_id;

        const roomName =
            session.rooms?.room_name ||
            "ไม่ระบุห้อง";


        if(!roomMap[roomId]){

            roomMap[roomId] = {

                roomName,

                records: []

            };

        }


        if(session.attendance){

            roomMap[roomId].records.push(
                ...session.attendance
            );

        }

    });


    const classes =
        Object.values(roomMap)
        .map(room => {

            const stats =
                calculateAttendanceStats(
                    room.records
                );

            return {

                roomName: room.roomName,

                rate: stats.rate,

                total: stats.total

            };

        })
        .filter(room => room.total > 0)
        .sort((a,b) =>
            b.rate - a.rate
        );


    analyticsClassChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        classes.map(
                            room => room.roomName
                        ),

                    datasets: [
                        {
                            label:
                                "Attendance Rate (%)",

                            data:
                                classes.map(
                                    room => room.rate
                                ),

                            borderWidth: 1
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    indexAxis: "y",

                    scales: {

                        x: {

                            beginAtZero: true,

                            max: 100,

                            ticks: {

                                callback: value =>
                                    value + "%"

                            }

                        }

                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: context =>
                                    ` ${context.parsed.x.toFixed(1)}%`

                            }

                        }

                    }

                }

            }
        );


    /* =========================
       Best Class
       ========================= */

    if(bestElement){

        if(classes.length > 0){

            const best = classes[0];

            bestElement.innerHTML = `
                <strong>${best.roomName}</strong>
                <span>${best.rate.toFixed(1)}%</span>
            `;

        }else{

            bestElement.innerHTML =
                "<span>ไม่มีข้อมูล</span>";

        }

    }


    /* =========================
       Watch Class
       ========================= */

    if(watchElement){

        if(classes.length > 0){

            const watch =
                classes[classes.length - 1];

            watchElement.innerHTML = `
                <strong>${watch.roomName}</strong>
                <span>${watch.rate.toFixed(1)}%</span>
            `;

        }else{

            watchElement.innerHTML =
                "<span>ไม่มีข้อมูล</span>";

        }

    }

}


/* =========================================================
   Date Display
   ========================================================= */

function formatShortThaiDate(dateString){

    const date =
        new Date(
            dateString + "T00:00:00"
        );

    return `${date.getDate()}/${date.getMonth() + 1}`;

}