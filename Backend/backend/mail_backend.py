"""
Email backend that sends with the mailbox chosen on the super admin Settings page
(Gmail address + App Password + sender name), falling back to the .env values.

Every email in the app (sign-up codes, password reset, invitations, prescription PDFs)
goes through Django's mail system, so changing the mailbox needs no code change.
"""
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend

from backend.platform_settings import mail_config


class SettingsEmailBackend(SMTPBackend):
    def __init__(self, *args, username=None, password=None, **kwargs):
        address, app_password, _ = mail_config()
        super().__init__(*args, username=username or address, password=password or app_password, **kwargs)

    def send_messages(self, email_messages):
        _, _, from_header = mail_config()
        if from_header:
            for message in email_messages:
                message.from_email = from_header  # always send as the system mailbox
        return super().send_messages(email_messages)
