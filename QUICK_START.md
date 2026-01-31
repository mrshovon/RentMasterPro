# 🚀 RentMaster Pro - Firebase Edition - Quick Start

## What's Ready
Your RentMaster Pro application is now **100% Firebase-ready**. All features have been migrated from localStorage to Firebase Realtime Database.

## ⚡ Quick Setup (3 Steps)

### Step 1️⃣ - Get Firebase Credentials
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Add a Web App (</> icon)
4. Copy your config

### Step 2️⃣ - Update firebase-config.js
Open `firebase-config.js` and replace the placeholder values:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",           // Copy from Firebase
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "123...",
    appId: "1:123...:web:abc..."
};
```

### Step 3️⃣ - Enable Realtime Database
1. In Firebase Console → Realtime Database
2. Click "Create Database"
3. Start in "test mode"
4. Done! ✅

## 🎮 Test the App
1. Open `index.html` in your browser
2. **Login:**
   - Admin: `master` / `admin`
   - Create owners/tenants as needed
3. All data auto-syncs to Firebase! 🎉

## 📋 Files Modified
| File | Changes |
|------|---------|
| `index.html` | Added Firebase SDK scripts |
| `app.js` | Converted all functions to async/Firebase calls |
| `firebase-config.js` | **NEW** - Your Firebase configuration |
| `FIREBASE_SETUP.md` | Detailed setup guide |
| `styles.css` | No changes (works as-is) |

## ✨ All Features Working
✅ Master Admin Control  
✅ Owner Management  
✅ Property Management  
✅ Tenant Portal  
✅ Billing & Payments  
✅ Maintenance Tracking  
✅ Receipt Generation  
✅ Real-time Cloud Sync  

## 🔒 Security Notes
- Replace test mode rules with production rules before going live
- Never share your Firebase credentials
- Use Firebase Authentication for production access control

## 📚 Need Help?
- See `FIREBASE_SETUP.md` for detailed instructions
- Check browser console (F12) for any errors
- Visit [Firebase Docs](https://firebase.google.com/docs/database)

---
**Happy Renting! 🏠**
