const API_URL = 'https://dosavilas.netlify.app/.netlify/functions';
const ADMIN_TOKEN = 'dosa-vilas-secret-123';
let currentFilter = 'all';

// Login check
function doLogin(e) {
  e.preventDefault();
  const u = document.getElementById("admin-user").value;
  const p = document.getElementById("admin-pass").value;
  
  // Simple check - in production use hashed password
  if (u === "admin" && p === "admin123") {
    sessionStorage.setItem("dv_admin", "1");
    showDashboard();
  } else {
    document.getElementById("login-err").style.display = "block";
  }
  return false;
}

function logout() {
  sessionStorage.removeItem("dv_admin");
  location.reload();
}

function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  loadOrders();
  setInterval(loadOrders, 10000); // Refresh every 10 seconds
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_URL}/get-orders`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    
    if (response.status === 401) {
      alert('Session expired. Please login again.');
      logout();
      return;
    }
    
    const orders = await response.json();
    updateStats(orders);
    renderOrders(orders);
  } catch (err) {
    console.error('Failed to load orders:', err);
    document.getElementById('orders-list').innerHTML = 
      '<p style="text-align:center;color:#dc2626;padding:3rem;">Failed to load orders. Check your connection.</p>';
  }
}

function updateStats(orders) {
  const today = new Date().toDateString();
  document.getElementById("stat-new").textContent = orders.filter(o => o.status === "new").length;
  document.getElementById("stat-prep").textContent = orders.filter(o => o.status === "preparing").length;
  document.getElementById("stat-ready").textContent = orders.filter(o => o.status === "ready").length;
  document.getElementById("stat-total").textContent = orders.filter(o => new Date(o.timestamp).toDateString() === today).length;
}

function filter(status) {
  currentFilter = status;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.style.background = "#e0e0e0";
    btn.style.color = "black";
  });
  event.target.style.background = "#027a31";
  event.target.style.color = "white";
  loadOrders();
}

function renderOrders(orders) {
  const container = document.getElementById("orders-list");
  let filtered = orders;
  if (currentFilter !== "all") {
    filtered = orders.filter(o => o.status === currentFilter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;padding:3rem;">No orders found</p>';
    return;
  }
  
  container.innerHTML = filtered.map(order => {
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const gst = total * 0.15;
    const grand = total + gst;
    
    return `
      <div class="order-card status-${order.status}">
        <div style="display:flex;justify-content:space-between;margin-bottom:1rem;">
          <div>
            <strong style="color:#027a31;">${order.id}</strong>
            <div style="font-size:0.85rem;color:#666;">${new Date(order.timestamp).toLocaleString()}</div>
          </div>
          <span style="background:${getStatusColor(order.status)};color:white;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.8rem;text-transform:uppercase;">${order.status}</span>
        </div>
        <div style="background:#f6f7fb;padding:1rem;border-radius:8px;margin-bottom:1rem;">
          <strong>${order.customer.name}</strong> • Table: ${order.customer.table}<br>
          <span style="color:#666;">${order.customer.location === "dominion" ? "Dominion Road" : "Stoddard Road"}</span>
        </div>
        <div style="margin-bottom:1rem;">
          ${order.items.map(item => `
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #eee;">
              <span>${item.title} x${item.quantity}</span>
              <span style="font-weight:600;">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join("")}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:1rem;border-top:2px solid #eee;">
          <div style="font-size:1.2rem;font-weight:700;color:#027a31;">Total: $${grand.toFixed(2)}</div>
          <div style="display:flex;gap:0.5rem;">
            ${order.status === "new" ? `<button onclick="updateStatus('${order.id}', 'preparing')" style="padding:0.5rem 1rem;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;">Start</button>` : ""}
            ${order.status === "preparing" ? `<button onclick="updateStatus('${order.id}', 'ready')" style="padding:0.5rem 1rem;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;">Ready</button>` : ""}
            ${order.status === "ready" ? `<button onclick="updateStatus('${order.id}', 'completed')" style="padding:0.5rem 1rem;background:#14a44d;color:white;border:none;border-radius:8px;cursor:pointer;">Complete</button>` : ""}
          </div>
        </div>
        ${order.customer.notes ? `<div style="margin-top:1rem;padding:0.75rem;background:#fff3cd;border-radius:8px;"><strong>Notes:</strong> ${order.customer.notes}</div>` : ""}
      </div>
    `;
  }).join("");
}

function getStatusColor(status) {
  const colors = {
    new: "#14a44d",
    preparing: "#f59e0b",
    ready: "#3b82f6",
    completed: "#6b7280"
  };
  return colors[status] || "#666";
}

async function updateStatus(id, status) {
  try {
    const response = await fetch(`${API_URL}/update-order`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ id, status })
    });
    
    if (response.ok) {
      loadOrders();
    } else {
      alert('Failed to update status');
    }
  } catch (err) {
    console.error('Update failed:', err);
    alert('Connection error. Please try again.');
  }
}

// Check auth on load
if (sessionStorage.getItem("dv_admin") === "1") {
  showDashboard();
}