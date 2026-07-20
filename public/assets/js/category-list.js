// Dung chung cho 3 trang category-reading/writing/thpt.html
async function loadCategoryExams(category, examHrefFn) {
  const listEl = document.getElementById("exam-list");
  try {
    const { exams } = await Api.call("get-exams");
    const items = exams.filter((e) => e.category === category);
    if (items.length === 0) {
      listEl.innerHTML = `<p class="muted">Chưa có đề nào.</p>`;
      return;
    }
    listEl.innerHTML = items.map((e) => {
      const time = e.timeLimitMinutes ? `${e.timeLimitMinutes} phút` : "Không giới hạn";
      return `
        <a class="exam-card" href="${examHrefFn(e)}">
          <div>
            <div class="title">${e.title}</div>
            <div class="meta">${time}</div>
          </div>
          <span class="badge">${e.category}</span>
        </a>`;
    }).join("");
  } catch (err) {
    listEl.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}
