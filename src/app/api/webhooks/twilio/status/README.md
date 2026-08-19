# Twilio Status Callback

Configure the Twilio Messaging Service / outgoing message status callback to:

`https://omnicomm-360.vercel.app/api/webhooks/twilio/status`

Send the message SID in `MessageSid` and status in `MessageStatus`. OmniComm maps Twilio statuses to queued, sent, delivered, failed and undelivered and updates the operator message history.