// Cap nhat thanh nav theo trang thai dang nhap (hoc sinh hoac admin)
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("nav-links");
  if (!nav) return;
  const username = Api.studentUsername();
  const adminUsername = Api.adminUsername();

  if (username) {
    const initial = username.charAt(0).toUpperCase();
    nav.innerHTML = `
      <a href="/index.html">Đề thi</a>
      <a href="/profile.html" class="profile-icon" title="${username}">${initial}</a>
    `;
  } else if (adminUsername) {
    nav.innerHTML = `
      <a href="/index.html">Đề thi</a>
      <a href="/profile.html">Lịch sử làm bài</a>
      <a href="/admin/dashboard.html">Admin: ${adminUsername}</a>
    `;
  } else {
    nav.innerHTML = `
      <a href="/index.html">Đề thi</a>
      <a href="/auth.html">Đăng nhập / Đăng ký</a>
    `;
  }
});
