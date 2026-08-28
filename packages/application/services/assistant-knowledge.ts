/**
 * The `search_help` tool's knowledge base — grounding for the assistant's
 * general (not personal-data) answers. Deliberately a plain array with
 * substring matching, not embeddings/vector search: everything here is
 * real content already written for the site's own static pages (About,
 * Schemes, RTI, Accessibility, Privacy, Help), just made retrievable by
 * the model instead of duplicated as free-floating "knowledge" it could
 * drift from. If it's not answerable from one of these entries, the
 * assistant is instructed (see AssistantService's system prompt) to say
 * so rather than invent an answer.
 */

export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  answer: { en: string; hi: string };
  page: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topic: "What EPF is",
    keywords: ["epf", "provident fund", "savings", "withdraw", "retirement"],
    answer: {
      en: "EPF (Employees' Provident Fund) is a savings account funded jointly by employee and employer contributions every month, growing with government-declared interest. It's meant mainly for retirement, though partial advances are allowed for housing, illness, or education.",
      hi: "EPF (कर्मचारी भविष्य निधि) एक बचत खाता है जो हर महीने कर्मचारी और नियोक्ता के संयुक्त अंशदान से बनता है और सरकार द्वारा घोषित ब्याज के साथ बढ़ता है। यह मुख्यतः सेवानिवृत्ति के लिए है, हालांकि आवास, बीमारी या शिक्षा के लिए आंशिक अग्रिम की अनुमति है।",
    },
    page: "/about",
  },
  {
    topic: "What EPS pension is",
    keywords: ["eps", "pension", "monthly pension"],
    answer: {
      en: "EPS (Employees' Pension Scheme) is funded by a share of the employer's contribution routed to a separate pension fund. It pays a monthly pension after a qualifying period of service, and it's separate from your withdrawable PF balance.",
      hi: "EPS (कर्मचारी पेंशन योजना) नियोक्ता के अंशदान के एक हिस्से से बनती है जो एक अलग पेंशन कोष में जाता है। यह सेवा की एक निश्चित अवधि के बाद मासिक पेंशन देती है, और यह आपके निकासी योग्य PF शेष से अलग है।",
    },
    page: "/about",
  },
  {
    topic: "What EDLI insurance is",
    keywords: ["edli", "insurance", "death", "nominee benefit"],
    answer: {
      en: "EDLI (Employees' Deposit Linked Insurance) is a linked insurance scheme that pays a lump sum to a member's nominee if the member dies while in service.",
      hi: "EDLI (कर्मचारी जमा संबद्ध बीमा) एक जुड़ी हुई बीमा योजना है जो सेवा के दौरान सदस्य की मृत्यु होने पर उसके नामांकित व्यक्ति को एकमुश्त राशि देती है।",
    },
    page: "/schemes",
  },
  {
    topic: "How to check claim status",
    keywords: ["claim status", "where is my claim", "track claim", "withdrawal status"],
    answer: {
      en: "Open 'Claim status' from the top navigation and enter your claim number to see exactly where it is and what (if anything) it's waiting on.",
      hi: "ऊपर के नेविगेशन से 'दावा स्थिति' खोलें और अपना दावा नंबर डालें — आप देख सकते हैं कि यह कहाँ है और किस चीज़ का इंतज़ार है।",
    },
    page: "/claims/status",
  },
  {
    topic: "How to raise a grievance",
    keywords: ["grievance", "complaint", "escalate", "not moving", "stuck claim"],
    answer: {
      en: "If a claim hasn't moved for more than 20 working days, you can escalate it — the claim status page has a 'Raise a grievance' link that takes you to Help with the claim number ready.",
      hi: "अगर कोई दावा 20 कार्य दिवसों से आगे नहीं बढ़ा है, तो आप इसे आगे बढ़ा सकते हैं — दावा स्थिति पृष्ठ पर 'शिकायत दर्ज करें' लिंक है जो दावा नंबर के साथ सहायता पृष्ठ पर ले जाता है।",
    },
    page: "/help",
  },
  {
    topic: "What Right to Information (RTI) is",
    keywords: ["rti", "right to information", "public information officer", "pio"],
    answer: {
      en: "Under the RTI Act, 2005, you can request information from a public authority by writing to its Public Information Officer with the prescribed fee; they must respond within 30 days, with an appeal process if they don't. This prototype doesn't have a live RTI submission channel — use the official EPFO site for a real request.",
      hi: "RTI अधिनियम, 2005 के तहत, आप निर्धारित शुल्क के साथ जन सूचना अधिकारी को लिखकर किसी सार्वजनिक प्राधिकरण से जानकारी मांग सकते हैं; उन्हें 30 दिनों के भीतर जवाब देना होता है, न मिलने पर अपील की प्रक्रिया है। इस प्रोटोटाइप में कोई लाइव RTI सबमिशन चैनल नहीं है — वास्तविक अनुरोध के लिए आधिकारिक EPFO साइट का उपयोग करें।",
    },
    page: "/rti",
  },
  {
    topic: "What data this site collects / privacy",
    keywords: ["privacy", "data", "real data", "otp", "sms", "cookie"],
    answer: {
      en: "This is a hackathon prototype: every member/employer/claim record is synthetic seed data, no real SMS gateway is connected (the login OTP is shown directly on screen), and only one session cookie is used — no analytics or trackers.",
      hi: "यह एक हैकाथॉन प्रोटोटाइप है: हर सदस्य/नियोक्ता/दावा रिकॉर्ड कृत्रिम सीड डेटा है, कोई वास्तविक SMS गेटवे नहीं जुड़ा है (लॉगिन OTP सीधे स्क्रीन पर दिखाया जाता है), और केवल एक सेशन कुकी का उपयोग होता है — कोई एनालिटिक्स या ट्रैकर नहीं।",
    },
    page: "/privacy",
  },
  {
    topic: "Employer login and dashboard",
    keywords: ["employer", "establishment", "employer login", "employees list"],
    answer: {
      en: "Employers sign in separately from members (Employer Login, top right) using their establishment code, and see a real, view-only dashboard of their employees pulled from the same records members see. There's no ECR filing, challans, or KYC approval in this prototype yet.",
      hi: "नियोक्ता सदस्यों से अलग साइन इन करते हैं (ऊपर दाईं ओर नियोक्ता लॉगिन) अपने प्रतिष्ठान कोड से, और उन्हें अपने कर्मचारियों का एक वास्तविक, केवल-देखने योग्य डैशबोर्ड दिखता है। इस प्रोटोटाइप में अभी ECR दाखिल करना, चालान या KYC मंज़ूरी नहीं है।",
    },
    page: "/employer",
  },
  {
    topic: "Nominees and KYC",
    keywords: ["nominee", "kyc", "pan", "aadhaar", "bank account", "add pan"],
    answer: {
      en: "Your details page shows KYC status (Aadhaar, PAN, bank account) and nominees. Editing these fields isn't built in this prototype — the Change/Add buttons are honestly disabled with a tooltip rather than pretending to work.",
      hi: "आपकी जानकारी पृष्ठ पर KYC स्थिति (आधार, PAN, बैंक खाता) और नामांकित व्यक्ति दिखते हैं। इन फ़ील्ड्स को संपादित करना इस प्रोटोटाइप में नहीं बनाया गया है — बदलें/जोड़ें बटन ईमानदारी से डिसेबल हैं, टूलटिप के साथ, काम करने का दिखावा किए बिना।",
    },
    page: "/profile",
  },
];

/** Simple keyword-overlap scoring — good enough for a small, hand-curated
 *  knowledge base; not meant to scale past this. Returns the top matches
 *  (or none, if nothing scores above zero) so the assistant can say
 *  honestly that it doesn't have an answer instead of forcing one. */
export function searchHelp(query: string, lang: "en" | "hi"): string {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((entry) => {
    const score = entry.keywords.filter((k) => q.includes(k)).length + (q.includes(entry.topic.toLowerCase()) ? 1 : 0);
    return { entry, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return JSON.stringify({ found: false, note: "No matching entry in the site's help content." });
  }

  return JSON.stringify({
    found: true,
    results: scored.map((s) => ({ topic: s.entry.topic, answer: s.entry.answer[lang], page: s.entry.page })),
  });
}
