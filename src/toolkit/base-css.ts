/**
 * Base CSS — design language ported from Vaani (vaani.soumyosinha.com).
 * Warm cream palette, glass-card containers, terracotta accent.
 */

export const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,600;1,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{
  font-family:'Outfit',system-ui,-apple-system,sans-serif;
  font-weight:400;font-size:0.9375rem;line-height:1.6;
  color:#1c1917;
  background:#f5ede0;
  max-width:740px;margin:0 auto;padding:2.5rem 1.75rem 4rem;
  letter-spacing:0.01em;
}
@media(max-width:640px){body{padding:1.75rem 1.25rem 3rem;font-size:0.875rem}}

/* ── Typography ── */
h1{font-size:1.625rem;font-weight:700;line-height:1.15;letter-spacing:-0.02em;color:#1c1917;margin-bottom:0.25rem}
h2{font-size:1.125rem;font-weight:600;line-height:1.3;letter-spacing:-0.01em;color:#1c1917;margin-top:1.75rem;margin-bottom:0.5rem}
h3{font-size:0.9375rem;font-weight:600;color:#1c1917;margin-top:0;margin-bottom:0.375rem}
p{margin-bottom:0.75rem;color:#78716c;font-size:0.8125rem;line-height:1.6}
.subtitle{font-size:0.875rem;color:#96897a;margin-bottom:1.75rem;font-weight:400}
@media(max-width:640px){h1{font-size:1.375rem}}

/* ── Glass Card — primary container ── */
.card{
  background:#faf6ef;
  border:1.5px solid rgba(191,176,154,0.3);
  border-radius:16px;
  padding:1.25rem;
  margin-bottom:0.75rem;
  box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.02);
}
.card h3{margin-top:0}
.card-header{font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:#96897a;margin-bottom:0.75rem;padding-bottom:0.625rem;border-bottom:1px solid rgba(191,176,154,0.2)}

/* ── Layout ── */
.section{margin-top:1.5rem}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:0.625rem}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.625rem}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:0.625rem}
@media(max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}}

/* ── Panels ── */
.panel{background:#faf6ef;border:1.5px solid rgba(191,176,154,0.3);border-radius:16px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.02)}
.panel.warm{background:#fef3ec;border-color:rgba(194,101,42,0.22)}
.panel.cool{background:#eef4fb;border-color:rgba(100,150,200,0.22)}
.panel.green{background:#eefbf2;border-color:rgba(90,143,110,0.22)}
.panel.muted{background:#ede5d8;border-color:rgba(191,176,154,0.3)}

/* ── Slider Controls ── */
.control{margin-bottom:1rem}
.control:last-child{margin-bottom:0}
.control label{display:flex;justify-content:space-between;align-items:baseline;font-size:0.8125rem;font-weight:500;margin-bottom:0.5rem;color:#44403c}
.control .val{
  color:#c2652a;font-weight:600;font-variant-numeric:tabular-nums;font-size:0.875rem;
  background:#fef3ec;padding:0.125rem 0.5rem;border-radius:6px;border:1px solid rgba(194,101,42,0.15);
}
input[type=range]{
  -webkit-appearance:none;width:100%;height:6px;border-radius:100px;
  background:#ddd2c0;outline:none;cursor:pointer;margin:0.375rem 0;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:22px;height:22px;border-radius:50%;
  background:#c2652a;
  box-shadow:0 1px 4px rgba(194,101,42,0.3),0 0 0 3px rgba(194,101,42,0.08);
  cursor:grab;transition:all 0.12s ease;
}
input[type=range]::-webkit-slider-thumb:hover{
  transform:scale(1.1);
  box-shadow:0 2px 8px rgba(194,101,42,0.35),0 0 0 5px rgba(194,101,42,0.1);
}
input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.05)}

/* ── Form Elements ── */
select,input[type=number],input[type=text]{
  font-family:inherit;font-size:0.8125rem;padding:0.5rem 0.75rem;
  border:1.5px solid rgba(191,176,154,0.3);border-radius:10px;
  background:#faf6ef;outline:none;width:100%;color:#1c1917;
  transition:border-color 0.12s,box-shadow 0.12s;
}
select:focus,input[type=number]:focus,input[type=text]:focus{border-color:#c2652a;box-shadow:0 0 0 3px rgba(194,101,42,0.1)}
button{
  font-family:inherit;font-size:0.8125rem;padding:0.5rem 1rem;
  border:1.5px solid rgba(191,176,154,0.3);border-radius:10px;
  background:#faf6ef;cursor:pointer;font-weight:500;transition:all 0.12s;color:#44403c;
}
button:hover{border-color:#c2652a;color:#c2652a;background:#fef3ec}
button.primary{background:#1c1917;color:#f5ede0;border-color:#1c1917;font-weight:500}
button.primary:hover{background:#292524}
button.accent{background:#c2652a;color:#fff;border-color:#c2652a;font-weight:500}
button.accent:hover{background:#a8521f}

/* ── Output Cards — metric display ── */
.output{
  background:#faf6ef;border-radius:14px;padding:1rem 0.875rem;text-align:center;
  border:1.5px solid rgba(191,176,154,0.3);
  box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.02);
}
.output.highlight{
  background:#1c1917;border-color:#1c1917;
  box-shadow:0 4px 20px rgba(0,0,0,0.12);
}
.output.highlight .label{color:#96897a}
.output.highlight .value{color:#f5ede0}
.output.highlight .sub{color:#78716c}
.output .label{font-size:0.5625rem;color:#96897a;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:0.25rem}
.output .value{font-size:1.25rem;font-weight:700;font-variant-numeric:tabular-nums;color:#1c1917;letter-spacing:-0.02em;line-height:1.2}
.output .value.green{color:#5a8f6e}
.output .value.red{color:#bf4f4f}
.output .value.amber{color:#c2652a}
.output .sub{font-size:0.6875rem;color:#96897a;margin-top:0.125rem}

/* ── Result Banner — hero number ── */
.result-banner{
  background:linear-gradient(135deg,#1c1917 0%,#292524 100%);
  border-radius:16px;padding:1.5rem;text-align:center;margin:1rem 0;
  box-shadow:0 4px 24px rgba(0,0,0,0.15);
}
.result-banner .value{font-size:2rem;font-weight:700;color:#f5ede0;letter-spacing:-0.03em;line-height:1.1}
.result-banner .label{font-size:0.6875rem;color:#96897a;font-weight:500;margin-top:0.375rem;text-transform:uppercase;letter-spacing:0.08em}
@media(max-width:640px){.result-banner{padding:1.25rem}.result-banner .value{font-size:1.5rem}}

/* ── Comparison Columns ── */
.vs-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin:0.75rem 0}
.vs-grid .vs-col{padding:1.25rem;border-radius:14px}
.vs-grid .vs-col:first-child{background:#fef3ec;border:1.5px solid rgba(194,101,42,0.22)}
.vs-grid .vs-col:last-child{background:#eefbf2;border:1.5px solid rgba(90,143,110,0.22)}
.vs-divider{display:flex;align-items:center;justify-content:center;padding:0 0.625rem;font-size:0.6875rem;font-weight:700;color:#bfb09a;text-transform:uppercase;letter-spacing:0.1em}
@media(max-width:640px){.vs-grid{grid-template-columns:1fr;gap:0.5rem}.vs-divider{padding:0.25rem 0}}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:0.8125rem;margin-top:0.375rem}
th{text-align:left;font-weight:600;padding:0.5rem 0.75rem;border-bottom:1.5px solid rgba(191,176,154,0.3);font-size:0.6875rem;color:#96897a;text-transform:uppercase;letter-spacing:0.06em}
td{padding:0.5rem 0.75rem;border-bottom:1px solid rgba(191,176,154,0.15);color:#44403c;font-variant-numeric:tabular-nums}
tr:hover td{background:rgba(191,176,154,0.06)}
tr:last-child td{border-bottom:none}
td.win{color:#5a8f6e;font-weight:600}
td.lose{color:#bf4f4f;font-weight:600}

/* ── Tabs — pill style ── */
.tab-bar{display:inline-flex;background:#ede5d8;border-radius:10px;padding:3px;margin-bottom:1.25rem;gap:2px}
.tab{padding:0.375rem 0.875rem;font-size:0.8125rem;font-weight:500;cursor:pointer;border-radius:8px;color:#78716c;transition:all 0.12s;user-select:none}
.tab.active{background:#faf6ef;color:#1c1917;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.tab:hover:not(.active){color:#44403c}

/* ── Tags / Badges ── */
.tag{display:inline-flex;align-items:center;font-size:0.6875rem;padding:0.125rem 0.5rem;border-radius:100px;font-weight:500}
.tag.green{background:rgba(90,143,110,0.12);color:#5a8f6e}
.tag.red{background:rgba(191,79,79,0.12);color:#bf4f4f}
.tag.amber{background:#fef3ec;color:#c2652a}
.tag.gray{background:#ede5d8;color:#57534e}

/* ── Progress Bar ── */
.progress-bar{width:100%;height:6px;background:#ddd2c0;border-radius:100px;overflow:hidden;margin:0.375rem 0}
.progress-fill{height:100%;border-radius:100px;transition:width 0.3s ease;background:#c2652a}
.progress-fill.green{background:#5a8f6e}

/* ── Meter Rows ── */
.meter-row{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem}
.meter-label{font-size:0.75rem;font-weight:500;color:#44403c;min-width:72px}
.meter-bar{flex:1;height:16px;background:#ede5d8;border-radius:6px;overflow:hidden}
.meter-fill{height:100%;border-radius:6px;transition:width 0.3s ease}
.meter-value{font-size:0.6875rem;font-weight:600;font-variant-numeric:tabular-nums;min-width:56px;text-align:right;color:#57534e}

/* ── Divider ── */
.divider{border:none;border-top:1.5px solid rgba(191,176,154,0.2);margin:1.25rem 0}

/* ── Sources / Trust ── */
.sources{margin-top:1.75rem;padding-top:0.875rem;border-top:1.5px solid rgba(191,176,154,0.2);font-size:0.6875rem;color:#96897a;line-height:1.5}
.sources p{font-size:0.6875rem;color:#96897a;margin-bottom:0.25rem}
.sources strong{color:#78716c;font-weight:600}
.sources a{color:#c2652a;text-decoration:none;font-weight:500}
.sources a:hover{text-decoration:underline}

/* ── Animation ── */
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.fade{animation:fadeIn 0.3s ease}

/* ── Utility ── */
.text-muted{color:#96897a}.text-sm{font-size:0.8125rem}.text-xs{font-size:0.6875rem}
.text-right{text-align:right}.text-center{text-align:center}
.font-mono{font-family:ui-monospace,'SF Mono',monospace;font-size:0.8125rem}
.font-semibold{font-weight:600}
.mt-0{margin-top:0}.mt-1{margin-top:0.375rem}.mt-2{margin-top:0.75rem}.mt-3{margin-top:1.25rem}
.mb-0{margin-bottom:0}.mb-1{margin-bottom:0.375rem}.mb-2{margin-bottom:0.75rem}
.gap-sm{gap:0.375rem}.flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}.w-full{width:100%}
`.trim();
