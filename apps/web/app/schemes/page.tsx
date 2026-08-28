"use client";

import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";
import { COLOR } from "~/design/tokens";

function SchemesContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("Acts, schemes and circulars", "अधिनियम, योजनाएँ और परिपत्र")}
      intro={t(
        "The three statutes and schemes EPFO administers. This prototype does not carry a live circulars feed — for current circulars and notifications, use the official EPFO site.",
        "तीन अधिनियम और योजनाएँ जिन्हें EPFO प्रशासित करता है। इस प्रोटोटाइप में परिपत्रों की लाइव फ़ीड नहीं है — वर्तमान परिपत्रों और सूचनाओं के लिए आधिकारिक EPFO साइट का उपयोग करें।",
      )}
    >
      <StaticSection heading={t("Employees' Provident Funds & Miscellaneous Provisions Act, 1952", "कर्मचारी भविष्य निधि एवं प्रकीर्ण उपबंध अधिनियम, 1952")}>
        <p>
          {t(
            "The parent act. It establishes the provident fund scheme and covers factories and establishments employing 20 or more people.",
            "मूल अधिनियम। यह भविष्य निधि योजना की स्थापना करता है और 20 या उससे अधिक कर्मचारियों वाले कारखानों और प्रतिष्ठानों को कवर करता है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Employees' Pension Scheme, 1995", "कर्मचारी पेंशन योजना, 1995")}>
        <p>
          {t(
            "Introduced under the 1952 Act, this replaced the earlier Family Pension Scheme and governs monthly pension entitlements.",
            "1952 के अधिनियम के तहत लाई गई यह योजना पहले की पारिवारिक पेंशन योजना की जगह लेती है और मासिक पेंशन हकदारी को नियंत्रित करती है।",
          )}
        </p>
      </StaticSection>
      <StaticSection heading={t("Employees' Deposit Linked Insurance Scheme, 1976", "कर्मचारी जमा संबद्ध बीमा योजना, 1976")}>
        <p>
          {t(
            "The insurance scheme linked to the provident fund account, paying a benefit to the nominee on death in service.",
            "भविष्य निधि खाते से जुड़ी बीमा योजना, जो सेवा के दौरान मृत्यु होने पर नामांकित व्यक्ति को लाभ देती है।",
          )}
        </p>
      </StaticSection>
      <div style={{ background: COLOR.panel, padding: "16px 20px" }}>
        <p style={{ fontSize: 15, color: COLOR.muted, margin: 0 }}>
          {t(
            "This page lists the schemes by name only — it is not a substitute for reading the acts themselves.",
            "यह पृष्ठ केवल योजनाओं के नाम सूचीबद्ध करता है — यह स्वयं अधिनियमों को पढ़ने का विकल्प नहीं है।",
          )}
        </p>
      </div>
    </StaticPage>
  );
}

export default function SchemesPage() {
  return (
    <SiteShell>
      <SchemesContent />
    </SiteShell>
  );
}
