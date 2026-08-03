// ใส่ URL Web App ที่ได้จาก Google Apps Script
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwBUSwf2nuTYLFwFRg9wz3yoGPt58HveCupammbzWT-LszDGMApnubmDE4d1fCLRHDbtA/exec";
const SECRET_TOKEN = "Kruyanisa_Secret_12345";

// ฟังก์ชันหลักสำหรับส่งข้อมูลไปที่หลังบ้าน
async function fetchFromAPI(action, data = {}) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ token: SECRET_TOKEN, action: action, ...data }) 
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Error:", error);
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    throw error;
  }
}
