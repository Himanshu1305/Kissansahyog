# Subah ki khabar - your 5-step morning routine (plain English)

You do this at about 5:45 AM. It takes five minutes. (Part B of this batch makes the message ready by itself at 04:30 and shows it on the admin page `/admin/morning`; this page is the manual way and the backup.)

1. **Run one command.** Open Git Bash in the project folder and type: `npm run morning`
   - Wait for the 5 lines at the end. If it says "PROBLEM" or "Stopped", do not post; tell the builder.
2. **Open the folder** it names (`out/morning/<today's date>/`). You will see four files.
3. **Message:** open `message.txt`, select all, copy, paste into the WhatsApp Channel. Read it once first.
4. **Card:** post `card.png` to the Channel (it is made for sharing: 1080 x 1350).
5. **Poll:** open `poll.txt`, make the poll in the Channel with that question and those options.

**Next morning, tell the message how the poll went:** look at the result, then run
`npm run morning:poll -- --date 2026-10-24 --pct 64`
(the date is the poll's day, 64 is the percent who picked the first answer). Tomorrow's message then says "कल 64% साथियों ने ... कहा". No file editing is needed.

## Things to know
- `report.txt` says where every number came from, how fresh it is, and why anything was left out. Look at it when something seems missing.
- If fresh mandi prices have not arrived, the message says so honestly instead of showing old numbers.
- `npm run morning -- --draft` also uses content that has not been reviewed yet (it prints a WARNING in the terminal and at the top of report.txt). Do not post draft content without checking it.
- `npm run morning -- --fixtures normal` makes a practice message with fixed fake data. Nothing is read from the internet.
- **First week:** glance at a printed panchang (calendar) each morning and check that the line "आज ... पक्ष की ..." matches. The tool was checked on 6 dates and agreed on all, but a tithi that changes right at sunrise can differ between calendars.
- All the Hindi wording is in one file, `scripts/morning/strings.hi.js`. Rules for the work tips are in `data/morning/work-rules.json`. Nothing else needs touching to reword the message.
