// ฟังก์ชันดึงรายชื่อเด็กมาใส่ Dropdown ตอนเลือกห้อง
function loadQRStudents() {
  const room = document.getElementById("qr-room-filter").value;
  const studentDropdown = document.getElementById("qr-student-filter");
  studentDropdown.innerHTML = '<option value="ALL">ทั้งหมด (All)</option>';
  if (!room) return;
  
  const students = allStudents.filter(r => r[3] === room);
  students.forEach(row => {
      studentDropdown.innerHTML += `<option value="${row[1]}">${row[2]}</option>`;
  });
}

// ฟังก์ชันสร้าง QR Code
function generateQR() {
  const room = document.getElementById('qr-room-filter').value;
  if (!room) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกห้องเรียนก่อนครับ', 'warning');
  
  const selectedStudent = document.getElementById("qr-student-filter").value;
  let students = allStudents.filter(r => r[3] === room);
  if(selectedStudent !== "ALL") { 
    students = students.filter(r => r[1] == selectedStudent); 
  }
  
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  
  // URL โลโก้โรงเรียน (เปลี่ยนเป็นลิงก์โลโก้จริงของโรงเรียนภรรยาได้เลยครับ)
  const logoUrl = encodeURIComponent('https://cdn-icons-png.flaticon.com/512/3553/3553140.png'); 

  students.forEach(row => {
    // ใช้ API สร้าง QR แบบใส่โลโก้ตรงกลาง
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(row[1])}&size=200&margin=0&centerImageUrl=${logoUrl}`; 
    
    container.innerHTML += `
      <div class="qr-card" style="width: 2in; height: 2.5in; padding: 5px; margin: 10px; background: white; border: 2px dashed #ccc; border-radius: 10px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box;">
        <img src="${qrUrl}" alt="QR Code" style="width: 100%; max-height: 1.8in; object-fit: contain; margin-bottom: 5px;">
        <div class="name" style="font-weight: bold; font-size: 12px; color: #333; margin-bottom: 2px; line-height: 1.1;">${row[2]}</div>
        <div class="id" style="font-size: 10px; color: #777;">รหัส: ${row[1]}</div>
      </div>`;
  });
  
  document.getElementById('print-btn').style.display = 'inline-block';
}
