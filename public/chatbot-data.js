const chatbotKnowledge = [
  {
    intent: "gst_registration",
    keywords: ["gst", "goods and services tax", "gstin", "register gst", "gst registration", "new gst", "apply gst", "gst certificate", "gst limit", "gst threshold", "gst rules", "gst number", "get gst", "create gst", "gst filing", "gst returns", "gstr", "gstr1", "gstr3b", "gst audit", "gst penalty", "gst late fee", "cancel gst", "surrender gst"],
    reply: "<strong>GST Services</strong><br>We offer end-to-end GST services including Registration, Monthly/Quarterly Return Filing (GSTR-1, GSTR-3B), Annual Returns, and GST Audits. Registration requires PAN, Aadhar, Business Proof, and Bank Details.",
    quickReplies: `<button onclick="document.getElementById('chat-input').value='Book GST Consultation'; sendChatMessage();" class="px-3 py-1.5 bg-primary-teal/10 text-primary-teal border border-primary-teal/20 rounded-full text-xs font-semibold hover:bg-primary-teal hover:text-white transition-colors">Book GST Consultation</button>`
  },
  {
    intent: "income_tax",
    keywords: ["itr", "income tax", "tax return", "file taxes", "itr-1", "itr-2", "itr-3", "itr-4", "form 16", "ais", "tis", "form 26as", "tax refund", "tax audit", "tax planning", "save tax", "80c", "tax deductions", "income tax filing", "e-file", "tax notice", "incometax", "tax computation"],
    reply: "<strong>Income Tax Returns (ITR)</strong><br>We expertly file ITR-1 to ITR-4 for salaried individuals, professionals, and businesses. We also assist with tax planning to maximize your deductions under section 80C and others.",
    quickReplies: `<button onclick="document.getElementById('chat-input').value='Get ITR Quote'; sendChatMessage();" class="px-3 py-1.5 bg-primary-teal/10 text-primary-teal border border-primary-teal/20 rounded-full text-xs font-semibold hover:bg-primary-teal hover:text-white transition-colors">Get ITR Quote</button>`
  },
  {
    intent: "pricing",
    keywords: ["fee", "fees", "cost", "price", "pricing", "quote", "charges", "how much", "tariff", "rates", "estimate", "quotation", "expensive", "cheap", "affordable", "costing", "charge", "amount", "budget"],
    reply: "Our professional fees are transparent and highly competitive:<br>• ITR Filing: Starts at ₹1,499<br>• GST Registration: ₹2,499<br>• Bookkeeping: Custom<br>Please note that prices vary based on the exact complexity of your financial data.",
    quickReplies: ""
  },
  {
    intent: "company_registration",
    keywords: ["incorporation", "company registration", "pvt ltd", "private limited", "llp", "limited liability partnership", "opc", "one person company", "register company", "start business", "form company", "company setup", "startup registration", "partnership firm", "proprietorship", "register business", "roc", "mca", "director identification", "din"],
    reply: "<strong>Company Incorporation</strong><br>We can register your Private Limited Company (Pvt Ltd), LLP, OPC, or Partnership firm. We handle name approval, MOA/AOA drafting, and ROC filings.",
    quickReplies: `<button onclick="document.getElementById('chat-input').value='Book Incorporation Consult'; sendChatMessage();" class="px-3 py-1.5 bg-primary-teal/10 text-primary-teal border border-primary-teal/20 rounded-full text-xs font-semibold hover:bg-primary-teal hover:text-white transition-colors">Book Consult</button>`
  },
  {
    intent: "accounting",
    keywords: ["accounting", "bookkeeping", "tally", "quickbooks", "zoho", "maintain books", "accounts", "ledger", "balance sheet", "p&l", "profit and loss", "financial statements", "cash flow", "audit support", "accountant", "hire accountant", "daily accounting", "computerized accounting"],
    reply: "<strong>Computerized Accounting</strong><br>We provide professional accounting and bookkeeping services using software like Tally Prime. We manage your daily entries, bank reconciliation, and financial statement preparation.",
    quickReplies: ""
  },
  {
    intent: "auditing",
    keywords: ["audit", "auditing", "statutory audit", "internal audit", "tax audit", "gst audit", "company audit", "auditor", "financial audit", "compliance audit", "secretarial audit", "concurrent audit", "stock audit", "ca audit"],
    reply: "<strong>Auditing Services</strong><br>Our network of experienced professionals conducts Statutory Audits, Tax Audits (under section 44AB), Internal Audits, and GST Audits to ensure absolute compliance for your business.",
    quickReplies: ""
  },
  {
    intent: "msme_udyam",
    keywords: ["msme", "udyam", "udhyam", "msme registration", "ssi", "small scale", "udyam certificate", "msme certificate", "register msme", "micro small medium", "msme benefits", "udyam aadhaar", "msme loan"],
    reply: "<strong>MSME / Udyam Registration</strong><br>Registering as an MSME unlocks massive government benefits, lower interest rates, and tender preferences. We can get your Udyam Certificate generated quickly and hassle-free.",
    quickReplies: ""
  },
  {
    intent: "tenders",
    keywords: ["tender", "tenders", "gem", "gem portal", "government tender", "eprocurement", "tender filing", "tender paperwork", "bid", "bidding", "tender document", "tender proposal", "gem registration", "tender compliance"],
    reply: "<strong>Tender Related Paper Works</strong><br>We assist in preparing robust technical and financial bids for Government and Private Tenders, including GeM portal registrations and ensuring total compliance with tender terms.",
    quickReplies: ""
  },
  {
    intent: "bank_reports",
    keywords: ["bank report", "project report", "cma", "cma data", "bank loan", "business loan", "loan project report", "credit report", "project financing", "mudra loan", "working capital", "term loan", "financial projections", "subsidy", "bank funding"],
    reply: "<strong>Bank Project Reports & CMA Data</strong><br>Need a business loan? We prepare highly detailed Bank Project Reports, CMA Data, and Financial Projections that banks require for approving Cash Credit (CC), Term Loans, or Mudra loans.",
    quickReplies: ""
  },
  {
    intent: "pf_esi",
    keywords: ["pf", "provident fund", "epf", "epfo", "esi", "esic", "payroll", "salary", "pt", "professional tax", "labour law", "employee benefits", "pf registration", "esi registration", "pf return", "esi return", "payroll processing"],
    reply: "<strong>Payroll & PF/ESI Compliance</strong><br>We handle employer registration for EPF and ESIC, generate monthly challans, file regular returns, and process your entire payroll securely.",
    quickReplies: ""
  },
  {
    intent: "trademark",
    keywords: ["trademark", "logo registration", "brand registration", "copyright", "patent", "ipr", "intellectual property", "tm", "registered symbol", "protect brand", "trademark search", "trademark objection", "trademark renewal"],
    reply: "<strong>Trademark Registration</strong><br>Protect your brand identity! We conduct comprehensive trademark searches, file your TM application, and handle any registry objections to secure your brand.",
    quickReplies: ""
  },
  {
    intent: "fssai",
    keywords: ["fssai", "food license", "food safety", "fssai registration", "fssai license", "restaurant license", "food business", "fssai renewal", "state food license", "central food license"],
    reply: "<strong>FSSAI (Food License)</strong><br>Starting a food business? We secure your FSSAI Basic Registration, State License, or Central License depending on your manufacturing capacity or turnover.",
    quickReplies: ""
  },
  {
    intent: "iec",
    keywords: ["iec", "import export", "import export code", "dgft", "export license", "import license", "customs code", "iec registration", "start export", "export business"],
    reply: "<strong>Import Export Code (IEC)</strong><br>Planning to trade internationally? We process your IEC application with the DGFT so you can legally start importing and exporting goods.",
    quickReplies: ""
  },
  {
    intent: "tds_tcs",
    keywords: ["tds", "tcs", "tax deducted", "tax collected", "tds return", "form 24q", "form 26q", "form 27q", "tds certificate", "form 16a", "tds refund", "lower deduction"],
    reply: "<strong>TDS & TCS Compliance</strong><br>We compute your monthly TDS/TCS liabilities, prepare challans, and file quarterly returns (Form 24Q, 26Q) to ensure no late filing penalties.",
    quickReplies: ""
  },
  {
    intent: "dsc",
    keywords: ["dsc", "digital signature", "class 3", "digital signature certificate", "token", "esign", "epasstoken", "sign pdf", "dsc renewal", "new dsc"],
    reply: "<strong>Digital Signature Certificate (DSC)</strong><br>We provide Class-3 Digital Signatures with secure USB tokens, required for MCA filings, GST, Income Tax, and E-Tendering.",
    quickReplies: ""
  },
  {
    intent: "pan_tan",
    keywords: ["pan", "pan card", "tan", "tan number", "apply pan", "new pan", "lost pan", "pan correction", "nsdl", "uti", "tan registration"],
    reply: "<strong>PAN & TAN Services</strong><br>We assist with new PAN card applications, PAN corrections, and TAN (Tax Deduction and Collection Account Number) registrations for businesses.",
    quickReplies: ""
  },
  {
    intent: "startup_india",
    keywords: ["startup india", "dpiit", "startup registration", "startup benefits", "tax exemption startup", "80iac", "angel tax", "startup seed fund"],
    reply: "<strong>Startup India (DPIIT) Recognition</strong><br>We help innovative startups get DPIIT recognized to unlock 3-year tax holidays, angel tax exemptions, and fast-track patent processing.",
    quickReplies: ""
  },
  {
    intent: "contact",
    keywords: ["contact human", "talk to human", "real person", "customer care", "helpline", "phone number", "call", "email", "contact details", "mobile number", "whatsapp", "reach you", "contact you"],
    reply: "You can reach our expert advisors directly at <strong>+91 9934593000</strong> (Call/WhatsApp) or email us at <strong>info@parekhconsultancy.com</strong>.",
    quickReplies: ""
  },
  {
    intent: "location",
    keywords: ["location", "address", "office", "where are you", "city", "map", "directions", "visit you", "office address", "branch", "located"],
    reply: "Our primary consulting office is based in India. You can connect with us digitally from anywhere in the country, or contact us to schedule an in-person appointment.",
    quickReplies: ""
  },
  {
    intent: "timings",
    keywords: ["time", "hours", "timings", "open", "close", "working hours", "office hours", "weekend", "sunday", "saturday"],
    reply: "Our standard office hours are <strong>Monday to Saturday: 10:00 AM to 7:00 PM</strong>. We are closed on Sundays and public holidays.",
    quickReplies: ""
  },
  {
    intent: "booking",
    keywords: ["book", "appointment", "consult", "consultation", "meeting", "schedule", "hire you", "get started"],
    reply: "Ready to get started? Just close this chat and click the <strong>'Get Consultation'</strong> button at the top right of the screen to lock in your appointment slot!",
    quickReplies: ""
  },
  {
    intent: "greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "hola", "sup"],
    reply: "Hello there! 👋 Welcome to Parekh Consultancy. How can our financial experts assist you today?",
    quickReplies: ""
  },
  {
    intent: "farewell",
    keywords: ["bye", "goodbye", "see ya", "cya", "leave", "quit", "exit", "farewell", "catch you later"],
    reply: "Goodbye! Feel free to reach out anytime if you need tax or financial assistance. Have a great day! 😊",
    quickReplies: ""
  },
  {
    intent: "thanks",
    keywords: ["thanks", "thank you", "thx", "appreciate it", "great", "awesome", "good", "perfect", "helpful"],
    reply: "You're very welcome! Let me know if there's anything else I can clarify for you.",
    quickReplies: ""
  },
  {
    intent: "jokes",
    keywords: ["joke", "funny", "laugh", "tell me a joke", "humor", "bored"],
    reply: "Why do auditors make great friends? ...Because they are highly accountable! 😄 But seriously, let's get back to saving you taxes!",
    quickReplies: ""
  }
];

// Helper function to find the best matched intent
function getChatbotResponse(userText) {
  const lowerText = userText.toLowerCase().replace(/[^a-z0-9\s]/g, ''); // strip punctuation for better matching
  const words = lowerText.split(' ');
  
  for (const item of chatbotKnowledge) {
    // Check if any keyword matches exactly, or is contained in the text
    const isMatch = item.keywords.some(kw => {
      // If the keyword has spaces, check if the whole string contains it
      if (kw.includes(' ')) {
        return lowerText.includes(kw);
      }
      // If single word, check if it exists in the split words array (exact match prevents partial word bugs)
      return words.includes(kw);
    });
    
    if (isMatch) return item;
  }
  
  // Default fallback if no keywords match
  return {
    reply: "I'm your virtual assistant. For highly specific or complex queries, I recommend speaking directly with our financial experts. Would you like to leave a message?",
    quickReplies: `<button onclick="document.getElementById('chat-input').value='Yes, contact human'; sendChatMessage();" class="px-3 py-1.5 bg-primary-teal/10 text-primary-teal border border-primary-teal/20 rounded-full text-xs font-semibold hover:bg-primary-teal hover:text-white transition-colors">Contact Human</button>`
  };
}
