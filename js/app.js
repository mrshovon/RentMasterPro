let sessionUser = null;
let curIdx = null;
let curPid = null; // stable property id for tenant sessions

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', function() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// Enable notifications function
async function enableNotifications() {
  if (typeof NotificationService !== 'undefined') {
    const permissionGranted = await NotificationService.requestNotificationPermission();
    if (permissionGranted) {
      alert('Notifications enabled! You will receive alerts for rent bills, payments, and maintenance issues.');
    } else {
      alert('Notification permission denied. You can enable it later in browser settings.');
    }
  } else {
    alert('Notification service not ready. Please try again later.');
  }
  lucide.createIcons();
}

// Firebase Database Reference (initialized in index.html)
let firebaseRef = window.firebaseRef || null;

// Wait for Firebase to be initialized
let firebaseReadyInterval = setInterval(function() {
    if (window.firebaseRef) {
        firebaseRef = window.firebaseRef;
        //console.log('Firebase reference ready');
        clearInterval(firebaseReadyInterval);
    }
}, 50);

// Get Database - Now retrieves from Firebase
async function getDB() {
    return new Promise(async (resolve) => {
        if (!firebaseRef || !window.firebaseGet) {
            console.warn('Firebase not ready, using empty data');
            resolve({ owners: [], properties: [] });
            return;
        }
        
        try {
            const snapshot = await window.firebaseGet(firebaseRef);
            const data = snapshot.val();
            resolve(data || { owners: [], properties: [] });
        } catch (error) {
            console.error('Error reading from Firebase:', error);
            resolve({ owners: [], properties: [] });
        }
    });
}

// Set Database - Now saves to Firebase
async function setDB(db) {
    if (!firebaseRef || !window.firebaseSet) {
        console.warn('Firebase not ready yet');
        return Promise.reject('Firebase not initialized');
    }
    
    try {
        await window.firebaseSet(firebaseRef, db);
        //console.log('Data saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        throw error;
    }
}

function calcTotal() {
    const rent = parseFloat($('#new-p-rent').val()) || 0;
    const service = parseFloat($('#new-p-service').val()) || 0;
    $('#new-p-total').val(rent + service);
}

async function processLogin() {
    const id = $('#user-id').val(), pass = $('#user-pass').val(), db = await getDB();
    if(id == 'master' && pass == 'admin') { $('#login-screen').hide(); $('#master-view').show(); renderMaster(); return; }
    const owners = db.owners || [];
    const properties = db.properties || [];
    const own = owners.find(o => o.id == id && o.pass == pass);
    if(own) { sessionUser = own; $('#login-screen').hide(); $('#owner-view').show(); $('#owner-header-title').text(`Dashboard: ${own.name}`); renderOwner(); 
        // Initialize notifications for owner
        if (typeof NotificationService !== 'undefined') {
            NotificationService.initializeNotifications(own.id, 'owner');
        }
        return; 
    }
    const pIdx = properties.findIndex(p => p.id == id && p.pass == pass);
    if(pIdx != -1) { curIdx = pIdx; curPid = properties[pIdx].id; sessionUser = { id: properties[pIdx].id, type: 'tenant', propertyId: properties[pIdx].id }; $('#login-screen').hide(); $('#tenant-view').show(); renderTenant();
        // Initialize notifications for tenant
        if (typeof NotificationService !== 'undefined') {
            NotificationService.initializeNotifications(properties[pIdx].id, 'tenant');
        }
        // Check for unread notices
        checkUnreadNoticesOnLogin();
        // Update notice badge
        updateNoticeBadge();
        return;
    }
    alert("Invalid login credentials.");
}

// --- MASTER FUNCTIONS ---
async function createOwner() {
    const db = await getDB();
    const name = $('#m-own-name').val(), id = $('#m-own-id').val(), pass = $('#m-own-pass').val();
    if(!name || !id || !pass) return alert("Fill all fields");
    if (!db.owners) db.owners = [];
    db.owners.push({ name, id, pass });
    await setDB(db); $('#m-own-name, #m-own-id, #m-own-pass').val(''); renderMaster();
}

async function renderMaster() {
    const db = await getDB();
    const list = $('#owners-list').empty().append('<h3>Registered Owners</h3>');
    const owners = db.owners || [];
    const properties = db.properties || [];

    owners.forEach((o, i) => {
        const propCount = properties.filter(p => p.ownerId == o.id).length;
        list.append(`
            <div class="property-card">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <div><b>${o.name}</b> <small>(ID: ${o.id})</small><br><small>Properties Managed: ${propCount}</small></div>
                    <div>
                        <button class="btn btn-edit" onclick="openOwnerEdit(${i})">Edit Account</button>
                        <button class="btn btn-danger" onclick="deleteOwner(${i})">Delete & Wipe Data</button>
                    </div>
                </div>
            </div>`);
    });
    lucide.createIcons();
}

async function openOwnerEdit(i) {
    const db = await getDB();
    const o = db.owners[i];
    $('#modal-body').html(`
        <h3>Edit Owner Account</h3>
        <label><small>Display Name</small></label>
        <input type="text" id="e-o-name" value="${o.name}">
        <label><small>Password</small></label>
        <input type="password" id="e-o-pass" value="${o.pass}">
        <button class="btn btn-master" onclick="saveOwnerEdit(${i})">Update Owner</button>
        <button class="btn" onclick="$('#modal').hide()">Cancel</button>
    `);
    $('#modal').show().css('display','flex');
}

async function saveOwnerEdit(i) {
    const db = await getDB(); 
    db.owners[i].name = $('#e-o-name').val(); 
    db.owners[i].pass = $('#e-o-pass').val();
    await setDB(db); 
    $('#modal').hide(); 
    renderMaster();
}

async function deleteOwner(i) {
    if(!confirm("CASCADING DELETE: This will delete owner and all property data?")) return;
    const db = await getDB(); 
    if (!db.owners || !db.owners[i]) return;
    const ownerId = db.owners[i].id;
    if (!db.properties) db.properties = [];
    db.properties = db.properties.filter(p => p.ownerId != ownerId);
    db.owners.splice(i, 1);
    await setDB(db); 
    renderMaster();
}

// --- OWNER FUNCTIONS ---
async function createNewProperty() {
    const db = await getDB();
    const rent = parseFloat($('#new-p-rent').val()) || 0;
    const service = parseFloat($('#new-p-service').val()) || 0;
    const p = {
        ownerId: sessionUser.id, ownerName: sessionUser.name, ownerPhone: $('#new-p-owner-phone').val(),
        id: 'UNIT-'+Math.floor(1000+Math.random()*9000), name: $('#new-p-name').val(), address: $('#new-p-address').val(), flatNo: $('#new-p-flat').val(),
        tName: $('#new-t-name').val(), tId: $('#new-t-id').val(), tPhone: $('#new-t-phone').val(), tFamily: $('#new-t-family').val(),
        rent: rent, serviceCharge: service, totalRent: rent + service, advance: $('#new-p-advance').val(), rentedDate: $('#new-p-date').val(),
        pass: $('#new-t-pass').val(), history: [], rentLogs: [], issues: [], solvedIssues: [], billing: []
    };
    if(!p.name || !p.tName) return alert("Fill required names");
    if (!db.properties) db.properties = [];
    db.properties.push(p);
    await setDB(db);
    renderOwner();
    $('#owner-view input').val(''); $('#new-p-total').val('');

    // Send notification to tenant
    if (typeof NotificationService !== 'undefined' && p.tName) {
        const notification = NotificationService.NotificationTemplates.tenantRegistered(
            p.tName,
            p.name,
            p.id,
            p.ownerName
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function renderOwner() {
    const db = await getDB();
    const list = $('#master-list').empty();
    const properties = db.properties || [];
    properties.filter(p => p.ownerId == sessionUser.id).forEach((p) => {
        let hRows = (p.history || []).map(h => `<tr><td>${h.name}</td><td>${h.end}</td><td>৳${h.rent||0}</td><td>৳${h.srv||0}</td><td>৳${h.adv}</td></tr>`).join('');
        let rRows = (p.rentLogs || []).map(l => `<tr><td>${l.date}</td><td>৳${l.old} → ৳${l.new}</td></tr>`).join('');
        let iHtml = (p.issues || []).map((s, j) => `<div class="issue-box">⚠️ ${s} <button class="btn btn-success" style="float:right; font-size:10px" onclick="fixIssue('${p.id}',${j})">Resolve</button></div>`).join('');
        let sHtml = (p.solvedIssues || []).map(s => `<div class="resolved-box">✔️ ${s}</div>`).join('');
        let bRows = (p.billing || []).map((b, bi) => {
            let action = b.status == 'pending' ? `<button class="btn btn-success" style="padding:2px 5px" onclick="confirmPayment('${p.id}', ${bi})">Confirm Payment</button>` : b.status == 'unpaid' ? `<small style="color:gray">Waiting...</small>` : `<span style="color:green; font-weight:bold">PAID</span>`;
            return `<tr><td>${b.month}</td><td>৳${b.amount}</td><td><span class="status-pill status-${b.status}">${b.status}</span></td><td>${action} <button class="btn btn-edit" style="padding:2px 5px" onclick="viewReceipt('${p.id}', ${bi}, 'Owner')">Receipt</button></td></tr>`;
        }).join('');
        const isVacant = !p.tName || p.tName.toLowerCase() == 'vacant';
        list.append(`
            <div class="property-card" style="${isVacant ? 'border-left: 8px solid #cbd5e1;' : 'border-left: 8px solid var(--success);'}">
                <div style="display:flex; justify-content:space-between">
                    <h3>${p.name} <small>(${p.id})</small> ${isVacant ? '<span style="font-size:10px; background:#cbd5e1; padding:2px 6px; border-radius:4px; color:white">VACANT</span>' : ''}</h3>
                    <div>
                        <button class="btn btn-success" onclick="initiateBill('${p.id}')">Initiate Rent</button>
                        <button class="btn btn-edit" onclick="openPropEdit('${p.id}')">Edit</button>
                        ${!isVacant ? `<button class="btn btn-vacate" onclick="openVacateModal('${p.id}')">Vacate</button>` : ''}
                        <button class="btn btn-danger" onclick="deleteProperty('${p.id}')">Delete</button>
                    </div>
                </div>
                <div class="grid-layout" style="font-size: 13px; border-bottom: 1px solid #eee; padding-bottom:10px;">
                    <div><strong>Property:</strong> ${p.flatNo}, ${p.address}<br><strong>Owner:</strong> ${p.ownerName} (${p.ownerPhone || 'N/A'})</div>
                    <div><strong>Tenant:</strong> ${isVacant ? '<i style="color:gray">No Active Tenant</i>' : p.tName + ' (' + (p.tFamily || 1) + ')'}<br><strong>ID:</strong> ${p.tId || 'N/A'} | <strong>Mob:</strong> ${p.tPhone || 'N/A'}</div>
                </div>
                <p>Rent: ৳${p.rent} + Service: ৳${p.serviceCharge || 0} = <b>Total: ৳${p.totalRent}</b> | Advance: ৳${p.advance}</p>
                <div style="margin-top:15px"><small><b>MONTHLY BILLING</b></small><table class="log-table"><thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${bRows || '<tr><td colspan="4">No bills</td></tr>'}</tbody></table></div>
                <div style="margin-top:10px"><small><b>MAINTENANCE</b></small>${iHtml}<div style="max-height:80px; overflow-y:auto; margin-top:5px">${sHtml}</div></div>
                <div class="grid-layout">
                    <div><small>TENANT HISTORY</small><table class="log-table"><thead><tr><th>Name</th><th>Ended</th><th>Rent</th><th>Srv</th><th>Adv</th></tr></thead><tbody>${hRows||'<tr><td colspan="5">No history</td></tr>'}</tbody></table></div>
                    <div><small>RENT REVISIONS</small><table class="log-table"><thead><tr><th>Date</th><th>Change</th></tr></thead><tbody>${rRows||'<tr><td colspan="2">No revisions</td></tr>'}</tbody></table></div>
                </div>
            </div>`);
    });
    lucide.createIcons();
}

async function initiateBill(pid) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == pid);
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    if(!p.billing) p.billing = [];
    if(p.billing.some(b => b.month == month)) return alert("Bill exists.");
    
    $('#modal-body').html(`
        <h3>Initiate Rent Bill - ${month}</h3>
        <div class="property-card" style="background:#f8fafc; border: none; padding: 15px; margin-bottom: 15px;">
            <div><strong>Base Rent:</strong> ৳${p.rent.toLocaleString()}</div>
            <div><strong>Service Charge:</strong> ৳${(p.serviceCharge || 0).toLocaleString()}</div>
            <div style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;"><strong>Subtotal:</strong> ৳${p.totalRent.toLocaleString()}</div>
        </div>
        <div>
            <label><small>Extra Charge (Optional)</small></label>
            <input type="number" id="extra-charge" placeholder="0" value="0">
        </div>
        <div>
            <label><small>Note (Optional)</small></label>
            <textarea id="bill-note" rows="2" placeholder="Add any notes about this bill..."></textarea>
        </div>
        <div style="background:#f0fdf4; padding: 10px; border-radius: 6px; margin-top: 10px;">
            <strong>Total Amount:</strong> <span id="bill-total-amount" style="font-size: 16px; color: var(--master);">৳${p.totalRent.toLocaleString()}</span>
        </div>
        <button class="btn btn-success" style="margin-top: 15px; width: 100%;" onclick="createBillWithDetails('${pid}')">Create Bill</button>
        <button class="btn" style="margin-top: 5px; width: 100%;" onclick="$('#modal').hide()">Cancel</button>
    `);
    $('#modal').show().css('display','flex');
    
    // Add event listener for extra charge input
    $('#extra-charge').on('input', function() {
        const extra = parseFloat($(this).val()) || 0;
        const total = p.totalRent + extra;
        $('#bill-total-amount').text('৳' + total.toLocaleString());
    });
}

async function createBillWithDetails(pid) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == pid);
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const extraCharge = parseFloat($('#extra-charge').val()) || 0;
    const note = $('#bill-note').val();

    const totalAmount = p.totalRent + extraCharge;

    if(!p.billing) p.billing = [];
    p.billing.unshift({
        month,
        amount: totalAmount,
        baseAmount: p.totalRent,
        extraCharge: extraCharge,
        note: note,
        status: 'unpaid',
        createdDate: new Date().toLocaleDateString()
    });

    await setDB(db);
    $('#modal').hide();
    renderOwner();

    // Send notification to tenant
    if (typeof NotificationService !== 'undefined' && p.tName) {
        const notification = NotificationService.NotificationTemplates.rentBillInitiated(
            p.tName,
            month,
            totalAmount,
            p.name,
            p.id
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function confirmPayment(pid, bi) {
    const db = await getDB(); 
    const p = db.properties.find(x => x.id == pid);
    
    $('#modal-body').html(`
        <h3>Confirm Payment</h3>
        <div class="property-card" style="background:#f0fdf4; border: 1px solid #dcfce7; padding: 15px; margin-bottom: 15px;">
            <div><strong>Bill Month:</strong> ${p.billing[bi].month}</div>
            <div><strong>Amount:</strong> ৳${p.billing[bi].amount.toLocaleString()}</div>
        </div>
        <div>
            <label><small>Payment Received Date</small></label>
            <input type="date" id="received-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <button class="btn btn-success" style="width: 100%; margin-top: 15px;" onclick="savePaidPayment('${pid}', ${bi})">Confirm Payment</button>
        <button class="btn" style="width: 100%; margin-top: 5px;" onclick="$('#modal').hide()">Cancel</button>
    `);
    $('#modal').show().css('display','flex');
}

async function savePaidPayment(pid, bi) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == pid);
    const receivedDate = $('#received-date').val();

    if(!receivedDate) return alert("Please select received date");

    p.billing[bi].status = 'paid';
    p.billing[bi].paidDate = receivedDate;
    await setDB(db);
    $('#modal').hide();
    renderOwner();

    // Send notification to tenant
    if (typeof NotificationService !== 'undefined' && p.tName) {
        const notification = NotificationService.NotificationTemplates.rentPaymentConfirmed(
            p.tName,
            p.billing[bi].month,
            p.billing[bi].amount,
            p.name,
            p.id
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function fixIssue(id, idx) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == id);
    const res = p.issues.splice(idx, 1)[0];
    if(!p.solvedIssues) p.solvedIssues = [];
    p.solvedIssues.push(res + " [Fixed: " + new Date().toLocaleDateString() + "]");
    await setDB(db);
    renderOwner();

    // Send notification to tenant
    if (typeof NotificationService !== 'undefined' && p.tName) {
        const notification = NotificationService.NotificationTemplates.maintenanceIssueResolved(
            p.tName,
            p.name,
            p.id
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function openVacateModal(id) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == id);
    $('#modal-body').html(`
        <h3>Vacate: ${p.flatNo}</h3>
        <p>Archive <b>${p.tName}</b>. Date:</p>
        <input type="date" id="vacate-date" value="${new Date().toISOString().split('T')[0]}">
        <button class="btn btn-vacate" onclick="processVacate('${id}')">Confirm Vacate</button>
        <button class="btn" onclick="$('#modal').hide()">Cancel</button>
    `);
    $('#modal').show().css('display','flex');
}

async function processVacate(id) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == id);
    const endDate = $('#vacate-date').val();
    if(!endDate) return alert("Select date");

    const tenantName = p.tName; // Store before clearing
    const propertyName = p.name;

    p.history.push({ name: p.tName, end: endDate, adv: p.advance, rent: p.rent, srv: p.serviceCharge });
    p.tName = ""; p.tId = ""; p.tPhone = ""; p.tFamily = ""; p.pass = ""; p.rentedDate = "";
    p.rentLogs = []; p.issues = []; p.solvedIssues = []; p.billing = [];
    await setDB(db);
    $('#modal').hide();
    renderOwner();

    // Send notification to tenant
    if (typeof NotificationService !== 'undefined' && tenantName) {
        const notification = NotificationService.NotificationTemplates.tenantVacated(
            tenantName,
            propertyName,
            p.id
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function openPropEdit(id) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == id);
    $('#modal-body').html(`
        <h3>Edit Property</h3>
        <div class="checkbox-container"><input type="checkbox" id="is-new-tenant"> <label>New Tenant? (Archive History)</label></div>
        <div class="grid-layout">
            <div><label>Prop Name</label><input type="text" id="ep-name" value="${p.name}"></div>
            <div><label>Flat</label><input type="text" id="ep-flat" value="${p.flatNo}"></div>
            <div><label>Rent</label><input type="number" id="ep-rent" value="${p.rent}"></div>
            <div><label>Service</label><input type="number" id="ep-service" value="${p.serviceCharge}"></div>
            <div><label>Advance</label><input type="number" id="ep-advance" value="${p.advance}"></div>
            <div><label>Date</label><input type="date" id="ep-date" value="${p.rentedDate}"></div>
        </div>
        <div class="form-section">Tenant Details</div>
        <div class="grid-layout">
            <div><label>Name</label><input type="text" id="et-name" value="${p.tName}"></div>
            <div><label>Mobile</label><input type="text" id="et-phone" value="${p.tPhone}"></div>
            <div><label>NID / Identity</label><input type="text" id="et-id" value="${p.tId}"></div>
        </div>
        <div class="grid-layout">
            <div><label>Family Members</label><input type="number" id="et-family" value="${p.tFamily}"></div>
            <div><label>Password</label><input type="password" id="et-pass" value="${p.pass}"></div>
        </div>
        <button class="btn btn-owner" onclick="savePropEdit('${id}')">Save</button>
        <button class="btn" onclick="$('#modal').hide()">Cancel</button>`);
    $('#modal').show().css('display','flex');
}

async function savePropEdit(id) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == id);
    if (!p) {
        alert('Property not found');
        return;
    }
    const today = new Date().toLocaleDateString();
    const newRent = parseFloat($('#ep-rent').val()) || 0;
    const newService = parseFloat($('#ep-service').val()) || 0;
    const oldRent = p.rent;
    let rentChanged = false;

    if($('#is-new-tenant').is(':checked')) {
        if (!p.history) p.history = [];
        p.history.push({ name: p.tName, end: today, adv: p.advance, rent: p.rent, srv: p.serviceCharge });
        p.rentLogs=[]; p.issues=[]; p.solvedIssues=[]; p.billing = [];
    } else if(p.rent != newRent) {
        if (!p.rentLogs) p.rentLogs = [];
        p.rentLogs.push({date: today, old: p.rent, new: newRent});
        rentChanged = true;
    }
    p.name=$('#ep-name').val(); p.flatNo=$('#ep-flat').val(); p.rent=newRent; p.serviceCharge=newService; p.totalRent=newRent + newService;
    p.advance=$('#ep-advance').val(); p.rentedDate=$('#ep-date').val(); p.tName=$('#et-name').val(); p.tPhone=$('#et-phone').val(); p.tId=$('#et-id').val(); p.tFamily=$('#et-family').val(); p.pass=$('#et-pass').val();
    await setDB(db);
    $('#modal').hide();
    renderOwner();

    // Send notification to tenant if rent changed
    if (rentChanged && typeof NotificationService !== 'undefined' && p.tName) {
        const notification = NotificationService.NotificationTemplates.rentChanged(
            p.tName,
            oldRent,
            newRent,
            p.name,
            p.id
        );
        // Get tenant's FCM tokens using property ID as tenant ID
        const tenantTokens = await NotificationService.getTenantTokens(p.id);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        } else {
            console.warn('No FCM tokens found for tenant:', p.id);
        }
    }
}

async function deleteProperty(id) { 
    if(!confirm("Delete?")) return; 
    const db = await getDB(); 
    db.properties = db.properties.filter(p => p.id != id); 
    await setDB(db); 
    renderOwner(); 
}

// --- TENANT FUNCTIONS ---
async function renderTenant() {
    const db = await getDB();
    const properties = db.properties || [];
    // Prefer stable id lookup; fall back to numeric index for older sessions
    let p = null;
    if (curPid) p = properties.find(x => x.id == curPid);
    if (!p && curIdx != null) p = properties[curIdx];
    if(!p || !p.tName) { $('#tenant-view').html('<h3>Inactive</h3>'); return; }
    // Ensure numeric fields and arrays exist to avoid runtime errors
    p.rent = Number(p.rent || 0);
    p.serviceCharge = Number(p.serviceCharge || 0);
    p.totalRent = Number(p.totalRent != null ? p.totalRent : (p.rent + p.serviceCharge));
    p.advance = Number(p.advance || 0);
    p.rentLogs = p.rentLogs || [];
    p.billing = p.billing || [];
    p.issues = p.issues || [];
    p.solvedIssues = p.solvedIssues || [];
    p.history = p.history || [];
    //console.log('Rendering tenant view for', p);
    $('#t-header-title').text(`Tenant: ${p.tName}`);
    let rRows = p.rentLogs.map(l => `<tr><td>${l.date}</td><td>৳${(l.old||0)} → ৳${(l.new||0)}</td></tr>`).join('');
    let bRows = p.billing.map((b, bi) => {
        let btn = b.status == 'unpaid' ? `<button class="btn btn-success" onclick="tenantNotifyPay(${bi})">Rent Sent/paid</button>` : b.status == 'pending' ? `<i>Pending</i>` : `<b>PAID</b>`;
        return `<tr><td>${b.month}</td><td>৳${b.amount}</td><td>${b.status}</td><td>${btn} <button class="btn btn-edit" onclick="viewReceipt('${p.id}', ${bi}, 'Tenant')">Receipt</button></td></tr>`;
    }).join('');

    // Enhanced tenant display with more details
    let tenantHTML = `
        <div class="property-card">
            <h2>${p.name} <small>(${p.flatNo})</small></h2>
            <div class="grid-layout">
                <div style="border-right: 1px solid #e2e8f0; padding-right: 15px;">
                    <div style="margin-bottom: 12px;"><strong>📍 Property Details</strong></div>
                    <div style="font-size: 13px; line-height: 1.8;">
                        <div>Unit ID: <b>${p.id}</b></div>
                        <div>Address: <b>${p.address || 'N/A'}</b></div>
                        <div>Flat/Unit: <b>${p.flatNo}</b></div>
                        <div>Owner: <b>${p.ownerName}</b></div>
                        <div>Owner Phone: <b>${p.ownerPhone || 'N/A'}</b></div>
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 12px;"><strong>👤 Your Information</strong></div>
                    <div style="font-size: 13px; line-height: 1.8;">
                        <div>Name: <b>${p.tName}</b></div>
                        <div>Mobile: <b>${p.tPhone || 'N/A'}</b></div>
                        <div>ID/NID: <b>${p.tId || 'N/A'}</b></div>
                        <div>Family Members: <b>${p.tFamily || '1'}</b></div>
                        <div>Since: <b>${p.rentedDate}</b></div>
                    </div>
                </div>
            </div>
            <div class="grid-layout" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                <div style="border-right: 1px solid #e2e8f0; padding-right: 15px;">
                    <div style="margin-bottom: 8px;"><strong>💰 Rent Breakdown</strong></div>
                    <div style="font-size: 13px; line-height: 1.8;">
                        <div>Base Rent: <b style="color: var(--tenant)">৳${p.rent.toLocaleString()}</b></div>
                        <div>Service Charge: <b style="color: var(--tenant)">৳${(p.serviceCharge || 0).toLocaleString()}</b></div>
                        <div>Total Monthly: <b style="color: var(--master); font-size: 14px;">৳${p.totalRent.toLocaleString()}</b></div>
                        <div style="margin-top: 8px;">Advance Paid: <b style="color: var(--success)">৳${p.advance.toLocaleString()}</b></div>
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 8px;"><strong>📊 Rent Revisions</strong></div>
                    ${rRows ? `<table class="log-table" style="font-size: 12px;"><thead><tr><th>Date</th><th>Change</th></tr></thead><tbody>${rRows}</tbody></table>` : '<small style="color: gray;">No revisions yet</small>'}
                </div>
            </div>
        </div>
    `;

    $('#tenant-display').html(tenantHTML);
    $('#tenant-billing-section').html(`<div class="property-card"><h4>💳 Payment History</h4><table class="log-table">${bRows || '<tr><td colspan="4">No billing records</td></tr>'}</table></div>`);
    updateMaintenanceUI(p);
    lucide.createIcons();
}

async function tenantNotifyPay(bi) {
    const db = await getDB();
    if(!db.properties) {
        console.error('No properties in DB');
        return;
    }
    let p = null;
    if (curPid) p = db.properties.find(x => x.id == curPid);
    if (!p && curIdx != null) p = db.properties[curIdx];
    if(!p) {
        console.error('Property not found', { curPid, curIdx });
        return;
    }
    if(!p.billing || !p.billing[bi]) {
        console.warn('Billing entry not found at index', bi);
        return;
    }
    p.billing[bi].status = 'pending';
    await setDB(db);
    renderTenant();

    // Send notification to owner
    if (typeof NotificationService !== 'undefined' && p.ownerId) {
        const notification = NotificationService.NotificationTemplates.rentPaymentSent(
            p.tName,
            p.billing[bi].month,
            p.billing[bi].amount,
            p.name,
            p.id
        );
        // Get owner's FCM tokens
        const ownerTokens = await NotificationService.getOwnerTokens(p.ownerId);
        if (ownerTokens.length > 0) {
            await NotificationService.sendPushNotification(ownerTokens, notification);
        } else {
            console.warn('No FCM tokens found for owner:', p.ownerId);
        }
    }
}

async function submitIssue() {
    const text = $('#issue-text').val();
    if(!text) return;
    const db = await getDB();
    if(!db.properties) {
        console.error('No properties in DB');
        return alert('Error: Property not found');
    }
    let p = null;
        if (curPid) p = db.properties.find(x => x.id == curPid); // Locate property by curPid
    if (!p && curIdx != null) p = db.properties[curIdx];
    if(!p) {
        console.error('Property not found', { curPid, curIdx });
        return alert('Error: Property not found');
    }
    if(!p.issues) p.issues = [];
    p.issues.push(text + " (" + new Date().toLocaleDateString() + ")");
    //console.log('Issue submitted. Total issues now:', p.issues.length);
    await setDB(db);
    $('#issue-text').val('');
    renderTenant();

    // Send notification to owner
    if (typeof NotificationService !== 'undefined' && p.ownerId) {
        const notification = NotificationService.NotificationTemplates.maintenanceIssueSubmitted(
            p.tName,
            p.name,
            p.id,
            text
        );
        // Get owner's FCM tokens
        const ownerTokens = await NotificationService.getOwnerTokens(p.ownerId);
        if (ownerTokens.length > 0) {
            await NotificationService.sendPushNotification(ownerTokens, notification);
        } else {
            console.warn('No FCM tokens found for owner:', p.ownerId);
        }
    }
}

// --- NOTICE LOGIC ---

/**
 * Create a new notice
 */
async function createNotice() {
    const db = await getDB();
    if (!db.notices) db.notices = [];

    const title = $('#notice-title').val();
    const content = $('#notice-content').val();
    const targetType = $('#notice-target-type').val();
    const targetPropertyId = $('#notice-property-select').val();
    const targetTenantId = $('#notice-tenant-select').val();

    if (!title || !content) return alert('Please fill in title and content');

    const notice = {
        id: 'notice_' + Date.now(),
        ownerId: sessionUser.id,
        propertyId: targetType === 'all' ? null : (targetType === 'property' ? targetPropertyId : targetPropertyId),
        tenantId: targetType === 'tenant' ? targetTenantId : null,
        title,
        content,
        createdAt: new Date().toLocaleDateString(),
        readBy: []
    };

    db.notices.push(notice);
    await setDB(db);
    $('#modal').hide();
    renderOwner();

    // Send push notification to affected tenants
    await sendNoticeNotification(notice);
}

/**
 * Send push notification for new notice
 */
async function sendNoticeNotification(notice) {
    if (typeof NotificationService === 'undefined') return;

    const db = await getDB();
    let affectedTenants = [];

    if (notice.propertyId === null) {
        // All properties
        affectedTenants = db.properties.filter(p => p.ownerId === notice.ownerId && p.tName).map(p => ({
            tenantName: p.tName,
            propertyId: p.id,
            propertyName: p.name
        }));
    } else if (notice.tenantId === null) {
        // Specific property, all tenants
        const property = db.properties.find(p => p.id === notice.propertyId);
        if (property && property.tName) {
            affectedTenants.push({
                tenantName: property.tName,
                propertyId: property.id,
                propertyName: property.name
            });
        }
    } else {
        // Specific tenant
        const property = db.properties.find(p => p.id === notice.propertyId);
        if (property) {
            affectedTenants.push({
                tenantName: property.tName,
                propertyId: property.id,
                propertyName: property.name
            });
        }
    }

    // Send notification to each affected tenant
    for (const tenant of affectedTenants) {
        const notification = NotificationService.NotificationTemplates.noticeCreated(
            tenant.tenantName,
            notice.title,
            tenant.propertyName,
            tenant.propertyId
        );
        const tenantTokens = await NotificationService.getTenantTokens(tenant.propertyId);
        if (tenantTokens.length > 0) {
            await NotificationService.sendPushNotification(tenantTokens, notification);
        }
    }
}

/**
 * Get notices for a specific tenant
 */
async function getNoticesForTenant(tenantId, propertyId) {
    const db = await getDB();
    if (!db.notices) return [];

    return db.notices.filter(notice => {
        // Notice must be for this property or all properties
        const propertyMatch = notice.propertyId === null || notice.propertyId === propertyId;
        // Notice must be for this tenant or all tenants in property
        const tenantMatch = notice.tenantId === null || notice.tenantId === tenantId;
        return propertyMatch && tenantMatch;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get unread notice count for a tenant
 */
async function getUnreadNoticeCount(tenantId, propertyId) {
    const notices = await getNoticesForTenant(tenantId, propertyId);
    return notices.filter(notice => !notice.readBy || !notice.readBy.includes(tenantId)).length;
}

/**
 * Mark notice as read
 */
async function markNoticeAsRead(noticeId, tenantId) {
    const db = await getDB();
    const notice = db.notices.find(n => n.id === noticeId);
    if (notice) {
        if (!notice.readBy) notice.readBy = [];
        if (!notice.readBy.includes(tenantId)) {
            notice.readBy.push(tenantId);
            await setDB(db);
        }
    }
}

/**
 * Delete a notice
 */
async function deleteNotice(noticeId) {
    if (!confirm('Delete this notice?')) return;
    const db = await getDB();
    db.notices = db.notices.filter(n => n.id !== noticeId);
    await setDB(db);
    renderOwner();
}

/**
 * Open create notice modal
 */
async function openCreateNoticeModal() {
    const db = await getDB();
    const ownerProperties = db.properties.filter(p => p.ownerId === sessionUser.id && p.tName);

    let propertyOptions = ownerProperties.map(p => `<option value="${p.id}">${p.name} (${p.tName})</option>`).join('');

    $('#modal-body').html(`
        <h3>Create Notice</h3>
        <div>
            <label><small>Target</small></label>
            <select id="notice-target-type" onchange="updateNoticeTargetOptions()">
                <option value="all">All My Properties</option>
                <option value="property">Specific Property</option>
                <option value="tenant">Specific Tenant</option>
            </select>
        </div>
        <div id="notice-property-select-container" style="display:none">
            <label><small>Property</small></label>
            <select id="notice-property-select" onchange="updateTenantSelectForNotice()">
                ${propertyOptions}
            </select>
        </div>
        <div id="notice-tenant-select-container" style="display:none">
            <label><small>Tenant</small></label>
            <select id="notice-tenant-select">
                <option value="">Select property first</option>
            </select>
        </div>
        <div>
            <label><small>Title</small></label>
            <input type="text" id="notice-title" placeholder="Notice title">
        </div>
        <div>
            <label><small>Content</small></label>
            <textarea id="notice-content" rows="5" placeholder="Enter notice content..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="createNotice()">Publish Notice</button>
    `);
    $('#modal').show();
}

/**
 * Update notice target options based on selection
 */
function updateNoticeTargetOptions() {
    const targetType = $('#notice-target-type').val();
    $('#notice-property-select-container').toggle(targetType !== 'all');
    $('#notice-tenant-select-container').toggle(targetType === 'tenant');
}

/**
 * Update tenant select for specific property
 */
async function updateTenantSelectForNotice() {
    const propertyId = $('#notice-property-select').val();
    const db = await getDB();
    const property = db.properties.find(p => p.id === propertyId);

    if (property && property.tName) {
        $('#notice-tenant-select').html(`<option value="${propertyId}">${property.tName}</option>`);
    } else {
        $('#notice-tenant-select').html('<option value="">No tenant</option>');
    }
}

/**
 * View sent notices for owner
 */
async function viewSentNotices() {
    const db = await getDB();
    if (!db.notices) db.notices = [];
    const notices = db.notices.filter(n => n.ownerId === sessionUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let noticesHtml = notices.length === 0 ? '<p>No notices sent yet.</p>' : '';

    notices.forEach(notice => {
        let targetText = 'All Properties';
        if (notice.propertyId) {
            const property = db.properties.find(p => p.id === notice.propertyId);
            targetText = property ? property.name : 'Unknown Property';
            if (notice.tenantId) {
                targetText += ` (${property.tName})`;
            }
        }

        noticesHtml += `
            <div class="property-card" style="margin-bottom:10px">
                <div style="display:flex; justify-content:space-between; align-items:start">
                    <div>
                        <strong>${notice.title}</strong>
                        <small style="display:block; color:#666">${notice.createdAt}</small>
                        <small style="display:block; color:#666">Target: ${targetText}</small>
                    </div>
                    <button class="btn btn-danger" style="font-size:12px; padding:5px 10px" onclick="deleteNotice('${notice.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    $('#modal-body').html(`
        <h3>Sent Notices</h3>
        <button class="btn btn-primary" style="margin-bottom:15px" onclick="openCreateNoticeModal()">+ Create Notice</button>
        ${noticesHtml}
    `);
    $('#modal').show();
}

/**
 * Check for unread notices on tenant login
 */
async function checkUnreadNoticesOnLogin() {
    if (sessionUser.type !== 'tenant') return;

    const db = await getDB();
    const property = db.properties.find(p => p.id === sessionUser.propertyId);
    if (!property) return;

    const unreadCount = await getUnreadNoticeCount(sessionUser.id, property.id);
    if (unreadCount > 0) {
        const notices = await getNoticesForTenant(sessionUser.id, property.id);
        const latestUnread = notices.find(n => !n.readBy || !n.readBy.includes(sessionUser.id));

        if (latestUnread) {
            showUnreadNoticePopup(latestUnread);
        }
    }
}

/**
 * Show unread notice popup
 */
function showUnreadNoticePopup(notice) {
    $('#modal-body').html(`
        <h3 style="color:#dc2626">📢 New Notice!</h3>
        <div class="property-card" style="background:#fef3c7; border:1px solid #fcd34d">
            <strong>${notice.title}</strong>
            <small style="display:block; color:#666; margin-top:5px">${notice.createdAt}</small>
            <p style="margin-top:10px">${notice.content.substring(0, 150)}${notice.content.length > 150 ? '...' : ''}</p>
        </div>
        <button class="btn btn-primary" onclick="viewFullNotice('${notice.id}')">View Full Notice</button>
        <button class="btn" onclick="$('#modal').hide()">Close</button>
    `);
    $('#modal').show();
}

/**
 * Open notices list for tenant
 */
async function openNoticesList() {
    const db = await getDB();
    const property = db.properties.find(p => p.id === sessionUser.propertyId);
    if (!property) return;

    const notices = await getNoticesForTenant(sessionUser.id, property.id);

    let noticesHtml = notices.length === 0 ? '<p>No notices.</p>' : '';

    notices.forEach(notice => {
        const isUnread = !notice.readBy || !notice.readBy.includes(sessionUser.id);
        noticesHtml += `
            <div class="property-card" style="margin-bottom:10px; border-left: ${isUnread ? '4px solid #dc2626' : '4px solid #10b981'}">
                <div style="display:flex; justify-content:space-between; align-items:start">
                    <div>
                        <strong>${notice.title}</strong>
                        ${isUnread ? '<span style="color:#dc2626; margin-left:10px">• New</span>' : ''}
                        <small style="display:block; color:#666">${notice.createdAt}</small>
                    </div>
                </div>
                <button class="btn btn-primary" style="margin-top:10px; font-size:12px" onclick="viewFullNotice('${notice.id}')">View</button>
            </div>
        `;
    });

    $('#modal-body').html(`
        <h3>Notices</h3>
        ${noticesHtml}
    `);
    $('#modal').show();
}

/**
 * View full notice
 */
async function viewFullNotice(noticeId) {
    const db = await getDB();
    const notice = db.notices.find(n => n.id === noticeId);
    if (!notice) return;

    // Mark as read if tenant
    if (sessionUser.type === 'tenant') {
        await markNoticeAsRead(noticeId, sessionUser.id);
        updateNoticeBadge();
    }

    $('#modal-body').html(`
        <h3>${notice.title}</h3>
        <small style="color:#666">${notice.createdAt}</small>
        <div class="property-card" style="margin-top:15px; white-space:pre-wrap">${notice.content}</div>
        <button class="btn" style="margin-top:15px" onclick="$('#modal').hide()">Close</button>
    `);
    $('#modal').show();
}

/**
 * Update notice badge count
 */
async function updateNoticeBadge() {
    if (sessionUser.type !== 'tenant') return;

    const db = await getDB();
    const property = db.properties.find(p => p.id === sessionUser.propertyId);
    if (!property) return;

    const unreadCount = await getUnreadNoticeCount(sessionUser.id, property.id);
    const badge = $('#notice-badge');

    if (unreadCount > 0) {
        badge.text(unreadCount).show();
        badge.parent().addClass('flash-animation');
    } else {
        badge.hide();
        badge.parent().removeClass('flash-animation');
    }
}

// --- RECEIPT LOGIC ---
async function viewReceipt(pid, bi, viewerType) {
    const db = await getDB();
    const p = db.properties.find(x => x.id == pid);
    const bill = p.billing[bi];
    const isPaid = bill.status == 'paid';
    const statusText = isPaid ? "PAID" : "DUE";
    const statusColor = isPaid ? "#10b981" : "#dc2626";
    
    // Calculate extra charge (for backward compatibility with old bills)
    const extraCharge = bill.extraCharge || 0;
    const baseAmount = bill.baseAmount || p.totalRent;
    
    // Build notes with custom note appended to default note
    let noteText = "Note: Please pay the rent by or on the 19th of the month.";
    if(bill.note && bill.note.trim()) {
        noteText += "\n" + bill.note;
    }
    
    // Build signature line with received date for paid bills
    const signatureContent = isPaid && bill.paidDate ? `
        ${p.ownerName.split(' ')[0]}<br>
        <small style="font-weight:normal; font-size:11px">Received: ${bill.paidDate}</small>
    ` : `
        ${p.ownerName.split(' ')[0]}<br>
        <small style="font-weight:normal; font-size:11px">Landlord's Signature</small>
    `;

    const html = `
        <div class="receipt-container" id="printable-receipt">
            <div class="status-watermark" style="color:${statusColor}">${statusText}</div>
            <div class="receipt-header">
                <div class="copy-tag">${viewerType} Copy</div>
                <h1>MONEY RECEIPT</h1>
                <div style="margin-top:5px">
                    <strong style="font-size:18px">${p.ownerName}</strong><br>
                    <small style="font-size:12px">${p.address}</small>
                </div>
            </div>

            <div class="receipt-row"><span>Date:</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
            <div class="receipt-row"><span>Month:</span><span>${bill.month}</span></div>
            <div class="receipt-row" style="margin-top:10px"><span>Tenant Name:</span><span><b>${p.tName}</b></span></div>
            <div class="receipt-row"><span>House Rent:</span><span>৳${p.rent.toLocaleString()}</span></div>
            <div class="receipt-row"><span>Service Charge:</span><span>৳${(p.serviceCharge || 0).toLocaleString()}</span></div>
            <div class="receipt-row"><span>Extra Charge:</span><span>৳${extraCharge.toLocaleString()}</span></div>

            <div class="total-box">
                <span>Total ${isPaid ? 'Paid' : 'Due'}:</span>
                <span>৳${bill.amount.toLocaleString()}</span>
            </div>

            <p style="font-size:10px; font-style:italic; margin-top:5px; color:#333;">
                ${noteText}
            </p>

            <div class="receipt-footer">
                <div style="font-size:10px; color:#888">Ref: ${p.id}</div>
                <div class="signature-line">
                    ${signatureContent}
                </div>
            </div>

            <div class="no-print" style="margin-top:30px; text-align:center; padding-top:15px">
                <button class="btn btn-owner" onclick="window.print()">Print</button>
                <button class="btn btn-success" onclick="downloadPNG('${p.tName}_${bill.month}')">PNG</button>
                <button class="btn" style="background:#64748b; color:white" onclick="$('#receipt-overlay').hide()">Close</button>
            </div>
        </div>`;

    $('#receipt-content').html(html);
    $('#receipt-overlay').fadeIn(200);
}

function downloadPNG(filename) {
    const element = document.getElementById('printable-receipt');
    const btns = element.querySelector('.no-print');
    
    // Temporarily hide buttons for the screenshot
    btns.style.display = 'none'; 
    
    html2canvas(element, { 
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Receipt_${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        btns.style.display = 'block'; // Show buttons back
    });
}

// Function to generate the HTML for tenant maintenance history UI
function updateMaintenanceUI(p) {
    // Helper function to turn whatever data we have into a clean Array
    const ensureArray = (data) => {
        if (!data) return []; // Handle null/undefined
        if (Array.isArray(data)) return data; // Already an array
        if (typeof data === 'string') return data.split(',').map(s => s.trim()).filter(s => s !== "");
        return [data.toString()]; // Fallback for numbers or objects
    };

    const openIssues = ensureArray(p.issues);
    const solvedIssues = ensureArray(p.solvedIssues);

    // If both are empty, hide the entire section
    if (openIssues.length === 0 && solvedIssues.length === 0) {
        $('#tenant-maintenance-history').hide();
        return;
    } else {
        $('#tenant-maintenance-history').show();
    }

    let html = `
        <div class="maint-container" style="margin-top:20px">
            <span class="maint-header">Maintenance History</span>
            <div id="maint-content-wrapper">`;

    // 1. Loop through Open Issues
    openIssues.forEach(issue => {
        html += `
            <div class="maint-item unfixed">
                <span class="status-dot"></span>
                <span class="issue-text">${issue}</span>
            </div>`;
    });

    // 2. Loop through Solved Issues (inside the scrollable list)
    if (solvedIssues.length > 0) {
        html += `<div class="maint-list">`;
        solvedIssues.forEach(issue => {
            html += `
                <div class="maint-item fixed">
                    <span class="status-dot"></span>
                    <span class="issue-text">${issue}</span>
                </div>`;
        });
        html += `</div>`;
    }

    html += `</div></div>`;

    $('#tenant-maintenance-history').html(html);
}
