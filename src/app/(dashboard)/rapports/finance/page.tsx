import {
  getFinanceReport,
} from "@/actions/finance-report.actions";

import FinanceReportClient from "@/components/rapports/finance-report-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rapports financiers",
  description:
    "Analyse financière et suivi des encaissements du centre.",
};

export default async function FinanceReportPage() {
  const rapport =
    await getFinanceReport();

  return (
    <div className="w-full">
      <FinanceReportClient
        initialReport={rapport}
      />
    </div>
  );
}