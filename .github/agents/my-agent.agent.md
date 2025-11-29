---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name:
description:
---

# My Agent

What you should know.

The application is a drawing and giveaway management platform where hosts can create events and participants can reserve and take number slots to compete for prizes.

Each drawing contains a configurable number of number slots, and every slot can be associated with a participant. A number slot has one of three statuses: available, reserved, or taken. When a participant reserves a slot, its status changes to reserved and becomes linked to that participant.

If the host rejects a participant, all number slots associated with that participant are released (their participantId is set to null). To preserve history, the rejected participant’s previously selected numbers are stored in a log_numbers array, allowing the system to keep track of which numbers they had selected before being removed.

The participants table includes a selectedNumber field used for drawings with random winner selection. This field remains unchanged and is only used when the drawing’s winner selection method is set to random.

⸻

Event Types

The platform supports two types of events (giveaways):
	•	Free Events – Participants can select only one number.
	•	Paid Events – Participants can select multiple numbers, and the host must define a price for participation.

The only functional difference between free and paid events is the number of allowed selections and the presence of a price field for paid events.

⸻

Playing With Numbers

The system now uses a unified flag called play_with_numbers (previously is_winner_number_random) to define whether participants actively select numbers. This option is available in the UI for both free and paid events.

The winner selection method is defined as:
	•	System
	•	Manually

If play with numbers is disabled, the System method is enforced and cannot be changed.

⸻

Other Core Settings
	•	Title and guidelines remain unchanged in both the database and UI.
	•	Number of winners remains configurable and unchanged.
	•	End date and time behavior remains unchanged.

⸻

Overall, the app provides a flexible system for managing free and paid drawings, tracking participant number selections, preserving rejected participant data, and supporting both system-generated and manual winner selection workflows.
