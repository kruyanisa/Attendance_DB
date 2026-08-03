const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwBUSwf2nuTYLFwFRg9wz3yoGPt58HveCupammbzWT-LszDGMApnubmDE4d1fCLRHDbtA/exec";
const SECRET_TOKEN = "Kruyanisa_Secret_12345";

async function fetchFromAPI(action, data = {}, retries = 2) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: SECRET_TOKEN, action: action, ...data })
    });
    
    const text = await response.text();
    return JSON.parse(text);
    
  } catch (error) {
    if (retries > 0) {
      console.warn("Google ค้าง... กำลังลองดึงข้อมูลใหม่");
      await new Promise(res => setTimeout(res, 1000)); // หน่วงเวลา 1 วินาทีแล้วยิงซ้ำ
      return fetchFromAPI(action, data, retries - 1);
    }
    
    console.error("API Error:", error);
    Swal.fire('ข้อผิดพลาด', 'ดึงข้อมูลจาก Google ไม่สำเร็จครับ', 'error');
    throw error;
  }
}
