document.addEventListener("DOMContentLoaded", async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Session check failed:", error);
        window.location.href = "login.html";
    }
});