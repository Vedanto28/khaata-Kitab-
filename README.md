
# **KhaataKitab — Smart Bookkeeping for Small Businesses**

---

## **Project Overview**

**KhaataKitab** is a smart bookkeeping and financial assistant built for small vendors and micro-entrepreneurs. It helps users maintain a structured digital ledger by automatically capturing transactions, categorizing income and expenses, and generating meaningful financial insights with minimal manual effort.

The app is designed with a **mobile-first mindset**, optimized for real-world Indian transaction patterns and everyday usability.

🔗 **Project URL**:
[https://lovable.dev/projects/d47af716-24ae-4be3-a18c-44a5f4f367c9](https://lovable.dev/projects/d47af716-24ae-4be3-a18c-44a5f4f367c9)

---

## **What Problem It Solves**

* Manual bookkeeping is time-consuming and error-prone
* Transactions are scattered across UPI, cards, wallets, and cash
* Users rely heavily on SMS alerts but don’t get structured records
* Lack of verified financial history limits access to credit

**KhaataKitab bridges this gap** by converting raw transaction signals into a clean, intelligent ledger.

---

## **Key Features**

### **Automated Transaction Capture**

* Reads bank/payment SMS on Android
* Extracts amount, merchant, date, and payment method automatically

### **Smart Categorization (AI-Assisted)**

* Categorizes income and expenses automatically
* Improves accuracy over time using user corrections

### **SMS-Based Verification**

* Matches manual entries with actual bank/payment SMS
* Marks transactions as **“Verified by SMS”** when data aligns

### **Insights & Planning**

* Monthly summaries and spending breakdowns
* Editable monthly income goals with progress tracking

### **User-Friendly Experience**

* Guided walkthroughs for first-time users
* Light and dark mode support
* Clean, mobile-first interface

---

## **My Contributions & Technical Ownership**

While AI-assisted tools were used to speed up development, the **core logic, system behavior, and user experience were designed and driven by me**.

---

### **Frontend UX & Guided Walkthrough**

I designed and implemented an **in-app feature guide walkthrough** that helps first-time users understand:

* Adding transactions
* Scanning receipts
* Setting monthly goals
* Using insights and AI indicators

This significantly improves usability and feature discoverability, especially for non-technical users.

---

### **SMS Verification Logic (Core Idea)**

I proposed and designed the verification logic where:

* Users can manually log transactions
* The app later reads real bank/payment SMS
* The system compares **amount, timing, merchant, and payment method**
* Matching entries are marked as **“Verified by SMS”**

This approach:

* Improves trust in records
* Prevents duplicate entries
* Keeps verification explainable and transparent

---

### **Intelligent Categorization Strategy**

I designed the categorization approach based on merchant semantics, such as:

* **IRCTC, UTS** → Travel
* **HDFC, EMI** → Banking / Loans
* **PHARMA, WELLNESS** → Healthcare

I structured keyword mappings and passed **numerous real and dummy SMS samples** to train backend logic, with a feedback loop where user corrections continuously improve future predictions.

---

### **Backend Logic & AI Direction**

My work included:

* Designing SMS parsing logic
* Implementing confidence-based verification (verified vs needs review)
* Structuring ML-friendly data pipelines
* Ensuring AI outputs remain transparent and user-overrideable

---

### **Mobile App Enablement**

I handled:

* Converting the web app into an Android app using **Capacitor**
* Configuring Android permissions and build settings
* Debugging build and runtime issues in **Android Studio**
* Ensuring the app works reliably on real Android devices

---

## **Tech Stack**

### **Frontend**

* React + TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

### **Mobile**

* Capacitor (Android)
* Android Studio

### **Backend / AI (Extensible)**

* Node.js
* SMS parsing & ML-assisted categorization

---

## **Running the Project Locally**

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

---

## **Deployment**

The project can be previewed and published via Lovable:

* Open the project link
* Use **Share → Publish**

The same codebase can be extended and deployed independently.

---

## **Project Direction**

KhaataKitab is being built as a **practical fintech product**, with future scope for:

* Stronger ML models
* Multi-language support
* Explainable credit indicators
* Secure authentication and app-lock features

---

## **Final Note**

This project represents **hands-on engineering, product thinking, and applied AI**, with AI tools used as accelerators — **not replacements** for design decisions, logic, or implementation.

---
