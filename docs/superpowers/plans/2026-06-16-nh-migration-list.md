# NH migration list — bulk-move via Jira UI (carries sub-tasks)

> 66 remaining **stories/tasks** (sub-tasks excluded — they follow their parent automatically). Move only the parent stories; Jira's **Bulk change** brings their sub-tasks along.
>
> **How to bulk-move (per group):** Filters → paste the group's JQL → *Tools ▸ Bulk change* → select all → *Edit issues* → set **Parent** (the epic), **Sprint**, **Fix Version** in one pass. Best-effort mapping — adjust any row as you see fit.
>
> Sprint ids: 5=`1·Foundation` 6=`2·Wireframes` 7=`3·Temp DS` 8=`4·Catalog+infra` 9=`5·Player` 10=`6·Sentry` 11=`7·Local play+score` 12=`7b·Thin SQS+SNS` 13=`8·Auth` 14=`9·Score history` 15=`10·Upload` 16=`11·Messaging` 17=`12·Deep SRE` 18=`13·Offline sync` 19=`14·Better UI` 20=`15·Native`.
> Epics: NH-176 Foundation · NH-177 Catalog/CMS&Infra · NH-178 Player&Notation · NH-179 Scoring/MIDI/Progress · NH-180 Observability&SRE · NH-181 AWS Messaging&Analytics · NH-182 Auth&Accounts · NH-183 Offline Sync · NH-184 Native&Platform · NH-14 Design · NH-15 Local play.

## A) Sprinted groups (set Parent + Sprint + Fix Version)

### → `5 · Player` · epic **NH-178** · release **Alpha / EAP**
`key in (NH-90,NH-84,NH-85,NH-81,NH-87,NH-88,NH-86,NH-102,NH-101,NH-103,NH-105,NH-95,NH-64,NH-65,NH-100)`
A-1 render · A-2 rings · A-3 missed · A-4 cross · A-8 ignore-error · B-1 load · B-2 transport · B-7 tempo · B-6 metronome · B-3 loop · B-5 count-in · B-8 display · A-7 NotationRenderer · B-9 A/B loop · D-1 Web-MIDI input

### → `7 · Local play + score` · epic **NH-179** · release **Alpha / EAP**
`key in (NH-97,NH-92,NH-50)`  — C-1 scoring engine · C-2 score% · H-13 PWA install/offline. (Local-play epic **NH-15** stays as-is.)

### → `8 · Auth` · epic **NH-182** · release **Beta**
`key in (NH-45)`  — H-9 Cognito

### → `9 · Score history` · epic **NH-179** · release **Beta**
`key in (NH-120,NH-58,NH-77,NH-74,NH-99,NH-94)`  — H-3 DynamoDB · C-5 save · C-7 history · C-6 streak · C-4 in-session streak · C-3 5-star

### → `10 · User upload` · epic **NH-182** · release **Beta**
`key in (NH-49)`  — H-10 S3 uploads

### → `11 · Messaging + analytics` · epic **NH-181** · release **Beta**
`key in (NH-54,NH-51)`  — H-6 SQS/SNS/Athena · J-8 instrumentation (full)

### → `12 · Deep SRE` · epic **NH-180** · release **Beta**
`key in (NH-52)`  — H-7 CloudWatch + X-Ray SLOs

### → `13 · Offline sync` · epic **NH-183** · release **M1**
`key in (NH-44)`  — H-5 sync engine

### → `14 · Better UI` · epic **NH-14** · release **M1**
`key in (NH-108,NH-82,NH-113)`  — F-4 dark mode · A-6 a11y · F-3 save settings

### → `15 · Native` · epic **NH-184** · release **M1**
`key in (NH-46,NH-47,NH-48,NH-78,NH-127,NH-128,NH-129,NH-130,NH-106,NH-109)`
iOS audio · Capacitor iPad · native scoring · Android Kotlin · keyboard shortcuts · desktop PWA · Electron · Windows ASIO · Android-Chrome PWA · iPad shim

## B) Backlog groups (set Parent + Fix Version only — schedule the sprint when it nears, per spec)

### epic **NH-178** Player · release **Beta**
`key in (NH-57,NH-59,NH-60,NH-63,NH-112,NH-115,NH-73,NH-55,NH-56,NH-61,NH-62)`
B-11 instrument selector · B-10 volume mixer · E-4 memory · E-1 game mode · E-3 auto-speed · E-2 practice · E-5 auto-suggest · F-2 timing windows · F-5 preload perf · F-1 latency · D-1-a multi-device

### epic **NH-179** Scoring/MIDI · release **Beta**
`key in (NH-111,NH-114,NH-72,NH-68,NH-71,NH-69)`
D-2 MIDI mapping · D-4 pedal forgiveness · D-3 pre-check mappings · A-5 velocity ghost · J-5 ghost dynamics · J-6 drumkit SVG

### epic **NH-177** Catalog · release **Beta**
`key in (NH-53,NH-70)`  — H-11 lesson library · J-3 import alphaTex/.midi

### epic **NH-178** Player · release **M2**
`key in (NH-75,NH-76)`  — J-1 backing-track · J-2 video sync

### epic **NH-178** Player · release **M1** (Friendly view)
`key in (NH-66,NH-67)`  — G-1 friendly highway · G-2 friendly feedback

## C) Cleanup (after the moves above)
Once each old milestone-epic is emptied of stories, archive it (transition to Cancelled): **NH-6, NH-7, NH-8, NH-9, NH-10, NH-11, NH-12, NH-13**. (Junk **NH-1** is archived separately by API.) Keep NH-14 + NH-15.

## Already done by API (no action needed)
Catalog Preview fully migrated (sprint 1·Foundation 15 stories +22 sub-tasks, 4·Catalog+infra, 2·Wireframes, 6·Sentry). New issues NH-187/188 (wireframes), NH-189 (temp design system), NH-190 (thin SQS/SNS) created + sprinted. Old duplicate "CI/CD Setup" sprints deleted.
