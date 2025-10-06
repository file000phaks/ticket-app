The App defines 3 main models: UserProfile, Ticket and Notification

UserProfile 
-----------
- Defines the structure and fields of Users
- Users are divided into 3 classes

1. Field Engineer (field_engineer)
----------------------------------
- Can create and view the tickets they created
- Can view and update the tickets they are assigned

2. Supervisor (supervisor)
--------------------------
- Can create and view tickets they created
- Can view all tickets created by field engineers
- Can assign tickets to engineers to resolve
- Can verify ticket resolution

3. Admin (admin)
----------------
- Can do all that the supervisor Can
- Can view all user profile and activate and deactivate accounts
- Can promote other users to Supervisor or to Admin


Ticket
------
- Defines the structure and field of Tickets 
- Tickets keep track of the following field areas

1. Text data
------------
- This includes ticket title, description, notes, status ( open, in_progress, closed ), and location (ticket can record the exact location of issue with GPS coords)

2. Media data
-------------
- Tickets also include media such as pictures and possibly video and audio

3. Dates
--------
- Keeps track of fields such as when ticket is created, updated, assigned to engineer, and resolved

4. Users Involved
-----------------
- Keeps track of who created the ticket, and who assigned the ticket and the engineer to whom the ticket was assigned


Notification (This one is a work in progress in the frontend)
------------
- Basically, a ticket creation, assignment, resolution should trigger a notification to the involved parties
- For example a ticket creation should issue a notification to a supervisor, and a ticket resolution should notify the ticket creator


An Example Usage of App
-----------------------
- The following is a simple depiction of how the app works

1. Field engineer at a construction site finds a fault in a generator
2. Engineer issues a ticket including all detail and possibly taking pictures or video and attaching to ticket
3. Supervisor receives notification that a ticket has been created and opens their dashboard
4. Supervisor reviews ticket to ensure it is valid, and not an accidental ticket or has inconsistent data. They might even contact the ticket creator via email or some other means
5. Supervisor then goes to engineers page, and assigns the ticket to a free engineer
6. Assigned engineer receives notification about ticket they have been assigned and opens their dashboard to see ticket details
7. Engineer reviews ticket and goes to site and solves the issue. After they are done they submit the ticket as resolved.
8. Supervisor receives notification about resolution, and verifies the ticket completion
9. Ticket creator receives notification about ticket resolution.
(10. A possible additional stage is if ticket creator is not satisfied with solution and would like to submit a sub-ticket referencing the original one)

