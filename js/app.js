// ฟังก์ชันสลับหน้าจอ และไฮไลต์เมนูที่เลือก
function switchView(view) {
  const views = ['attendance', 'homework', 'qrcode', 'guidance', 'study', 'scholarship', 'pdf', 'settings'];
  
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
     if(view === "settings"){
    showSetting("profile");
    loadProfile();
}
  
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
function showSetting(page) {

    // ซ่อนทุกหน้า
    document.querySelectorAll(".setting-page").forEach(p => {
        p.style.display = "none";
    });

    // ลบ active ทุกปุ่ม
    document.querySelectorAll(".setting-item").forEach(btn => {
        btn.classList.remove("active");
    });

    // แสดงหน้าที่เลือก
    document.getElementById("setting-" + page).style.display = "block";

    // เติม active ให้ปุ่มที่กด
    document.querySelector(`[onclick="showSetting('${page}')"]`).classList.add("active");

}