# Chama Web App - Updated MVP

Updated with member addition, interest calc, fines, total capital, agendas, documents.

## Setup
- Add `public/docs/constitution.pdf` manually for download.
- Passwords now hashed; update samples if needed.
- For production, replace hardcoded admin creds in JS with proper auth (e.g., JWT).

## Suggestions for Next
- Implement sessions/JWT for secure auth without sending creds each time.
- Add email notifications for agendas/fines (use Nodemailer).
- Move to SQLite for better data handling.
- Add loan interest configuration per loan.
- Member profile updates (e.g., change password).

## License
MIT.
