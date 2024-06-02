AES encrypted MongoDB database for chunks client

built modularly to isolate the encryption algorithm

this server can be used for other applications by renaming the cipher obscure/revealActivities functions and tailoring mergeUpdate to the application's data.

Seeded with an admin hash which allows users to be invited
to use the chunks client datastore

This server expects requests to be encrypted and replies with encrypted responses; use chunks-client apparatus to interact

when receiving an update request, the request header is expected to have a name, credential, and key field

name: username => APP_SIGNATURE + OUTBOUND_NAME
name + password: username & CRED_SEPARATOR & password => APP_SIGNATURE + OUTBOUND_CRED 
key: update number => APP_SIGNATURE + OUTBOUND_KEY

when receiving a request with a body, the request body is expected to be a string encrypted with CLIENT_SIGNATURE



API:

GET /
    Pings the api; returns response with "Chonk"

POST /invite
    Creates an invitation to the app, receiving a ticket string and the admin password
    returns 200 on success, or 403 if the ticket string is already present

POST /signup
    Creates a user on the app, receiving a ticket string and the new user's credentials (name and password with cred separator)
    returns 200 on success with an auth token, activities, and the current update key; returns 403 when the ticket string is invalid, returns 403 and refunds the ticket if the credentials already exist

POST /login
    Retrieves a current user's data on the app, receiving a user's credentials (name and password with cred separator)
    returns 200 on success with an auth token, activities, and the current update key; returns 403 when the credentials are invalid, or if the login expired

POST /update
    updates a user's data on the app, receiving the user's name, credentials, and update key via header, and optional update body.
    if the body is omitted, responds 200 and listens for the coming update with listening: true; the user enters the waiting state and other updates will be deferred and login attempts for that user will be rejected. If the body is present and the server is listening for an update, then respond with 200 and the incremented update key. if not listening, then respond with 200 with a message to defer.