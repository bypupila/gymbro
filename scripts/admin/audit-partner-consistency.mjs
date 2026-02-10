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

async function main() {
    const args = parseArgs();
    const userFilterSet = parseUserFilter(args);
    const limit = Number(args.limit || 25);

    const db = getAdminDb();
    const context = await loadProfileContext(db);
    const report = buildConsistencyReport(context, { userFilterSet });

    console.log('=== Partner Consistency Audit ===');
    console.log(`Scanned users: ${report.scannedCount}`);
    console.log(`Findings: ${report.findings.length}`);
    console.log(`Fixable profiles: ${report.fixableCount}`);

    if (report.findings.length === 0) {
        console.log('No inconsistencies found.');
        return;
    }

    const displayLimit = Number.isFinite(limit) && limit > 0 ? limit : 25;
    const slice = report.findings.slice(0, displayLimit);

    console.log('');
    console.log(`Showing ${slice.length} finding(s):`);
    for (const finding of slice) {
        console.log('');
        console.log(formatFinding(finding));
    }

    if (report.findings.length > slice.length) {
        console.log('');
        console.log(`... ${report.findings.length - slice.length} more finding(s) not shown.`);
    }

    console.log('');
    console.log('Next step: npm run admin:fix:partners -- --apply');
}

main().catch((error) => {
    console.error('Audit failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
