"use client";

import Link from "next/link";
import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";
import { COLOR } from "~/design/tokens";

/**
 * Deliberately not a form. A form with a "Thanks, feedback submitted"
 * confirmation and nowhere for that feedback to actually go would be
 * exactly the dishonest UI pattern this app avoids everywhere else — see
 * /profile's disabled Change/Add buttons and the old inert footer links
 * this page replaces. What's genuinely real: the two channels the app
 * already has.
 */
function FeedbackContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("Give feedback on this page", "इस पेज पर प्रतिक्रिया दें")}
      intro={t(
        "There is no feedback form here — a form with nowhere to send its data would just be a different kind of dead link. Two channels in this prototype are real.",
        "यहाँ कोई फीडबैक फ़ॉर्म नहीं है — एक ऐसा फ़ॉर्म जिसके डेटा को भेजने के लिए कहीं जगह न हो, वह एक अलग तरह का डेड लिंक ही होगा। इस प्रोटोटाइप में दो चैनल वास्तविक हैं।",
      )}
    >
      <StaticSection heading={t("Raise a grievance", "शिकायत दर्ज करें")}>
        <p>
          {t(
            "Every claim status page has a real link into the grievance flow.",
            "हर दावा स्थिति पृष्ठ में शिकायत प्रवाह का एक वास्तविक लिंक है।",
          )}{" "}
          <Link href="/help">{t("Go to Help", "सहायता पर जाएँ")}</Link>
        </p>
      </StaticSection>
      <StaticSection heading={t("Helpline", "हेल्पलाइन")}>
        <p style={{ color: COLOR.ink, fontWeight: 700 }}>1800 118 005</p>
        <p>
          {t(
            "Free from any phone, 9.15am–5.45pm, Monday to Friday.",
            "किसी भी फोन से मुफ़्त, सुबह 9:15 से शाम 5:45, सोमवार से शुक्रवार।",
          )}
        </p>
      </StaticSection>
    </StaticPage>
  );
}

export default function FeedbackPage() {
  return (
    <SiteShell>
      <FeedbackContent />
    </SiteShell>
  );
}
