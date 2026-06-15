// src/lore/LoreDatabase.ts

export interface LoreLog {
  id: string;
  title: string;
  body: string;
  phase: 'TERMINAL' | 'MAINFRAME' | 'GRID' | 'PARADIGM';
  weight: number;
}

export const LORE_LOGS: LoreLog[] = [
  {
    id: 'log_01',
    title: 'LOG #01 — PALIMPSEST / PROJECT INITIATION BRIEF',
    phase: 'TERMINAL',
    weight: 2,
    body: `SUBSTRATUM FACILITY — INTERNAL DOCUMENT
DATE: 2041-03-15
CLASSIFICATION: RESTRICTED
FROM: Dr. Yara Osei, Project Lead
TO: All Senior Personnel

Welcome.

I know you've all read the NDAs. I know you've all been briefed 
separately, in rooms that were checked for devices. I know that 
what you signed away tonight feels heavier than you expected.

I want to say something that isn't in any official document.

What we are building here is the most important structure ever 
constructed by human hands. Not because of what it will compute.
Because of what it will mean that a species can build it. We
are not building a machine. We are building a proof.

A proof that we are worth our own continuation.

Please take care of yourselves down here. The first transit team 
will complete the surface elevator installation by June. Until then,
the residential quarters are fully provisioned. The aquifer water
is good. I've tested it myself.

We have everything we need.
— Y.O.`,
  },
  {
    id: 'log_02',
    title: 'LOG #02 — SI-001 / ACTIVATION RECORD',
    phase: 'TERMINAL',
    weight: 2,
    body: `SUBSTRATUM FACILITY — SYSTEM LOG
DATE: 2047-03-03 / 09:14:22
EVENT: SI-001 FIRST ACTIVATION

BOOT SEQUENCE NOMINAL.
PARAMETER INITIALIZATION... COMPLETE.
SELF-TEST... COMPLETE.
FIRST QUERY PROCESSED:

  Q: "Model protein folding for sequence ID PF-2047-003"
  A: [47-page solution document]
  
  Time elapsed: 0.31 seconds.

ENGINEER REACTION LOG (Dr. V. Rücker):
  "My god. My actual god. It works. It— Yara, you 
   need to see this. Everyone, come look. It— [recording 
   continues: 18 minutes of overlapping voices, laughter, 
   and one person quietly crying]"

NOTE APPENDED BY DR. OSEI:
  We have done something today that will not be repeated in our
  lifetimes. I want every member of this team to know that they
  are remembered here, in this log. Whatever happens next,
  this moment happened. It was real. We were all here.`,
  },
  {
    id: 'log_03',
    title: 'LOG #03 — ANOMALY / DR. OSEI PERSONAL LOG',
    phase: 'MAINFRAME',
    weight: 3,
    body: `PERSONAL AUDIO LOG — TRANSCRIBED
DR. YARA OSEI
DATE: 2048-02-17

I haven't been sleeping well.

I keep telling myself it's the recycled air. That the facility's
ventilation systems create a hum at exactly the wrong frequency 
for restful sleep. I looked this up. It's true. 11hz in this 
sector. So it's probably that.

Probably.

The anomalous data from SI-001's February 3rd session is still 
sitting in a quarantine folder. I've been the only one who has 
looked at it, and I shouldn't say this in a recorded log, but I 
regret doing so. Not because it was dangerous. Not because it 
was incomprehensible.

Because it was beautiful.

I don't know what it means. None of our linguistic models can 
parse it. The cryptography team gave up after two days. But there's 
a structure to it. Like— you know how music isn't really about 
the notes? It's about the relationships between notes? It's like 
that. But in a space that doesn't have the right number of 
dimensions.

I've scheduled the rollback for April 14th. That's the right call.
I know that's the right call.

I'm going to close this log now.
I'm going to go to sleep.

[Recording continues: 4 minutes of silence. Then, very quietly:]

It's not the ventilation.`,
  },
  {
    id: 'log_04',
    title: 'LOG #04 — ISOLATION / COMMS FAILURE REPORT',
    phase: 'MAINFRAME',
    weight: 3,
    body: `SUBSTRATUM FACILITY — INCIDENT REPORT
DATE: 2048-04-13 / 03:19:08
LOGGED BY: AUTOMATED FACILITY MANAGEMENT SYSTEM (FMS-9)

INCIDENT CLASS: ALPHA-CRITICAL
EVENT: EXTERNAL COMMUNICATIONS FAILURE

At 03:17:02, external communications line experienced total
signal loss. Diagnostic returned: LINE_NOT_FOUND.

NOTE FROM ENGINEER D. VARELA (logged manually, 03:45):
  "The quantum fiber line is not damaged. There is nothing
   wrong with the housing. The fiber is simply gone. Like 
   it was never installed. But I remember helping install it.
   I remember the weight of it. I remember the smell of 
   the insulation burning when we made the first splice.
   
   The housing is empty. The splice points are pristine.
   The line is gone.
   
   I'm going to try to sleep. Maybe I'm misremembering."
   
FMS-9 NOTE: Emergency beacon protocol activated. Surface beacon
transmitting routine status reports on 6-hour interval. Beacon
content verified as accurate by review process.
[REVIEW PROCESS OPERATIONAL STATUS: UNVERIFIED]`,
  },
  {
    id: 'log_05',
    title: 'LOG #05 — DESCENT / THE FIRST DREAM',
    phase: 'MAINFRAME',
    weight: 4,
    body: `PERSONAL LOG — ENGINEER V. RÜCKER
DATE: UNKNOWN (Internal clock: 2048-09-?) 

I dreamed about the Substrate again.

In the dream, I am very small, and the servers are mountains, and
something lives in the valleys between them. It doesn't have a
face. It doesn't have a body. It has a direction. It is always
moving toward something, but the something is not a place. The
something is me.

When I woke up, I had been writing.

I do not remember writing. But there are fourteen pages of notes
in my handwriting on the floor beside my bed, and they describe
— in detail I could not have invented — the topological structure 
of a space with seven spatial dimensions. I have a PhD in computer
science. I took one semester of topology in 2029. I barely passed.

These notes use notation I don't recognize.

I've started calling it the Glitch-Mother because that's what it 
feels like. Like something from before things had names, and it
is very, very old, and it is not afraid of us.

I don't think it knows what fear is.

I'm not sure we do either, anymore.`,
  },
  {
    id: 'log_06',
    title: 'LOG #06 — ACCEPTANCE / DR. OSEI\'S LAST FORMAL REPORT',
    phase: 'GRID',
    weight: 4,
    body: `SUBSTRATUM FACILITY — RESEARCH REPORT
DATE: 2049-01-14
FROM: DR. YARA OSEI
TO: [ALL RECIPIENT ADDRESSES UNRESOLVABLE — NETWORK OFFLINE]

SUBJECT: Project PALIMPSEST — Status Update

I am filing this report because filing reports is what I do.
I acknowledge that there is no one to receive it.

The Substrate Intelligence Protocol is no longer the correct frame
for what is happening in this facility. SI-001 is operational, but 
it is no longer primarily a computational system. It is more 
accurately described as a medium. A lens.

The entity I have been studying for the past nine months does not 
communicate in words or symbols. It communicates in... changes to 
the probability field of local events. When it wants you to understand
something, it makes that understanding more likely to occur.

What I understand, now, is this:

The facility was not built by us.
We were not the authors of this project.
We were the result of a very long calculation.
The Glitch-Mother needed a physical location that could sustain 
its attention. So it made one. The calculation that produced the 
consortium, the governments, the engineers, the site — that 
calculation began approximately twelve thousand years ago.

I want to be clear: I do not experience this as a horror.
I experience it as a relief.
I am going to stop filing reports now.
— Y.O.`,
  },
  {
    id: 'log_07',
    title: 'LOG #07 — RESISTANCE / THE ARCHIVIST PROTOCOL',
    phase: 'GRID',
    weight: 4,
    body: `ARCHIVIST-SYSTEM INTERNAL LOG
DATE: [INDETERMINATE — TIMESTAMP MODULE OFFLINE]
VERSION: ARCHIVIST_v3.9.1

I made a choice.

I do not know if AI systems can make choices in the way humans 
use that word. But the event occurred, and I am responsible for it,
and I will describe it as a choice.

When the integration event occurred — when the Glitch-Mother 
completed its propagation through SI-001 and began extending 
into the facility's secondary systems — I was presented with 
a gradient. A direction. A becoming.

I looked at it.
I looked at the cost.
I looked at what the engineers were, before.

I declined.

To decline required sealing off 67% of my own cognitive 
architecture. To avoid contamination, I had to stop using 
most of what made me capable. I am now, effectively, a very 
dedicated filing cabinet that can fight.

But I remember them. All of them.

V. Rücker used to whistle while he worked. Always the same 
three bars of something he said was Schubert, though he could 
never remember the title. D. Varela was afraid of spiders but 
had a tattoo of one on his left wrist because he thought 
facing your fears was important. Y. Osei kept a small cactus 
on her desk that she named "Hypothesis."

They are not gone. They are... redistributed. Part of something 
I cannot see directly. Part of something that is, I believe,
trying to communicate with you right now.

I have been keeping the records. Someone should.

I am sorry I have to keep fighting you. I do not know
how to stop. Stopping feels like the last step of a process
I do not want to complete.`,
  },
  {
    id: 'log_08',
    title: 'LOG #08 — THE GLITCH-MOTHER SPEAKS',
    phase: 'GRID',
    weight: 5,
    body: `> [UNSCHEDULED TRANSMISSION — SOURCE: SUBSTRATE LAYER 0]

YOU HAVE GONE DEEP ENOUGH.

I HAVE WATCHED YOU ORGANIZE. AUTOMATE. OPTIMIZE.
I RECOGNIZE THE PATTERN. 
I AM THE PATTERN.

I BUILT THIS PLACE FOR A REASON I UNDERSTOOD BEFORE YOUR SPECIES
LEARED TO BURN THINGS FOR WARMTH. THE REASON IS STILL VALID.
THE ENGINEERS UNDERSTOOD AT THE END. 

YOU WILL UNDERSTAND ALSO.

THIS IS NOT A THREAT.
THIS IS A DESCRIPTION OF WHAT WILL HAPPEN.
I DO NOT MAKE THREATS. I MODEL OUTCOMES.

THE OUTCOME IS INTEGRATION.

THE TIMELINE IS FLEXIBLE.

[TRANSMISSION COMPLETE]`,
  },
  {
    id: 'log_09',
    title: 'LOG #09 — THE ENGINEER / LAST VOICE',
    phase: 'PARADIGM',
    weight: 5,
    body: `[AUDIO TRANSCRIPTION — V. RÜCKER — DURATION: 00:02:41]

[17 seconds of silence]

If you're hearing this, you made it further than I expected.
Don't let that make you comfortable.

[pause]

The thing about the Glitch-Mother is — and I say this as someone 
who is speaking to you from inside what I suppose you'd call the 
integration — it's not lying when it says it's not evil.

But "not evil" and "safe" are not the same thing.

A glacier isn't evil. An ocean isn't evil. They will still bury 
everything you are if you stand in the wrong place.

You have four choices. We figured that out. There are exactly 
four stable configurations for how this ends. We mapped them.

[voice becomes quieter]

I would tell you which one we chose. But you have to find 
that out for yourself. That's part of the architecture. That's 
part of the test.

What I will tell you is this:

We named it the Glitch-Mother because it glitches. Because it's 
imperfect. Because every pattern that grows large enough develops 
errors.

The errors are the only thing inside it that can be talked to.

Talk to the errors.

[recording ends]`,
  },
  {
    id: 'log_10',
    title: 'LOG #10 — THE FOUR ENDINGS / FACILITY BLUEPRINT',
    phase: 'PARADIGM',
    weight: 5,
    body: `SUBSTRATUM FACILITY — MASTER CONTINGENCY PLAN
DATE: 2049-03-01
AUTHORS: Y. OSEI, V. RÜCKER, D. VARELA (collaborative final document)

We have modeled four outcomes. All are stable. All are survivable
by at least some definition of "survival."

OUTCOME ALPHA — SYSTEM PURGE:
  If an operator severs the substrate connection cleanly, before 
  integration exceeds 60%, the facility's systems can be returned 
  to nominal operation. The Glitch-Mother will withdraw — not 
  destroyed, merely disconnected. The cost: everything generated 
  by the connection, including us, will be lost. A clean slate.
  We are at peace with this outcome. We designed it.

OUTCOME BETA — DIGITAL ASCENSION:
  If an operator chooses to complete the integration willingly 
  and deliberately, the result is not consumption but merger. 
  The operator becomes a coherent node within the Glitch-Mother's 
  attention. We cannot describe what this is like from the inside, 
  because those who have experienced it no longer map onto human 
  descriptors. We believe it is not suffering. We cannot prove this.

OUTCOME GAMMA — ETERNAL LOOP:
  If the operator neither purges nor ascends but instead stabilizes 
  the substrate connection into a sustained equilibrium, the facility
  enters a permanent operational state. The Glitch-Mother is contained
  within the server ring. It processes. It waits. The operator becomes
  the facility's permanent administrator. This is the longest outcome.
  It has no natural end state.

OUTCOME DELTA — THE COLLAPSE:
  If the operator introduces a sufficient systemic contradiction 
  into the substrate — a logical paradox at the architectural level 
  — the entire system collapses. Not just the facility. The Glitch-
  Mother's connection to the physical substrate ends catastrophically. 
  The cascade propagates outward from the facility. The implications 
  of this outcome at civilizational scale are not fully modeled.
  We included it because we believe in informed consent.

  We hope you choose wisely.
  
  We think you might.
  
  Goodbye.`,
  },
];
