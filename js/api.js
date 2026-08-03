const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwBUSwf2nuTYLFwFRg9wz3yoGPt58HveCupammbzWT-LszDGMApnubmDE4d1fCLRHDbtA/exec";
const SECRET_TOKEN = "Kruyanisa_Secret_12345";

async function fetchFromAPI(action, data = {}, retries = 1) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: SECRET_TOKEN, action: action, ...data })
    });

    // Apps Script sometimes serves a Google HTML error page (404/redirect hiccup)
    // instead of JSON. response.ok / status alone won't catch this reliably,
    // so we try to parse and treat a parse failure as a transient error.
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new Error("Non-JSON response (likely a transient Apps Script redirect issue): " + text.slice(0, 100));
    }

  } catch (error) {
    if (retries > 0) {
      // Wait briefly, then retry once before giving up.
      await new Promise(res => setTimeout(res, 800));
      return fetchFromAPI(action, data, retries - 1);
    }
    console.error("API Error:", error);
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งครับ', 'error');
    throw error;
  }
}
