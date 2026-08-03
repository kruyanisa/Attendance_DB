// ฟังก์ชันสลับหน้าจอ และไฮไลต์เมนูที่เลือก
function switchView(view) {
  const views = ['attendance', 'homework', 'qrcode', 'guidance', 'study', 'scholarship', 'pdf'];
  
  views.forEach(v => {
    // ซ่อน/แสดง เนื้อหา
    const viewElement = document.getElementById(`view-${v}`);
    if(viewElement) {
      viewElement.style.display = (v === view) ? 'block' : 'none';
    }
    
    // เติม/ลบ แถบ Active ที่เมนู
    const menuBtn = document.getElementById(`menu-${v}`);
    if (menuBtn) {
      if (v === view) menuBtn.classList.add('active');
      else menuBtn.classList.remove('active');
    }
  });
}

function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('theme-toggle');
  
  // สลับ class dark-mode ที่ body
  body.classList.toggle('dark-mode');
  
  // เปลี่ยนข้อความและไอคอนบนปุ่ม
  if (body.classList.contains('dark-mode')) {
    btn.innerHTML = '☀️ Light Mode';
  } else {
    btn.innerHTML = '🌙 Dark Mode';
  }
}
