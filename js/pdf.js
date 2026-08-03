// โครงสร้างรอทำระบบ Export PDF
function generatePDFReport() {
  Swal.fire({
    title: 'กำลังพัฒนา 🚧',
    text: 'ระบบดาวน์โหลดรายงาน PDF จะพร้อมใช้งานเร็วๆ นี้ครับ',
    icon: 'info'
  });
}

// ผูกปุ่มเมนู PDF ให้เรียกฟังก์ชันนี้เมื่อคลิก
document.getElementById('menu-pdf').addEventListener('click', () => {
    generatePDFReport();
});
