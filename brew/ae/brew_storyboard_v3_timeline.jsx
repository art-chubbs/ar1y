// brew launch film v3 - storyboard -> After Effects timeline (no animation)
// Run: After Effects -> File -> Scripts -> Run Script File... -> pick this file.
// Keep this script next to the "frames" folder and soundtrack_v3_temp.wav.
// Creates one 1920x1080 comp with every storyboard frame as a still layer, placed at its
// time in the film v3 cut, named per shot, with a marker (shot notes) at each shot start.
(function () {
  var FPS = 60;          // matches the rendered film; change to 30/25/24 if you prefer
  var DURATION = 93;     // seconds
  var COMP_NAME = "brew v3 \u2014 storyboard timeline";
  var LABEL_BY_ACT = { 1: 1, 2: 9, 3: 8, 4: 14, 5: 11 }; // AE label colours: red, green, blue, cyan, orange

  var shots = [
  { file: "01_typed-the-same-video.png", tin: 0, tout: 2, name: "01 \u00b7 Typed: \"The same video.\"", act: 1, actName: "The problem", visual: "Clean off-white stage, a soft green glow far below frame. One centred line typed on with a blinking caret.", motion: "Typing at a natural pace with tiny timing jitter; caret blinks on the off-beats. Ref: Numtera opens the same way (\"The same issue|\").", vo: "(none; on-screen type carries it)", sfx: "Soft key taps, room tone." },
  { file: "02_the-mess-in-depth.png", tin: 2, tout: 4.5, name: "02 \u00b7 The mess, in depth", act: 1, actName: "The problem", visual: "\"The same video, a different editor.\" Floating light-UI fragments of making video by hand: a timeline, client nudges, v3_FINAL_final.mp4, an overdue invoice. Near cards sharp, far ones blurred.", motion: "Slow parallax drift (near cards move 3\u00d7 the far ones). Rack focus breathes between layers. Ref: floating ticket UI with depth of field.", vo: "\u2014", sfx: "Muted notification pings, low in the mix." },
  { file: "03_selection-highlight.png", tin: 4.5, tout: 6.3, name: "03 \u00b7 Selection highlight", act: 1, actName: "The problem", visual: "The words \"a different editor\" get selected, in brew green with white text, like a cursor dragging across a doc.", motion: "Highlight wipes L\u2192R in 300 ms (e-out). Cards behind keep drifting. Ref: the \"Different channels\" selection.", vo: "\u2014", sfx: "A soft text-select \"tick\"." },
  { file: "04_same-brief-again.png", tin: 6.3, tout: 8.2, name: "04 \u00b7 Same brief\u2026 again?", act: 1, actName: "The problem", visual: "\"Same brief\u2026 again?\" The near cards slide out of frame; only blurred far cards remain.", motion: "Near layer exits with gravity (down-left) over 0.5 s; type stays dead centre.", vo: "\u2014", sfx: "Exhale-like whoosh." },
  { file: "05_stop.png", tin: 8.2, tout: 9.4, name: "05 \u00b7 \"Stop\"", act: 1, actName: "The problem", visual: "One giant word, \"Stop\", crashing toward camera with horizontal motion blur and a ghost trail.", motion: "Scale 0.7 \u2192 1.15 with a 6-frame directional blur, then snaps sharp. Ref: Numtera's \"Stop\".", vo: "\u2014", sfx: "Sub drop + whoosh hit." },
  { file: "06_stop-assembling-videos.png", tin: 9.4, tout: 11, name: "06 \u00b7 \"Stop assembling videos.\"", act: 1, actName: "The problem", visual: "\"Stop\" settles small; \"assembling videos.\" resolves out of blur beside it, one word at a time.", motion: "Each word focus-pulls in (blur 18 \u2192 0) with a 120 ms stagger. A thin green arc sweeps behind.", vo: "\u2014", sfx: "Two soft clicks on the words." },
  { file: "07_meet-focus-pull.png", tin: 11, tout: 12.3, name: "07 \u00b7 \"Meet\" focus pull", act: 2, actName: "Meet brew", visual: "The gradient takes over: off-white top, green \u2192 teal glow rising from below. \"Meet\" pulls into focus left to right: M sharp, \"et\" still soft.", motion: "Rack focus across the word in 600 ms. Glow breathes up 5%. Ref: Numtera's thumbnail \"Meet\".", vo: "\"Meet\u2026\"", sfx: "Music enters: warm pad + light pulse." },
  { file: "08_meet-mark-brew.png", tin: 12.3, tout: 14.3, name: "08 \u00b7 Meet [mark] brew", act: 2, actName: "Meet brew", visual: "\"Meet  [e]  brew\": the brew mark (green viewfinder brackets holding a green \"e\") slides in between the two words, then \"brew\" lands in the wordmark style.", motion: "Mark enters with a short horizontal blur, brackets snap closed (overshoot). Ref: the Numtera icon dropping between \"Meet\" and the name.", vo: "\"\u2026brew.\"", sfx: "The brew signature chord." },
  { file: "09_positioning-line.png", tin: 14.3, tout: 17.3, name: "09 \u00b7 Positioning line", act: 2, actName: "Meet brew", visual: "\"The AI-powered video studio, watched by people.\" \"watched by people\" in brew green. Calm, centred, small.", motion: "Words fade-rise in 40 ms stagger; green words arrive last with a tiny glow pulse.", vo: "\"The AI-powered video studio, watched by people.\"", sfx: "Pad swells." },
  { file: "10_product-reveal-in-perspective.png", tin: 17.3, tout: 20.3, name: "10 \u00b7 Product reveal in perspective", act: 2, actName: "Meet brew", visual: "brew Studio (light theme) sweeps up in 3D perspective out of the glow. Top-right label: \"For channels that post every week\".", motion: "Camera cranes down + rotates 18\u00b0 \u2192 6\u00b0 over 2.5 s. Heavy depth of field on the window's far edge. Ref: the \"For Complex Operations\" reveal.", vo: "\"For channels that post every week.\"", sfx: "Air swell, glassy shimmer as the edge catches light." },
  { file: "11_one-line-in.png", tin: 20.3, tout: 23.3, name: "11 \u00b7 One line in", act: 3, actName: "We make it", visual: "Straight-on New video screen. The topic \"Why the Panama Canal ran short of water\" is typed; the cursor clicks \"Send to brew\".", motion: "Slow push 4%. Typing with caret. Click compresses the button 2 px; a green ring pulses out.", vo: "\"Send a topic, or a script.\"", sfx: "Keys; a crisp click." },
  { file: "12_the-card-isolates.png", tin: 23.3, tout: 25, name: "12 \u00b7 The card isolates", act: 3, actName: "We make it", visual: "The new project card lifts out of the interface and floats alone in white space; the app behind it melts into blur.", motion: "Card scales 1 \u2192 1.4 toward camera while the UI behind defocuses (blur 0 \u2192 24). Ref: the single ticket card pulled out of the inbox.", vo: "\u2014", sfx: "Soft lift whoosh." },
  { file: "13_hero-the-production-panel.png", tin: 25, tout: 31.5, name: "13 \u00b7 HERO: the production panel", act: 3, actName: "We make it", visual: "Split screen. Left, light: the project card. Right, brew-dark: a monospace system panel ticking down the whole job: topic received \u2192 researching 14 sources \u2192 verified source found \u2192 script \u2192 voice \u2192 edit assembled. A green arrow links card to panel.", motion: "Dark panel wipes in from the right (shape transition, hard vertical edge). Rows land one per beat over a 6 s hold (the reference's longest beat); progress bars fill in real time. Ref: Numtera's \"Connected to your infrastructure\" knowledge-lock moment.", vo: "\"We research it, write it, voice it, and cut it.\"", sfx: "Beat drops in; a mechanical tick per row." },
  { file: "14_a-person-reviews-it-frame-by-frame.png", tin: 31.5, tout: 33.5, name: "14 \u00b7 A person reviews it { frame by frame }", act: 3, actName: "We make it", visual: "White stage. \"A person reviews it { frame by frame }\" with the braces and phrase in green IBM Plex Mono.", motion: "Sentence fades in; the braced phrase types on last. Ref: \"Agent Approves it as { learning }\".", vo: "\"Then a person reviews it, frame by frame.\"", sfx: "Music thins to the pad." },
  { file: "15_shape-morph-phrase-bar.png", tin: 33.5, tout: 35, name: "15 \u00b7 Shape morph: phrase \u2192 bar", act: 3, actName: "We make it", visual: "The braced phrase stretches into a full-width green bar reading \"reviewing\u2026\" with a progress track.", motion: "Shape transition: the text block's bounds morph into a 1700 px bar (e-in-out, 500 ms) and the text cross-dissolves to mono \"reviewing\u2026\". Ref: \"{ learning }\" \u2192 \"learning\u2026\" bar.", vo: "\u2014", sfx: "Rising tone that tracks the bar." },
  { file: "16_review-card-scan-line.png", tin: 35, tout: 38.5, name: "16 \u00b7 Review card + scan line", act: 3, actName: "We make it", visual: "The bar is now the green header of a small review card: the Rose Freedman frame, a scan line sweeping across it, and a log underneath: \"Named people match the narration \u2713 / Places dated and sourced \u2713 / Numbers legible on pause \u2713\".", motion: "Scan line passes top \u2192 bottom twice (teal glow). Log lines type on in mono. Ref: the ticket card being scanned.", vo: "\"Every name, every place, every number. Checked.\"", sfx: "Soft scanner hum; ticks." },
  { file: "17_review-complete.png", tin: 38.5, tout: 40.5, name: "17 \u00b7 Review complete", act: 3, actName: "We make it", visual: "Card collapses to a compact confirmation: \"Review complete \u00b7 Approved for delivery\" with the reviewer: \"Watched by Maya K. \u00b7 all 54 seconds\".", motion: "Card height animates down (shape morph) with content cross-fading; a check draws on.", vo: "\u2014", sfx: "Warm confirmation tone." },
  { file: "18_it-turns-your-idea-into.png", tin: 40.5, tout: 41.7, name: "18 \u00b7 it turns your idea into\u2026", act: 3, actName: "We make it", visual: "brew-dark stage with green and teal light leaks in opposite corners. \"it turns your idea into\" small, centred, soft grey-white.", motion: "Words drift in with blur \u2192 sharp. Light leaks slowly rotate. Ref: \"it turns the solution into\".", vo: "\"It turns your idea into\u2026\"", sfx: "Bass swell." },
  { file: "19_a-finished-file.png", tin: 41.7, tout: 44, name: "19 \u00b7 [ A finished file ]", act: 3, actName: "We make it", visual: "brew's viewfinder brackets close around \"A finished file\" in green. The brackets are the brand mark, so this is the logo device doing the talking.", motion: "Brackets snap in with overshoot; then the camera zooms THROUGH the brackets (they fly past the lens) into the next shot. Ref: \"[ Reusable knowledge ]\".", vo: "\"\u2026a finished file.\"", sfx: "Snap + whoosh-through." },
  { file: "20_delivered-in-the-library.png", tin: 44, tout: 47.5, name: "20 \u00b7 Delivered, in the Library", act: 3, actName: "We make it", visual: "Light Library screen in soft perspective; the Panama film appears at the top as \"Delivered \u00b7 Day 3\" with a green chip. Cursor hovers it.", motion: "New card drops in, pushing the grid down (layout animation). Slow lateral glide. Glow from bottom-right.", vo: "\"Ready to upload. Day three.\"", sfx: "Card drop; soft ding." },
  { file: "21_delivered.png", tin: 47.5, tout: 49, name: "21 \u00b7 \"Delivered.\"", act: 3, actName: "We make it", visual: "brew gradient. One big word, \"Delivered.\", resolving out of blur.", motion: "Focus pull, 500 ms. Hold. Ref: \"Auto-resolved\".", vo: "\u2014", sfx: "Hit on the downbeat." },
  { file: "22_and.png", tin: 49, tout: 50.3, name: "22 \u00b7 \"And\"", act: 3, actName: "We make it", visual: "brew-dark. A huge white \"And\" sweeping left with heavy motion blur.", motion: "Whip-pan: the word travels L 400 px with directional blur. Ref: Numtera's \"And\".", vo: "\"And\u2026\"", sfx: "Whoosh L." },
  { file: "23_you-can-type-the-shot.png", tin: 50.3, tout: 53.8, name: "23 \u00b7 You can type the shot", act: 4, actName: "You drive it", visual: "Dark. \"when you need one exact shot\" then \"you can type it yourself\", with \"type\" in teal (b-roll's colour on the site).", motion: "Words space out and slide together (tracking animation). Ref: \"You can define the response\".", vo: "\"When you need one exact shot, you can type it yourself.\"", sfx: "Light keys." },
  { file: "24_glass-menu-ai-b-roll.png", tin: 53.8, tout: 56, name: "24 \u00b7 Glass menu \u2192 AI b-roll", act: 4, actName: "You drive it", visual: "Bright teal-white gradient. A frosted brew menu opens; the cursor slides to \"AI b-roll\".", motion: "Menu unfolds from its header (scaleY with 40 ms item stagger); hover highlight follows cursor. Ref: Numtera menu \u2192 Workflows.", vo: "\u2014", sfx: "Glassy tick per item." },
  { file: "25_macro-filling-the-shot.png", tin: 56, tout: 59.5, name: "25 \u00b7 Macro: filling the shot", act: 4, actName: "You drive it", visual: "Macro on two form fields, huge and soft-edged: \"Describe the shot\" \u2192 \"Our serum bottle, in a hand, on wet marble\"; \"Length\" \u2192 \"10 s\".", motion: "Fields slide up as the camera tracks down the form; text types in. Shallow depth of field, background washed teal. Ref: \"Workflow Name (Button Label)\" macro.", vo: "\u2014", sfx: "Close keys." },
  { file: "26_four-takes-keep-one.png", tin: 59.5, tout: 63, name: "26 \u00b7 Four takes, keep one", act: 4, actName: "You drive it", visual: "Glass panel with four generated takes in a 2\u00d72. One gets a teal outline and a \"Keep\" button. Credits counter top-right.", motion: "Takes resolve from soft noise to sharp, 60 ms stagger. Cursor clicks Keep; the chosen take lifts forward.", vo: "\"Download it in minutes.\"", sfx: "Shimmer resolve; click." },
  { file: "27_ugc-ad-step-by-step.png", tin: 63, tout: 68.5, name: "27 \u00b7 UGC ad, step by step", act: 4, actName: "You drive it", visual: "The kept take is now inside a vertical ad on the left. Right: numbered steps like a builder: 1 HOOK \"I was so wrong about serums\" \u00b7 2 DEMO \"30 seconds, morning light\" \u00b7 3 PAYOFF \"okay this actually worked\". Coral tags.", motion: "Steps build one at a time over 5 s (about 1.5 s each, like the reference's workflow builder), with a connecting line drawing down. Ref: Numtera's numbered workflow steps (MESSAGE / INPUT).", vo: "\"Ads that look shot, not generated.\"", sfx: "One pluck per step." },
  { file: "28_one-edit-nine-voices.png", tin: 68.5, tout: 72.5, name: "28 \u00b7 One edit, nine voices", act: 4, actName: "You drive it", visual: "A single player centre-frame; a vertical list of the nine languages beside it with the selection stepping EN \u2192 DE \u2192 FR. The waveform under the player reshapes each time.", motion: "Selection steps on each beat; waveform morphs; picture never moves. Small chip: \"Upload it nine times, not once.\"", vo: "\"And upload it nine times, not once.\"", sfx: "The same phrase in three languages, crossfading." },
  { file: "29_the-channel-keeps-posting.png", tin: 72.5, tout: 75, name: "29 \u00b7 The channel keeps posting", act: 5, actName: "Close", visual: "Bright gradient, one calm line: \"The channel keeps posting. Every week.\" with \"Every week.\" in brew green.", motion: "Words fade in spaced wide, then tracking tightens. Ref: \"The system gets smarter \u2014 forever\".", vo: "\"Your channel keeps posting, every week.\"", sfx: "Pad + soft pulse." },
  { file: "30_others-hand-you-a-tool.png", tin: 75, tout: 77, name: "30 \u00b7 Others hand you a tool.", act: 5, actName: "Close", visual: "White stage, near-black text: \"Others hand you a tool.\" \"tool\" slightly out of focus.", motion: "Line types on; \"tool\" drifts out of focus as it lands. Ref: \"They close tickets\".", vo: "\"Others hand you a tool.\"", sfx: "One dry key click." },
  { file: "31_we-hand-you-the-video.png", tin: 77, tout: 79.5, name: "31 \u00b7 We hand you the video.", act: 5, actName: "Close", visual: "\"We hand you the video.\" in brew green on the gradient; \"video\" sharp, the rest softening.", motion: "Cross-dissolve from the previous line with a 6 px vertical slide. Ref: \"We Eliminate them\".", vo: "\"We hand you the video.\"", sfx: "brew signature, soft." },
  { file: "32_logo.png", tin: 79.5, tout: 82.5, name: "32 \u00b7 Logo", act: 5, actName: "Close", visual: "White glow. The brew mark and wordmark, side by side, mid-size, calm.", motion: "Mark lands first; letters of \"brew\" type on (b, r, e, w) with the green \"e\" last. Ref: Numtera logo typing on.", vo: "\u2014", sfx: "Signature chord, full." },
  { file: "33_tagline-on-black.png", tin: 82.5, tout: 87.5, name: "33 \u00b7 Tagline on black", act: 5, actName: "Close", visual: "brew-dark with green and teal light leaks drifting in from the corners. Typed: \"Every frame watched by a person.\"", motion: "Typed with caret; light leaks slowly orbit. Ref: \"The self-learning support OS|\".", vo: "\"Every frame, watched by a person.\"", sfx: "Music resolves to a single held chord." },
  { file: "34_cta.png", tin: 87.5, tout: 93, name: "34 \u00b7 CTA", act: 5, actName: "Close", visual: "\"Your first video is free.\" centred on black, a green \"Send us a script \u2192\" button, and scalewithbrew.com small beneath.", motion: "Headline fades up; button pops (overshoot); URL types on. Hold 4 s, then fade to black.", vo: "\"Your first video is free.\"", sfx: "Final note; tail." }
  ];

  var root = File($.fileName).parent;
  var framesDir = new Folder(root.fsName + "/frames");
  if (!framesDir.exists) { alert("Can\u0027t find the \"frames\" folder next to this script:\n" + framesDir.fsName); return; }

  app.beginUndoGroup("brew storyboard timeline");
  var proj = app.project || app.newProject();
  var bin = proj.items.addFolder("brew v3 storyboard");
  var stillsBin = proj.items.addFolder("frames"); stillsBin.parentFolder = bin;
  var comp = proj.items.addComp(COMP_NAME, 1920, 1080, 1, DURATION, FPS);
  comp.parentFolder = bin;
  comp.bgColor = [0.043, 0.043, 0.047];

  var missing = [];
  // Add in reverse so shot 01 sits at the top of the layer stack.
  for (var i = shots.length - 1; i >= 0; i--) {
    var s = shots[i];
    var f = new File(framesDir.fsName + "/" + s.file);
    if (!f.exists) { missing.push(s.file); continue; }
    var io = new ImportOptions(f);
    io.sequence = false;
    var item = proj.importFile(io);
    item.parentFolder = stillsBin;
    var L = comp.layers.add(item);
    L.startTime = s.tin;
    L.inPoint = s.tin;
    L.outPoint = s.tout;
    L.name = s.name;
    L.label = LABEL_BY_ACT[s.act] || 0;
    L.comment = s.visual;
    var mv = new MarkerValue(s.name);
    mv.comment = s.name + "  [" + s.actName + "]\rVISUAL: " + s.visual + "\rMOTION: " + s.motion + "\rVO: " + s.vo + "\rSFX: " + s.sfx;
    mv.duration = s.tout - s.tin;
    var placed = false;
    try { comp.markerProperty.setValueAtTime(s.tin, mv); placed = true; } catch (e) {}
    if (!placed) L.property("Marker").setValueAtTime(s.tin, mv);
  }

  var wav = new File(root.fsName + "/soundtrack_v3_temp.wav");
  if (wav.exists) {
    var a = proj.importFile(new ImportOptions(wav));
    a.parentFolder = bin;
    var AL = comp.layers.add(a);
    AL.name = "Soundtrack (temp)";
    AL.moveToEnd();
  }

  comp.openInViewer();
  app.endUndoGroup();
  alert("Done: " + (shots.length - missing.length) + " shots placed in \"" + comp.name + "\"." + (missing.length ? "\nMissing: " + missing.join(", ") : ""));
})();
