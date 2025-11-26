## Signup POC Demo Script

### Scenario 1 – RSVP as an attendee
1. Open the web-user portal and log in as `user@mes.dev`.
2. Select the *Fireball* instance.
3. Scroll to the new **Signup Actions** panel, enter a quick RSVP note, and press **Submit RSVP**.
4. Observe the confirmation toast, then view the RSVP inside **My Sign-ups**. The status should be `confirmed` if capacity is available or `waitlisted` otherwise.

### Scenario 2 – Bus waitlist promotion
1. In another browser tab, log in to the admin portal as `admin@mes.dev` and choose the *Fireball* instance.
2. In the **Signup Management** widget, switch to the *Bus* tab. Confirm the attendee from Scenario 1 is listed (likely as waitlisted).
3. Click **Confirm** to promote the attendee. The status updates immediately thanks to the new API route.
4. Switch back to the user portal and click **Refresh Status** to show the promotion reflected in the attendee’s view.

### Scenario 3 – Table assignments
1. From the web-user portal, submit a table request (choose a table, seats, and optional group name).
2. In the admin portal’s *Table* tab, review the request. Use **Waitlist** or **Confirm** to simulate organizer decisions.
3. Show the same updates inside the mobile app’s **Signups** tab to highlight cross-platform parity.

### Scenario 4 – Mobile signups overview
1. Launch the Expo mobile client, log in as `user@mes.dev`, and navigate to the new **Signups** tab.
2. Tap **Refresh Status** to sync with the backend. The screen lists RSVP, bus, and table entries along with their latest statuses.
3. This tab pulls from `/users/me/signups`, demonstrating our unified API for all clients.

