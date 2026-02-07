import { isLimitReached } from '../../types.js';
import { getProviderLabel } from '../../stdin.js';
import { red, yellow, dim, getContextColor, quotaBar, RESET } from '../colors.js';
export function renderUsageLine(ctx) {
    const display = ctx.config?.display;
    if (display?.showUsage === false) {
        return null;
    }
    if (!ctx.usageData?.planName) {
        return null;
    }
    if (getProviderLabel(ctx.stdin)) {
        return null;
    }
    const label = dim('Usage');
    if (ctx.usageData.apiUnavailable) {
        const errorHint = formatUsageError(ctx.usageData.apiError);
        return `${label} ${yellow(`⚠${errorHint}`)}`;
    }
    if (isLimitReached(ctx.usageData)) {
        const resetTime = ctx.usageData.fiveHour === 100
            ? formatResetTime(ctx.usageData.fiveHourResetAt)
            : formatResetTime(ctx.usageData.sevenDayResetAt);
        return `${label} ${red(`⚠ Limit reached${resetTime ? ` (resets ${resetTime})` : ''}`)}`;
    }
    const threshold = display?.usageThreshold ?? 0;
    const fiveHour = ctx.usageData.fiveHour;
    const sevenDay = ctx.usageData.sevenDay;
    const extraUsage = ctx.usageData.extraUsage;
    const usageBarEnabled = display?.usageBarEnabled ?? true;
    const effectiveUsage = Math.max(fiveHour ?? 0, sevenDay ?? 0);
    // If 5h/7d both null or below threshold, but extraUsage exists → show extra only
    if (fiveHour === null && sevenDay === null && extraUsage) {
        const extraPart = formatExtraUsage(extraUsage, usageBarEnabled);
        return `${label} ${dim('Extra')} ${extraPart}`;
    }
    if (effectiveUsage < threshold) {
        if (extraUsage) {
            const extraPart = formatExtraUsage(extraUsage, usageBarEnabled);
            return `${label} ${dim('Extra')} ${extraPart}`;
        }
        return null;
    }
    const fiveHourDisplay = formatUsagePercent(ctx.usageData.fiveHour);
    const fiveHourReset = formatResetTime(ctx.usageData.fiveHourResetAt);
    const fiveHourPart = usageBarEnabled
        ? (fiveHourReset
            ? `${quotaBar(fiveHour ?? 0)} ${fiveHourDisplay} (${fiveHourReset} / 5h)`
            : `${quotaBar(fiveHour ?? 0)} ${fiveHourDisplay}`)
        : (fiveHourReset
            ? `5h: ${fiveHourDisplay} (${fiveHourReset})`
            : `5h: ${fiveHourDisplay}`);
    let result = '';
    const sevenDayThreshold = display?.sevenDayThreshold ?? 80;
    if (sevenDay !== null && sevenDay >= sevenDayThreshold) {
        const sevenDayDisplay = formatUsagePercent(sevenDay);
        const sevenDayReset = formatResetTime(ctx.usageData.sevenDayResetAt);
        const sevenDayPart = usageBarEnabled
            ? (sevenDayReset
                ? `${quotaBar(sevenDay)} ${sevenDayDisplay} (${sevenDayReset} / 7d)`
                : `${quotaBar(sevenDay)} ${sevenDayDisplay}`)
            : `7d: ${sevenDayDisplay}`;
        result = `${label} ${fiveHourPart} | ${sevenDayPart}`;
    }
    else {
        result = `${label} ${fiveHourPart}`;
    }
    // Append extra_usage if present
    if (extraUsage) {
        const extraPart = formatExtraUsage(extraUsage, usageBarEnabled);
        result += ` | ${dim('Extra')} ${extraPart}`;
    }
    return result;
}
function formatUsagePercent(percent) {
    if (percent === null) {
        return dim('--');
    }
    const color = getContextColor(percent);
    return `${color}${percent}%${RESET}`;
}
function formatUsageError(error) {
    if (!error)
        return '';
    if (error.startsWith('http-')) {
        return ` (${error.slice(5)})`;
    }
    return ` (${error})`;
}
function formatResetTime(resetAt) {
    if (!resetAt)
        return '';
    const now = new Date();
    const diffMs = resetAt.getTime() - now.getTime();
    if (diffMs <= 0)
        return '';
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins < 60)
        return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
function formatDollars(cents) {
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
}
function getExtraUsageColor(percent) {
    if (percent >= 90)
        return '\x1b[31m'; // red
    if (percent >= 70)
        return '\x1b[33m'; // yellow
    return '\x1b[32m'; // green
}
function extraUsageBar(percent, width = 10) {
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const filled = Math.round((safePercent / 100) * width);
    const empty = width - filled;
    const color = getExtraUsageColor(safePercent);
    return `${color}${'█'.repeat(filled)}\x1b[2m${'░'.repeat(empty)}${RESET}`;
}
function formatExtraUsage(extra, barEnabled) {
    const color = getExtraUsageColor(extra.utilization);
    const pct = `${color}${extra.utilization}%${RESET}`;
    const used = formatDollars(extra.usedCredits);
    const limit = formatDollars(extra.monthlyLimit);
    if (barEnabled) {
        return `${extraUsageBar(extra.utilization)} ${pct} ${dim('(')}${used}${dim('/')}${limit}${dim(')')}`;
    }
    return `${pct} ${dim('(')}${used}${dim('/')}${limit}${dim(')')}`;
}
//# sourceMappingURL=usage.js.map