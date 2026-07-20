function adminGuard() {
  if (!Api.adminToken()) {
    location.href = "/admin/login.html";
    return false;
  }
  return true;
}

function renderAdminNav(active) {
  const nav = document.getElementById("admin-nav");
  if (!nav) return;
  const links = [
    ["/index.html", "Danh sách đề"],
    ["/admin/dashboard.html", "Dashboard"],
    ["/admin/grade.html", "Chấm Writing"],
    ["/admin/students.html", "Học sinh"],
    ["/admin/performance.html", "Hiệu suất"],
    ["/admin/report.html", "Report"],
  ];
  nav.innerHTML = links.map(([href, label]) =>
    `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`
  ).join("") + `<a href="#" id="admin-logout">Đăng xuất</a>`;
  document.getElementById("admin-logout").addEventListener("click", (e) => {
    e.preventDefault();
    Api.clearAdminSession();
    location.href = "/admin/login.html";
  });
}
