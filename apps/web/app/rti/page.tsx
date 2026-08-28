"use client";

import { useLang } from "~/design/lang";
import { SiteShell } from "~/components/site/site-shell";
import { StaticPage, StaticSection } from "~/components/site/static-page";
import { COLOR } from "~/design/tokens";

function RtiContent() {
  const { lang } = useLang();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <StaticPage
      title={t("Right to Information", "सूचना का अधिकार")}
      intro={t(
        "How an RTI request generally works under the Right to Information Act, 2005, as it applies to any public authority including EPFO.",
        "सूचना का अधिकार अधिनियम, 2005 के तहत RTI अनुरोध आम तौर पर कैसे काम करता है, जैसा कि यह EPFO सहित किसी भी सार्वजनिक प्राधिकरण पर लागू होता है।",
      )}
    >
      <StaticSection heading={t("How it works", "यह कैसे काम करता है")}>
        <p>
          {t(
            "A citizen submits a written request to the public authority's Public Information Officer (PIO), along with the prescribed fee. The authority must respond within 30 days.",
            "एक नागरिक सार्वजनिक प्राधिकरण के जन सूचना अधिकारी (PIO) को निर्धारित शुल्क के साथ लिखित अनुरोध जमा करता है। प्राधिकरण को 30 दिनों के भीतर जवाब देना होता है।",
          )}
        </p>
        <p>
          {t(
            "If the reply is unsatisfactory or doesn't arrive in time, the request can be escalated to a first appellate authority, and then to the Central/State Information Commission.",
            "यदि जवाब असंतोषजनक है या समय पर नहीं आता, तो अनुरोध को पहले अपीलीय प्राधिकारी और फिर केंद्रीय/राज्य सूचना आयोग तक ले जाया जा सकता है।",
          )}
        </p>
      </StaticSection>

      <div style={{ background: COLOR.panel, padding: "16px 20px" }}>
        <p style={{ fontSize: 15, color: COLOR.muted, margin: 0 }}>
          {t(
            "This prototype does not have a live RTI submission channel or EPFO's actual PIO contact details — inventing either here would risk sending someone to the wrong place. For a real request, use the official EPFO site or the government's RTI Online portal.",
            "इस प्रोटोटाइप में कोई लाइव RTI सबमिशन चैनल या EPFO के वास्तविक PIO संपर्क विवरण नहीं हैं — यहाँ इन्हें बनाना किसी को गलत जगह भेजने का जोखिम होगा। वास्तविक अनुरोध के लिए, आधिकारिक EPFO साइट या सरकार के RTI ऑनलाइन पोर्टल का उपयोग करें।",
          )}
        </p>
      </div>
    </StaticPage>
  );
}

export default function RtiPage() {
  return (
    <SiteShell>
      <RtiContent />
    </SiteShell>
  );
}
