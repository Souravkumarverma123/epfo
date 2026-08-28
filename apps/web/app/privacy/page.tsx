"use client";

import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";

function PrivacyContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("Privacy", "गोपनीयता")}
      intro={t(
        "This is a plain description of what this prototype actually does with data — not a formal legal privacy policy, and not the real EPFO's policy.",
        "यह इस प्रोटोटाइप के डेटा के साथ वास्तव में क्या करता है, इसका सीधा विवरण है — यह कोई औपचारिक कानूनी गोपनीयता नीति नहीं है, और न ही यह वास्तविक EPFO की नीति है।",
      )}
    >
      <StaticSection heading={t("There is no real personal data here", "यहाँ कोई वास्तविक व्यक्तिगत डेटा नहीं है")}>
        <p>
          {t(
            "Every member, employer, and claim record on this site is synthetic seed data created for the demo. Signing in does not touch any real government or banking system.",
            "इस साइट पर हर सदस्य, नियोक्ता और दावा रिकॉर्ड डेमो के लिए बनाया गया कृत्रिम सीड डेटा है। साइन इन करना किसी वास्तविक सरकारी या बैंकिंग सिस्टम को छूता नहीं है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Login codes", "लॉगिन कोड")}>
        <p>
          {t(
            "There is no SMS gateway connected. The one-time code is shown directly on screen after you request it — it is never actually sent anywhere.",
            "कोई SMS गेटवे जुड़ा नहीं है। अनुरोध करने के बाद वन-टाइम कोड सीधे स्क्रीन पर दिखाया जाता है — यह वास्तव में कहीं भेजा नहीं जाता।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Cookies", "कुकीज़")}>
        <p>
          {t(
            "One httpOnly session cookie per signed-in persona (member or employer), used only to keep you signed in. No analytics or advertising trackers are on this site.",
            "प्रत्येक साइन-इन व्यक्तित्व (सदस्य या नियोक्ता) के लिए एक httpOnly सेशन कुकी, जिसका उपयोग केवल आपको साइन इन रखने के लिए किया जाता है। इस साइट पर कोई एनालिटिक्स या विज्ञापन ट्रैकर नहीं हैं।",
          )}
        </p>
      </StaticSection>
    </StaticPage>
  );
}

export default function PrivacyPage() {
  return (
    <SiteShell>
      <PrivacyContent />
    </SiteShell>
  );
}
