# RentMaster Pro - Application Features & User Guide

## 📋 Application Overview

RentMaster Pro is a comprehensive rental property management system designed for property owners, tenants, and administrators. The application enables efficient management of properties, tenants, billing, payments, and maintenance tracking through a unified cloud-based platform.

---

## 👑 Master Admin

**Purpose:** System administrator with full control over all accounts and properties.

### Access Credentials
- **Username:** `master`
- **Password:** `admin`

### Features

#### Owner Management
- ✅ **Register New Owners**
  - Create new property owner accounts
  - Set owner credentials (username, password)
  - Assign unique owner IDs
  
- ✅ **Edit Owner Accounts**
  - Update owner information
  - Modify owner credentials
  - Change owner details
  
- ✅ **Delete Owner Accounts**
  - Remove owner accounts from system
  - Cascade delete: removes owner + all associated properties
  - Archive data before deletion

#### System Overview
- ✅ **View All Registered Owners**
  - List of all property owners in system
  - Owner statistics (number of properties, tenants)
  - Quick access to owner details

- ✅ **View Property Statistics**
  - Total properties in system
  - Total tenants across all properties
  - Billing and payment summaries
  - Maintenance issue tracking

---

## 🏢 Property Owner

**Purpose:** Property owners who manage their rental properties and tenants.

### Features

#### Property Management
- ✅ **Register Properties**
  - Add new rental properties
  - Set property details (name, address, unit number)
  - Assign property ID (auto-generated: UNIT-XXXX)
  
- ✅ **Edit Property Details**
  - Update property information
  - Modify property address/name
  - Change property status

- ✅ **Set Rent & Service Charges**
  - Configure monthly rent amount
  - Set service charges (electricity, water, gas, etc.)
  - Update rent rates over time
  - Track rent revision history

#### Tenant Management
- ✅ **Register Tenants**
  - Add new tenants to properties
  - Set tenant details (name, contact info)
  - Assign tenant to specific property unit
  - Set move-in date
  
- ✅ **View Tenant Information**
  - Access tenant profiles
  - View tenant contact details
  - Check tenant history
  
- ✅ **Vacate Tenants**
  - Process tenant move-out
  - Archive tenant history
  - Mark property as vacant
  - Maintain tenant records for future reference

#### Billing & Payments
- ✅ **Create Monthly Bills**
  - Generate monthly rent bills
  - Include service charges
  - Send bills to tenants
  - Track billing history
  
- ✅ **Confirm Rent Payments**
  - Record tenant payments
  - Update payment status (unpaid → pending → paid)
  - Track payment dates
  - Handle advance payments
  
- ✅ **View Payment History**
  - Check all payment records
  - Filter by date, tenant, property
  - Download payment reports

#### Maintenance Management
- ✅ **Track Maintenance Issues**
  - Receive maintenance requests from tenants
  - View issue details and severity
  - Track issue status (reported → in progress → resolved)
  - Assign maintenance tasks
  
- ✅ **Resolve Maintenance Issues**
  - Mark issues as resolved
  - Add resolution notes
  - Track resolution time
  - Maintain maintenance history

#### Document Generation
- ✅ **Generate Money Receipts**
  - Create payment receipts
  - Include payment details
  - Add property and tenant information
  - Format for professional use
  
- ✅ **Print Receipts**
  - Print receipts directly from app
  - Format for A4 paper
  - Include company branding
  
- ✅ **Download Receipts**
  - Save receipts as PNG images
  - Email receipts to tenants
  - Archive digital copies

---

## 👤 Tenant Portal

**Purpose:** Tenants who rent properties and need to manage their rental experience.

### Features

#### Property Information
- ✅ **View Unit Details**
  - Access property information
  - View rent amount and service charges
  - Check property address and contact
  - See property amenities

#### Billing & Payments
- ✅ **Check Billing Status**
  - View current month's bill
  - Check payment status (unpaid/pending/paid)
  - View billing history
  - See due dates

- ✅ **View Payment History**
  - Access all past payments
  - Check payment dates and amounts
  - Download payment receipts
  - Track payment patterns

#### Maintenance Requests
- ✅ **Submit Maintenance Requests**
  - Report maintenance issues
  - Describe problem details
  - Set issue priority
  - Track request status
  
- ✅ **View Request Status**
  - Check if issue is resolved
  - See maintenance progress
  - View resolution notes

#### Notifications
- ✅ **Receive Notifications**
  - Get notified about new bills
  - Receive payment confirmations
  - Get maintenance updates
  - Stay informed about property changes

#### Documents
- ✅ **Download Receipts**
  - Access payment receipts
  - Download for records
  - Print if needed

---

## 🔧 Technical Features

### Data Management
- ✅ **Cloud-Based Storage**
  - All data stored in Firebase Realtime Database
  - Automatic backups
  - Real-time synchronization across devices
  
- ✅ **Multi-Device Access**
  - Access from any device
  - Data syncs automatically
  - Work offline with cache
  
- ✅ **Persistent Storage**
  - Data never lost
  - Automatic recovery
  - Version history

### User Interface
- ✅ **Responsive Design**
  - Works on desktop, tablet, mobile
  - Optimized for all screen sizes
  - Touch-friendly interface
  
- ✅ **Role-Based UI**
  - Different interfaces for each user type
  - Relevant features only
  - Clean, organized layout

### Security
- ✅ **User Authentication**
  - Secure login system
  - Role-based access control
  - Session management

---

## 📊 Data Structure

### Owners
```
{
  "id": "owner-unique-id",
  "name": "Owner Name",
  "username": "owner-username",
  "password": "encrypted-password"
}
```

### Properties
```
{
  "id": "UNIT-XXXX",
  "ownerId": "owner-unique-id",
  "name": "Property Name",
  "address": "Property Address",
  "rent": 15000,
  "serviceCharge": 500,
  "tenantName": "Tenant Name",
  "tenantContact": "Contact Number",
  "billing": [...],
  "issues": [...],
  "history": [...]
}
```

### Billing
```
{
  "month": "January 2026",
  "rent": 15000,
  "serviceCharge": 500,
  "total": 15500,
  "status": "paid",
  "paidDate": "2026-01-15"
}
```

### Maintenance Issues
```
{
  "id": "issue-unique-id",
  "reportedBy": "Tenant Name",
  "description": "Issue description",
  "status": "resolved",
  "reportedDate": "2026-01-10",
  "resolvedDate": "2026-01-12"
}
```

---

## 🚀 Deployment

### Current Deployment
- **Platform:** Netlify
- **URL:** https://idyllic-lollipop-8131e9.netlify.app
- **Database:** Firebase Realtime Database
- **Project ID:** rentmasterpro-45672

### Supported Browsers
- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review troubleshooting section
3. Contact system administrator

---

**Version:** 1.0  
**Last Updated:** April 27, 2026  
**Status:** ✅ Production Ready
