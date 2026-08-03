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
