// Helper goi API + quan ly token dang nhap (luu trong localStorage)

const Api = (() => {
  function studentToken() { return localStorage.getItem("student_token"); }
  function studentUsername() { return localStorage.getItem("student_username"); }
  function adminToken() { return localStorage.getItem("admin_token"); }
  function adminUsername() { return localStorage.getItem("admin_username"); }

  function setStudentSession(token, username) {
    localStorage.setItem("student_token", token);
    localStorage.setItem("student_username", username);
  }
  function clearStudentSession() {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_username");
  }
  function setAdminSession(token, username) {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_username", username);
  }
  function clearAdminSession() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
  }

  async function call(path, { method = "GET", body, token } = {}) {
    const headers = { "Content-Type": "application/json" };
    const t = token || studentToken() || adminToken();
    if (t) headers.Authorization = `Bearer ${t}`;

    const res = await fetch(`/api/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Loi ${res.status}`);
    return data;
  }

  return {
    call,
    studentToken, studentUsername, setStudentSession, clearStudentSession,
    adminToken, adminUsername, setAdminSession, clearAdminSession,
  };
})();
