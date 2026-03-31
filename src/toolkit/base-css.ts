/**
 * Base CSS — design language ported from Vaani (vaani.soumyosinha.com).
 * Warm cream palette, glass-card containers, terracotta accent.
 * v2: stronger visual hierarchy — increased border opacity, deeper shadows,
 *     layered card backgrounds, auto slider-fill via CSS custom property.
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
body::before{
  content:'';
  position:fixed;
  inset:0;
  background:
    radial-gradient(circle at 15% 20%,rgba(255,247,236,0.65),transparent 45%),
    radial-gradient(circle at 90% 10%,rgba(255,230,204,0.45),transparent 40%);
  z-index:-2;
}
body::after{
  content:'';
  position:fixed;
  inset:0;
  background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23d6c4ad' opacity='0.35'/%3E%3C/svg%3E\");
  opacity:0.45;
  z-index:-1;
  mix-blend-mode:soft-light;
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
  background:linear-gradient(160deg,#faf6ef 0%,#f5f0e6 100%);
  border:1.5px solid rgba(191,176,154,0.5);
  border-radius:18px;
  padding:1.5rem;
  margin-bottom:0.875rem;
  box-shadow:0 2px 6px rgba(0,0,0,0.07),0 8px 28px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.75);
  position:relative;
  overflow:hidden;
}
.card h3{margin-top:0}
.card-header{font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:#96897a;margin-bottom:0.875rem;padding-bottom:0.75rem;border-bottom:1.5px solid rgba(191,176,154,0.25)}
.card::before{
  content:'';
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0));
  opacity:0.65;
  pointer-events:none;
}
.card::after{
  content:'';
  position:absolute;
  inset:1px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,0.35);
  pointer-events:none;
}

/* ── Layout ── */
.section{margin-top:1.5rem}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:0.625rem}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.625rem}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:0.625rem}
@media(max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}}

/* ── Panels ── */
.panel{
  background:#faf6ef;
  border:1.5px solid rgba(191,176,154,0.45);
  border-radius:16px;padding:1.25rem;
  box-shadow:0 2px 8px rgba(0,0,0,0.06),0 6px 20px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.6)
}
.panel.warm{background:#fef3ec;border-color:rgba(194,101,42,0.3)}
.panel.cool{background:#eef4fb;border-color:rgba(100,150,200,0.28)}
.panel.green{background:#eefbf2;border-color:rgba(90,143,110,0.28)}
.panel.muted{background:#ede5d8;border-color:rgba(191,176,154,0.4)}

/* ── Slider Controls ── */
.control{margin-bottom:1rem}
.control:last-child{margin-bottom:0}
.control label{display:flex;justify-content:space-between;align-items:baseline;font-size:0.8125rem;font-weight:500;margin-bottom:0.5rem;color:#44403c}
.control .val{
  color:#c2652a;font-weight:600;font-variant-numeric:tabular-nums;font-size:0.875rem;
  background:#fef3ec;padding:0.125rem 0.5rem;border-radius:6px;border:1px solid rgba(194,101,42,0.2);
}
/* Slider track fill via CSS custom property --fill (updated by base script) */
input[type=range]{
  -webkit-appearance:none;width:100%;height:8px;border-radius:100px;
  background:linear-gradient(90deg,#c2652a var(--fill,50%),#ddd2c0 var(--fill,50%));
  outline:none;cursor:pointer;margin:0.5rem 0;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:22px;height:22px;border-radius:50%;
  background:#c2652a;
  box-shadow:0 1px 4px rgba(194,101,42,0.35),0 0 0 3px rgba(194,101,42,0.1);
  cursor:grab;transition:box-shadow 0.12s ease,transform 0.12s ease;
}
input[type=range]::-webkit-slider-thumb:hover{
  transform:scale(1.12);
  box-shadow:0 2px 10px rgba(194,101,42,0.4),0 0 0 5px rgba(194,101,42,0.12);
}
input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.05)}

/* ── Form Elements ── */
select,input[type=number],input[type=text]{
  font-family:inherit;font-size:0.8125rem;padding:0.5rem 0.75rem;
  border:1.5px solid rgba(191,176,154,0.4);border-radius:10px;
  background:#faf6ef;outline:none;width:100%;color:#1c1917;
  transition:border-color 0.12s,box-shadow 0.12s;
}
select:focus,input[type=number]:focus,input[type=text]:focus{border-color:#c2652a;box-shadow:0 0 0 3px rgba(194,101,42,0.12)}
button{
  font-family:inherit;font-size:0.8125rem;padding:0.5rem 1rem;
  border:1.5px solid rgba(191,176,154,0.4);border-radius:10px;
  background:#faf6ef;cursor:pointer;font-weight:500;transition:all 0.12s;color:#44403c;
}
button:hover{border-color:#c2652a;color:#c2652a;background:#fef3ec}
button.primary{background:#1c1917;color:#f5ede0;border-color:#1c1917;font-weight:500}
button.primary:hover{background:#292524}
button.accent{background:#c2652a;color:#fff;border-color:#c2652a;font-weight:500}
button.accent:hover{background:#a8521f}

/* ── Output Cards — metric display ── */
.output{
  background:linear-gradient(145deg,#faf6ef 0%,#f3ede2 100%);
  border-radius:14px;padding:1.25rem 1rem;text-align:center;
  border:1.5px solid rgba(191,176,154,0.45);
  box-shadow:0 2px 6px rgba(0,0,0,0.06),0 6px 20px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.6);
  transition:box-shadow 0.15s ease,transform 0.15s ease;
}
.output:hover{
  box-shadow:0 4px 12px rgba(0,0,0,0.09),0 8px 28px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.6);
  transform:translateY(-1px);
}
.output.highlight{
  background:linear-gradient(145deg,#1c1917 0%,#292524 100%);
  border-color:#1c1917;
  box-shadow:0 4px 20px rgba(0,0,0,0.2),0 1px 4px rgba(0,0,0,0.12);
}
.output.highlight .label{color:#78716c}
.output.highlight .value{color:#f5ede0}
.output.highlight .sub{color:#57534e}
.output .label{font-size:0.5625rem;color:#96897a;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:0.25rem}
.output .value{font-size:1.375rem;font-weight:700;font-variant-numeric:tabular-nums;color:#1c1917;letter-spacing:-0.02em;line-height:1.2}
.output .value.green{color:#5a8f6e}
.output .value.red{color:#bf4f4f}
.output .value.amber{color:#c2652a}
.output .sub{font-size:0.6875rem;color:#96897a;margin-top:0.1875rem}
.grid-3 .output:first-child{background:linear-gradient(145deg,#1c1917 0%,#292524 100%);border-color:#1c1917;box-shadow:0 4px 20px rgba(0,0,0,0.2)}
.grid-3 .output:first-child .label{color:#78716c}
.grid-3 .output:first-child .value{color:#f5ede0}
.grid-3 .output:first-child .sub{color:#57534e}

/* ── Result Banner — hero number ── */
.result-banner{
  background:linear-gradient(135deg,#1c1917 0%,#292524 60%,#3a2e1e 100%);
  border-radius:20px;padding:2rem 1.5rem;text-align:center;margin:1rem 0;
  box-shadow:0 8px 40px rgba(0,0,0,0.22),0 2px 8px rgba(0,0,0,0.1),0 0 0 1px rgba(194,101,42,0.18);
  position:relative;overflow:hidden;
}
.result-banner::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(194,101,42,0.15) 0%,transparent 60%);pointer-events:none}
.result-banner::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(194,101,42,0.35),transparent);pointer-events:none}
.result-banner .value{font-size:2.5rem;font-weight:700;color:#f5ede0;letter-spacing:-0.03em;line-height:1.1;position:relative}
.result-banner .label{font-size:0.625rem;color:#78716c;font-weight:600;margin-top:0.375rem;text-transform:uppercase;letter-spacing:0.12em;position:relative}
.result-banner .sub{font-size:0.75rem;color:#57534e;margin-top:0.25rem;position:relative}
@media(max-width:640px){.result-banner{padding:1.5rem;border-radius:16px}.result-banner .value{font-size:1.75rem}}

/* ── Comparison Columns ── */
.vs-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin:0.75rem 0}
.vs-grid .vs-col{padding:1.25rem}
.vs-grid .vs-col:first-child{background:#fef3ec;border:1.5px solid rgba(194,101,42,0.22);border-radius:14px 0 0 14px}
.vs-grid .vs-col:last-child{background:#eefbf2;border:1.5px solid rgba(90,143,110,0.22);border-radius:0 14px 14px 0}
.vs-divider{display:flex;align-items:center;justify-content:center;padding:0 0.75rem;font-size:0.625rem;font-weight:700;color:#bfb09a;text-transform:uppercase;letter-spacing:0.1em;background:#ede5d8}
.vs-badge{display:inline-block;font-size:0.6875rem;font-weight:600;padding:0.375rem 0.625rem;border-radius:8px;margin-top:0.5rem}
.vs-badge.win{background:rgba(194,101,42,0.1);color:#c2652a}
.vs-badge.alt{background:rgba(90,143,110,0.08);color:#78716c}
@media(max-width:640px){.vs-grid{grid-template-columns:1fr;gap:0.5rem}.vs-divider{padding:0.25rem 0;background:transparent}.vs-grid .vs-col:first-child,.vs-grid .vs-col:last-child{border-radius:14px}}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:0.8125rem;margin-top:0.375rem}
th{text-align:left;font-weight:600;padding:0.625rem 0.875rem;border-bottom:2px solid rgba(191,176,154,0.35);font-size:0.6875rem;color:#78716c;text-transform:uppercase;letter-spacing:0.06em}
td{padding:0.625rem 0.875rem;border-bottom:1px solid rgba(191,176,154,0.15);color:#44403c;font-variant-numeric:tabular-nums}
tr:nth-child(even) td{background:rgba(191,176,154,0.05)}
tr:hover td{background:rgba(191,176,154,0.1)}
tr:last-child td{border-bottom:none}
td:last-child{font-weight:600;color:#1c1917}
td.win{color:#5a8f6e;font-weight:600}
td.lose{color:#bf4f4f;font-weight:600}
tfoot td,tr.total td{border-top:2px solid rgba(191,176,154,0.35);font-weight:700;color:#1c1917;font-size:0.875rem}

/* ── Tabs — pill style ── */
.tab-bar{display:inline-flex;background:#ede5d8;border-radius:10px;padding:3px;margin-bottom:1.25rem;gap:2px}
.tab{padding:0.375rem 0.875rem;font-size:0.8125rem;font-weight:500;cursor:pointer;border-radius:8px;color:#78716c;transition:all 0.12s;user-select:none}
.tab.active{background:#faf6ef;color:#1c1917;box-shadow:0 1px 4px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.7)}
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
.meter-row{display:flex;align-items:center;gap:0.625rem;margin-bottom:0.625rem}
.meter-label{font-size:0.75rem;font-weight:500;color:#44403c;min-width:72px}
.meter-bar{flex:1;height:16px;background:#ede5d8;border-radius:6px;overflow:hidden}
.meter-fill{height:100%;border-radius:6px;transition:width 0.3s ease;background:linear-gradient(90deg,#c2652a,#d4834e)}
.meter-fill.green{background:linear-gradient(90deg,#5a8f6e,#6aab80)}
.meter-fill.red{background:linear-gradient(90deg,#bf4f4f,#d06a6a)}
.meter-fill.muted{background:linear-gradient(90deg,#96897a,#aca08f)}
.meter-value{font-size:0.6875rem;font-weight:600;font-variant-numeric:tabular-nums;min-width:56px;text-align:right;color:#57534e}

/* ── Divider ── */
.divider{border:none;border-top:1.5px solid rgba(191,176,154,0.22);margin:1.25rem 0}

/* ── Sources / Trust ── */
.sources{margin-top:1.75rem;padding-top:0.875rem;border-top:1.5px solid rgba(191,176,154,0.22);font-size:0.6875rem;color:#96897a;line-height:1.5}
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

/**
 * Base JS injected into every generated tool page.
 * Handles slider track-fill updates automatically so the LLM doesn't need to.
 * Updates the --fill CSS custom property on every range input.
 */
export const BASE_SCRIPT = `
(function(){
  function syncSlider(el){
    var min=parseFloat(el.min)||0,max=parseFloat(el.max)||100,val=parseFloat(el.value)||0;
    var pct=((val-min)/(max-min)*100).toFixed(1)+'%';
    el.style.setProperty('--fill',pct);
  }
  function initSliders(){
    document.querySelectorAll('input[type=range]').forEach(function(el){
      syncSlider(el);
      el.addEventListener('input',function(){syncSlider(this);});
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSliders);
  } else {
    initSliders();
  }
  // Re-run after dynamic content changes (e.g. after calc() injects new sliders)
  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(function(){initSliders();}).observe(document.body,{childList:true,subtree:true});
  }
})();
`.trim();
