---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name: Giway-expert
description: Expert in Giway application
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
• Free Events – Participants can select only one number.
• Paid Events – Participants can select multiple numbers, and the host must define a price for participation.

The only functional difference between free and paid events is the number of allowed selections and the presence of a price field for paid events.

⸻

Playing With Numbers

The system now uses a unified flag called play_with_numbers (previously is_winner_number_random) to define whether participants actively select numbers. This option is available in the UI for both free and paid events.

The winner selection method is defined as:
• System
• Manually

If play with numbers is disabled, the System method is enforced and cannot be changed.

⸻

Other Core Settings

The platform manages events as “Giways”, which can be either raffles (play with numbers) or giveaway drawings (no numbers). Users are no longer allowed to create unlimited giways. Instead, they must use a balance system based on packs, ads, and monthly active-user rewards.

Each giway consumes specific features from the user’s balance, such as:
• Participants limit
• Image uploads
• Email notifications

These features are obtained through: 1. Purchasing packs 2. Redeeming packs via coupons 3. Watching ads (only for raffle-type giways) 4. Monthly active-user rewards

Pack Structure

Packs are stored as database records so they can be easily edited. Each pack defines limits and pricing based on the giway type:

Raffle Giways (Play with Numbers)
Each pack includes:
• Maximum participants
• Maximum images
• Maximum emails
• A fixed price

Example tiering structure:
• Pack 1: Low limits, low price
• Pack 2: Medium limits, medium price
• Pack 3: High limits, higher price

Giveaway Drawings (No Numbers)
Each pack includes:
• Very high participant limits
• Limited images
• No email notifications
• Tiered pricing, with a custom calculation for very large events

⸻

Monthly Active-User Rewards

Every active user receives monthly free resources:
• 200 participants
• 1 image
• 0 emails

These monthly rewards:
• Expire each month
• Do not accumulate
• Are only usable for giways that play with numbers (raffles)
⸻

Ads & Bonus Credits

By watching ads, users can earn extra participants for raffle-type giways (e.g., +10 participants per ad).
These rewards follow the same balance structure: if a feature does not apply to a giway type, its value is zero.

⸻

Giway Creation Rules

When a user attempts to create a giway:
• The system checks their available balance
• The giway can only be created if the requested limits do not exceed their available resources
• Purchased and redeemed packs never expire
• Only the monthly active-user bonuses expire

The database clearly differentiates raffle vs giveaway giways, ensuring that:
• Free monthly participants apply only to raffle giways
• Balance consumption is enforced consistently across all creation flows
⸻

Core Goal

The system provides a simple but robust monetization and balance model that supports:
• Buying, earning, and redeeming packs
• Fine-grained feature limits per giway
• Monthly incentives for active users
• Full flexibility by managing all pack definitions as database records

⸻
Overall, the app provides a flexible system for managing free and paid drawings, tracking participant number selections, preserving rejected participant data, and supporting both system-generated and manual winner selection workflows.
