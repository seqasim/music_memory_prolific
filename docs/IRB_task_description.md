# Music Memory Task — IRB Procedures Description

## Overview

Participants will complete a single-session, browser-based Music Memory task lasting approximately 55–70 minutes. The task examines how incidental exposure to music during viewing of short video clips relates to later recognition memory for those videos, and how participants subjectively experience the music (e.g., familiarity, autobiographical memory, and emotional engagement). The session comprises three consecutive phases administered in a fixed order: (1) encoding, (2) music survey, and (3) recall (old/new recognition). Music stimuli are selected to correspond to a birth-year cohort such that songs fall within the participant’s adolescence and young adulthood (approximately release years *birth year + 15* through *birth year + 30*). Each deployed version of the task serves one music cohort; recruitment is age-screened accordingly.

## Setting and technical requirements

The study is administered remotely over the internet. Participants will use a desktop or laptop computer with a physical keyboard and functioning audio output (headphones or speakers). Mobile phones and tablets are not permitted, because the recognition phase requires left- and right-arrow key responses. Before encoding and again before the music survey, participants will complete a brief audio check in which they hear a spoken word, confirm that they heard it, and type the word; the check repeats until it is completed correctly. Instruction and break screens are self-paced; participants advance by pressing Enter.

## Recruitment and session identifiers

Participants will be recruited through an online research panel or comparable remote recruitment channel. When a panel platform is used, study and participant identifiers supplied by that platform (e.g., participant ID, study ID, and session ID) may be captured from the study URL and recorded with the behavioral data. At the start of the session, participants will provide or confirm their birth year. Birth year is retained in the data record for documentation; the particular music set presented is determined by the cohort for which that instance of the task was prepared and is not changed dynamically by the typed birth year.

## Procedures

### Encoding

During encoding, participants will view 108 short video clips organized into 9 blocks of 12 trials. Within each block, trials are assigned equally to three conditions and then shuffled: no music, music previously associated with music-evoked autobiographical memory (MEAM) in stimulus development, and control music. Each trial begins with a fixation cross (approximately 3 seconds), followed by a short video (approximately 3 seconds). When music is assigned to a trial, the music clip begins at fixation onset and ends when the video ends. No behavioral response is required during encoding; participants are instructed to watch the videos and try to remember them. Self-paced instructions appear at the start of each block.

### Music survey

After encoding, participants will hear again each of the 72 music clips that accompanied videos during encoding (36 MEAM and 36 control clips). Each clip is played in full (approximately 15 seconds). Immediately afterward, participants will rate the clip on nine 1–5 scales: familiarity; liking; strength of memories evoked; self-relevance (thinking about oneself or one’s own life); how emotionally moving the song was; vividness of mentally reliving past experiences; how distracting the music was during the video; how stimulating or engaging the song was; and how novel or unexpected the song was. Participants must adjust each slider before submitting; ratings are advanced by Enter or an on-screen continue control.

### Recall (old/new recognition)

Following a self-paced break with response instructions, participants will complete a recognition test of 216 video trials (9 blocks of 24). Each block includes the 12 videos from the corresponding encoding block intermixed with 12 never-seen lure videos. Each trial begins with a brief fixation (approximately 750 ms), followed by the video. Participants will press the left arrow key to indicate that the video is old (seen during encoding) or the right arrow key to indicate that it is new. A response may be made during or after the video. After each response, the chosen option is briefly highlighted (approximately 500 ms). Self-paced instructions appear at the start of each recall block.

## Stimuli

Video stimuli are short, everyday clips presented without spoken narration as the primary content of the memory task. Music stimuli are short excerpts of commercially released popular music, curated for the target birth-year cohort as described above. Music conditions contrast MEAM and control clips; one third of encoding videos are presented without music. Stimulus assignment (which videos pair with which music conditions, list order, and lure selection) is randomized per participant according to the task’s assignment rules.

## Data collected and storage

The task records trial-level behavioral data in a tidy tabular format (CSV), including phase and trial identifiers; music condition; stimulus file labels; survey question identifiers and 1–5 ratings; recognition responses (old/new), accuracy coding for recognition and the audio check, and reaction times; and session metadata such as participant and panel identifiers (when available), birth year, session start time, browser information, screen dimensions, and counts of focus loss as attention-related environment proxies. Data are uploaded to the experiment hosting platform at the end of a completed session. As a safeguard against incomplete remote sessions, trial data may also be retained temporarily in the participant’s browser local storage so that a disrupted session can potentially be recovered. A completion flag distinguishes sessions that reached the end of the timeline from sessions that did not.

Participants do not provide free-text autobiographical narratives; survey items are closed-ended ratings about reactions to the music and videos. No clinical assessments, biometric recordings, or identifiable audiovisual recordings of the participant are collected by the task software.
