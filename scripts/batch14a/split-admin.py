# One-off: splits src/screens/Admin.jsx into per-tab modules (panels are MOVED verbatim, not rewritten).
import re, sys
src = open('src/screens/Admin.jsx', encoding='utf8').read().split('\n')
L = lambda a, b: '\n'.join(src[a-1:b])
header = L(1, 37)
imports_raw = []
# parse import statements (may span lines)
for m in re.finditer(r"import\s+(.*?)\s+from\s+'([^']+)'\n?", header + '\n', re.S):
    imports_raw.append((m.group(1).strip(), m.group(2)))

def fix_path(p):
    return p.replace('../', '../../../', 1) if p.startswith('../') else p

def build_imports(body):
    out = []
    for spec, path in imports_raw:
        if path in ('react-router-dom', '../lib/i18n/LanguageProvider', '../lib/auth/AuthProvider', '../components/layout'):
            pass
        names = []
        default = None
        m = re.match(r"^([A-Za-z_$][\w$]*)?\s*,?\s*(\{(.*)\})?\s*$", spec, re.S)
        if not m:
            continue
        default = m.group(1)
        named = [n.strip() for n in (m.group(3) or '').split(',') if n.strip()]
        keepn = [n for n in named if re.search(r'\b' + re.escape(n.split(' as ')[-1]) + r'\b', body)]
        keepd = default if default and re.search(r'\b' + re.escape(default) + r'\b', body) else None
        if not keepn and not keepd:
            continue
        parts = []
        if keepd: parts.append(keepd)
        if keepn:
            if len(keepn) > 4:
                parts.append('{\n  ' + ',\n  '.join(keepn) + ',\n}')
            else:
                parts.append('{ ' + ', '.join(keepn) + ' }')
        out.append(f"import {', '.join(parts)} from '{fix_path(path)}'")
    return '\n'.join(out)

R = {  # panel name -> (start, end)
 'StatsBar': (104,132), 'AvailabilityPanel': (139,216), 'FarmerProfilesPanel': (217,301), 'VendorReportPanel': (302,391),
 'ListingsPanel': (392,460), 'ExpertsPanel': (461,531), 'ArticlesPanel': (532,618), 'ResourcesPanel': (619,706),
 'MspPanel': (707,801), 'InputPricesPanel': (802,885), 'MelaPanel': (886,979), 'MelaCandidatesPanel': (980,1026),
 'MelaMergesPanel': (1027,1060), 'SawaalPanel': (1061,1134), 'SafaltaPanel': (1135,1221), 'YojanaPanel': (1222,1353),
 'UsersPanel': (1354,1400), 'ReportsPanel': (1401,1465), 'CarbonSuggestionsPanel': (1466,1499), 'SearchMissesPanel': (1500,1525),
 'SubscriptionsPanel': (1526,1556), 'ProcurementPanel': (1557,1592), 'PageFaqsPanel': (1593,1627), 'DataHealthPanel': (1628,1644),
}
TABS = {
 'Overview': ['StatsBar', 'AvailabilityPanel', 'DataHealthPanel'],
 'Content': ['ExpertsPanel', 'ArticlesPanel', 'ResourcesPanel', 'YojanaPanel', 'SafaltaPanel', 'SawaalPanel', 'PageFaqsPanel'],
 'Mandi': ['MspPanel', 'InputPricesPanel', 'ProcurementPanel'],
 'Moderation': ['ListingsPanel', 'ReportsPanel', 'CarbonSuggestionsPanel', 'MelaPanel', 'MelaCandidatesPanel', 'MelaMergesPanel'],
 'People': ['UsersPanel', 'FarmerProfilesPanel', 'VendorReportPanel', 'SubscriptionsPanel', 'SearchMissesPanel'],
}
vk = L(133,138)
open('src/screens/admin/shared.jsx', 'w', encoding='utf8').write(vk.replace('function vendorKeyDetail', 'export function vendorKeyDetail') + '\n')
for tab, panels in TABS.items():
    body = '\n\n'.join(L(*R[p]) for p in panels)
    if 'vendorKeyDetail' in body:
        body = body.replace('function vendorKeyDetail', 'function __x')
    imps = build_imports(body)
    extra = "import Section from '../Section'\n"
    if 'vendorKeyDetail' in body: extra += "import { vendorKeyDetail } from '../shared'\n"
    if tab == 'People': extra += "import WhatsAppAdminPanel from '../../../components/admin/WhatsAppAdminPanel'\n"
    open(f'src/screens/admin/tabs/{tab}Panels.jsx', 'w', encoding='utf8').write(
        f"// Batch 14A - the {tab} tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).\n"
        + imps + '\n' + extra + '\n' + body + '\n\nexport { ' + ', '.join(panels) + ' }\n')
    print(tab, len(body.split('\n')))
