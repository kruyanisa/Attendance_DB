/* =========================================================
   Dashboard Analytics
   ========================================================= */

let analyticsTrendChart = null;
let analyticsClassChart = null;
let analyticsSubjectChart = null;


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
        renderSubjectComparison(data);

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
function buildTrendData(data,startDate,endDate){

    const start=new Date(startDate+"T00:00:00");
    const end=new Date(endDate+"T00:00:00");
    const days=Math.round((end-start)/86400000)+1;

    const daily={};

    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
        const date=formatAnalyticsDate(d);
        const records=[];

        data.forEach(session=>{
            if(session.attendance_date===date && session.attendance){
                records.push(...session.attendance);
            }
        });

        if(records.length){
            const s=calculateAttendanceStats(records);
            daily[date]={
                present:s.present,
                late:s.late,
                personal:s.personal,
                sick:s.sick,
                absent:s.absent,
                rate:s.rate,
                total:s.total
            };
        }
    }

    if(days<=60){
        return {
            mode:"daily",
            labels:Object.keys(daily),
            stats:Object.values(daily)
        };
    }

    const groups={};

if(days<=180){

    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
        const day=d.getDay()||7;
        const monday=new Date(d);
        monday.setDate(d.getDate()-day+1);
        const key=formatAnalyticsDate(monday);

        if(!groups[key]){
            groups[key]={present:0,late:0,personal:0,sick:0,absent:0,total:0,hasData:false};
        }
    }

}else{

    for(let d=new Date(start.getFullYear(),start.getMonth(),1);
        d<=end;
        d.setMonth(d.getMonth()+1)){

        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;

        groups[key]={present:0,late:0,personal:0,sick:0,absent:0,total:0,hasData:false};
    }
}

Object.entries(daily).forEach(([date,s])=>{

    const d=new Date(date+"T00:00:00");
    let key;

    if(days<=180){

        const day=d.getDay()||7;
        const monday=new Date(d);
        monday.setDate(d.getDate()-day+1);
        key=formatAnalyticsDate(monday);

    }else{

        key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }

    if(groups[key]){
        groups[key].present+=s.present;
        groups[key].late+=s.late;
        groups[key].personal+=s.personal;
        groups[key].sick+=s.sick;
        groups[key].absent+=s.absent;
        groups[key].total+=s.total;
        groups[key].hasData=true;
    }
});

const stats=Object.values(groups).map(s=>{

    if(!s.hasData){
        return {
            present:null,
            late:null,
            personal:null,
            sick:null,
            absent:null,
            rate:null
        };
    }

    return {
        present:s.present,
        late:s.late,
        personal:s.personal,
        sick:s.sick,
        absent:s.absent,
        rate:s.total
            ? ((s.present+s.late)/s.total)*100
            : null
    };
});

    return {
        mode:days<=180?"weekly":"monthly",
        labels:Object.keys(groups),
        stats
    };
}


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

    const trend=buildTrendData(data,startDate,endDate);
const labels=trend.labels;
const stats=trend.stats;

    analyticsTrendChart = new Chart(
        canvas,
        {
            type: "line",

            data: {

                labels:labels.map(date=>{
    if(trend.mode==="daily")
        return formatShortThaiDate(date);

    if(trend.mode==="weekly"){
        const d=new Date(date+"T00:00:00");
        return `สัปดาห์ ${d.getDate()}/${d.getMonth()+1}`;
    }

    const [y,m]=date.split("-");
    return `${m}/${Number(y)+543}`;
}),

                datasets: [
                    {
    label: "มาเรียน",

        data:stats.map(item=>item.present),

    yAxisID: "y",

    borderColor: "#22C55E",
    backgroundColor: "#22C55E",

    tension: 0.35,

    fill: false,

    borderWidth: 2.5,

    pointRadius: 3,

    pointHoverRadius: 5,

    spanGaps: false
},

{
    label: "สาย",

    data:stats.map(item=>item.late),

    yAxisID: "y",

    borderColor: "#F97316",
    backgroundColor: "#F97316",

    tension: 0.35,

    fill: false,

    borderWidth: 2.5,

    pointRadius: 3,

    pointHoverRadius: 5,

    spanGaps: false
},

{
    label: "ลากิจ",

    data:stats.map(item=>item.personal),

    yAxisID: "y",

    borderColor: "#EAB308",
    backgroundColor: "#EAB308",

    tension: 0.35,

    fill: false,

    borderWidth: 2.5,

    pointRadius: 3,

    pointHoverRadius: 5,

    spanGaps: false
},

{
    label: "ลาป่วย",

    data:stats.map(item=>item.sick),

    yAxisID: "y",

    borderColor: "#8B5CF6",
    backgroundColor: "#8B5CF6",

    tension: 0.35,

    fill: false,

    borderWidth: 2.5,

    pointRadius: 3,

    pointHoverRadius: 5,

    spanGaps: false
},

{
    label: "ขาด",

    data:stats.map(item=>item.absent),

    yAxisID: "y",

    borderColor: "#EF4444",
    backgroundColor: "#EF4444",

    tension: 0.35,

    fill: false,

    borderWidth: 2.5,

    pointRadius: 3,

    pointHoverRadius: 5,

    spanGaps: false
},

{
    label: "อัตราการเข้าเรียน",

    data:stats.map(item=>item.rate),
    yAxisID: "yRate",

    borderColor: "#3B82F6",
    backgroundColor: "#3B82F6",

    tension: 0.35,

    fill: false,

    borderWidth: 3,

    pointRadius: 3.5,

    pointHoverRadius: 5,

    spanGaps: false
}
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

    /* =========================
       X AXIS — วันที่
       ========================= */

    x:{
    title:{display:true,text:"วันที่"},
    ticks:{
        autoSkip:true,
        maxTicksLimit:trend.mode==="daily"?14:12
    }
},


    /* =========================
       Y AXIS LEFT — จำนวนคน
       ========================= */

    y:{
    type:"linear",
    position:"left",
    beginAtZero:true,
    title:{display:true,text:"จำนวนคน"},
    ticks:{precision:0}
},


    /* =========================
       Y AXIS RIGHT — %
       ========================= */

    yRate: {

        type: "linear",

        position: "right",

        beginAtZero: true,

        max: 100,

        title: {

            display: true,

            text: "อัตราการเข้าเรียน (%)"

        },

        ticks: {

            callback:
                value =>
                    value + "%"

        },

        grid: {

            drawOnChartArea: false

        }

    }

},

                plugins: {

                    legend: {

    display: true,

    position: "bottom"

},

                    tooltip: {

    mode: "index",

    intersect: false,

    callbacks: {

        title: tooltipItems => {

            if(!tooltipItems.length){
                return "";
            }

            return tooltipItems[0].label;

        },


        label: context => {

            const value =
                context.parsed.y;


            /* =========================
               ไม่มีข้อมูล
               ========================= */

            if(
                value === null ||
                value === undefined
            ){

                return null;

            }


            /* =========================
               Attendance Rate
               ========================= */

            if(
                context.dataset.yAxisID ===
                "yRate"
            ){

                return ` ${context.dataset.label}: ${value.toFixed(1)}%`;

            }


            /* =========================
               Student Count
               ========================= */

            return ` ${context.dataset.label}: ${value} ${trend.mode==="daily"?"คน":"ครั้ง"}`;

        }

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
   4. Subject Comparison
   ========================================================= */

function renderSubjectComparison(data){

    const canvas=document.getElementById("attendance-subject-chart");
    if(!canvas) return;

    if(analyticsSubjectChart){
        analyticsSubjectChart.destroy();
    }

    const subjectMap={};

    data.forEach(session=>{

        const subject=session.subjects;
        if(!subject) return;

        const key=session.subject_id || subject.subject_code;

        if(!subjectMap[key]){
            subjectMap[key]={
                subjectName:`${subject.subject_code} ${subject.subject_name}`,
                records:[]
            };
        }

        if(session.attendance){
            subjectMap[key].records.push(...session.attendance);
        }

    });

    const subjects=Object.values(subjectMap)
        .map(subject=>{

            const stats=calculateAttendanceStats(
                subject.records
            );

            return {
                subjectName:subject.subjectName,
                rate:stats.rate,
                total:stats.total
            };

        })
        .filter(subject=>subject.total>0)
        .sort((a,b)=>b.rate-a.rate);

    analyticsSubjectChart=new Chart(canvas,{
        type:"bar",

        data:{
            labels:subjects.map(
                subject=>subject.subjectName
            ),

            datasets:[{
                label:"Attendance Rate (%)",

                data:subjects.map(
                    subject=>subject.rate
                ),

                borderWidth:1
            }]
        },

        options:{
            responsive:true,
            maintainAspectRatio:false,

            indexAxis:"y",

            scales:{
                x:{
                    beginAtZero:true,
                    max:100,

                    title:{
                        display:true,
                        text:"Attendance Rate (%)"
                    },

                    ticks:{
                        callback:value=>value+"%"
                    }
                },

                y:{
                    title:{
                        display:true,
                        text:"รายวิชา"
                    }
                }
            },

            plugins:{
                legend:{
                    display:false
                },

                tooltip:{
                    callbacks:{
                        label:context=>
                            ` ${context.parsed.x.toFixed(1)}%`
                    }
                }
            }
        }
    });
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