// Laravel positional plural rules; provenance and BSD/MIT notices are in THIRD_PARTY_NOTICES.md.
const rules = new Map<string, (number: number) => number>();
for (const alias of 'az az_AZ bo bo_CN bo_IN dz dz_BT id id_ID ja ja_JP jv ka ka_GE km km_KH kn kn_IN ko ko_KR ms ms_MY th th_TH tr tr_CY tr_TR vi vi_VN zh zh_CN zh_HK zh_SG zh_TW'.split(' ')) rules.set(alias, () => 0);
for (const alias of 'af af_ZA bn bn_BD bn_IN bg bg_BG ca ca_AD ca_ES ca_FR ca_IT da da_DK de de_AT de_BE de_CH de_DE de_LI de_LU el el_CY el_GR en en_AG en_AU en_BW en_CA en_DK en_GB en_HK en_IE en_IN en_NG en_NZ en_PH en_SG en_US en_ZA en_ZM en_ZW eo eo_US es es_AR es_BO es_CL es_CO es_CR es_CU es_DO es_EC es_ES es_GT es_HN es_MX es_NI es_PA es_PE es_PR es_PY es_SV es_US es_UY es_VE et et_EE eu eu_ES eu_FR fa fa_IR fi fi_FI fo fo_FO fur fur_IT fy fy_DE fy_NL gl gl_ES gu gu_IN ha ha_NG he he_IL hu hu_HU is is_IS it it_CH it_IT ku ku_TR lb lb_LU ml ml_IN mn mn_MN mr mr_IN nah nb nb_NO ne ne_NP nl nl_AW nl_BE nl_NL nn nn_NO no om om_ET om_KE or or_IN pa pa_IN pa_PK pap pap_AN pap_AW pap_CW ps ps_AF pt pt_BR pt_PT so so_DJ so_ET so_KE so_SO sq sq_AL sq_MK sv sv_FI sv_SE sw sw_KE sw_TZ ta ta_IN ta_LK te te_IN tk tk_TM ur ur_IN ur_PK zu zu_ZA'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : 1);
for (const alias of 'am am_ET bh fil fil_PH fr fr_BE fr_CA fr_CH fr_FR fr_LU gun hi hi_IN hy hy_AM ln ln_CD mg mg_MG nso nso_ZA ti ti_ER ti_ET wa wa_BE xbr'.split(' ')) rules.set(alias, (number: number) => ((number === 0) || (number === 1)) ? 0 : 1);
for (const alias of 'be be_BY bs bs_BA hr hr_HR ru ru_RU ru_UA sr sr_ME sr_RS uk uk_UA'.split(' ')) rules.set(alias, (number: number) => ((Math.trunc(number) % 10 === 1) && (Math.trunc(number) % 100 !== 11)) ? 0 : (((Math.trunc(number) % 10 >= 2) && (Math.trunc(number) % 10 <= 4) && ((Math.trunc(number) % 100 < 10) || (Math.trunc(number) % 100 >= 20))) ? 1 : 2));
for (const alias of 'cs cs_CZ sk sk_SK'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : (((number >= 2) && (number <= 4)) ? 1 : 2));
for (const alias of 'ga ga_IE'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : ((number === 2) ? 1 : 2));
for (const alias of 'lt lt_LT'.split(' ')) rules.set(alias, (number: number) => ((Math.trunc(number) % 10 === 1) && (Math.trunc(number) % 100 !== 11)) ? 0 : (((Math.trunc(number) % 10 >= 2) && ((Math.trunc(number) % 100 < 10) || (Math.trunc(number) % 100 >= 20))) ? 1 : 2));
for (const alias of 'sl sl_SI'.split(' ')) rules.set(alias, (number: number) => (Math.trunc(number) % 100 === 1) ? 0 : ((Math.trunc(number) % 100 === 2) ? 1 : (((Math.trunc(number) % 100 === 3) || (Math.trunc(number) % 100 === 4)) ? 2 : 3)));
for (const alias of 'mk mk_MK'.split(' ')) rules.set(alias, (number: number) => (Math.trunc(number) % 10 === 1) ? 0 : 1);
for (const alias of 'mt mt_MT'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : (((number === 0) || ((Math.trunc(number) % 100 > 1) && (Math.trunc(number) % 100 < 11))) ? 1 : (((Math.trunc(number) % 100 > 10) && (Math.trunc(number) % 100 < 20)) ? 2 : 3)));
for (const alias of 'lv lv_LV'.split(' ')) rules.set(alias, (number: number) => (number === 0) ? 0 : (((Math.trunc(number) % 10 === 1) && (Math.trunc(number) % 100 !== 11)) ? 1 : 2));
for (const alias of 'pl pl_PL'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : (((Math.trunc(number) % 10 >= 2) && (Math.trunc(number) % 10 <= 4) && ((Math.trunc(number) % 100 < 12) || (Math.trunc(number) % 100 > 14))) ? 1 : 2));
for (const alias of 'cy cy_GB'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : ((number === 2) ? 1 : (((number === 8) || (number === 11)) ? 2 : 3)));
for (const alias of 'ro ro_RO'.split(' ')) rules.set(alias, (number: number) => (number === 1) ? 0 : (((number === 0) || ((Math.trunc(number) % 100 > 0) && (Math.trunc(number) % 100 < 20))) ? 1 : 2));
for (const alias of 'ar ar_AE ar_BH ar_DZ ar_EG ar_IN ar_IQ ar_JO ar_KW ar_LB ar_LY ar_MA ar_OM ar_QA ar_SA ar_SD ar_SS ar_SY ar_TN ar_YE'.split(' ')) rules.set(alias, (number: number) => (number === 0) ? 0 : ((number === 1) ? 1 : ((number === 2) ? 2 : (((Math.trunc(number) % 100 >= 3) && (Math.trunc(number) % 100 <= 10)) ? 3 : (((Math.trunc(number) % 100 >= 11) && (Math.trunc(number) % 100 <= 99)) ? 4 : 5)))));

function normalizedAlias(locale: string): string {
    const parts = locale.replaceAll('_', '-').split('-');
    const canonical = parts.map((part, i) => i === 0 ? part.toLowerCase()
        : /^[A-Za-z]{4}$/.test(part) ? part[0].toUpperCase() + part.slice(1).toLowerCase()
        : /^[A-Za-z]{2}$/.test(part) ? part.toUpperCase() : part).join('_');
    if (rules.has(canonical)) return canonical;
    const language = parts[0].toLowerCase();
    return rules.has(language) ? language : locale;
}

/** Laravel 13.x applies abs() for the positional index. Inline conditions and :count keep the raw number.
 * The shared PHP/JS golden table covers nonnegative counts only (12.x and 13.x agree there).
 */
export function choosePlural(line: string, count: number, sourceLocale: string): string {
    if (!Number.isFinite(count)) throw new RangeError('Message count must be finite');
    const segments = line.split('|');
    for (const segment of segments) {
        const match = segment.match(/^[\{\[]([-?\d|*,.]*)[\}\]]([\s\S]*)$/);
        if (!match) continue;
        const [condition, value] = [match[1], match[2]];
        if (condition.includes(',')) {
            const [from, to] = condition.split(',', 2);
            if ((to === '*' && count >= Number(from)) || (from === '*' && count <= Number(to))
                || (from !== '*' && to !== '*' && count >= Number(from) && count <= Number(to))) return value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
        } else if (condition.trim() !== '' && Number(condition) === count) return value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
    }
    const number = Math.abs(count);
    const index = rules.get(normalizedAlias(sourceLocale))?.(number) ?? 0;
    const plain = segments.map(segment => segment.replace(/^[\{\[][-?\d|*,.]*[\}\]]/, ''));
    return plain[index] ?? plain[0];
}
