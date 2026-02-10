import 'dotenv/config';
import { getAdminDb } from './lib/firebaseAdmin.mjs';
import { parseArgs, toStringArray } from './lib/cli.mjs';
import { buildConsistencyReport, formatFinding, loadProfileContext } from './lib/partnerConsistency.mjs';

function parseUserFilter(args) {
    const values = [
        ...toStringArray(args.userId),
        ...toStringArray(args.userIds),
    ];

    if (values.length === 0) return null;
    return new Set(values);
}

async function applyUpdates(db, findings) {
    const WRITE_BATCH_LIMIT = 400;

    let batch = db.batch();
    let pendingWrites = 0;
    let appliedProfiles = 0;

    for (const finding of findings) {
        if (!finding.hasChanges) continue;

        batch.set(finding.ref, finding.updates, { merge: true });
        pendingWrites += 1;
        appliedProfiles += 1;

        if (pendingWrites >= WRITE_BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            pendingWrites = 0;
        }
    }

    if (pendingWrites > 0) {
        await batch.commit();
    }

    return appliedProfiles;
}

async function main() {
    const args = parseArgs();
    const shouldApply = Boolean(args.apply);
    const previewLimit = Number(args.limit || 25);
    const userFilterSet = parseUserFilter(args);

    const db = getAdminDb();
    const context = await loadProfileContext(db);
    const report = buildConsistencyReport(context, { userFilterSet });

    const fixableFindings = report.findings.filter((item) => item.hasChanges);

    console.log('=== Partner Consistency Repair ===');
    console.log(`Scanned users: ${report.scannedCount}`);
    console.log(`Findings: ${report.findings.length}`);
    console.log(`Fixable profiles: ${fixableFindings.length}`);

    if (fixableFindings.length === 0) {
        console.log('No updates are needed.');
        return;
    }

    const displayLimit = Number.isFinite(previewLimit) && previewLimit > 0 ? previewLimit : 25;
    const previewItems = fixableFindings.slice(0, displayLimit);

    console.log('');
    console.log('Preview of planned updates:');
    for (const finding of previewItems) {
        console.log('');
        console.log(formatFinding(finding));
    }

    if (fixableFindings.length > previewItems.length) {
        console.log('');
        console.log(`... ${fixableFindings.length - previewItems.length} more fixable profile(s) not shown.`);
    }

    if (!shouldApply) {
        console.log('');
        console.log('Dry run complete. Re-run with --apply to write changes.');
        return;
    }

    const appliedProfiles = await applyUpdates(db, fixableFindings);

    console.log('');
    console.log(`Applied updates to ${appliedProfiles} profile(s).`);
}

main().catch((error) => {
    console.error('Repair failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
