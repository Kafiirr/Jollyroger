import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sender, recipient, assetSymbol, amount } = body;

    const checkId = `ccp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const auditReportId = `REP_${Math.floor(100000 + Math.random() * 900000)}`;

    return NextResponse.json({
      checkId,
      senderAddress: sender,
      recipientAddress: recipient,
      assetSymbol: assetSymbol || "aUSDC",
      amount: amount || "100.00",
      travelRuleStatus: "PASSED",
      preTxRulePassed: true,
      riskScore: 0,
      auditReportId,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
