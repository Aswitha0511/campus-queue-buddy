const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { services: [], queue: [], view: "overview" };
const serviceSymbols = ["▤", "◷", "⌂", "⌁"];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatTime = date => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed. Please try again.");
  return data;
}
function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  $("#toastRegion").appendChild(item);
  setTimeout(() => item.remove(), 3500);
}
function emptyState(title, message) {
  return `<div class="empty-state"><b>${escapeHtml(title)}</b><p>${escapeHtml(message)}</p></div>`;
}
function setView(view) {
  state.view = view;
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}View`));
  const names = { overview: ["OVERVIEW", "Good afternoon, student ✦", "Here's what's happening around your campus today."], queues: ["LIVE QUEUES", "Live queue board", "See who is waiting and what's being served."], services: ["SERVICES", "Service directory", "Manage the service points available around campus."] };
  $("#breadcrumb").textContent = names[view][0];
  $("#pageTitle").textContent = names[view][1];
  $("#pageSubtitle").textContent = names[view][2];
  if (view === "queues") loadQueue();
  if (view === "services") loadServices();
}
function serviceIcon(index) {
  return `<span class="service-icon s${index % 4}">${serviceSymbols[index % 4]}</span>`;
}
function renderStats(data) {
  $("#statServices").textContent = data.services;
  $("#statWaiting").textContent = data.waiting;
  $("#statCompleted").textContent = data.completedToday;
  $("#statWait").textContent = data.averageWait;
  $("#navQueueCount").textContent = data.waiting + data.serving;
}
function renderFeaturedServices() {
  const list = $("#serviceCards");
  const visible = state.services.filter(service => service.isOpen).slice(0, 4);
  if (!visible.length) {
    list.innerHTML = emptyState("No open services", "Check the service directory for updates.");
    return;
  }
  list.innerHTML = visible.map(service => {
    const index = state.services.findIndex(s => s._id === service._id);
    return `<div class="service-row">
      ${serviceIcon(index)}
      <div class="service-info"><b>${escapeHtml(service.name)}</b><small>${escapeHtml(service.location)}</small></div>
      <div class="service-meta"><b>${service.estimatedWait} min</b><small>estimated wait</small></div>
      <button class="join-mini" data-join="${service._id}">Join +</button>
    </div>`;
  }).join("");
  list.querySelectorAll("[data-join]").forEach(button => button.addEventListener("click", () => openJoinDialog(button.dataset.join)));
}
function renderDirectory() {
  const root = $("#serviceDirectory");
  if (!state.services.length) {
    root.innerHTML = emptyState("No services yet", "Add a campus service to get started.");
    return;
  }
  root.innerHTML = state.services.map((service, index) => `
    <article class="directory-card">
      <div class="directory-top">${serviceIcon(index)}<div class="directory-title"><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.location)}</p></div><span class="open-badge ${service.isOpen ? "" : "closed"}">${service.isOpen ? "● Open" : "● Closed"}</span></div>
      <div class="directory-stats">
        <div><span>Waiting</span><b>${service.waiting}</b></div>
        <div><span>Est. wait</span><b>${service.estimatedWait}<small>m</small></b></div>
        <div><span>Service time</span><b>${service.averageServiceMinutes}<small>m</small></b></div>
      </div>
      <div class="directory-actions">
        <button class="btn btn-primary" data-join="${service._id}" ${service.isOpen ? "" : "disabled"}>Join queue ↗</button>
        <button class="btn btn-outline" data-edit="${service._id}">Edit</button>
        <button class="btn btn-quiet" data-toggle="${service._id}">${service.isOpen ? "Close" : "Open"}</button>
        <button class="btn btn-danger" data-delete="${service._id}">Delete</button>
      </div>
    </article>`).join("");
  root.querySelectorAll("[data-join]").forEach(b => b.addEventListener("click", () => openJoinDialog(b.dataset.join)));
  root.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openServiceDialog(b.dataset.edit)));
  root.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleService(b.dataset.toggle)));
  root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteService(b.dataset.delete)));
}
function updateServiceOptions(preselect) {
  const openServices = state.services.filter(s => s.isOpen);
  $("#joinService").innerHTML = openServices.length
    ? openServices.map(s => `<option value="${s._id}" ${s._id === preselect ? "selected" : ""}>${escapeHtml(s.name)} — ${escapeHtml(s.location)}</option>`).join("")
    : `<option value="">No open services available</option>`;
}
function openJoinDialog(serviceId) {
  updateServiceOptions(serviceId);
  if (!state.services.some(s => s.isOpen)) return toast("There are no open services right now.", "error");
  $("#joinDialog").showModal();
  $("#studentName").focus();
}
function openServiceDialog(id) {
  const service = state.services.find(s => s._id === id);
  $("#serviceForm").reset();
  $("#serviceId").value = service?._id || "";
  $("#serviceDialogTitle").textContent = service ? "Edit service" : "Add a service";
  $("#serviceName").value = service?.name || "";
  $("#serviceLocation").value = service?.location || "";
  $("#serviceMinutes").value = service?.averageServiceMinutes || 3;
  $("#serviceDialog").showModal();
}
function statusLabel(status) {
  const labels = { waiting: "Waiting", serving: "Now serving", completed: "Completed", cancelled: "Cancelled" };
  return `<span class="status-pill status-${status}">${labels[status] || status}</span>`;
}
function renderQueue() {
  const filter = $("#queueFilter").value;
  const query = $("#queueSearch").value.toLowerCase().trim();
  let entries = state.queue;
  if (filter === "active") entries = entries.filter(e => ["waiting", "serving"].includes(e.status));
  else if (filter !== "all") entries = entries.filter(e => e.status === filter);
  entries = entries.filter(e => `${e.studentName} ${e.service?.name || ""} ${e.ticketNumber}`.toLowerCase().includes(query));
  const root = $("#queueTable");
  if (!entries.length) {
    root.innerHTML = `<tr><td colspan="7">${emptyState("Nothing to show", "Try another filter or join a campus queue.")}</td></tr>`;
    return;
  }
  root.innerHTML = entries.map(entry => {
    const position = entry.status === "serving" ? "Now serving" : entry.status === "waiting" ? `#${entry.position || "—"}` : "—";
    const wait = entry.status === "waiting" ? `${entry.estimatedWait || 0} min` : entry.status === "serving" ? "Your turn" : "—";
    const actions = ["waiting", "serving"].includes(entry.status)
      ? `<select class="action-select" data-status="${entry._id}" aria-label="Change status"><option value="">Update…</option><option value="serving">Now serving</option><option value="completed">Complete</option><option value="cancelled">Cancel ticket</option></select>`
      : `<button class="text-button" data-remove="${entry._id}">Remove</button>`;
    return `<tr><td><span class="ticket-pill">#${String(entry.ticketNumber).padStart(3, "0")}</span></td><td class="student-cell">${escapeHtml(entry.studentName)}</td><td>${escapeHtml(entry.service?.name || "Service removed")}</td><td>${position}</td><td>${wait}</td><td>${statusLabel(entry.status)}</td><td>${actions}</td></tr>`;
  }).join("");
  root.querySelectorAll("[data-status]").forEach(select => select.addEventListener("change", async () => {
    if (!select.value) return;
    try {
      await api(`/api/queue/${select.dataset.status}/status`, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
      toast("Queue status updated.");
      await refreshAll();
    } catch (error) { toast(error.message, "error"); }
  }));
  root.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("Remove this ticket from queue history?")) return;
    try { await api(`/api/queue/${button.dataset.remove}`, { method: "DELETE" }); toast("Ticket removed."); await refreshAll(); }
    catch (error) { toast(error.message, "error"); }
  }));
}
async function loadServices() {
  try {
    state.services = await api("/api/services");
    renderFeaturedServices();
    renderDirectory();
    updateServiceOptions($("#joinService").value);
  } catch (error) { toast(error.message, "error"); }
}
async function loadQueue() {
  try {
    state.queue = await api("/api/queue");
    renderQueue();
  } catch (error) { toast(error.message, "error"); }
}
async function refreshAll() {
  try {
    const [stats, services, queue] = await Promise.all([api("/api/dashboard"), api("/api/services"), api("/api/queue")]);
    renderStats(stats);
    state.services = services;
    state.queue = queue;
    renderFeaturedServices();
    renderDirectory();
    updateServiceOptions($("#joinService").value);
    renderQueue();
  } catch (error) { toast(error.message, "error"); }
}
async function toggleService(id) {
  const service = state.services.find(s => s._id === id);
  try {
    await api(`/api/services/${id}`, { method: "PATCH", body: JSON.stringify({ isOpen: !service.isOpen }) });
    toast(`Service ${service.isOpen ? "closed" : "opened"}.`);
    await refreshAll();
  } catch (error) { toast(error.message, "error"); }
}
async function deleteService(id) {
  const service = state.services.find(s => s._id === id);
  if (!confirm(`Delete "${service.name}"? Active tickets for this service will also be removed.`)) return;
  try {
    await api(`/api/services/${id}`, { method: "DELETE" });
    toast("Service deleted.");
    await refreshAll();
  } catch (error) { toast(error.message, "error"); }
}

$$(".nav-link").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-goto]").forEach(button => button.addEventListener("click", () => setView(button.dataset.goto)));
$("#findQueueBtn").addEventListener("click", () => setView("services"));
$("#joinQueueTop").addEventListener("click", () => openJoinDialog());
$("#addServiceBtn").addEventListener("click", () => openServiceDialog());
$("#queueFilter").addEventListener("change", renderQueue);
$("#queueSearch").addEventListener("input", renderQueue);
$$("[data-close]").forEach(button => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));

$("#joinForm").addEventListener("submit", async event => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const entry = await api("/api/queue", { method: "POST", body: JSON.stringify({ studentName: $("#studentName").value, serviceId: $("#joinService").value }) });
    $("#joinDialog").close();
    $("#joinForm").reset();
    toast(`Ticket #${String(entry.ticketNumber).padStart(3, "0")} created for ${entry.service.name}!`);
    await refreshAll();
    setView("queues");
    $("#queueFilter").value = "active";
    renderQueue();
  } catch (error) { toast(error.message, "error"); }
  finally { submit.disabled = false; }
});

$("#serviceForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = $("#serviceId").value;
  const body = { name: $("#serviceName").value.trim(), location: $("#serviceLocation").value.trim(), averageServiceMinutes: Number($("#serviceMinutes").value) };
  try {
    await api(id ? `/api/services/${id}` : "/api/services", { method: id ? "PATCH" : "POST", body: JSON.stringify(body) });
    $("#serviceDialog").close();
    toast(id ? "Service updated." : "Service added.");
    await refreshAll();
    setView("services");
  } catch (error) { toast(error.message, "error"); }
});

$("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
refreshAll();
setInterval(refreshAll, 15000);
