-- ============================================================================
-- TS-4 catalog seed (idempotent — every INSERT is ON CONFLICT DO NOTHING).
-- Source: docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql
-- Adaptations: (a) ON CONFLICT clauses per-table PK, (b) listable column on
-- composite-beat block (false for the 3 pat_voice_* leaves), (c) no DDL —
-- data only. INSERT order follows FK dependency (playable → track → profiles
-- → notation / media). See NH-79 §7 for the approval-gated full-reset flow.
-- ============================================================================

-- ── DRUM PATTERNS: 8 leveled rudiments (2 per group) ────────────────────────
INSERT INTO playable (id, kind, title, slug, description, level, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_ssr_debut','pattern','Single Stroke Roll (Debut)','single-stroke-roll-debut','Alternating single strokes, 8th notes — the first rudiment.',0,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Single%20Stroke%20Roll%20(Level%20Debut)&Tempo=70&Measures=1&H=|--------|&S=|oooooooo|&K=|--------|&Stickings=|RLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_dsr_debut','pattern','Double Stroke Roll (Debut)','double-stroke-roll-debut','Open roll, RRLL — 8th notes.',0,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Double%20Stroke%20Roll%20(Level%20Debut)&Tempo=70&Measures=1&H=|--------|&S=|oooooooo|&K=|--------|&Stickings=|RRLLRRLL|","source":"groovescribe-import.json"}'),
 ('pat_ssr_l2','pattern','Single Stroke Roll (L2)','single-stroke-roll-l2','Single strokes at 16th notes.',2,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Single%20Stroke%20Roll%20(Level%202)&Tempo=80&Measures=1&H=|----------------|&S=|oooooooooooooooo|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_ss4_l3','pattern','Single Stroke Four (L3)','single-stroke-four-l3','Four singles resolving to an accent.',3,'rudiment','{Single,Accent}','{drums}','{rudiment}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Single%20Stroke%20Four%20(Level%203)&Tempo=90&Measures=1&H=|----------------|&S=|oooOoooOoooOoooO|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_5sr_l4','pattern','Five Stroke Roll (L4)','five-stroke-roll-l4','RR LL R — two diddles plus an accent.',4,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Five%20Stroke%20Roll%20(Level%204)&Tempo=75&Measures=1&H=|----------------|&S=|ooooO-----------|&K=|----------------|&Stickings=|RRLLR-----------|","source":"groovescribe-import.json"}'),
 ('pat_7sr_l6','pattern','Seven Stroke Roll (L6)','seven-stroke-roll-l6','Three diddles plus an accent.',6,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Seven%20Stroke%20Roll%20(Level%206)&Tempo=85&Measures=1&H=|----------------|&S=|ooooooO---------|&K=|----------------|&Stickings=|RRLLRRL---------|","source":"groovescribe-import.json"}'),
 ('pat_swiss_l7','pattern','Swiss Army Triplet (L7)','swiss-army-triplet-l7','Flam plus two singles per triplet (RRL feel).',7,'rudiment','{Flam,Triplet}','{drums}','{rudiment,flam}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=12&Title=Swiss%20Army%20Triplet%20(Level%207)&Tempo=85&Measures=1&H=|------------|&S=|foofoofoofoo|&K=|------------|&Stickings=|RRLRRLRRLRRL|","source":"groovescribe-import.json"}'),
 ('pat_ssr_l8','pattern','Single Stroke Roll (L8)','single-stroke-roll-l8','Single strokes at 32nd notes.',8,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=32&Title=Single%20Stroke%20Roll%20(Level%208)&Tempo=65&Measures=1&H=|--------------------------------|&S=|oooooooooooooooooooooooooooooooo|&K=|--------------------------------|&Stickings=|RLRLRLRLRLRLRLRLRLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}')
ON CONFLICT (id) DO NOTHING;

-- ── DRUM PATTERNS: 1 standalone beat + 1 fill ───────────────────────────────
INSERT INTO playable (id, kind, title, slug, description, level, bpm, time_signature_numerator, time_signature_denominator, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_basic_rock','pattern','Basic Rock Beat','basic-rock-beat','Backbeat on 2 & 4, kick on 1 & 3 — the first groove.',1,100,4,4,'beat','{Rock}','{drums}','{beat,rock}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Basic%20Rock%20Beat&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--o---o-|&K=|o---o---|","source":"groovescribe-import.json"}'),
 ('pat_snare_fill_l4','pattern','16th-Note Snare Fill (L4)','16th-note-snare-fill-l4','Continuous 16th-note snare fill.',4,120,4,4,'fill','{Fill,Snare}','{drums}','{fill}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=16th-Note%20Snare%20Fill%20(Level%204)&Tempo=120&Measures=1&H=|----------------|&S=|oooooooooooooooo|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}')
ON CONFLICT (id) DO NOTHING;

-- ── COMPOSITE BEAT: full beat = hi-hat + snare + kick voices (via step) ──────
-- The 3 single-voice leaves are masked (listable=false); pat_rock_composite is
-- the real, user-visible pattern (listable=true). Step 1(b) of the seed spec.
INSERT INTO playable (id, kind, title, slug, description, level, bpm, time_signature_numerator, time_signature_denominator, pattern_kind, family, instruments, tags, origin, visibility, status, listable, created_by, data) VALUES
 ('pat_voice_hh','pattern','Hi-Hat Voice (8ths)','hi-hat-voice-8ths','Just the hi-hats — eight straight 8th notes.',0,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,hi-hat}','curated','public','published',false,'seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Hi-Hat%20Voice&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--------|&K=|--------|","source":"masked from Basic Rock Beat"}'),
 ('pat_voice_sn','pattern','Snare Voice (backbeat)','snare-voice-backbeat','Just the snare — backbeat on 2 & 4.',1,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,snare}','curated','public','published',false,'seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Snare%20Voice&Tempo=100&Measures=1&H=|--------|&S=|--o---o-|&K=|--------|","source":"masked from Basic Rock Beat"}'),
 ('pat_voice_kick','pattern','Kick Voice (1 & 3)','kick-voice-1-3','Just the kick — on beats 1 & 3.',1,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,kick}','curated','public','published',false,'seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Kick%20Voice&Tempo=100&Measures=1&H=|--------|&S=|--------|&K=|o---o---|","source":"masked from Basic Rock Beat"}'),
 ('pat_rock_composite','pattern','Rock Beat — built from voices','rock-beat-built-from-voices','The full beat assembled from its hi-hat, snare and kick voices.',1,100,4,4,'beat','{Rock,Composite}','{drums}','{beat,rock,composite}','curated','public','published',true,'seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Rock%20Beat%20(composite)&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--o---o-|&K=|o---o---|","source":"composed from voices"}')
ON CONFLICT (id) DO NOTHING;

-- composite -> voice leaves (ordered)
INSERT INTO step (parent_id, child_id, sort_order, created_by) VALUES
 ('pat_rock_composite','pat_voice_hh',  1,'seed'),
 ('pat_rock_composite','pat_voice_sn',  2,'seed'),
 ('pat_rock_composite','pat_voice_kick',3,'seed')
ON CONFLICT (parent_id, sort_order) DO NOTHING;

-- ── one DRUMS track per drum pattern (the drum_profile's home; level mirrors) ─
INSERT INTO track (id, playable_id, instrument, sort_order, level, techniques, created_by) VALUES
 ('trk_ssr_debut','pat_ssr_debut','drums',1,0,'{}','seed'),
 ('trk_dsr_debut','pat_dsr_debut','drums',1,0,'{}','seed'),
 ('trk_ssr_l2','pat_ssr_l2','drums',1,2,'{}','seed'),
 ('trk_ss4_l3','pat_ss4_l3','drums',1,3,'{accent}','seed'),
 ('trk_5sr_l4','pat_5sr_l4','drums',1,4,'{}','seed'),
 ('trk_7sr_l6','pat_7sr_l6','drums',1,6,'{}','seed'),
 ('trk_swiss_l7','pat_swiss_l7','drums',1,7,'{flam}','seed'),
 ('trk_ssr_l8','pat_ssr_l8','drums',1,8,'{}','seed'),
 ('trk_basic_rock','pat_basic_rock','drums',1,1,'{}','seed'),
 ('trk_snare_fill_l4','pat_snare_fill_l4','drums',1,4,'{16th}','seed'),
 ('trk_voice_hh','pat_voice_hh','drums',1,0,'{}','seed'),
 ('trk_voice_sn','pat_voice_sn','drums',1,1,'{}','seed'),
 ('trk_voice_kick','pat_voice_kick','drums',1,1,'{}','seed'),
 ('trk_rock_composite','pat_rock_composite','drums',1,1,'{}','seed')
ON CONFLICT (id) DO NOTHING;

-- ── drum_profile per drums track (SD-27: keyed by track_id) ──────────────────
INSERT INTO drum_profile (track_id, beats, fills, rudiments, kit_pieces) VALUES
 ('trk_ssr_debut','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_dsr_debut','{}','{}','{double-stroke-roll}','{snare}'),
 ('trk_ssr_l2','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_ss4_l3','{}','{}','{single-stroke-four}','{snare}'),
 ('trk_5sr_l4','{}','{}','{five-stroke-roll}','{snare}'),
 ('trk_7sr_l6','{}','{}','{seven-stroke-roll}','{snare}'),
 ('trk_swiss_l7','{}','{}','{swiss-army-triplet}','{snare}'),
 ('trk_ssr_l8','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_basic_rock','{rock,basic-rock}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_snare_fill_l4','{}','{snare-fill}','{single-stroke-roll}','{snare}'),
 ('trk_voice_hh','{}','{}','{}','{hi-hat}'),
 ('trk_voice_sn','{}','{}','{}','{snare}'),
 ('trk_voice_kick','{}','{}','{}','{kick}'),
 ('trk_rock_composite','{rock,basic-rock}','{}','{}','{hi-hat,snare,kick}')
ON CONFLICT (track_id) DO NOTHING;

-- ── SONGS: notation rows first (FK dependency) ───────────────────────────────
-- s3_key holds the BARE object key (e.g. seed/yellow.gp) — the bucket is applied by the fetch
-- layer, so the AWS SDK GetObject Key maps 1:1; never store a full s3:// URI here (review F-L).
INSERT INTO notation (id, format, s3_key, upload_status, created_by) VALUES
 ('not_bohemian','gp','seed/bohemian-rhapsody.gp','ready','seed'),
 ('not_yellow','gp','seed/yellow.gp','ready','seed'),
 ('not_zoio','gp','seed/zoio.gp','ready','seed'),
 ('not_imyours','gp','seed/im-yours.gp','ready','seed'),
 ('not_angra','gp','seed/angra-nothing-to-say.gp','ready','seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO playable (id, kind, title, slug, description, notation_id, level, author, author_type, bpm, time_signature_numerator, time_signature_denominator, genre, instruments, tags, family, origin, visibility, status, has_audio, has_video, created_by, data) VALUES
 ('song_bohemian','song','Bohemian Rhapsody','bohemian-rhapsody','Queen''s multi-section epic — ballad, opera and hard-rock parts.','not_bohemian',8,'{Queen}','artist',72,4,4,'{rock,progressive}','{keys,guitar,bass,drums,vocals}','{classic-rock}','{Rock}','curated','public','published',true,true,'seed','{"bars":139,"sections":[{"label":"gtrs enter","startBar":42,"endBar":54,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","kick"],"level":5},{"track":"trk_boh_keys","voices":["left-hand","right-hand"],"level":6}]},{"label":"tempo 144","startBar":55,"endBar":95,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","snare","kick","crash"],"level":5},{"track":"trk_boh_keys","voices":["left-hand","right-hand"],"level":6}]},{"label":"tempo 207","startBar":96,"endBar":139,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","snare","kick","crash","ride"],"level":5},{"track":"trk_boh_keys","voices":["right-hand"],"level":6}]}]}'),
 ('song_yellow','song','Yellow','yellow','Coldplay — a steady, ringing guitar anthem.','not_yellow',3,'{Coldplay}','artist',87,4,4,'{rock,alternative}','{guitar,bass,drums,keys,vocals}','{}','{Rock}','curated','public','published',false,true,'seed','{"bars":97}'),
 ('song_zoio','song','Zoio de Lula','zoio-de-lula','Charlie Brown Jr. — Brazilian rock (artist unconfirmed; flagged).','not_zoio',9,'{Charlie Brown Jr.}','artist',76,4,4,'{rock,brazilian}','{guitar,bass,drums}','{}','{Rock}','curated','public','published',false,true,'seed','{"bars":79,"markerless":true}'),
 ('song_imyours','song','I''m Yours','im-yours','Jason Mraz — one I–V–vi–IV progression carries the whole song.','not_imyours',2,'{Jason Mraz}','artist',73,4,4,'{pop,reggae}','{guitar,bass,drums,vocals}','{}','{Pop}','curated','public','published',false,true,'seed','{"singleSection":true,"bars":76}'),
 ('song_angra','song','Nothing To Say','nothing-to-say','Angra — neoclassical power metal; Expert-level double-bass drumming.','not_angra',9,'{Angra}','artist',138,4,4,'{metal,power-metal}','{drums,guitar,bass,keys,vocals}','{neoclassical}','{Metal}','curated','public','published',true,true,'seed','{"bars":221}')
ON CONFLICT (id) DO NOTHING;

-- ── tracks: per-instrument, per-role, with per-instrument LEVELS ─────────────
INSERT INTO track (id, playable_id, instrument, roles, name, sort_order, level, notation_track_index, techniques, created_by) VALUES
 -- Bohemian Rhapsody (real .gp: 13 tracks incl. 5 guitars + 2 print-dupe pianos; primaries mapped). guitar lead(7) vs rhythm(4) → max-on-guitar = 7
 ('trk_boh_keys','song_bohemian','keys','{}','Piano',1,6,1,'{}','seed'),
 ('trk_boh_glead','song_bohemian','guitar','{lead}','Gtr 1',2,7,0,'{}','seed'),
 ('trk_boh_grhythm','song_bohemian','guitar','{rhythm}','Gtr 2',3,4,3,'{}','seed'),
 ('trk_boh_bass','song_bohemian','bass','{}','Bass',4,5,7,'{}','seed'),
 ('trk_boh_drums','song_bohemian','drums','{}','Percussions',5,5,10,'{}','seed'),
 ('trk_boh_vox','song_bohemian','vocals','{}','Voice',6,8,8,'{}','seed'),
 -- Yellow (real .gp: 8 tracks)
 ('trk_yel_glead','song_yellow','guitar','{lead}','Lead Guitar',1,3,2,'{}','seed'),
 ('trk_yel_grhythm','song_yellow','guitar','{rhythm}','Rhythm Guitar',2,2,1,'{}','seed'),
 ('trk_yel_bass','song_yellow','bass','{}','Bass',3,2,4,'{}','seed'),
 ('trk_yel_drums','song_yellow','drums','{}','Drums',4,2,7,'{}','seed'),
 ('trk_yel_keys','song_yellow','keys','{}','Strings / Piano',5,3,5,'{}','seed'),
 ('trk_yel_vox','song_yellow','vocals','{}','Lead Vocals',6,3,0,'{}','seed'),
 -- Zoio de Lula (real .gp: marker-less; 3 guitars + bass + drums; NO vocals track)
 ('trk_zoio_glead','song_zoio','guitar','{solo}','Guitarra Solo',1,4,1,'{}','seed'),
 ('trk_zoio_grhythm','song_zoio','guitar','{rhythm}','Guitarra Base',2,3,0,'{}','seed'),
 ('trk_zoio_gtr3','song_zoio','guitar','{}','Guitarra 3',3,3,2,'{}','seed'),
 ('trk_zoio_bass','song_zoio','bass','{}','Baixo',4,4,3,'{}','seed'),
 ('trk_zoio_drums','song_zoio','drums','{}','Bateria',5,9,4,'{}','seed'),
 -- I'm Yours (real .gp: classical + electric guitar, NOT ukulele; + vocals)
 ('trk_imy_grhythm','song_imyours','guitar','{rhythm}','Classical Guitar',1,2,0,'{}','seed'),
 ('trk_imy_uke','song_imyours','guitar','{lead}','Electric Guitar',2,2,1,'{}','seed'),
 ('trk_imy_bass','song_imyours','bass','{}','Bass',3,2,2,'{}','seed'),
 ('trk_imy_drums','song_imyours','drums','{}','Drums',4,1,3,'{cross-stick}','seed'),
 ('trk_imy_vox','song_imyours','vocals','{}','Lead Vocal Harmonies',5,2,4,'{}','seed'),
 -- Angra – Nothing To Say (real .gp: 15 sections, E→G modulation; player-named tracks)
 ('trk_angra_drums','song_angra','drums','{}','Ricardo (Drums)',1,9,4,'{double-bass,blast-beat}','seed'),
 ('trk_angra_glead','song_angra','guitar','{lead}','Kiko (Lead Guitar)',2,9,1,'{}','seed'),
 ('trk_angra_grhythm','song_angra','guitar','{rhythm}','Rafael (Rhythm Guitar)',3,7,2,'{}','seed'),
 ('trk_angra_bass','song_angra','bass','{}','Luis (Bass)',4,8,3,'{}','seed'),
 ('trk_angra_keys','song_angra','keys','{}','Keyboards',5,6,5,'{}','seed'),
 ('trk_angra_vox','song_angra','vocals','{}','Andre (Vocals)',6,8,0,'{}','seed')
ON CONFLICT (id) DO NOTHING;

-- ── tonal_profile per PITCHED track (SD-27: the bass carries its OWN notes) ──
INSERT INTO tonal_profile (track_id, musical_key, keys, scales, chords, progression_concrete, progression_roman, progression_family) VALUES
 -- Bohemian: the chart has NO chord symbols → chords empty (not invented); key Bb from the file (plausible).
 ('trk_boh_keys','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_glead','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_grhythm','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_bass','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 -- Yellow: REAL chords from the .gp (B major).
 ('trk_yel_glead','B major','{B major}','{}','{B,Badd9,F#6,E7M,Badd11,G#m,Eadd9,F#m7add11}','{B-Badd9-F#6-E7M}','{I-V-IV}','{I-IV-V}'),
 ('trk_yel_grhythm','B major','{B major}','{}','{B,Badd9,F#6,E7M,Badd11,G#m,Eadd9,F#m7add11}','{B-Badd9-F#6-E7M}','{I-V-IV}','{I-IV-V}'),
 ('trk_yel_bass','B major','{B major}','{}','{B,F#,E}','{}','{}','{}'),
 -- Zoio: chart has NO chord symbols + GP key is a default → tonal honestly unknown.
 ('trk_zoio_glead',NULL,'{}','{}','{}','{}','{}','{}'),
 ('trk_zoio_grhythm',NULL,'{}','{}','{}','{}','{}','{}'),
 ('trk_zoio_bass',NULL,'{}','{}','{}','{}','{}','{}'),
 -- I'm Yours: REAL chords from the .gp — B major, I-V-vi-IV (fixes the earlier wrong "C major").
 ('trk_imy_grhythm','B major','{B major}','{}','{B,F#,G#m,E,Fdim,F#/A#}','{B-F#-G#m-E}','{I-V-vi-IV}','{I-V-vi-IV}'),
 ('trk_imy_uke','B major','{B major}','{}','{B,F#,G#m,E,Fdim,F#/A#}','{B-F#-G#m-E}','{I-V-vi-IV}','{I-V-vi-IV}'),
 ('trk_imy_bass','B major','{B major}','{}','{B,F#,G#m,E}','{}','{}','{}'),
 -- Angra: NO chord symbols; keys from the real section labels (Chorus III modulates E→G).
 ('trk_angra_glead','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_grhythm','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_bass','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_keys','E minor','{E minor,G major}','{}','{}','{}','{}','{}')
ON CONFLICT (track_id) DO NOTHING;

-- ── drum_profile per DRUMS track (the drum side of the same per-track model) ──
INSERT INTO drum_profile (track_id, beats, fills, rudiments, kit_pieces) VALUES
 ('trk_boh_drums','{rock}','{tom-fill}','{}','{hi-hat,snare,kick,crash,tom}'),
 ('trk_yel_drums','{rock,pop}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_zoio_drums','{rock,punk}','{snare-fill}','{}','{hi-hat,snare,kick,crash}'),
 ('trk_imy_drums','{pop,reggae}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_angra_drums','{metal,double-bass}','{around-the-kit}','{}','{hi-hat,snare,kick,ride,crash,tom}')
ON CONFLICT (track_id) DO NOTHING;

-- ── media: one official video per song; audio stems where we flagged has_audio ─
INSERT INTO media (id, playable_id, kind, provider, url, s3_key, label, sort_order, created_by) VALUES
 ('med_boh_vid','song_bohemian','video','youtube','https://www.youtube.com/watch?v=fJ9rUzIMcZQ',NULL,'Official video',0,'seed'),
 ('med_boh_aud','song_bohemian','audio','s3',NULL,'seed/bohemian-rhapsody.mp3','Full mix',1,'seed'),
 ('med_yel_vid','song_yellow','video','youtube','https://www.youtube.com/watch?v=yKNxeF4KMsY',NULL,'Official video',0,'seed'),
 ('med_zoio_vid','song_zoio','video','youtube','https://www.youtube.com/watch?v=placeholder-zoio',NULL,'Official video',0,'seed'),
 ('med_imy_vid','song_imyours','video','youtube','https://www.youtube.com/watch?v=EkHTsc9PU2A',NULL,'Official video',0,'seed'),
 ('med_angra_vid','song_angra','video','youtube','https://www.youtube.com/watch?v=placeholder-angra',NULL,'Official video',0,'seed'),
 ('med_angra_aud','song_angra','audio','s3',NULL,'seed/angra-nothing-to-say.mp3','Full mix',1,'seed')
ON CONFLICT (id) DO NOTHING;
