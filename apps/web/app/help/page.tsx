"use client";

import { SiteShell } from "~/components/site/site-shell";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

const TOPICS = [
  {
    title: { en: "My employer has not paid my contribution", hi: "मेरे नियोक्ता ने मेरा अंशदान नहीं भरा" },
    detail: {
      en: "Check your passbook first — a missing month shows up there before anywhere else. If it's genuinely missing, this prototype does not yet have a way to file that grievance for you.",
      hi: "पहले अपनी पासबुक जांचें — छूटा हुआ महीना वहीं सबसे पहले दिखता है। अगर वाकई छूटा है, तो यह प्रोटोटाइप अभी शिकायत दर्ज करने की सुविधा नहीं देता।",
    },
  },
  {
    title: { en: "My claim was rejected and I do not understand why", hi: "मेरा दावा अस्वीकृत हुआ और मुझे कारण समझ नहीं आया" },
    detail: {
      en: "Open the claim from Claim status — the reason, when there is one, is shown there.",
      hi: "‘दावा स्थिति’ से अपना दावा खोलें — कारण, जब हो, वहां दिखाया जाता है।",
    },
  },
  {
    title: { en: "My name or date of birth is wrong", hi: "मेरा नाम या जन्मतिथि गलत है" },
    detail: {
      en: "Corrections need employer approval in the real system and are not part of this prototype.",
      hi: "सुधार के लिए असली सिस्टम में नियोक्ता की मंज़ूरी चाहिए और यह इस प्रोटोटाइप का हिस्सा नहीं है।",
    },
  },
  {
    title: { en: "I have two UANs", hi: "मेरे पास दो UAN हैं" },
    detail: {
      en: "In the real system, EPFO merges duplicate UANs on request. Not implemented here.",
      hi: "असली सिस्टम में, EPFO अनुरोध पर डुप्लिकेट UAN मर्ज करता है। यहाँ लागू नहीं है।",
    },
  },
  {
    title: { en: "Something else", hi: "कुछ और" },
    detail: {
      en: "Call the helpline below.",
      hi: "नीचे दी गई हेल्पलाइन पर कॉल करें।",
    },
  },
] as const;

function HelpContent() {
  const { lang } = useLang();

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        {lang === "hi" ? "सहायता प्राप्त करें" : "Get help"}
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: COLOR.muted, maxWidth: 640, margin: "0 0 44px" }}>
        {lang === "hi"
          ? "अधिकतर समस्याएँ इनमें से एक हैं। सबसे नज़दीकी से शुरू करें।"
          : "Most problems are one of these. Start with the closest match."}
      </p>

      <div className="two-col-layout">
        <div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {TOPICS.map((topic, i) => (
              <li
                key={topic.title.en}
                style={{
                  borderTop: i === 0 ? `2px solid ${COLOR.ink}` : `1px solid ${COLOR.border}`,
                  borderBottom: i === TOPICS.length - 1 ? `1px solid ${COLOR.border}` : undefined,
                  padding: "22px 0",
                }}
              >
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{topic.title[lang]}</p>
                <p style={{ fontSize: 17, lineHeight: 1.5, color: COLOR.muted, margin: "8px 0 0", maxWidth: 540 }}>
                  {topic.detail[lang]}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "0 0 16px" }}>
            {lang === "hi" ? "किसी से बात करें" : "Talk to someone"}
          </h2>
          <p style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", fontVariantNumeric: "tabular-nums" }}>1800 118 005</p>
          <p style={{ fontSize: 17, color: COLOR.muted, margin: "0 0 20px" }}>
            {lang === "hi"
              ? "मुफ़्त, सुबह 9:15 से शाम 5:45, सोमवार से शुक्रवार। हिंदी, अंग्रेज़ी और 8 अन्य भाषाएँ।"
              : "Free, 9.15am to 5.45pm, Monday to Friday. Hindi, English and 8 other languages."}
          </p>
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: COLOR.muted, borderTop: `2px solid ${COLOR.ink}`, paddingTop: 16, margin: "40px 0 16px" }}>
            {lang === "hi" ? "हमें लिखने से पहले" : "Before you write to us"}
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: COLOR.mutedDark, margin: 0 }}>
            {lang === "hi"
              ? "अपना UAN, और अगर दावे के बारे में है तो दावा संदर्भ संख्या तैयार रखें।"
              : "Have your UAN and, if it is about a claim, the claim reference number ready."}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function HelpPage() {
  return (
    <SiteShell>
      <HelpContent />
    </SiteShell>
  );
}
