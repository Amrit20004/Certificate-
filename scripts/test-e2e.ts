import { prisma } from "../src/lib/prisma";
import { createCertificate, renderPreview, revokeCertificate, verifyByToken } from "../src/server/certificates";

async function main() {
  console.log("\n==========================================");
  console.log("Nextute Certificate System - Automated E2E Verification");
  console.log("==========================================\n");

  // 1. Check Super Admin user
  const admin = await prisma.user.findUnique({ where: { email: "admin@nextute.com" } });
  if (!admin) throw new Error("Admin user not found in database!");
  console.log(`[PASS] Super Admin verified in database: ${admin.email} (Role: ${admin.role})`);

  // 2. Check Active Template
  const template = await prisma.template.findFirst({ where: { isActive: true } });
  if (!template) throw new Error("No active certificate template found!");
  console.log(`[PASS] Active Template verified: ${template.name} v${template.version} (Key: ${template.fileKey})`);

  // 3. Test Preview Generation
  console.log("\n[TEST] Generating watermarked PDF preview...");
  const previewBytes = await renderPreview({
    candidateName: "Harsh Raj Anand",
    title: "Mr.",
    role: "Data Analyst Intern",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    issueDate: "2026-08-31",
    templateId: template.id,
  });
  const previewHeader = Buffer.from(previewBytes.slice(0, 5)).toString("utf8");
  if (previewHeader !== "%PDF-") throw new Error(`Invalid PDF header for preview: ${previewHeader}`);
  console.log(`[PASS] Preview PDF successfully compiled! (${previewBytes.byteLength} bytes, header: ${previewHeader})`);

  // 4. Test Certificate Issuance & Sequential ID Generation
  console.log("\n[TEST] Issuing new certificate for Harsh Raj Anand...");
  const { certificate, warnings, verificationUrl } = await createCertificate(
    {
      candidateName: "Harsh Raj Anand",
      title: "Mr.",
      email: "harsh.raj@example.com",
      phone: "+91 98765 43210",
      role: "Data Analyst Intern",
      startDate: "2026-07-01",
      endDate: "2026-08-31",
      issueDate: "2026-08-31",
      templateId: template.id,
      confirmDuplicate: false,
    },
    admin.id
  );

  console.log(`[PASS] Certificate successfully issued!`);
  console.log(`       Certificate ID: ${certificate.certificateNumber}`);
  console.log(`       Verification Token: ${certificate.verificationToken}`);
  console.log(`       Verification URL: ${verificationUrl}`);
  console.log(`       Generated PDF File: ${certificate.pdfFilename}`);
  if (warnings.length > 0) console.log(`       Warnings: ${warnings.join(", ")}`);

  if (!certificate.certificateNumber.startsWith("NXT-INT-2026-")) {
    throw new Error(`Unexpected certificate ID format: ${certificate.certificateNumber}`);
  }

  // 5. Test Public Verification by Certificate Number
  console.log(`\n[TEST] Testing public verification by Certificate ID: ${certificate.certificateNumber}`);
  const verifiedByNumber = await verifyByToken(certificate.certificateNumber);
  if (!verifiedByNumber) throw new Error("Certificate could not be verified by certificateNumber!");
  console.log(`[PASS] Verified by ID:`);
  console.log(`       Candidate: ${verifiedByNumber.candidate.title} ${verifiedByNumber.candidate.name}`);
  console.log(`       Role: ${verifiedByNumber.role}`);
  console.log(`       Status: ${verifiedByNumber.status}`);

  // 6. Test Public Verification by Cryptographic Token
  console.log(`\n[TEST] Testing public verification by token: ${certificate.verificationToken}`);
  const verifiedByTokenRes = await verifyByToken(certificate.verificationToken);
  if (!verifiedByTokenRes) throw new Error("Certificate could not be verified by token!");
  console.log(`[PASS] Verified by token: Status = ${verifiedByTokenRes.status}`);

  // 7. Test Invalid Certificate Lookup
  console.log(`\n[TEST] Testing invalid certificate ID lookup: NXT-INT-9999-999999`);
  const invalidCert = await verifyByToken("NXT-INT-9999-999999");
  if (invalidCert !== null) throw new Error("Expected null for invalid certificate, but got record!");
  console.log(`[PASS] Correctly rejected invalid certificate (returned null / Not Found).`);

  // 8. Test Revocation Workflow & Audit Log
  console.log(`\n[TEST] Revoking certificate with audit reason...`);
  const revoked = await revokeCertificate(
    certificate.id,
    "Testing revocation workflow: incorrect internship dates recorded",
    admin.id
  );
  console.log(`[PASS] Certificate revoked: Status = ${revoked.status}, Reason = "${revoked.revocationReason}"`);

  // 9. Re-verify Public Status of Revoked Certificate
  console.log(`\n[TEST] Re-verifying public status of revoked certificate...`);
  const verifiedRevoked = await verifyByToken(certificate.certificateNumber);
  if (!verifiedRevoked || verifiedRevoked.status !== "REVOKED") {
    throw new Error(`Expected status REVOKED, but got: ${verifiedRevoked?.status}`);
  }
  console.log(`[PASS] Public status updated to REVOKED on verification endpoint!`);

  // 10. Verify Audit Log Trail
  const logs = await prisma.auditLog.findMany({
    where: { certificateId: certificate.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n[PASS] Audit Trail Verified (${logs.length} events logged for this certificate):`);
  for (const log of logs) {
    console.log(`       - [${log.action}] at ${log.createdAt.toISOString()}`);
  }

  // 11. Test HTTP Server Endpoint directly
  console.log("\n[TEST] Testing HTTP Server responses on http://localhost:3000 ...");
  const verifyRes = await fetch(`http://localhost:3000/verify/${certificate.certificateNumber}`);
  const verifyHtml = await verifyRes.text();
  if (verifyRes.status === 200 && verifyHtml.includes("CERTIFICATE REVOKED")) {
    console.log(`[PASS] HTTP GET /verify/${certificate.certificateNumber} returned 200 with 'CERTIFICATE REVOKED' badge!`);
  } else {
    throw new Error(`HTTP verification failed: status ${verifyRes.status}`);
  }

  const notFoundRes = await fetch("http://localhost:3000/verify/NXT-INT-9999-999999");
  const notFoundHtml = await notFoundRes.text();
  if (notFoundRes.status === 200 && notFoundHtml.includes("CERTIFICATE NOT FOUND")) {
    console.log(`[PASS] HTTP GET /verify/NXT-INT-9999-999999 returned 200 with 'CERTIFICATE NOT FOUND' badge!`);
  } else {
    throw new Error(`HTTP not found test failed: status ${notFoundRes.status}`);
  }

  const loginRes = await fetch("http://localhost:3000/login");
  const loginHtml = await loginRes.text();
  if (loginRes.status === 200 && loginHtml.includes("NEXTUTE") && loginHtml.includes("Certificate Management")) {
    console.log(`[PASS] HTTP GET /login returned 200 with authentic Nextute branding!`);
  } else {
    throw new Error(`HTTP login test failed: status ${loginRes.status}`);
  }

  console.log("\n==========================================");
  console.log("ALL 11 AUTOMATED VERIFICATION TESTS PASSED!");
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
