let qrStudents = [];

// โหลดรายชื่อตามห้อง
async function loadQRStudents(){
    const roomId=document.getElementById("qr-room-filter").value;
    const studentDropdown=document.getElementById("qr-student-filter");
    studentDropdown.innerHTML='<option value="ALL">ทั้งหมด (All)</option>';
    if(!roomId) return;
    qrStudents=await getStudentsByRoom(roomId);
    qrStudents.forEach(student=>{
        const option=document.createElement("option");
        option.value=student.id;
        option.textContent=`${student.student_code ?? ""} - ${student.prefix ?? ""}${student.first_name ?? ""} ${student.last_name ?? ""}`;
        studentDropdown.appendChild(option);
    });

}

// สร้าง QR Code
// แทนที่ฟังก์ชัน generateQR เดิมใน qr.js
function generateQR() {
    const roomName = document.getElementById("qr-room-filter").selectedOptions[0].text;
    const selected = document.getElementById("qr-student-filter").value;

    let students = qrStudents;
    if (selected !== "ALL") {
        students = qrStudents.filter(s => s.id === selected);
    }

    document.getElementById("qr-title").textContent = `สร้าง QR Code ประจำตัว ${roomName} (${students.length} คน)`;

    const container = document.getElementById("qr-container");
    container.innerHTML = "";

    const ITEMS_PER_PAGE = 12;

    for (let i = 0; i < students.length; i += ITEMS_PER_PAGE) {
        const chunk = students.slice(i, i + ITEMS_PER_PAGE);
        
        const page = document.createElement("div");
        page.className = "print-page";
        
        chunk.forEach((student) => {
            const card = document.createElement("div");
            card.className = "qr-card";
            card.innerHTML = `
                <div class="qr-box" id="qr-${student.id}"></div>
                <div class="student-code">${student.student_code}</div>
                <div class="student-name">${student.prefix ?? ""}${student.first_name} ${student.last_name}</div>
            `;
            page.appendChild(card);
        });

        container.appendChild(page);

        // สร้าง QR Code หลังจากที่ Element ถูกเพิ่มลงใน DOM แล้ว
        chunk.forEach((student) => {
            new QRCode(document.getElementById(`qr-${student.id}`), {
                text: `SMS|${student.id}`,
                width: 170,
                height: 170,
                correctLevel: QRCode.CorrectLevel.H
            });
        });
    }

    document.getElementById("print-btn").style.display = "inline-block";
}