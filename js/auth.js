document.addEventListener("DOMContentLoaded", async () => {
    try {
        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (session) {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error(err);
    }
});

const form = document.getElementById("login-form");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            alert(error.message);
            return;
        }

        window.location.href = "index.html";
    });
}