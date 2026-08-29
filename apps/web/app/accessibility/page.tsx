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
        "An honest account of what's actually in place, not a compliance claim. Some of this has now been measured rather than assumed — but no disabled person has tested this site, which is the check that actually matters.",
        "यह वास्तव में क्या लागू है इसका ईमानदार विवरण है, कोई अनुपालन दावा नहीं। इसमें से कुछ अब मापा गया है, मान लिया नहीं गया — लेकिन किसी दिव्यांग व्यक्ति ने इस साइट का परीक्षण नहीं किया है, और असल में वही जाँच मायने रखती है।",
      )}
    >
      <StaticSection heading={t("What's in place", "क्या लागू है")}>
        <p>
          {t(
            "Semantic HTML (headings, lists, tables, real <button>/<a> elements) throughout. A \u2018Skip to main content\u2019 link as the first thing keyboard focus reaches. Every form control is now programmatically joined to its label, and the six one-time-code boxes are announced as a single named group. Data table headers carry scope, so a screen reader can say which column a cell belongs to. The page language attribute follows the English/Hindi toggle, so Hindi is not read aloud in an English voice. Every disabled control carries a tooltip explaining why, instead of just looking greyed out.",
            "पूरे साइट में सिमेंटिक HTML (हेडिंग, सूचियाँ, टेबल, असली <button>/<a> एलिमेंट्स)। कीबोर्ड फोकस सबसे पहले \u2018मुख्य सामग्री पर जाएँ\u2019 लिंक तक पहुँचता है। हर फ़ॉर्म कंट्रोल अब अपने लेबल से प्रोग्रामेटिक रूप से जुड़ा है, और वन-टाइम कोड के छह बॉक्स एक नामित समूह के रूप में घोषित होते हैं। टेबल हेडर में scope है, ताकि स्क्रीन रीडर बता सके कि सेल किस कॉलम का है। पृष्ठ की भाषा एट्रिब्यूट अंग्रेज़ी/हिंदी टॉगल के साथ बदलती है, इसलिए हिंदी अंग्रेज़ी आवाज़ में नहीं पढ़ी जाती। हर डिसेबल्ड कंट्रोल पर एक टूलटिप है जो कारण बताता है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("What has been measured", "क्या मापा गया है")}>
        <p>
          {t(
            "Colour contrast was computed for every text and background pair in the palette against WCAG 2.2 AA. All text pairs pass, most of them well clear of the 4.5:1 minimum. Two things failed and were fixed: the focus ring's dark edge ran along the bottom of a control only, leaving three sides below the 3:1 a focus indicator needs, and one secondary button's outline was too faint to be its own boundary. Faint dividers between table rows remain low-contrast by design; they are decoration, not the thing identifying a control.",
            "पैलेट के हर टेक्स्ट और बैकग्राउंड जोड़े का कंट्रास्ट WCAG 2.2 AA के विरुद्ध मापा गया। सभी टेक्स्ट जोड़े उत्तीर्ण हैं, अधिकांश 4.5:1 की न्यूनतम सीमा से काफ़ी ऊपर। दो चीज़ें विफल रहीं और ठीक की गईं: फोकस रिंग का गहरा किनारा केवल कंट्रोल के नीचे था, जिससे तीन ओर 3:1 से कम रह जाता था, और एक द्वितीयक बटन की आउटलाइन इतनी हल्की थी कि वह अपनी सीमा नहीं बन पाती थी। टेबल की पंक्तियों के बीच हल्की विभाजक रेखाएँ जानबूझकर कम कंट्रास्ट की हैं; वे सजावट हैं, कंट्रोल की पहचान नहीं।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("What still hasn't been checked", "अब भी क्या जांचा नहीं गया")}>
        <p>
          {t(
            "No testing with an actual screen reader, on any platform. No testing by anyone who uses assistive technology daily. Keyboard-only navigation has not been walked end to end, only spot-checked. No testing at 200% zoom or on a real low-end Android device. Contrast was computed from the palette, which does not catch text sitting on an image or a gradient. Passing a contrast calculation is not the same as being usable, and this page should not be read as a claim of WCAG 2.2 AA conformance.",
            "किसी भी प्लेटफ़ॉर्म पर वास्तविक स्क्रीन रीडर के साथ कोई परीक्षण नहीं। सहायक तकनीक का रोज़ उपयोग करने वाले किसी व्यक्ति द्वारा कोई परीक्षण नहीं। केवल-कीबोर्ड नेविगेशन को शुरू से अंत तक नहीं आज़माया गया, केवल कुछ जगह जाँचा गया। 200% ज़ूम पर या वास्तविक लो-एंड एंड्रॉयड डिवाइस पर कोई परीक्षण नहीं। कंट्रास्ट पैलेट से गणना किया गया, जो छवि या ग्रेडिएंट पर रखे टेक्स्ट को नहीं पकड़ता। कंट्रास्ट गणना पास करना उपयोग योग्य होने के बराबर नहीं है, और इस पृष्ठ को WCAG 2.2 AA अनुपालन का दावा नहीं समझा जाना चाहिए।",
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
