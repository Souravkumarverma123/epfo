"use client";

import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { SiteShell } from "~/components/site/site-shell";
import { RequireEmployerAuth } from "~/components/site/require-employer-auth";
import { COLOR, BADGE } from "~/design/tokens";
import { useLang } from "~/design/lang";

/**
 * Real employer dashboard — backed by EmployerService.getDashboard, which
 * joins the same `employments`/`members` rows the citizen side already
 * writes. View-only by design (see the scoping decision this feature was
 * built under): no ECR filing, challans, or KYC-approval actions exist yet,
 * and this page says so plainly instead of showing sample numbers for them
 * (the honesty principle applied everywhere else in this app — see the old
 * illustrative version of this page, and the "Change"/"Add" buttons on
 * /profile).
 */
function EmployerDashboardContent({ establishmentCode }: { establishmentCode: string }) {
  const { lang } = useLang();
  const router = useRouter();
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);
  const dashboard = trpc.employer.getDashboard.useQuery();
  const utils = trpc.useUtils();
  const signOut = trpc.employerAuth.signOut.useMutation({
    onSuccess: () => {
      utils.employerAuth.me.setData(undefined, { establishment: null });
      router.push("/employer/login");
    },
  });

  if (dashboard.isLoading) {
    return <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>Loading...</main>;
  }
  if (!dashboard.data) {
    return (
      <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <p style={{ color: "#8a2321" }}>{t("Could not load your establishment.", "आपका प्रतिष्ठान लोड नहीं हो सका।")}</p>
      </main>
    );
  }

  const d = dashboard.data;

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap", margin: "0 0 8px" }}>
        <div>
          <p style={{ fontSize: 17, color: COLOR.muted, margin: "0 0 8px" }}>
            {t("Establishment", "प्रतिष्ठान")} {establishmentCode}, {d.establishment.city}
          </p>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            {d.establishment.name}
          </h1>
        </div>
        <button
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            fontSize: 15,
            fontWeight: 600,
            color: COLOR.accent,
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: "pointer",
          }}
        >
          {t("Sign out", "साइन आउट")}
        </button>
      </div>

      <div style={{ background: "#f9e5c9", padding: "16px 20px", margin: "40px 0 32px", maxWidth: 760 }}>
        <p style={{ fontSize: 15, color: "#5c3d0a", margin: 0, fontWeight: 600 }}>
          {t(
            "This dashboard shows real employee records for this establishment. ECR filing, challans, and KYC approvals are not built in this prototype yet.",
            "यह डैशबोर्ड इस प्रतिष्ठान के वास्तविक कर्मचारी रिकॉर्ड दिखाता है। ECR दाखिल करना, चालान और KYC मंज़ूरी अभी इस प्रोटोटाइप में नहीं बनाए गए हैं।",
          )}
        </p>
      </div>

      <div style={{ display: "flex", gap: 48, margin: "0 0 40px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 15, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.muted, fontWeight: 700, margin: "0 0 6px" }}>
            {t("Active employees", "सक्रिय कर्मचारी")}
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{d.activeCount}</p>
        </div>
        <div>
          <p style={{ fontSize: 15, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.muted, fontWeight: 700, margin: "0 0 6px" }}>
            {t("Pending KYC", "लंबित KYC")}
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, margin: 0, color: d.pendingKycCount > 0 ? COLOR.actionText : COLOR.ink }}>
            {d.pendingKycCount}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 15, letterSpacing: "0.06em", textTransform: "uppercase", color: COLOR.muted, fontWeight: 700, margin: "0 0 6px" }}>
            {t("Total on record", "कुल दर्ज")}
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{d.employees.length}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 20px" }}>
        {t("Employees", "कर्मचारी")}
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, fontSize: 17, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[t("Name", "नाम"), "UAN", t("KYC", "KYC"), t("Joined", "शामिल हुए"), t("Status", "स्थिति")].map((h) => (
                <th scope="col"
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 15,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLOR.muted,
                    borderBottom: `2px solid ${COLOR.ink}`,
                    padding: "0 16px 10px 0",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.employees.map((e) => (
              <tr key={e.employmentId}>
                <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0", fontWeight: 700 }}>{e.fullName}</td>
                <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0", fontVariantNumeric: "tabular-nums", color: COLOR.mutedDark }}>
                  {e.uan.replace(/(\d{3})(?=\d)/g, "$1 ")}
                </td>
                <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0" }}>
                  <span
                    style={{
                      ...(e.kycStatus === "VERIFIED" ? BADGE.verified : BADGE.action),
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: "6px 10px",
                    }}
                  >
                    {e.kycStatus === "VERIFIED" ? t("Verified", "सत्यापित") : t("Pending", "लंबित")}
                  </span>
                </td>
                <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 16px 18px 0", color: COLOR.mutedDark }}>
                  {new Date(e.joinedOn).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}
                </td>
                <td style={{ borderBottom: `1px solid ${COLOR.border}`, padding: "18px 0" }}>
                  <span
                    style={{
                      ...(e.employmentStatus === "ACTIVE" ? BADGE.verified : BADGE.neutral),
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: "6px 10px",
                    }}
                  >
                    {e.employmentStatus === "ACTIVE" ? t("Active", "सक्रिय") : t("Exited", "निकास")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function EmployerPage() {
  return (
    <SiteShell>
      <RequireEmployerAuth>
        {(establishment) => <EmployerDashboardContent establishmentCode={establishment.establishmentCode} />}
      </RequireEmployerAuth>
    </SiteShell>
  );
}
