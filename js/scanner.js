let html5QrcodeScanner; 

// -----------------------------------------
// 1. ระบบสำหรับ "ปืนยิงบาร์โค้ด" (USB Scanner)
// -----------------------------------------
let barcodeBuffer = '';
let barcodeTimer = null;

// ดักจับการกดแป้นพิมพ์ (ปืนยิงบาร์โค้ดจะทำงานเหมือนคนพิมพ์คีย์บอร์ดไวๆ)
document.addEventListener('keydown', function(e) {
  // ถ้าระบบเช็คชื่อไม่ได้เปิดอยู่ หรือยังไม่โหลดรายชื่อ ให้ข้ามไป
  if (document.getElementById('view-attendance').style.display === 'none' || displayedStudents.length === 0) return;
  
  // ถ้ากด Enter (ปืนยิงมักจะจบท้ายด้วย Enter เสมอ)
  if (e.key === 'Enter' && barcodeBuffer.length > 0) {
    processScannedCode(barcodeBuffer);
    barcodeBuffer = ''; 
  } else {
    // เก็บตัวอักษรที่พิมพ์เข้ามา
    if(e.key.length === 1) barcodeBuffer += e.key;
    
    // เคลียร์ค่าทิ้งถ้าทิ้งช่วงนานเกินไป (ป้องกันคนพิมพ์ปกติ)
    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 100); 
  }
});

// -----------------------------------------
// 2. ระบบสำหรับ "กล้องมือถือ/iPad" 
// -----------------------------------------
function openScanner() {
  document.getElementById('reader').style.display = 'block';
  document.getElementById('close-scan-btn').style.display = 'inline-block';
  
  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }
}

function closeScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().then(() => { html5QrcodeScanner = null; });
  }
  document.getElementById('reader').style.display = 'none';
  document.getElementById('close-scan-btn').style.display = 'none';
}

function onScanSuccess(decodedText, decodedResult) {
  processScannedCode(decodedText);
}

function onScanFailure(error) {
  // ไม่ต้องทำอะไร ปล่อยกล้องหาสแกนต่อไป
}

// -----------------------------------------
// 3. ตัวประมวลผลเมื่อได้รหัส (ใช้ร่วมกันทั้งกล้องและปืนยิง)
// -----------------------------------------
function processScannedCode(scannedId) {
  let studentIndex = displayedStudents.findIndex(s => s[1] == scannedId);
  
  if (studentIndex !== -1) {
    const statusSelect = document.getElementById(`status-${studentIndex}`);
    if(statusSelect) statusSelect.value = "มา";
    
    document.getElementById(`row-${studentIndex}`).style.backgroundColor = "#d4edda";
    Swal.fire({ icon: 'success', title: 'เช็คชื่อสำเร็จ', text: `รหัส: ${scannedId}`, timer: 1500, showConfirmButton: false });
  } else {
    Swal.fire({ icon: 'error', title: 'ไม่พบรหัสนักเรียน', text: `รหัส: ${scannedId} ไม่อยู่ในห้องนี้`, timer: 1500, showConfirmButton: false });
  }
}
