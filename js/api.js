const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwBUSwf2nuTYLFwFRg9wz3yoGPt58HveCupammbzWT-LszDGMApnubmDE4d1fCLRHDbtA/exec";
const SECRET_TOKEN = "Kruyanisa_Secret_12345";

async function fetchFromAPI(action, data = {}) {
  try {
    let url = WEB_APP_URL;
    let options = {};

    if (action === 'getInitialData') {
      url += `?action=${action}&token=${SECRET_TOKEN}`;
      options = { method: 'GET' };
    } else {
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: SECRET_TOKEN, action: action, ...data }),
        redirect: 'follow'
      };
    }

    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    throw error;
  }
}
