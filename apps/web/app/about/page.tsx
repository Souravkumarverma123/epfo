"use client";

import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";

function AboutContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("What EPFO does", "EPFO क्या करता है")}
      intro={t(
        "The Employees' Provident Fund Organisation is a statutory body under India's Ministry of Labour & Employment. It runs three linked schemes for salaried employees.",
        "कर्मचारी भविष्य निधि संगठन (EPFO) भारत के श्रम एवं रोज़गार मंत्रालय के अधीन एक सांविधिक निकाय है। यह वेतनभोगी कर्मचारियों के लिए तीन जुड़ी हुई योजनाएँ चलाता है।",
      )}
    >
      <StaticSection heading={t("Provident Fund (EPF)", "भविष्य निधि (EPF)")}>
        <p>
          {t(
            "A savings account funded jointly by employee and employer contributions every month, growing with government-declared interest, meant to be drawn down mainly at retirement — though partial advances are allowed for specific needs like housing, illness or education.",
            "हर महीने कर्मचारी और नियोक्ता के संयुक्त अंशदान से बनने वाला बचत खाता, जो सरकार द्वारा घोषित ब्याज के साथ बढ़ता है और मुख्यतः सेवानिवृत्ति पर निकाला जाता है — हालांकि आवास, बीमारी या शिक्षा जैसी विशेष ज़रूरतों के लिए आंशिक अग्रिम की अनुमति है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Pension (EPS)", "पेंशन (EPS)")}>
        <p>
          {t(
            "A share of the employer's contribution is routed to a separate pension fund, which pays a monthly pension after a qualifying period of service, independent of the withdrawable PF balance.",
            "नियोक्ता के अंशदान का एक हिस्सा एक अलग पेंशन कोष में जाता है, जो सेवा की एक निश्चित अवधि के बाद मासिक पेंशन देता है — यह निकासी योग्य PF शेष से अलग होता है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Insurance (EDLI)", "बीमा (EDLI)")}>
        <p>
          {t(
            "A linked insurance scheme that pays a lump sum to a member's nominee if the member dies while in service.",
            "एक जुड़ी हुई बीमा योजना जो किसी सदस्य की सेवा के दौरान मृत्यु होने पर उसके नामांकित व्यक्ति को एकमुश्त राशि देती है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("About this site", "इस साइट के बारे में")}>
        <p>
          {t(
            "EPFO One is a redesign prototype built for a hackathon — not the official EPFO portal. For real account access, use the government's own site.",
            "EPFO One एक हैकाथॉन के लिए बनाया गया रीडिज़ाइन प्रोटोटाइप है — यह आधिकारिक EPFO पोर्टल नहीं है। वास्तविक खाता एक्सेस के लिए सरकार की अपनी साइट का उपयोग करें।",
          )}
        </p>
      </StaticSection>
    </StaticPage>
  );
}

export default function AboutPage() {
  return (
    <SiteShell>
      <AboutContent />
    </SiteShell>
  );
}
