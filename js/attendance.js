let allStudents = [];
let displayedStudents = [];

// โหลดข้อมูลจาก Google Sheets อัตโนมัติเมื่อเปิดหน้าเว็บ
async function initSystem() {
  try {
    const res = await fetchFromAPI('getInitialData');
    if (res.success) {
      allStudents = res.data.students;
      const subjects = res.data.subjects;
      
      const roomFilter = document.getElementById('room-filter');
      roomFilter.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
      const rooms = [...new Set(allStudents.slice(1).map(r => r[3]))].filter(r => r);
      rooms.forEach(room => roomFilter.innerHTML += `<option value="${room}">${room}</option>`);

      const subjDropdown = document.getElementById('subject-dropdown');
      subjDropdown.innerHTML = '<option value="">-- เลือกวิชา --</option>';
      subjects.slice(1).forEach(row => {
        if(row[0] && row[1]) subjDropdown.innerHTML += `<option value="${row[0]}|${row[1]}">${row[0]} - ${row[1]}</option>`;
      });

      document.getElementById('load-btn').disabled = false;
    }
  } catch (err) {
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', 'error');
  }
}

// ฟังก์ชันกดปุ่มโหลดรายชื่อเข้าตาราง
function filterAndLoad() {
  const room = document.getElementById('room-filter').value;
  const subj = document.getElementById('subject-dropdown').value;
  if (!room || !subj) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกห้องและวิชาก่อนโหลดครับ', 'warning');

  displayedStudents = allStudents.filter(r => r[3] === room);
  const tbody = document.getElementById('student-body');
  tbody.innerHTML = '';
  
  displayedStudents.forEach((row, i) => {
    let statsStr = `มา:${row[4] || 0} | สาย:${row[5] || 0} | ป่วย:${row[6] || 0} | กิจ:${row[7] || 0} | ขาด:${row[8] || 0}`;
    tbody.innerHTML += `
      <tr id="row-${i}">
        <td><b>${row[0]}</b></td>
        <td>${row[1]}</td>
        <td><b>${row[2]}</b></td>
        <td><span class="stats">${statsStr}</span></td>
        <td class="alert-text">${row[9] || 0} ครั้ง</td>
        <td>
          <select id="status-${i}" style="padding: 5px; border-radius: 5px;">
            <option value="มา">มา</option><option value="สาย">สาย</option>
            <option value="ลาป่วย">ลาป่วย</option><option value="ลากิจ">ลากิจ</option>
            <option value="ขาด">ขาด</option>
          </select>
        </td>
        <td><button class="btn-alert" disabled>🔔 Alert</button></td>
      </tr>`;
  });

  document.getElementById('student-table').style.display = 'table';
  document.getElementById('save-btn').style.display = 'block';
  document.getElementById('scan-btn').style.display = 'inline-block';
}

// ฟังก์ชันบันทึกข้อมูลส่งกลับไปหลังบ้าน
async function submitAttendance() {
  const subjVal = document.getElementById('subject-dropdown').value.split('|');
  const records = displayedStudents.map((row, i) => ({
    no: row[0], id: row[1], name: row[2], room: row[3],
    status: document.getElementById(`status-${i}`).value
  }));

  Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  
  const res = await fetchFromAPI('saveAttendance', { records, subjectCode: subjVal[0], subjectName: subjVal[1] });
  
  if(res.success) {
    Swal.fire('สำเร็จ!', 'บันทึกการเช็คชื่อเข้าสู่ Google Sheets เรียบร้อย 🎉', 'success');
    displayedStudents.forEach((_, i) => document.getElementById(`row-${i}`).style.backgroundColor = "");
  } else {
    Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
  }
}
