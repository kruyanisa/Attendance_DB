// -----------------------------------------
// 1. ระบบสำหรับ "ปืนยิงบาร์โค้ด" (USB Scanner)
// -----------------------------------------
let lastScannedId = "";
let scanTimeout;
let barcodeBuffer = "";
let barcodeTimer = null;
let html5QrcodeScanner;


const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 1500,
  customClass: {
    container: "swal-on-top"
  }
});

// ดักจับการกดแป้นพิมพ์ (ปืนยิงบาร์โค้ดจะทำงานเหมือนคนพิมพ์คีย์บอร์ดไวๆ)
document.addEventListener('keydown', function(e) {
  // ถ้าระบบเช็คชื่อไม่ได้เปิดอยู่ หรือยังไม่โหลดรายชื่อ ให้ข้ามไป
  if (document.getElementById('view-attendance').style.display === 'none' || displayedStudents.length === 0) return;
  
  // ถ้ากด Enter (ปืนยิงมักจะจบท้ายด้วย Enter เสมอ)
if (e.key === 'Enter' && /[ก-๙]/.test(barcodeBuffer)) {

    e.preventDefault();
    e.stopPropagation();

    barcodeBuffer = "";

    Swal.fire({
        icon: "warning",
        title: "⌨️ ภาษาแป้นพิมพ์ไม่ถูกต้อง",
        text: "กรุณาเปลี่ยน Keyboard เป็น English (EN) แล้วสแกนใหม่",
        confirmButtonText: "ตกลง"
    });

    return;
}

if (e.key === 'Enter' && barcodeBuffer.length > 0) {

    e.preventDefault();
    e.stopPropagation();

    processScannedCode(barcodeBuffer);

    barcodeBuffer = '';

    return;
}
   else {
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
  document.getElementById('qr-popup').style.display = 'flex';
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
  document.getElementById('qr-popup').style.display = 'none';
  document.getElementById('reader').style.display = 'none';
  document.getElementById('close-scan-btn').style.display = 'none';
}

function onScanSuccess(decodedText, decodedResult){processScannedCode(decodedText);}

function onScanFailure(error) {
  // ไม่ต้องทำอะไร ปล่อยกล้องหาสแกนต่อไป
}

// -----------------------------------------
// 3. ตัวประมวลผลเมื่อได้รหัส (ใช้ร่วมกันทั้งกล้องและปืนยิง)
// -----------------------------------------
function processScannedCode(scannedId){

    // ----------------------------
    // กันสแกนซ้ำ
    // ----------------------------
    if(scannedId === lastScannedId) return;

    lastScannedId = scannedId;

    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(()=>{
        lastScannedId = "";
    },3000);

    // ----------------------------
    // แปลง QR
    // ----------------------------
    const uuid = scannedId.replace("SMS|","");

    const studentIndex = displayedStudents.findIndex(s => (s.studentId || s.id) === uuid
);

    // ----------------------------
    // ไม่พบในห้อง
    // ----------------------------
    if (studentIndex === -1) {

    closeScanner();

    Swal.fire({
        icon: "error",
        title: "❌ ไม่สามารถเช็กชื่อได้",
        text: "นักเรียนคนนี้ไม่ได้อยู่ในห้องที่เลือก",
        confirmButtonText: "ตกลง"
    });

    return;
}

    // ----------------------------
    // พบ
    // ----------------------------

    const statusSelect = document.getElementById(`status-${studentIndex}`);
    const row = document.getElementById(`row-${studentIndex}`);
    const isWaiting = statusSelect.value === "รอเช็ค";

    // เปลี่ยนเฉพาะคนที่ยังรอเช็ก
    if(statusSelect.value === "รอเช็ค"){
        statusSelect.value = "มา";
    }

    updateSummaryCards();
// ตรวจสอบว่าเช็กชื่อครบหรือยัง

    // Highlight
    row.style.backgroundColor="#d4edda";
    row.classList.remove("scanner-highlight");
    void row.offsetWidth;
    row.classList.add("scanner-highlight");

    // Scroll ไปหาแถว
    row.scrollIntoView({
        behavior:"smooth",
        block:"center"
    });

    // Toast
   Toast.fire({
    icon: "success",
    title: `${displayedStudents[studentIndex].student_code}<br>${displayedStudents[studentIndex].first_name} ${displayedStudents[studentIndex].last_name}`
});

// ตรวจสอบว่ายังมี "รอเช็ค" เหลือหรือไม่
const pending = [...document.querySelectorAll("[id^='status-']")]
    .filter(x => x.value === "รอเช็ค").length;

if (pending === 0) {

    setTimeout(() => {

        Swal.fire({
            icon: "success",
            title: "🎉 เช็กชื่อครบแล้ว",
            text: 'กรุณาตรวจสอบข้อมูล แล้วกด "บันทึกข้อมูล"',
            confirmButtonText: "ตกลง"
        });

    }, 300);

}

}
