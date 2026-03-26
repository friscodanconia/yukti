/**
 * Base CSS injected into every generated page.
 * The LLM uses these classes. Host injects this automatically.
 */

export const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-weight:400;font-size:1.0625rem;line-height:1.65;color:#1C1917;background:#F5F3EF;max-width:760px;margin:0 auto;padding:3rem 2rem 5rem}
@media(max-width:640px){body{padding:2rem 1.25rem 3rem}}

/* Typography */
h1{font-size:2rem;font-weight:700;line-height:1.2;letter-spacing:-0.025em;margin-bottom:0.375rem;color:#1C1917}
h2{font-size:1.375rem;font-weight:600;line-height:1.3;margin-top:2rem;margin-bottom:0.75rem;color:#1C1917}
h3{font-size:1.125rem;font-weight:600;margin-top:0.25rem;margin-bottom:0.5rem;color:#1C1917}
p{margin-bottom:1rem;color:#57534E;font-size:0.9375rem;line-height:1.65}
.subtitle{font-size:1.125rem;color:#78716C;margin-bottom:2rem;font-weight:400}

/* Layout */
.section{margin-top:2rem}
.card{background:#FFFFFF;border:1.5px solid #D6D3D1;border-radius:14px;padding:1.5rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.02)}
.card h3{margin-top:0}
.card-header{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:#A8A29E;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid #F5F5F4}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem}
.grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem}
@media(max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}}

/* Panel — for grouping inputs in a colored container */
.panel{background:#FFFFFF;border:1.5px solid #D6D3D1;border-radius:14px;padding:1.5rem}
.panel.warm{background:#FFFCF8;border-color:#E0C9A8}
.panel.cool{background:#F8FBFF;border-color:#A8C8E0}
.panel.green{background:#F7FDF9;border-color:#A8D9B8}
.panel.muted{background:#F9F8F6;border-color:#D6D3D1}

/* Slider Controls */
.control{margin-bottom:1.25rem}
.control:last-child{margin-bottom:0}
.control label{display:flex;justify-content:space-between;align-items:baseline;font-size:0.875rem;font-weight:500;margin-bottom:0.375rem;color:#44403C}
.control .val{color:#C2410C;font-weight:600;font-variant-numeric:tabular-nums;font-size:0.9375rem}
input[type=range]{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:linear-gradient(to right,#E7E5E4,#D6D3D1);outline:none;cursor:pointer;margin-top:0.125rem}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#C2410C;box-shadow:0 1px 4px rgba(194,65,12,0.3);cursor:grab;transition:transform 0.15s ease,box-shadow 0.15s ease}
input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.1);box-shadow:0 2px 8px rgba(194,65,12,0.35)}
input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.15)}

/* Form elements */
select,input[type=number],input[type=text]{font-family:inherit;font-size:0.9375rem;padding:0.625rem 0.875rem;border:1px solid #D6D3D1;border-radius:8px;background:#fff;outline:none;width:100%;transition:border-color 0.15s ease,box-shadow 0.15s ease}
select:focus,input[type=number]:focus,input[type=text]:focus{border-color:#C2410C;box-shadow:0 0 0 3px rgba(194,65,12,0.08)}
button{font-family:inherit;font-size:0.9375rem;padding:0.625rem 1.25rem;border:1px solid #D6D3D1;border-radius:8px;background:#fff;cursor:pointer;font-weight:500;transition:all 0.15s ease;color:#44403C}
button:hover{border-color:#C2410C;color:#C2410C;background:#FFFBF7}
button.primary{background:#C2410C;color:#fff;border-color:#C2410C;font-weight:600}
button.primary:hover{background:#9A3412}

/* Output cards */
.output{background:#FFFFFF;border-radius:12px;padding:1.25rem 1rem;text-align:center;border:1.5px solid #D6D3D1}
.output.highlight{background:#FFF7ED;border:2px solid #EA580C;box-shadow:0 2px 8px rgba(234,88,12,0.1)}
.output .label{font-size:0.6875rem;color:#A8A29E;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:0.375rem}
.output .value{font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums;color:#1C1917;letter-spacing:-0.01em}
.output .value.green{color:#16A34A}
.output .value.red{color:#DC2626}
.output .value.amber{color:#D97706}
.output .sub{font-size:0.8125rem;color:#78716C;margin-top:0.25rem}

/* Result banner — for a big hero result */
.result-banner{background:linear-gradient(135deg,#FFF7ED 0%,#FFFBF5 100%);border:2px solid #FDBA74;border-radius:16px;padding:2rem;text-align:center;margin:1.5rem 0}
.result-banner .value{font-size:2.25rem;font-weight:700;color:#C2410C;letter-spacing:-0.02em}
.result-banner .label{font-size:0.875rem;color:#9A3412;font-weight:500;margin-top:0.25rem}

/* Comparison columns */
.vs-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin:1rem 0}
.vs-grid .vs-col{padding:1.5rem;border-radius:14px}
.vs-grid .vs-col:first-child{background:#FFFCF8;border:1.5px solid #E0C9A8}
.vs-grid .vs-col:last-child{background:#F7FDF9;border:1.5px solid #A8D9B8}
.vs-divider{display:flex;align-items:center;justify-content:center;padding:0 1rem;font-size:0.875rem;font-weight:600;color:#A8A29E}
@media(max-width:640px){.vs-grid{grid-template-columns:1fr;gap:0.75rem}.vs-divider{padding:0.5rem 0}}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:0.9375rem;margin-top:0.5rem}
th{text-align:left;font-weight:600;padding:0.75rem 1rem;border-bottom:2px solid #E7E5E4;font-size:0.75rem;color:#A8A29E;text-transform:uppercase;letter-spacing:0.05em}
td{padding:0.75rem 1rem;border-bottom:1px solid #F5F5F4;color:#44403C}
tr:hover td{background:#FAF9F7}
tr:last-child td{border-bottom:none}
td.win{color:#16A34A;font-weight:600}
td.lose{color:#DC2626;font-weight:600}

/* Tabs */
.tab-bar{display:flex;gap:0;background:#EEECEB;border-radius:10px;padding:4px;margin-bottom:1.5rem;width:fit-content}
.tab{padding:0.5rem 1.25rem;font-size:0.875rem;font-weight:500;cursor:pointer;border-radius:7px;color:#78716C;transition:all 0.15s ease;user-select:none}
.tab.active{background:#fff;color:#1C1917;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.tab:hover:not(.active){color:#44403C}

/* Tags */
.tag{display:inline-block;font-size:0.75rem;padding:0.25rem 0.75rem;border-radius:6px;font-weight:600;letter-spacing:0.02em}
.tag.green{background:#DCFCE7;color:#166534}
.tag.red{background:#FEE2E2;color:#991B1B}
.tag.amber{background:#FFF7ED;color:#9A3412}
.tag.gray{background:#F5F5F4;color:#57534E}

/* Progress bar */
.progress-bar{width:100%;height:8px;background:#E7E5E4;border-radius:4px;overflow:hidden;margin:0.5rem 0}
.progress-fill{height:100%;background:#C2410C;border-radius:4px;transition:width 0.3s ease}
.progress-fill.green{background:#16A34A}

/* Meter / bar chart row */
.meter-row{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem}
.meter-label{font-size:0.875rem;font-weight:500;color:#44403C;min-width:100px}
.meter-bar{flex:1;height:24px;background:#F5F5F4;border-radius:6px;overflow:hidden;position:relative}
.meter-fill{height:100%;border-radius:6px;transition:width 0.3s ease}
.meter-value{font-size:0.8125rem;font-weight:600;font-variant-numeric:tabular-nums;min-width:80px;text-align:right}

/* Divider */
.divider{border:none;border-top:1px solid #E7E5E4;margin:1.5rem 0}

/* Sources */
.sources{margin-top:3rem;padding-top:1.25rem;border-top:1px solid #E7E5E4;font-size:0.8125rem;color:#A8A29E}
.sources a{color:#C2410C;text-decoration:none;font-weight:500}
.sources a:hover{text-decoration:underline}

/* Animation */
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeIn 0.25s ease}

/* Utility */
.text-muted{color:#78716C}
.text-sm{font-size:0.875rem}
.text-xs{font-size:0.8125rem}
.text-right{text-align:right}
.text-center{text-align:center}
.font-mono{font-family:'SF Mono','Fira Code',monospace;font-size:0.875rem}
.font-semibold{font-weight:600}
.mt-0{margin-top:0}
.mt-1{margin-top:0.5rem}
.mt-2{margin-top:1rem}
.mt-3{margin-top:1.5rem}
.mb-0{margin-bottom:0}
.mb-1{margin-bottom:0.5rem}
.mb-2{margin-bottom:1rem}
.gap-sm{gap:0.5rem}
.flex{display:flex}
.items-center{align-items:center}
.justify-between{justify-content:space-between}
.w-full{width:100%}
`.trim();
