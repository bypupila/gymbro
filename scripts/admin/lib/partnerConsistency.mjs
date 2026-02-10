import { FieldPath } from 'firebase-admin/firestore';

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function uniqueStrings(values) {
    const result = [];
    const seen = new Set();

    for (const value of values) {
        if (!isNonEmptyString(value)) continue;

        const cleaned = value.trim();
        if (seen.has(cleaned)) continue;

        seen.add(cleaned);
        result.push(cleaned);
    }

    return result;
}

export function normalizePartnerIds(rawValue) {
    if (!Array.isArray(rawValue)) return [];
    return uniqueStrings(rawValue);
}

export function normalizePartners(rawValue) {
    if (!Array.isArray(rawValue)) return [];

    const result = [];
    const seen = new Set();

    for (const candidate of rawValue) {
        if (!candidate || typeof candidate !== 'object') continue;

        const rawId = candidate.id;
        if (!isNonEmptyString(rawId)) continue;

        const id = rawId.trim();
        if (seen.has(id)) continue;
        seen.add(id);

        const alias = isNonEmptyString(candidate.alias) ? candidate.alias.trim() : id.slice(0, 8);
        const nombre = isNonEmptyString(candidate.nombre) ? candidate.nombre.trim() : alias;

        result.push({ id, alias, nombre });
    }

    return result;
}

function buildPartnerInfo(userId, displayNamesByUserId) {
    const displayName = displayNamesByUserId.get(userId) || userId.slice(0, 8);
    return {
        id: userId,
        alias: displayName,
        nombre: displayName,
    };
}

function deepEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function maybeString(value) {
    return isNonEmptyString(value) ? value.trim() : null;
}

export async function loadProfileContext(db) {
    const usersSnapshot = await db.collection('users').select('displayName').get();

    const profilesByUserId = new Map();

    // Fetch all profile/main documents for each user
    const profilePromises = [];
    usersSnapshot.forEach((userDoc) => {
        profilePromises.push(
            userDoc.ref.collection('profile').doc('main').get().then((profileDoc) => {
                if (profileDoc.exists) {
                    profilesByUserId.set(userDoc.id, {
                        userId: userDoc.id,
                        ref: profileDoc.ref,
                        data: profileDoc.data() || {},
                    });
                }
            })
        );
    });

    await Promise.all(profilePromises);

    const displayNamesByUserId = new Map();
    usersSnapshot.forEach((userDoc) => {
        const rawDisplayName = userDoc.get('displayName');
        if (!isNonEmptyString(rawDisplayName)) return;
        displayNamesByUserId.set(userDoc.id, rawDisplayName.trim());
    });

    return {
        profilesByUserId,
        displayNamesByUserId,
    };
}

function buildProfileFinding(profile, profilesByUserId, displayNamesByUserId) {
    const data = profile.data || {};
    const partnerIds = normalizePartnerIds(data.partnerIds);
    const partners = normalizePartners(data.partners);
    const partnerId = maybeString(data.partnerId);
    const activePartnerId = maybeString(data.activePartnerId);
    const linkSetupPendingPartnerId = maybeString(data.linkSetupPendingPartnerId);
    const routineSync = data.routineSync && typeof data.routineSync === 'object' ? data.routineSync : null;

    const issuesSet = new Set();
    const addIssue = (issue) => {
        if (issue) issuesSet.add(issue);
    };

    const candidatePartnerIds = [...partnerIds];

    for (const partner of partners) {
        if (!candidatePartnerIds.includes(partner.id)) {
            addIssue(`partners contains ${partner.id} but partnerIds is missing it.`);
            candidatePartnerIds.push(partner.id);
        }
    }

    if (partnerId && !candidatePartnerIds.includes(partnerId)) {
        addIssue(`partnerId (${partnerId}) is not in partnerIds.`);
        candidatePartnerIds.push(partnerId);
    }

    if (activePartnerId && !candidatePartnerIds.includes(activePartnerId)) {
        addIssue(`activePartnerId (${activePartnerId}) is not in partnerIds.`);
        candidatePartnerIds.push(activePartnerId);
    }

    const validPartnerIds = [];

    for (const candidateId of uniqueStrings(candidatePartnerIds)) {
        const partnerProfile = profilesByUserId.get(candidateId);

        if (!partnerProfile) {
            addIssue(`partner profile missing for ${candidateId}.`);
            continue;
        }

        const partnerPartnerIds = normalizePartnerIds(partnerProfile.data.partnerIds);
        const partnerPartnerId = maybeString(partnerProfile.data.partnerId);
        const isReciprocal = partnerPartnerIds.includes(profile.userId) || partnerPartnerId === profile.userId;

        if (!isReciprocal) {
            addIssue(`non reciprocal relation with ${candidateId}.`);
            continue;
        }

        validPartnerIds.push(candidateId);
    }

    const expectedPartnerIds = uniqueStrings(validPartnerIds);

    const currentPartnersById = new Map(partners.map((item) => [item.id, item]));
    const expectedPartners = expectedPartnerIds.map((item) => {
        if (currentPartnersById.has(item)) return currentPartnersById.get(item);

        addIssue(`partners is missing details for ${item}; a placeholder will be generated.`);
        return buildPartnerInfo(item, displayNamesByUserId);
    });

    for (const currentPartner of partners) {
        if (!expectedPartnerIds.includes(currentPartner.id)) {
            addIssue(`partners contains invalid relation to ${currentPartner.id}.`);
        }
    }

    const expectedPartnerId = partnerId && expectedPartnerIds.includes(partnerId)
        ? partnerId
        : (expectedPartnerIds[0] || null);

    if (partnerId && partnerId !== expectedPartnerId) {
        addIssue(`partnerId (${partnerId}) will be adjusted.`);
    }

    const expectedActivePartnerId = activePartnerId && expectedPartnerIds.includes(activePartnerId)
        ? activePartnerId
        : expectedPartnerId;

    if (activePartnerId && activePartnerId !== expectedActivePartnerId) {
        addIssue(`activePartnerId (${activePartnerId}) will be adjusted.`);
    }

    const expectedLinkSetupPendingPartnerId =
        linkSetupPendingPartnerId && expectedPartnerIds.includes(linkSetupPendingPartnerId)
            ? linkSetupPendingPartnerId
            : null;

    if (linkSetupPendingPartnerId && linkSetupPendingPartnerId !== expectedLinkSetupPendingPartnerId) {
        addIssue(`linkSetupPendingPartnerId (${linkSetupPendingPartnerId}) is no longer valid.`);
    }

    let expectedRoutineSync = routineSync;
    if (
        routineSync &&
        isNonEmptyString(routineSync.partnerId) &&
        !expectedPartnerIds.includes(routineSync.partnerId.trim())
    ) {
        addIssue(`routineSync.partnerId (${routineSync.partnerId}) is no longer valid.`);
        expectedRoutineSync = {
            ...routineSync,
            enabled: false,
            partnerId: null,
            mode: 'manual',
            syncId: null,
            updatedAt: new Date().toISOString(),
        };
    }

    const updates = {};

    if (!deepEqual(partnerIds, expectedPartnerIds)) {
        updates.partnerIds = expectedPartnerIds;
    }

    if (!deepEqual(partners, expectedPartners)) {
        updates.partners = expectedPartners;
    }

    if ((partnerId ?? null) !== expectedPartnerId) {
        updates.partnerId = expectedPartnerId;
    }

    if ((activePartnerId ?? null) !== expectedActivePartnerId) {
        updates.activePartnerId = expectedActivePartnerId;
    }

    if ((linkSetupPendingPartnerId ?? null) !== expectedLinkSetupPendingPartnerId) {
        updates.linkSetupPendingPartnerId = expectedLinkSetupPendingPartnerId;
    }

    if (!deepEqual(routineSync ?? null, expectedRoutineSync ?? null)) {
        updates.routineSync = expectedRoutineSync;
    }

    if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
    }

    return {
        userId: profile.userId,
        ref: profile.ref,
        issues: Array.from(issuesSet),
        hasChanges: Object.keys(updates).length > 0,
        updates,
        current: {
            partnerIds,
            partners,
            partnerId,
            activePartnerId,
            linkSetupPendingPartnerId,
            routineSyncPartnerId: routineSync?.partnerId || null,
        },
        expected: {
            partnerIds: expectedPartnerIds,
            partners: expectedPartners,
            partnerId: expectedPartnerId,
            activePartnerId: expectedActivePartnerId,
            linkSetupPendingPartnerId: expectedLinkSetupPendingPartnerId,
            routineSyncPartnerId: expectedRoutineSync?.partnerId || null,
        },
    };
}

export function buildConsistencyReport(context, options = {}) {
    const { profilesByUserId, displayNamesByUserId } = context;
    const userFilterSet = options.userFilterSet || null;

    const findings = [];

    for (const profile of profilesByUserId.values()) {
        if (userFilterSet && !userFilterSet.has(profile.userId)) continue;

        const finding = buildProfileFinding(profile, profilesByUserId, displayNamesByUserId);

        if (finding.issues.length > 0 || finding.hasChanges) {
            findings.push(finding);
        }
    }

    findings.sort((left, right) => left.userId.localeCompare(right.userId));

    return {
        scannedCount: userFilterSet ? userFilterSet.size : profilesByUserId.size,
        findings,
        fixableCount: findings.filter((item) => item.hasChanges).length,
    };
}

export function formatFinding(finding) {
    const lines = [];
    lines.push(`User: ${finding.userId}`);

    if (finding.issues.length > 0) {
        lines.push(`  Issues: ${finding.issues.join(' | ')}`);
    }

    if (finding.hasChanges) {
        lines.push(`  partnerIds: ${JSON.stringify(finding.current.partnerIds)} -> ${JSON.stringify(finding.expected.partnerIds)}`);
        lines.push(`  partnerId: ${JSON.stringify(finding.current.partnerId)} -> ${JSON.stringify(finding.expected.partnerId)}`);
        lines.push(`  activePartnerId: ${JSON.stringify(finding.current.activePartnerId)} -> ${JSON.stringify(finding.expected.activePartnerId)}`);
        lines.push(
            `  routineSync.partnerId: ${JSON.stringify(finding.current.routineSyncPartnerId)} -> ` +
            `${JSON.stringify(finding.expected.routineSyncPartnerId)}`
        );
    }

    return lines.join('\n');
}
