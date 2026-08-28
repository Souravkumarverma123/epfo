"use client";

import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";

function AccessibilityContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("Accessibility statement", "सुगम्यता विवरण")}
      intro={t(
        "An honest account of what's actually in place, not a compliance claim — this is a hackathon prototype and hasn't gone through a real accessibility audit.",
        "यह वास्तव में क्या लागू है इसका ईमानदार विवरण है, कोई अनुपालन दावा नहीं — यह एक हैकाथॉन प्रोटोटाइप है और इसका कोई वास्तविक सुगम्यता ऑडिट नहीं हुआ है।",
      )}
    >
      <StaticSection heading={t("What's in place", "क्या लागू है")}>
        <p>
          {t(
            "Semantic HTML (headings, lists, tables, real <button>/<a> elements) throughout; a visible focus ring on every interactive element; every disabled control carries a tooltip explaining why, instead of just looking greyed out; and a bilingual English/Hindi toggle on every page.",
            "पूरे साइट में सिमेंटिक HTML (हेडिंग, सूचियाँ, टेबल, असली <button>/<a> एलिमेंट्स); हर इंटरैक्टिव एलिमेंट पर दिखाई देने वाली फोकस रिंग; हर डिसेबल्ड कंट्रोल पर सिर्फ धूसर दिखने के बजाय एक टूलटिप जो कारण बताता है; और हर पृष्ठ पर द्विभाषी अंग्रेज़ी/हिंदी टॉगल।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("What hasn't been checked", "क्या जांचा नहीं गया")}>
        <p>
          {t(
            "Color contrast has not been formally audited against WCAG. No testing has been done with an actual screen reader. Keyboard-only navigation has not been walked through end to end.",
            "रंग कंट्रास्ट का WCAG के विरुद्ध औपचारिक रूप से ऑडिट नहीं हुआ है। किसी वास्तविक स्क्रीन रीडर के साथ कोई परीक्षण नहीं किया गया है। केवल-कीबोर्ड नेविगेशन को शुरू से अंत तक नहीं आज़माया गया है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("If something doesn't work for you", "अगर आपके लिए कुछ काम नहीं करता")}>
        <p>
          {t(
            "This is a prototype without a feedback backend yet (see Give feedback) — there's no way to route a report to anyone right now. Worth knowing regardless of whether it can be acted on immediately.",
            "यह एक प्रोटोटाइप है जिसमें अभी फीडबैक बैकएंड नहीं है (देखें 'प्रतिक्रिया दें') — अभी किसी रिपोर्ट को कहीं भेजने का कोई तरीका नहीं है। यह जानना फिर भी महत्वपूर्ण है, भले ही अभी इस पर कार्रवाई न हो सके।",
          )}
        </p>
      </StaticSection>
    </StaticPage>
  );
}

export default function AccessibilityPage() {
  return (
    <SiteShell>
      <AccessibilityContent />
    </SiteShell>
  );
}
